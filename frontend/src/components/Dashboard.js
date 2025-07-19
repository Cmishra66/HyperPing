import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    company_name: '',
    company_website: '', // <-- Added
    company_size: '1-10',
    note: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGenerate = async () => {
    if (!formData.name || !formData.position || !formData.company_name) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('hyperping_token');
      const response = await axios.post(
        `${BACKEND_URL}/api/generate`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Navigate to draft page with generated content
      navigate('/draft', { 
        state: { 
          generatedContent: response.data,
          formData: formData
        }
      });
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <TopBar user={user} onLogout={onLogout} />
        
        <div className="content-area">
          <div className="page-header">
            <h1>Create New Outreach</h1>
            <p>Generate personalized LinkedIn messages and marketing emails</p>
          </div>
          
          <div className="outreach-form">
            <div className="form-section">
              <h2>Target Information</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Recipient Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Smith"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="position">Position *</label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="CFO, Finance Director"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="company_name">Company Name *</label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="Acme Corp"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="company_website">Company Website (optional)</label>
                  <input
                    type="text"
                    id="company_website"
                    name="company_website"
                    value={formData.company_website}
                    onChange={handleInputChange}
                    placeholder="https://company.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="company_size">Company Size</label>
                  <select
                    id="company_size"
                    name="company_size"
                    value={formData.company_size}
                    onChange={handleInputChange}
                  >
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="note">Additional Context (Optional)</label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  placeholder="Any additional context about the company or contact..."
                  rows="3"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="generate-button"
              >
                {loading ? 'Generating...' : 'Generate Messages'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;