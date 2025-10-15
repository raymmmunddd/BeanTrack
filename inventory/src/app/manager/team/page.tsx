"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { Users, Plus, Trash2, Calendar, Edit, Clock, Eye, EyeOff, CheckCircle, AlertCircle, X } from 'lucide-react';
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
  last_login?: string;
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBarista, setSelectedBarista] = useState<Barista | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [baristaToDelete, setBaristaToDelete] = useState<Barista | null>(null);

  const API_BASE_URL = 'https://beantrack-esht.onrender.com';
  
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
      const response = await fetch('${API_BASE_URL}/api/users/baristas', {
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

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return {
      isValid: hasUpperCase && hasLowerCase && hasNumber && hasSymbol && password.length >= 12,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSymbol,
      hasLength: password.length >= 12
    };
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    
    const validation = validatePassword(password);
    let strength = 0;
    
    if (validation.hasLength) strength++;
    if (validation.hasUpperCase) strength++;
    if (validation.hasLowerCase) strength++;
    if (validation.hasNumber) strength++;
    if (validation.hasSymbol) strength++;
    
    if (strength <= 2) return { strength: 1, label: 'Weak', color: '#dc2626' };
    if (strength <= 4) return { strength: 2, label: 'Medium', color: '#f59e0b' };
    return { strength: 3, label: 'Strong', color: '#10b981' };
  };

  const handleAddBarista = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newUsername || !newPassword) {
      setError('Username and password are required');
      return;
    }

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError('Password must include uppercase, lowercase, number, and symbol');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('cafestock_token');
    
    try {
      const response = await fetch('${API_BASE_URL}/api/users/baristas', {
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
        setSuccessMessage(`Barista account "${newUsername}" created successfully!`);
        setShowSuccessModal(true);
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

  const handleDeleteBarista = async () => {
    if (!baristaToDelete) return;

    const token = localStorage.getItem('cafestock_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/baristas/${baristaToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        fetchBaristas(token!);
        setSuccessMessage(`Barista account "${baristaToDelete.username}" deleted successfully!`);
        setShowSuccessModal(true);
        setBaristaToDelete(null);
      } else {
        alert('Failed to delete barista account');
      }
    } catch (error) {
      console.error('Error deleting barista:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleEditBarista = async () => {
    setIsSubmitting(true);
    setError('');

    // Validate password if provided
    if (editPassword.trim().length > 0) {
      if (editPassword.length < 12) {
        setError('Password must be at least 12 characters');
        setIsSubmitting(false);
        return;
      }

      const validation = validatePassword(editPassword);
      if (!validation.isValid) {
        setError('Password must include uppercase, lowercase, number, and symbol');
        setIsSubmitting(false);
        return;
      }
    }

    const token = localStorage.getItem('cafestock_token');

    try {
      // Update username first if changed
      if (editUsername !== selectedBarista?.username) {
        const resUsername = await fetch(`${API_BASE_URL}/api/users/baristas/${selectedBarista?.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: editUsername })
        });

        if (!resUsername.ok) {
          const data = await resUsername.json();
          throw new Error(data.error || 'Failed to update username');
        }
      }

      // Update password if provided
      if (editPassword.trim().length > 0) {
        const resPassword = await fetch(`${API_BASE_URL}/api/users/baristas/${selectedBarista?.id}/password`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newPassword: editPassword })
        });

        if (!resPassword.ok) {
          const data = await resPassword.json();
          throw new Error(data.error || 'Failed to update password');
        }
      }

      setShowEditModal(false);
      setEditPassword('');
      fetchBaristas(token!);
      setSuccessMessage(`Barista account "${editUsername}" updated successfully!`);
      setShowSuccessModal(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
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

  const newPasswordStrength = getPasswordStrength(newPassword);
  const editPasswordStrength = getPasswordStrength(editPassword);

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
                      <div className="member-meta">
                        <Clock className="meta-icon" />
                        <span>
                          Last login: {barista.last_login ? formatDate(barista.last_login) : 'Never'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="edit-button"
                      onClick={() => {
                        setSelectedBarista(barista);
                        setEditUsername(barista.username);
                        setEditPassword('');
                        setShowEditModal(true);
                      }}
                      title="Edit barista"
                    >
                      <Edit className="edit-icon" />
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => {
                        setBaristaToDelete(barista);
                        setShowDeleteModal(true);
                      }}
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
      
      {/* Add Barista Modal */}
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
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-input"
                    style={{ paddingRight: '2.5rem' }}
                    placeholder="Create a secure password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '0.25rem'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {newPassword && (
                  <>
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '0.25rem', 
                        marginBottom: '0.5rem' 
                      }}>
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            style={{
                              flex: 1,
                              height: '4px',
                              backgroundColor: level <= newPasswordStrength.strength 
                                ? newPasswordStrength.color 
                                : '#e5e7eb',
                              borderRadius: '2px',
                              transition: 'all 0.3s'
                            }}
                          />
                        ))}
                      </div>
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: newPasswordStrength.color,
                        fontWeight: '500'
                      }}>
                        {newPasswordStrength.label}
                      </p>
                    </div>
                    
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Password must contain:</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(newPassword).hasLength ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>At least 12 characters</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(newPassword).hasUpperCase ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Uppercase letter (A-Z)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(newPassword).hasLowerCase ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Lowercase letter (a-z)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(newPassword).hasNumber ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Number (0-9)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {validatePassword(newPassword).hasSymbol ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Special character (!@#$%...)</span>
                      </div>
                    </div>
                  </>
                )}
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

      {/* Edit Barista Modal */}
      {showEditModal && selectedBarista && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Barista</h2>
              <button className="close-button" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? "text" : "password"}
                    className="form-input"
                    style={{ paddingRight: '2.5rem' }}
                    placeholder="Leave blank to keep current password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '0.25rem'
                    }}
                  >
                    {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {editPassword && (
                  <>
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '0.25rem', 
                        marginBottom: '0.5rem' 
                      }}>
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            style={{
                              flex: 1,
                              height: '4px',
                              backgroundColor: level <= editPasswordStrength.strength 
                                ? editPasswordStrength.color 
                                : '#e5e7eb',
                              borderRadius: '2px',
                              transition: 'all 0.3s'
                            }}
                          />
                        ))}
                      </div>
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: editPasswordStrength.color,
                        fontWeight: '500'
                      }}>
                        {editPasswordStrength.label}
                      </p>
                    </div>
                    
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Password must contain:</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(editPassword).hasLength ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>At least 12 characters</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(editPassword).hasUpperCase ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Uppercase letter (A-Z)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(editPassword).hasLowerCase ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Lowercase letter (a-z)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                        {validatePassword(editPassword).hasNumber ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Number (0-9)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {validatePassword(editPassword).hasSymbol ? 
                          <CheckCircle size={14} color="#10b981" /> : 
                          <AlertCircle size={14} color="#6b7280" />
                        }
                        <span>Special character (!@#$%...)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="create-button"
                  onClick={handleEditBarista}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && baristaToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Barista</h2>
              <button className="close-button" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                Are you sure you want to delete the barista account <strong>"{baristaToDelete.username}"</strong>? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setBaristaToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="delete-button"
                  style={{ padding: '0.75rem 1.5rem' }}
                  onClick={handleDeleteBarista}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '1rem', 
                backgroundColor: '#d1fae5', 
                borderRadius: '50%',
                marginBottom: '1rem'
              }}>
                <CheckCircle size={48} color="#10b981" />
              </div>
              <h2 className="modal-title" style={{ marginBottom: '0.5rem' }}>Success!</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                {successMessage}
              </p>
              <button
                type="button"
                className="create-button"
                onClick={() => setShowSuccessModal(false)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
