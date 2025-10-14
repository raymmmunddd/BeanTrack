// archive.tsx

"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { Archive, RefreshCw, Trash2, AlertTriangle, Package, Coffee, Users, Clock } from 'lucide-react';
import './archive.css';

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

interface ArchivedItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  current_quantity: number;
  min_threshold: number;
  max_threshold: number;
  description: string;
  deleted_at: string;
  days_until_deletion: number;
}

interface ArchivedRecipe {
  id: number;
  name: string;
  deleted_at: string;
  days_until_deletion: number;
  ingredients: Array<{
    item_id: number;
    item_name: string;
    quantity: number;
    unit: string;
  }>;
}

interface ArchivedUser {
  id: number;
  username: string;
  role: string;
  created_at: string;
  deleted_at: string;
  days_until_deletion: number;
}

const ArchiveManager = () => {
  const [activeTab, setActiveTab] = useState('archive');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [archiveTab, setArchiveTab] = useState<'items' | 'recipes' | 'users'>('items');
  
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [archivedRecipes, setArchivedRecipes] = useState<ArchivedRecipe[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>([]);

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

      fetchArchived(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
    }
  }, []);

  const fetchArchived = async (token: string) => {
    setIsLoading(true);
    try {
      const [itemsRes, recipesRes, usersRes] = await Promise.all([
        fetch('http://localhost:3001/api/inventory/archived', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/recipes/archived', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/users/baristas/archived', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setArchivedItems(data);
      }
      if (recipesRes.ok) {
        const data = await recipesRes.json();
        setArchivedRecipes(data);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setArchivedUsers(data);
      }
    } catch (error) {
      console.error('Error fetching archived data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (type: 'item' | 'recipe' | 'user', id: number, name: string) => {
    if (!confirm(`Restore "${name}" from archive?`)) return;

    const token = localStorage.getItem('cafestock_token');
    if (!token) return;

    const endpoints = {
      item: `http://localhost:3001/api/inventory/${id}/restore`,
      recipe: `http://localhost:3001/api/recipes/${id}/restore`,
      user: `http://localhost:3001/api/users/baristas/${id}/restore`
    };

    try {
      const response = await fetch(endpoints[type], {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully`);
        fetchArchived(token);
      } else {
        const error = await response.json();
        alert(`Failed to restore: ${error.error}`);
      }
    } catch (error) {
      console.error('Error restoring:', error);
      alert('Server error restoring item');
    }
  };

  const handlePermanentDelete = async (type: 'item' | 'recipe' | 'user', id: number, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${name}"? This action cannot be undone!`)) {
      return;
    }

    const token = localStorage.getItem('cafestock_token');
    if (!token) return;

    const endpoints = {
      item: `http://localhost:3001/api/inventory/${id}/permanent`,
      recipe: `http://localhost:3001/api/recipes/${id}/permanent`,
      user: `http://localhost:3001/api/users/baristas/${id}/permanent`
    };

    try {
      const response = await fetch(endpoints[type], {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted`);
        fetchArchived(token);
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Server error deleting item');
    }
  };

  const handleAutoCleanup = async () => {
    if (!confirm('This will permanently delete all items that have been in the archive for more than 30 days. Continue?')) {
      return;
    }

    const token = localStorage.getItem('cafestock_token');
    if (!token) return;

    try {
      const [itemsRes, recipesRes, usersRes] = await Promise.all([
        fetch('http://localhost:3001/api/inventory/cleanup-archived', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/recipes/cleanup-archived', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/users/cleanup-archived', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const results = await Promise.all([
        itemsRes.ok ? itemsRes.json() : null,
        recipesRes.ok ? recipesRes.json() : null,
        usersRes.ok ? usersRes.json() : null
      ]);

      const totalDeleted = (results[0]?.items_deleted || 0) + 
                          (results[1]?.recipes_deleted || 0) + 
                          (results[2]?.users_deleted || 0);

      alert(`Cleanup completed! ${totalDeleted} item(s) permanently deleted.`);
      fetchArchived(token);
    } catch (error) {
      console.error('Error during cleanup:', error);
      alert('Server error during cleanup');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getDaysUntilDeletionBadge = (days: number) => {
    if (days <= 0) {
      return <span className="days-badge critical">Delete Today</span>;
    } else if (days <= 7) {
      return <span className="days-badge warning">{days} days left</span>;
    } else {
      return <span className="days-badge safe">{days} days left</span>;
    }
  };

  if (isLoading || !user) {
    return (
      <div className="archive-container">
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

  const currentData = archiveTab === 'items' ? archivedItems : 
                      archiveTab === 'recipes' ? archivedRecipes : 
                      archivedUsers;

  return (
    <div className="archive-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="archive-content">
        <div className="archive-inner">
          <div className="archive-header">
            <div>
              <h1 className="archive-title">Archive Manager</h1>
              <p className="archive-subtitle">Manage archived items, recipes, and user accounts</p>
            </div>
            <button 
              className="cleanup-button"
              onClick={handleAutoCleanup}
            >
              <Trash2 className="button-icon" />
              Auto Cleanup (30+ days)
            </button>
          </div>

          <div className="tabs-card">
            <div className="tabs-header">
              <button 
                className={`tab-button ${archiveTab === 'items' ? 'active' : ''}`}
                onClick={() => setArchiveTab('items')}
              >
                <Package className="tab-icon" />
                Items ({archivedItems.length})
              </button>
              <button 
                className={`tab-button ${archiveTab === 'recipes' ? 'active' : ''}`}
                onClick={() => setArchiveTab('recipes')}
              >
                <Coffee className="tab-icon" />
                Recipes ({archivedRecipes.length})
              </button>
              <button 
                className={`tab-button ${archiveTab === 'users' ? 'active' : ''}`}
                onClick={() => setArchiveTab('users')}
              >
                <Users className="tab-icon" />
                Users ({archivedUsers.length})
              </button>
            </div>
          </div>

          <div className="archive-info-banner">
            <AlertTriangle className="info-icon" />
            <div>
              <strong>Auto-deletion Policy:</strong> Archived items will be permanently deleted after 30 days. 
              Items with less than 7 days remaining are highlighted in orange.
            </div>
          </div>

          <div className="archive-list-card">
            <div className="archive-list-header">
              <Archive className="list-icon" />
              <h2 className="list-title">
                Archived {archiveTab.charAt(0).toUpperCase() + archiveTab.slice(1)}
              </h2>
            </div>
            
            {currentData.length === 0 ? (
              <p className="no-archived-items">
                No archived {archiveTab} found
              </p>
            ) : (
              <div className="archived-items-list">
                {archiveTab === 'items' && archivedItems.map((item) => (
                  <div key={item.id} className="archived-item">
                    <div className="item-main-info">
                      <div className="item-header">
                        <h3 className="item-name">{item.name}</h3>
                        {getDaysUntilDeletionBadge(item.days_until_deletion)}
                      </div>
                      
                      <div className="item-meta">
                        <span className="meta-label">Category:</span>
                        <span className="meta-value">{item.category}</span>
                        <span className="meta-separator"></span>
                        <span className="meta-label">Stock:</span>
                        <span className="meta-value">{item.current_quantity} {item.unit}</span>
                        <span className="meta-separator"></span>
                        <span className="meta-label">Archived:</span>
                        <span className="meta-value">{formatDate(item.deleted_at)} at {formatTime(item.deleted_at)}</span>
                      </div>

                      {item.description && (
                        <p className="item-description">{item.description}</p>
                      )}
                    </div>

                    <div className="item-actions">
                      <button 
                        className="action-button restore"
                        onClick={() => handleRestore('item', item.id, item.name)}
                      >
                        <RefreshCw className="action-icon" />
                        Restore
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={() => handlePermanentDelete('item', item.id, item.name)}
                      >
                        <Trash2 className="action-icon" />
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                ))}

                {archiveTab === 'recipes' && archivedRecipes.map((recipe) => (
                  <div key={recipe.id} className="archived-item">
                    <div className="item-main-info">
                      <div className="item-header">
                        <h3 className="item-name">{recipe.name}</h3>
                        {getDaysUntilDeletionBadge(recipe.days_until_deletion)}
                      </div>
                      
                      <div className="item-meta">
                        <span className="meta-label">Ingredients:</span>
                        <span className="meta-value">{recipe.ingredients.length} item(s)</span>
                        <span className="meta-separator"></span>
                        <span className="meta-label">Archived:</span>
                        <span className="meta-value">{formatDate(recipe.deleted_at)} at {formatTime(recipe.deleted_at)}</span>
                      </div>

                      <div className="recipe-ingredients">
                        {recipe.ingredients.map((ing, idx) => (
                          <span key={idx} className="ingredient-tag">
                            {ing.item_name}: {ing.quantity} {ing.unit}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="item-actions">
                      <button 
                        className="action-button restore"
                        onClick={() => handleRestore('recipe', recipe.id, recipe.name)}
                      >
                        <RefreshCw className="action-icon" />
                        Restore
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={() => handlePermanentDelete('recipe', recipe.id, recipe.name)}
                      >
                        <Trash2 className="action-icon" />
                        Delete Forever
                      </button>
                    </div>
                  </div>
                ))}

                {archiveTab === 'users' && archivedUsers.map((archivedUser) => (
                  <div key={archivedUser.id} className="archived-item">
                    <div className="item-main-info">
                      <div className="item-header">
                        <h3 className="item-name">{archivedUser.username}</h3>
                        {getDaysUntilDeletionBadge(archivedUser.days_until_deletion)}
                      </div>
                      
                      <div className="item-meta">
                        <span className="meta-label">Role:</span>
                        <span className="meta-value">{archivedUser.role}</span>
                        <span className="meta-separator"></span>
                        <span className="meta-label">Created:</span>
                        <span className="meta-value">{formatDate(archivedUser.created_at)}</span>
                        <span className="meta-separator"></span>
                        <span className="meta-label">Archived:</span>
                        <span className="meta-value">{formatDate(archivedUser.deleted_at)} at {formatTime(archivedUser.deleted_at)}</span>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button 
                        className="action-button restore"
                        onClick={() => handleRestore('user', archivedUser.id, archivedUser.username)}
                      >
                        <RefreshCw className="action-icon" />
                        Restore
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={() => handlePermanentDelete('user', archivedUser.id, archivedUser.username)}
                      >
                        <Trash2 className="action-icon" />
                        Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveManager;