import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const SettingsPage = ({ user, onLogout }) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hyperping_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/drafts`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setDrafts(response.data);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearDrafts = async () => {
    if (window.confirm('Are you sure you want to clear all drafts?')) {
      // In a real app, you'd have a delete endpoint
      alert('Clear drafts functionality would be implemented here');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <TopBar user={user} onLogout={onLogout} />
        
        <div className="content-area">
          <div className="page-header">
            <h1>Settings</h1>
            <p>Manage your account and application settings</p>
          </div>
          
          <div className="settings-sections">
            <div className="settings-section">
              <h2>API Configuration</h2>
              <div className="setting-item">
                <label>Gemini API Key</label>
                <input type="password" value="••••••••••••••••" disabled />
                <span className="status connected">Connected</span>
              </div>
              <div className="setting-item">
                <label>NewsAPI Key</label>
                <input type="password" value="••••••••••••••••" disabled />
                <span className="status connected">Connected</span>
              </div>
              <div className="setting-item">
                <label>EmailJS Configuration</label>
                <input type="password" value="••••••••••••••••" disabled />
                <span className="status connected">Connected</span>
              </div>
            </div>
            
            <div className="settings-section">
              <h2>Account Information</h2>
              <div className="setting-item">
                <label>Email</label>
                <input type="email" value={user?.email || ''} disabled />
              </div>
              <div className="setting-item">
                <label>Organization</label>
                <input type="text" value="Hyprbots" disabled />
              </div>
            </div>
            
            <div className="settings-section">
              <h2>Saved Drafts</h2>
              <div className="drafts-summary">
                <p>You have {drafts.length} saved drafts</p>
                {loading ? (
                  <p>Loading drafts...</p>
                ) : (
                  <div className="drafts-list">
                    {drafts.map((draft) => (
                      <div key={draft.id} className="draft-item">
                        <div className="draft-info">
                          <h3>{draft.name} - {draft.company_name}</h3>
                          <p>{draft.position}</p>
                          <span className="draft-date">
                            {new Date(draft.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={clearDrafts} className="clear-button">
                  Clear All Drafts
                </button>
              </div>
            </div>
            
            <div className="settings-section">
              <h2>Application Info</h2>
              <div className="app-info">
                <div className="info-item">
                  <label>Version</label>
                  <span>1.0.0</span>
                </div>
                <div className="info-item">
                  <label>Build</label>
                  <span>2025.01.20</span>
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <span className="status connected">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;