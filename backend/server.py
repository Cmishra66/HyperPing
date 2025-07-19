from fastapi import FastAPI, APIRouter, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import requests
import json
import logging
from openai import OpenAI
import re

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# FastAPI app
app = FastAPI(title="HyprNurture API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models
class GenerateRequest(BaseModel):
    name: str
    position: str
    company_name: str
    company_size: str
    note: Optional[str] = ""

class NewsResponse(BaseModel):
    title: str
    url: str
    snippet: str
    published_at: str

class GenerateResponse(BaseModel):
    linkedin_msg: str
    email_html: str
    news_summary: List[NewsResponse]

# Helper to fetch news
@api_router.post("/news", response_model=List[NewsResponse])
async def get_news(company: dict):
    try:
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        params = {
            "q": company["company_name"],
            "from": seven_days_ago,
            "sortBy": "publishedAt",
            "pageSize": 10,
            "apiKey": os.environ["NEWS_API_KEY"]
        }
        response = requests.get("https://newsapi.org/v2/everything", params=params)
        articles = response.json().get("articles", [])
        keywords = ["merger", "funding", "expansion", "revenue", "growth", "investment"]

        filtered = []
        for a in articles:
            title = a.get("title", "").lower()
            desc = a.get("description", "").lower()
            if any(k in title or k in desc for k in keywords):
                filtered.append(NewsResponse(
                    title=a.get("title", ""),
                    url=a.get("url", ""),
                    snippet=(a.get("description", "")[:200] + "..."),
                    published_at=a.get("publishedAt", "")
                ))
        return filtered[:5]
    except Exception as e:
        logger.error(f"News fetch failed: {e}")
        return []

SERPAPI_KEY = os.environ.get("SERPAPI_KEY")

def get_company_data_serpapi(company_name):
    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google",
        "q": company_name,
        "api_key": SERPAPI_KEY
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        # Try to extract knowledge graph/company info if available
        kg = data.get("knowledge_graph", {})
        # Try to extract 'about' or company description from organic results if not in KG
        about = kg.get("description", "")
        if not about:
            for result in data.get("organic_results", []):
                snippet = result.get("snippet", "")
                if company_name.lower() in snippet.lower() or 'about' in snippet.lower():
                    about = snippet
                    break
        return {
            "name": kg.get("title", company_name),
            "description": about,
            "type": kg.get("type", ""),
            "website": kg.get("website", ""),
            "source": "serpapi"
        }
    else:
        return {"name": company_name, "source": "serpapi", "error": "No data found"}

def get_person_data_serpapi(company_name, person_name):
    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google",
        "q": f"{person_name} {company_name} LinkedIn",
        "api_key": SERPAPI_KEY
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        # Try to extract LinkedIn profile from organic results
        for result in data.get("organic_results", []):
            link = result.get("link", "")
            if "linkedin.com/in/" in link:
                return {
                    "name": person_name,
                    "linkedin": link,
                    "title": result.get("title", ""),
                    "snippet": result.get("snippet", ""),
                    "source": "serpapi"
                }
    return None

@api_router.get("/company-info")
async def company_info(company: str):
    data = get_company_data_serpapi(company)
    return data

# AI content generation using DeepSeek via OpenRouter
@api_router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    news_response = await get_news({"company_name": request.company_name})
    news_context = ""
    if news_response:
        news_context = "Recent news:\n" + "\n".join(f"- {n.title}" for n in news_response)

    # Fetch company data from SerpApi
    company_data = get_company_data_serpapi(request.company_name)
    if company_data and company_data.get("website"):
        logger.info(f"[SerpApi] Company data scraped successfully: {company_data['name']} ({company_data['website']})")
    else:
        logger.info(f"[SerpApi] No company website found for {request.company_name}")
    # Build company context for the prompt, focusing on what the company does
    company_about = company_data.get('description', '')
    company_context = f"About the company: {company_about}" if company_about else ""

    # Try to scrape CFO/finance head data
    person_data = get_person_data_serpapi(request.company_name, request.name)
    if person_data:
        logger.info(f"[SerpApi] Person data scraped successfully: {person_data['name']} ({person_data['linkedin']})")
        person_context = f"Finance head info: Name: {person_data.get('name', '')}, LinkedIn: {person_data.get('linkedin', '')}, Title: {person_data.get('title', '')}, Bio: {person_data.get('snippet', '')}."
    else:
        person_context = f"Finance head info: Name: {request.name}."

    prompt = f"""
You are a B2B SaaS sales rep. Write two things for:

- Name: {request.name}
- Role: {request.position}
- Company: {request.company_name} ({request.company_size} employees)
- Company website: {company_data.get('website', '[company_website]')}
{f"- Note: {request.note}" if request.note else ""}
{company_context}
{person_context}
{news_context if news_context else "- No recent news found."}

Instructions:
- Use the provided company and person data to personalize the LinkedIn message and email.
- Focus on what the company does, using the 'about' or description information.
- Replace ALL placeholders (such as [Your SaaS Solution], [key benefit], [company_website], etc.) with real values from the scraped data above.
- Always replace [Your SaaS Solution] with 'Hyperbots'.
- If a value is missing, omit the placeholder or use the best available info.
- Return ONLY valid JSON, no markdown, no explanation, no code block, just the JSON object.

Output this JSON:
{{
  "linkedinMsg": "...",
  "emailHtml": "..."
}}
    """.strip()

    try:
        OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
        client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1"
        )

        try:
            response = client.chat.completions.create(
                model="deepseek/deepseek-chat",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            text = response.choices[0].message.content
            logger.info(f"Raw model response: {text}")
            # Try to extract JSON from markdown code block or anywhere in the text
            json_match = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", text)
            if not json_match:
                json_match = re.search(r"```\s*(\{[\s\S]*?\})\s*```", text)
            if not json_match:
                json_match = re.search(r"(\{[\s\S]*\})", text)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = text  # fallback to the whole text
            try:
                ai_data = json.loads(json_str)
            except Exception as e:
                logger.error(f"JSON decode error: {e}, response: {text}")
                raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {text}")
            return GenerateResponse(
                linkedin_msg=ai_data.get("linkedinMsg", ""),
                email_html=ai_data.get("emailHtml", ""),
                news_summary=news_response
            )
        except Exception as e:
            import traceback
            logger.error(f"OpenRouter/DeepSeek API failed: {e}\nTraceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
            
    except Exception as e:
        logger.error(f"OpenRouter/DeepSeek API failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# Stub endpoints
@api_router.post("/save-draft")
async def save_draft(request: dict):
    return {"success": False, "message": "Draft saving is not available (no database)."}

@api_router.get("/drafts")
async def get_drafts():
    return []

# Health check
@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Register router
app.include_router(api_router)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

@api_router.post("/send-email-resend")
async def send_email_resend(
    to_email: str = Body(...),
    subject: str = Body(...),
    html_content: str = Body(...)
):
    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "from": "Your Name <your@domain.com>",  # Use a verified sender from your Resend account
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200 or response.status_code == 202:
            return {"success": True, "message": "Email sent successfully!"}
        else:
            return {"success": False, "message": f"Failed to send email: {response.text}"}
    except Exception as e:
        return {"success": False, "message": f"Failed to send email: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
