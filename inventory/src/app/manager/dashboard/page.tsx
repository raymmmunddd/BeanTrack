// manager dashboard.tsx

"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { Package, Plus, AlertTriangle, Clock, Users, X } from 'lucide-react';
import './dashboard.css';

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  current_quantity: number;
  unit: string;
  min_threshold: number;
  max_threshold: number;
  status: 'healthy' | 'medium' | 'low' | 'out';
}

interface Transaction {
  id: number;
  item_name: string;
  transaction_type: 'usage' | 'restock' | 'adjustment' | 'update' | 'delete';
  quantity: number;
  unit_name: string;
  notes: string;
  created_at: string;
  username: string;
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [baristaCount, setBaristaCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Transaction[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmSignOut = () => {
    localStorage.removeItem('cafestock_token');
    localStorage.removeItem('cafestock_user');
    setShowLogoutModal(false);
    window.location.href = 'http://localhost:3000/';
  };

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

      fetchInventoryData(token);
      fetchBaristaCount(token);
      fetchRecentActivity(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
      return;
    }
  }, []);

  useEffect(() => {
    window.history.pushState({ page: "dashboard" }, "", window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      const currentPath = window.location.pathname;
      if (currentPath.includes("/barista/dashboard") || currentPath.includes("/manager/dashboard")) {
        setShowLogoutModal(true);

        window.history.pushState({ page: "dashboard" }, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const fetchBaristaCount = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/users/baristas/count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBaristaCount(data.total);
      }
    } catch (error) {
      console.error('Error fetching barista count:', error);
    }
  };

  const fetchInventoryData = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: InventoryItem[] = await response.json();
        setTotalItems(data.length);
        
        const alertItems = data.filter(item => 
          item.status === 'low' || item.status === 'out'
        );
        setLowStockItems(alertItems);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivity = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/inventory/recent-activity-all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: Transaction[] = await response.json();
        setRecentActivity(data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const getAlertColor = () => {
    const alertCount = lowStockItems.length;
    if (alertCount === 0) return '#170d03';
    if (alertCount < 3) return '#e1bc42';
    return '#dc2626';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      healthy: { color: '#16a34a', label: 'Healthy' },
      medium: { color: '#e1bc42', label: 'Medium' },
      low: { color: '#eb912c', label: 'Low Stock' },
      out: { color: '#dc2626', label: 'Out of Stock' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges.healthy;
    
    return (
      <span className="status-badge" style={{ color: badge.color, backgroundColor: `${badge.color}15` }}>
        <AlertTriangle className="badge-icon" />
        {badge.label}
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getTransactionText = (transaction: Transaction) => {
    const type = transaction.transaction_type;
    const qty = transaction.quantity;
    const item = transaction.item_name;
    const unit = transaction.unit_name;
    const name = transaction.username;
    
    if (type === 'usage') {
      return `${name} used ${qty} ${unit}(s) of ${item}`;
    } else if (type === 'restock') {
      return `${name} restocked ${qty} units of ${item}`;
    } else if (type === 'update') {
      return `${name} updated ${qty} units of ${item}`;
    } else if (type === 'delete') {
      return `${name} deleted ${qty} units of ${item}`;
    } else {
      return `${name} adjusted ${item} stock by ${qty} units`;
    }
  };

  if (isLoading || !user) {
    return (
      <div className="dashboard-container">
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
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="dashboard-content">
        <div className="dashboard-inner">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Welcome back, Manager!</h1>
              <p className="dashboard-subtitle">Here's your cafe inventory overview</p>
            </div>
            <button 
              className="log-usage-button"
              onClick={() => (window.location.href = "/manager/add-item/")}
            >
              <Plus className="button-icon" />
              Add Item
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <h3 className="section-title">Total Items</h3>
                <Package className="stat-icon" />
              </div>
              <p className="stat-value">{totalItems}</p>
              <p className="stat-description">Active inventory items</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <h3 className="section-title">Stock Alerts</h3>
                <AlertTriangle className="stat-icon" style={{ color: getAlertColor() }} />
              </div>
              <p className="stat-value" style={{ color: getAlertColor() }}>
                {lowStockItems.length}
              </p>
              <p className="stat-description">
                {lowStockItems.length === 0 
                  ? 'All items well stocked' 
                  : lowStockItems.length < 3 
                    ? 'Items need attention' 
                    : 'Items require immediate attention'}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <h3 className="section-title">Team Members</h3>
                <Users className="stat-icon" />
              </div>
              <p className="stat-value">{baristaCount}</p>
              <p className="stat-description">Your current staff</p>
            </div>
          </div>

          <div className="content-grid">
            <div className="low-stock-section">
              <div className="section-header">
                <AlertTriangle className="section-icon" style={{ color: getAlertColor() }} />
                <h2 className="section-title">Critical Stocks</h2>
              </div>
              <p className="section-description">Items that need immediate attention</p>
              
              <div className="low-stock-list">
                {lowStockItems.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                    No stock alerts at the moment
                  </p>
                ) : (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="low-stock-item" data-status={item.status}>
                      <div>
                        <h3 className="item-name">{item.name}</h3>
                        <p className="item-remaining">
                          {item.current_quantity} {item.unit} remaining 
                          (Min: {item.min_threshold}, Max: {item.max_threshold})
                        </p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="activity-section">
              <div className="section-header">
                <Clock className="section-icon" />
                <h2 className="section-title">Recent Activity</h2>
              </div>
              <p className="section-description">Latest inventory updates and usage</p>
              
              <div className="activity-list">
                {recentActivity.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                    No changes logged yet
                  </p>
                ) : (
                  recentActivity.map((transaction) => (
                    <div key={transaction.id} className="activity-item">
                      <div className="activity-dot"></div>
                      <div className="activity-content">
                        <p className="activity-action">{getTransactionText(transaction)}</p>
                        <div className="activity-meta">
                          <span>{transaction.username || 'System'}</span>
                          <span className="meta-separator"></span>
                          <span>{formatTimeAgo(transaction.created_at)}</span>
                          {transaction.notes && (
                            <>
                              <span className="meta-separator"></span>
                              <span>{transaction.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Sign Out</h3>
              <button className="modal-close-button" onClick={() => setShowLogoutModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="logout-warning">Are you sure you want to sign out?</p>
              <p className="logout-subtext">You’ll need to log in again to access your account.</p>
            </div>

            <div className="modal-footer">
              <button
                className="modal-button cancel-button"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button logout-confirm-button"
                onClick={confirmSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;