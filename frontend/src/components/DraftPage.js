import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const DraftPage = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [linkedinMsg, setLinkedinMsg] = useState('');
  const [emailHtml, setEmailHtml] = useState('');
  const [newsData, setNewsData] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');

  useEffect(() => {
    if (location.state?.generatedContent) {
      const { generatedContent, formData: form } = location.state;
      setLinkedinMsg(generatedContent.linkedin_msg || '');
      setEmailHtml(generatedContent.email_html || '');
      setNewsData(generatedContent.news_summary || []);
      setFormData(form || {});
      setEmailRecipient(form?.email || '');
    }
  }, [location.state]);

  const handleCopyLinkedIn = () => {
    navigator.clipboard.writeText(linkedinMsg);
    alert('LinkedIn message copied to clipboard!');
  };

  const handleSendEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRecipient || !emailRegex.test(emailRecipient)) {
      alert('Please enter a valid recipient email address');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/send-email-resend`,
        {
          to_email: emailRecipient,
          subject: `Partnership Opportunity - ${formData.company_name}`,
          html_content: emailHtml
        }
      );

      if (response.data.success) {
        alert('Email sent successfully!');
      } else {
        alert('Failed to send email. Please try again.');
        console.log('Resend API error:', response.data.message);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('hyperping_token');
      const draftData = {
        ...formData,
        linkedin_msg: linkedinMsg,
        email_html: emailHtml,
        news_summary: newsData
      };

      await axios.post(
        `${BACKEND_URL}/api/save-draft`,
        draftData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!linkedinMsg && !emailHtml) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main-content">
          <TopBar user={user} onLogout={onLogout} />
          <div className="content-area">
            <div className="empty-state">
              <h2>No draft content available</h2>
              <p>Generate messages from the dashboard first</p>
              <button onClick={() => navigate('/')} className="back-button">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <TopBar user={user} onLogout={onLogout} />
        
        <div className="content-area">
          <div className="page-header">
            <h1>Review & Edit Draft</h1>
            <p>Customize your outreach messages before sending</p>
          </div>
          
          {newsData.length > 0 && (
            <div className="news-section">
              <h2>Recent News</h2>
              <div className="news-items">
                {newsData.map((news, index) => (
                  <div key={index} className="news-item">
                    <h3>
                      <a href={news.url} target="_blank" rel="noopener noreferrer">
                        {news.title}
                      </a>
                    </h3>
                    <p>{news.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="drafts-container">
            <div className="draft-section">
              <div className="draft-header">
                <h2>LinkedIn Message</h2>
                <button onClick={handleCopyLinkedIn} className="copy-button">
                  Copy to Clipboard
                </button>
              </div>
              <textarea
                value={linkedinMsg}
                onChange={(e) => setLinkedinMsg(e.target.value)}
                className="linkedin-textarea"
                rows="8"
                placeholder="LinkedIn message will appear here..."
              />
            </div>
            
            <div className="draft-section">
              <div className="draft-header">
                <h2>Marketing Email</h2>
                <div className="email-actions">
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="recipient@company.com"
                    className="email-input"
                  />
                  <button 
                    onClick={handleSendEmail}
                    disabled={loading}
                    className="send-button"
                  >
                    {loading ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
              
              <div className="email-editor">
                <div className="email-preview">
                  <h3>Preview:</h3>
                  <div 
                    className="email-content"
                    dangerouslySetInnerHTML={{ __html: emailHtml }}
                  />
                </div>
                
                <div className="email-source">
                  <h3>HTML Source:</h3>
                  <textarea
                    value={emailHtml}
                    onChange={(e) => setEmailHtml(e.target.value)}
                    className="email-textarea"
                    rows="10"
                    placeholder="Email HTML content will appear here..."
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="draft-actions">
            <button onClick={() => navigate('/')} className="back-button">
              Back to Form
            </button>
            <button 
              onClick={handleSaveDraft}
              disabled={loading}
              className="save-button"
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftPage;