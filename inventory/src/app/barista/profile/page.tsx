"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { User, Lock, Calendar, Activity, Eye, EyeOff } from 'lucide-react';
import './profile.css';

interface UserData {
  id: number;
  username: string;
  role: 'manager' | 'barista';
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Feedback state
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const token = localStorage.getItem('cafestock_token');
    const userStr = localStorage.getItem('cafestock_user');

    if (!token || !userStr) {
      window.location.href = '/';
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      console.log('User data from localStorage:', userData);
      console.log('User ID:', userData.id);
      fetchUserProfile(token, userData.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
    }
  }, []);

  const fetchUserProfile = async (token: string, userId: number) => {
    try {
      console.log('Fetching profile with token:', token ? 'Token exists' : 'No token');
      console.log('User ID:', userId);
      
      const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setNewUsername(data.username);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      return;
    }

    const token = localStorage.getItem('cafestock_token');
    if (!token || !user) return;

    try {
      const response = await fetch(`http://localhost:3001/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        setMessage('Password updated successfully');
        setMessageType('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsEditing(false);
      } else {
        const error = await response.json();
        setMessage(error.message || 'Failed to update password');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setMessage('An error occurred while updating password');
      setMessageType('error');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const token = localStorage.getItem('cafestock_token');
    if (!token || !user) return;

    try {
      // 1️⃣ Update username
      const usernameRes = await fetch(`http://localhost:3001/api/users/${user.id}/username`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: newUsername })
      });

      if (!usernameRes.ok) {
        const err = await usernameRes.json();
        setMessage(err.error || 'Failed to update username');
        setMessageType('error');
        return;
      }

      // 2️⃣ Update password (only if provided)
      if (currentPassword && newPassword) {
        if (newPassword !== confirmPassword) {
          setMessage('New passwords do not match');
          setMessageType('error');
          return;
        }

        const passwordRes = await fetch(`http://localhost:3001/api/users/${user.id}/password`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!passwordRes.ok) {
          const err = await passwordRes.json();
          setMessage(err.error || 'Failed to update password');
          setMessageType('error');
          return;
        }
      }

      setMessage('Profile updated successfully');
      setMessageType('success');
      setIsEditing(false);
      fetchUserProfile(token, user.id); // refresh displayed data
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('An error occurred while saving changes');
      setMessageType('error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeSinceLastLogin = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(dateString);
  };

  if (isLoading || !user) {
    return (
      <div className="profile-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="profile-content">
        <div className="profile-inner">
          <div className="profile-header">
            <div>
              <h1 className="profile-title">Profile</h1>
              <p className="profile-subtitle">Manage your account settings and information</p>
            </div>
          </div>

          <div className="profile-card">
            <div className="card-header">
              <div className="card-header-content">
                <User className="card-icon" />
                <h2 className="card-title">Profile Information</h2>
              </div>
              <p className="card-description">Your account details and personal information</p>
            </div>

            {!isEditing ? (
              <>
                <div className="profile-display">
                  <div className="profile-avatar">
                    <span className="avatar-text">
                      {user.username.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="profile-info">
                    <div className="info-main">
                      <h3 className="username-display">{user.username}</h3>
                      <span className="role-badge">{user.role}</span>
                    </div>
                    <p className="username-label">@{user.username}</p>
                  </div>
                </div>

                <div className="info-grid">
                  <div className="info-item">
                    <label className="info-label">Username</label>
                    <div className="info-value">
                      <User className="info-icon" />
                      <span>@{user.username}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">Join Date</label>
                    <div className="info-value">
                      <Calendar className="info-icon" />
                      <span>{formatDate(user.created_at)}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <label className="info-label">Last Login</label>
                    <div className="info-value">
                      <Activity className="info-icon" />
                      <span>{getTimeSinceLastLogin(user.updated_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="button-group">
                  <button
                    className="edit-button"
                    onClick={() => setIsEditing(true)}
                  >
                    <Lock className="button-icon" />
                    Edit Profile
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSaveChanges} className="password-form">
                <div className="form-section">
                  <h3 className="form-section-title">Change Password</h3>
                  
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter new username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        className="form-input"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          className="form-input"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          className="form-input"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {message && (
                  <div className={`message ${messageType}`}>
                    {message}
                  </div>
                )}

                <div className="button-group">
                  <button type="submit" className="save-button">
                    Save Changes
                  </button>
                  <button type="button" className="cancel-button" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;