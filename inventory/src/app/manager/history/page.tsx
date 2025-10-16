// history/page.tsx

"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { History, Download, Search, Filter, Calendar } from 'lucide-react';
import './history.css';

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

interface Transaction {
  id: number;
  item_name: string | null;
  recipe_name: string | null;
  transaction_type: 'usage' | 'restock' | 'adjustment' | 'update' | 'delete' | 'added' | 'archive' | 'restore' | 'password_reset' | 'username_change';
  quantity: number | null;
  unit_name: string | null;
  notes: string;
  created_at: string;
  username: string;
}

const ActivityHistory = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<Transaction[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Transaction[]>([]);

  const API_BASE_URL = 'https://beantrack-esht.onrender.com';
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [users, setUsers] = useState<string[]>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

      fetchActivities(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
      return;
    }
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [activities, searchQuery, selectedUser, selectedType, dateRange]);

  const fetchActivities = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/transactions/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: Transaction[] = await response.json();
        setActivities(data);
        
        const uniqueUsers = Array.from(new Set(data.map(t => t.username).filter(Boolean)));
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];

    if (searchQuery) {
      filtered = filtered.filter(activity => 
        (activity.item_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (activity.recipe_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (activity.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (activity.notes?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }

    if (selectedUser !== 'all') {
      filtered = filtered.filter(activity => activity.username === selectedUser);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(activity => activity.transaction_type === selectedType);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(activity => 
        new Date(activity.created_at) >= cutoffDate
      );
    }

    setFilteredActivities(filtered);
  };

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportHistory = () => {
    const csvContent = [
      ['Date', 'Time', 'User', 'Action', 'Item/Recipe', 'Quantity', 'Unit', 'Notes'],
      ...filteredActivities.map(activity => [
        formatDate(activity.created_at),
        formatTime(activity.created_at),
        activity.username,
        activity.transaction_type,
        activity.item_name || activity.recipe_name || 'N/A',
        activity.quantity || 'N/A',
        activity.unit_name || 'N/A',
        activity.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  const getTransactionBadge = (type: string) => {
    const badges = {
      usage: { color: '#dc2626', label: 'Usage' },
      restock: { color: '#16a34a', label: 'Restock' },
      adjustment: { color: '#2563eb', label: 'Adjustment' },
      update: { color: '#e1bc42', label: 'Update' },
      delete: { color: '#ef4444', label: 'Delete' },
      added: { color: '#775932', label: 'Add' },
      archive: { color: '#f97316', label: 'Archive' },
      restore: { color: '#10b981', label: 'Restore' },
      password_reset: { color: '#8b5cf6', label: 'Password Reset' },
      username_change: { color: '#06b6d4', label: 'Username Change' }
    };
    
    const badge = badges[type as keyof typeof badges] || badges.adjustment;
    
    return (
      <span className="transaction-badge" style={{ backgroundColor: badge.color }}>
        {badge.label}
      </span>
    );
  };

  const getTransactionText = (transaction: Transaction) => {
    const type = transaction.transaction_type;
    const qty = transaction.quantity;
    const item = transaction.item_name;
    const recipe = transaction.recipe_name;
    const unit = transaction.unit_name;
    
    // User-related transactions
    if (type === 'password_reset') {
      return transaction.notes || 'Password reset';
    }
    
    if (type === 'username_change') {
      return transaction.notes || 'Username changed';
    }
    
    // Recipe-related transactions
    if (recipe) {
      if (type === 'usage') {
        return `Used recipe: ${recipe}`;
      } else if (type === 'added') {
        return `Added new recipe: ${recipe}`;
      } else if (type === 'update') {
        return `Updated recipe: ${recipe}`;
      } else if (type === 'archive') {
        return `Archived recipe: ${recipe}`;
      } else if (type === 'restore') {
        return `Restored recipe: ${recipe}`;
      } else if (type === 'delete') {
        return `Deleted recipe: ${recipe}`;
      }
    }
    
    // Item-related transactions
    if (item) {
      if (type === 'usage') {
        return `Used ${qty} ${unit}(s) of ${item}`;
      } else if (type === 'restock') {
        return `Restocked ${qty} ${unit}(s) of ${item}`;
      } else if (type === 'update') {
        return `Updated ${item} to ${qty} ${unit}(s)`;
      } else if (type === 'delete') {
        return `Deleted ${item}`;
      } else if (type === 'added') {
        return `Added new item: ${item}`;
      } else if (type === 'archive') {
        return `Archived ${item}`;
      } else if (type === 'restore') {
        return `Restored ${item}`;
      } else if (type === 'adjustment') {
        return `Adjusted ${item} stock by ${qty} ${unit}(s)`;
      }
    }
    
    return transaction.notes || 'Activity recorded';
  };

  const getTransactionMeta = (transaction: Transaction) => {
    const meta = [];
    
    meta.push(
      <React.Fragment key="user">
        <span className="meta-label">User:</span>
        <span className="meta-value">{transaction.username}</span>
      </React.Fragment>
    );
    
    if (transaction.item_name) {
      meta.push(
        <React.Fragment key="item">
          <span className="meta-separator"></span>
          <span className="meta-label">Item:</span>
          <span className="meta-value">{transaction.item_name}</span>
        </React.Fragment>
      );
    }
    
    if (transaction.recipe_name) {
      meta.push(
        <React.Fragment key="recipe">
          <span className="meta-separator"></span>
          <span className="meta-label">Recipe:</span>
          <span className="meta-value">{transaction.recipe_name}</span>
        </React.Fragment>
      );
    }
    
    if (transaction.quantity !== null && transaction.unit_name) {
      meta.push(
        <React.Fragment key="quantity">
          <span className="meta-separator"></span>
          <span className="meta-label">Quantity:</span>
          <span className="meta-value">{transaction.quantity} {transaction.unit_name}</span>
        </React.Fragment>
      );
    }
    
    return meta;
  };

  if (isLoading || !user) {
    return (
      <div className="activity-container">
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
    <div className="activity-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="activity-content">
        <div className="activity-inner">
          <div className="activity-header">
            <div>
              <h1 className="activity-title">Activity History</h1>
              <p className="activity-subtitle">Track all inventory changes and user activities</p>
            </div>
          </div>

          <div className="filters-card">
            <div className="filters-header">
              <Filter className="filter-icon" />
              <h3 className="filters-title">Filters</h3>
            </div>
            
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">Search</label>
                <div className="search-input-wrapper">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">User</label>
                <select
                  className="filter-select"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="all">All Users</option>
                  {users.map(username => (
                    <option key={username} value={username}>{username}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Action Type</label>
                <select
                  className="filter-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="usage">Usage</option>
                  <option value="restock">Restock</option>
                  <option value="added">Add</option>
                  <option value="update">Update</option>
                  <option value="archive">Archive</option>
                  <option value="restore">Restore</option>
                  <option value="delete">Delete</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Date Range</label>
                <select
                  className="filter-select"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>

          <div className="results-info">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} activities
          </div>

          <div className="timeline-card">
            <div className="timeline-header">
              <History className="timeline-icon" />
              <h2 className="timeline-title">Activity Timeline</h2>
            </div>
            <p className="timeline-subtitle">Complete history of all inventory activities</p>
            
            <div className="timeline-list">
              {filteredActivities.length === 0 ? (
                <p className="no-activities">
                  No activities found matching your filters
                </p>
              ) : (
                paginatedActivities.map((activity) => (
                  <div key={activity.id} className="timeline-item">
                    <div className="timeline-marker">
                      <div className="timeline-dot"></div>
                    </div>
                    
                    <div className="timeline-content">
                      <div className="timeline-main">
                        <div className="timeline-info">
                          {getTransactionBadge(activity.transaction_type)}
                          <span className="timeline-date">{formatDate(activity.created_at)}</span>
                          <span className="timeline-time">{formatTime(activity.created_at)}</span>
                        </div>
                        
                        <h3 className="timeline-action">{getTransactionText(activity)}</h3>
                        
                        <div className="timeline-meta">
                          {getTransactionMeta(activity)}
                        </div>
                        
                        {activity.notes && (
                          <div className="timeline-notes">
                            <span className="notes-label">Notes:</span>
                            <span className="notes-text">{activity.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredActivities.length > 0 && totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                
                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          className={`pagination-number ${page === currentPage ? 'active' : ''}`}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button 
                  className="pagination-button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory;
