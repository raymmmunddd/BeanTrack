"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { User, Lock, Calendar, Activity, Eye, EyeOff, CheckCircle } from 'lucide-react';
import './profile.css';

interface UserData {
  id: number;
  username: string;
  role: 'manager' | 'barista';
  created_at: string;
  updated_at: string;
}

// Password validation function (same as auth.js)
const validatePassword = (password: string) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSymbol;
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
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
      fetchUserProfile(token, userData.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
    }
  }, []);

  const fetchUserProfile = async (token: string, userId: number) => {
    try {
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

  const clearForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
    if (user) {
      setNewUsername(user.username);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    clearForm();
  };

  const isFormChanged = () => {
    if (!user) return false;
    
    const usernameChanged = newUsername !== user.username;
    const passwordProvided = currentPassword || newPassword || confirmPassword;
    
    return usernameChanged || passwordProvided;
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const token = localStorage.getItem('cafestock_token');
    if (!token || !user) return;

    // Validate password if provided
    if (newPassword) {
      if (newPassword.length < 12) {
        setMessage('Password must be at least 12 characters');
        setMessageType('error');
        return;
      }

      if (!validatePassword(newPassword)) {
        setMessage('Password must include uppercase, lowercase, number, and symbol');
        setMessageType('error');
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage('New passwords do not match');
        setMessageType('error');
        return;
      }

      if (!currentPassword) {
        setMessage('Current password is required to change password');
        setMessageType('error');
        return;
      }
    }

    try {
      // 1️⃣ Update username if changed
      if (newUsername !== user.username) {
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

        // Update localStorage with new username
        const userStr = localStorage.getItem('cafestock_user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userData.username = newUsername;
          localStorage.setItem('cafestock_user', JSON.stringify(userData));
        }
      }

      // 2️⃣ Update password if provided
      if (currentPassword && newPassword) {
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

      // Success - show modal
      setShowSuccessModal(true);
      setIsEditing(false);
      clearForm();
      
      // Refresh user data
      fetchUserProfile(token, user.id);
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
          fontSize: '16px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
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
                  <h3 className="form-section-title">Update Profile</h3>
                  
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter new username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
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
                      <p className="form-hint">
                        Min 12 chars, uppercase, lowercase, number, symbol
                      </p>
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

                {message && messageType === 'error' && (
                  <div className="message error">
                    {message}
                  </div>
                )}

                <div className="button-group">
                  <button 
                    type="submit" 
                    className="save-button"
                    disabled={!isFormChanged()}
                  >
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="profile-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-icon">
              <CheckCircle size={48} />
            </div>
            <h3 className="profile-modal-title">Profile Updated</h3>
            <p className="profile-modal-message">
              Your profile has been updated successfully.
            </p>
            <button 
              className="profile-modal-button"
              onClick={() => setShowSuccessModal(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;