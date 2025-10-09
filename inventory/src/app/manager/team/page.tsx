"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { Users, Plus, Trash2, Calendar } from 'lucide-react';
import './team.css';

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

interface Barista {
  id: number;
  username: string;
  created_at: string;
}

const TeamManagement = () => {
  const [activeTab, setActiveTab] = useState('team');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [baristas, setBaristas] = useState<Barista[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cafestock_token');
    const userStr = localStorage.getItem('cafestock_user');

    if (!token || !userStr) {
      window.location.href = '/';
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      if (userData.role !== 'manager') {
        window.location.href = `/${userData.role}/dashboard/`;
        return;
      }

      fetchBaristas(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
      return;
    }
  }, []);

  const fetchBaristas = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/users/baristas', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: Barista[] = await response.json();
        setBaristas(data);
      }
    } catch (error) {
      console.error('Error fetching baristas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBarista = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const token = localStorage.getItem('cafestock_token');
    
    try {
      const response = await fetch('http://localhost:3001/api/users/baristas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewUsername('');
        setNewPassword('');
        fetchBaristas(token!);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create barista account');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBarista = async (id: number) => {
    if (!confirm('Are you sure you want to delete this barista account?')) {
      return;
    }

    const token = localStorage.getItem('cafestock_token');
    
    try {
      const response = await fetch(`http://localhost:3001/api/users/baristas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchBaristas(token!);
      } else {
        alert('Failed to delete barista account');
      }
    } catch (error) {
      console.error('Error deleting barista:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric' 
    });
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  if (isLoading || !user) {
    return (
      <div className="team-container">
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
    <div className="team-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="team-content">
        <div className="team-inner">
          <div className="team-header">
            <div>
              <h1 className="team-title">Team Management</h1>
              <p className="team-subtitle">Manage barista accounts and permissions</p>
            </div>
            <button 
              className="add-barista-button"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="button-icon" />
              Add Barista
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <h3 className="section-title">Total Baristas</h3>
                <Users className="stat-icon" />
              </div>
              <p className="stat-value">{baristas.length}</p>
              <p className="stat-description">All team members</p>
            </div>
          </div>

          <div className="team-members-section">
            <div className="section-header">
              <Users className="section-icon" />
              <h2 className="section-title">Team Members</h2>
            </div>
            <p className="section-description">Manage your barista team accounts and permissions</p>
            
            <div className="members-list">
              {baristas.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                  No baristas yet. Click "Add Barista" to create an account.
                </p>
              ) : (
                baristas.map((barista) => (
                  <div key={barista.id} className="member-card">
                    <div className="member-avatar">
                      {getInitials(barista.username)}
                    </div>
                    <div className="member-info">
                      <h3 className="member-name">{barista.username}</h3>
                      <p className="member-username">@{barista.username}</p>
                      <div className="member-meta">
                        <Calendar className="meta-icon" />
                        <span>Created: {formatDate(barista.created_at)}</span>
                      </div>
                    </div>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteBarista(barista.id)}
                      title="Delete barista"
                    >
                      <Trash2 className="delete-icon" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Add New Barista</h2>
                <p className="modal-subtitle">Create a new account for a barista team member</p>
              </div>
              <button 
                className="close-button"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            <div>
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., john_barista"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Create a secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  minLength={6}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="create-button"
                  onClick={handleAddBarista}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;