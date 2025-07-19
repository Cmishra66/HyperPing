import React from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TopBar = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('hyperping_token');
      await axios.post(
        `${BACKEND_URL}/api/logout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      onLogout();
    }
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <h1>Welcome to HyperPing</h1>
      </div>
      
      <div className="top-bar-right">
        <div className="user-info">
          <span className="user-avatar">👤</span>
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;