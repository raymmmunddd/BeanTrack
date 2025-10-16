"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { Package, Plus, AlertTriangle, Clock, Users, X, XCircle, AlertCircle, CheckCircle, MinusCircle, ShoppingCart, PackagePlus } from 'lucide-react';
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
  ordered?: number;
}

interface Transaction {
  id: number;
  item_name: string;
  transaction_type: 'usage' | 'restock' | 'adjustment' | 'update' | 'delete' | 'added' | 'archive' | 'restore' | 'password_reset' | 'username_change';
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
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showRestockSuccessModal, setShowRestockSuccessModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const API_BASE_URL = 'https://beantrack-esht.onrender.com';

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
      const response = await fetch(`${API_BASE_URL}/api/users/baristas/count`, {
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
      const response = await fetch(`${API_BASE_URL}/api/inventory`, {
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
      const response = await fetch(`${API_BASE_URL}/api/inventory/recent-activity-all`, {
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

  const handleMarkAsOrdered = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowOrderConfirmModal(true);
  };

  const confirmMarkAsOrdered = async () => {
    if (!selectedItem) return;
    
    setIsProcessing(true);
    const token = localStorage.getItem('cafestock_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ordering/${selectedItem.id}/order`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setShowOrderConfirmModal(false);
        setShowOrderSuccessModal(true);
        
        // Refresh inventory data
        if (token) {
          await fetchInventoryData(token);
          await fetchRecentActivity(token);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to mark item as ordered');
      }
    } catch (error) {
      console.error('Error marking item as ordered:', error);
      alert('Failed to mark item as ordered');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestock = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockQuantity('');
    setShowRestockModal(true);
  };

  const confirmRestock = async () => {
    if (!selectedItem || !restockQuantity || parseFloat(restockQuantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    
    setIsProcessing(true);
    const token = localStorage.getItem('cafestock_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ordering/${selectedItem.id}/restock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ current_stock: parseFloat(restockQuantity) })
      });

      if (response.ok) {
        setShowRestockModal(false);
        setShowRestockSuccessModal(true);
        setRestockQuantity('');
        
        // Refresh inventory data
        if (token) {
          await fetchInventoryData(token);
          await fetchRecentActivity(token);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to restock item');
      }
    } catch (error) {
      console.error('Error restocking item:', error);
      alert('Failed to restock item');
    } finally {
      setIsProcessing(false);
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
      healthy: { color: '#16a34a', label: 'Healthy', icon: <CheckCircle className="badge-icon" /> },
      medium: { color: '#e1bc42', label: 'Medium', icon: <MinusCircle className="badge-icon" /> },
      low: { color: '#eb912c', label: 'Low Stock', icon: <AlertCircle className="badge-icon" /> },
      out: { color: '#dc2626', label: 'Out of Stock', icon: <XCircle className="badge-icon" /> }
    };

    const badge = badges[status as keyof typeof badges] || badges.healthy;

    return (
      <span
        className="status-badge"
        style={{
          color: badge.color,
          backgroundColor: `${badge.color}15`
        }}
      >
        {badge.icon}
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
    
    if (!item && transaction.notes) {
      return transaction.notes;
    }
    
    if (type === 'usage' && item && qty && unit) {
      return `${name} used ${qty} ${unit}(s) of ${item}`;
    } else if (type === 'restock' && item && qty) {
      return `${name} restocked ${qty} units of ${item}`;
    } else if (type === 'update' && item) {
      if (qty && unit) {
        return `${name} updated ${item} to ${qty} ${unit}(s)`;
      }
      return `${name} updated ${item}`;
    } else if (type === 'delete' && item) {
      return `${name} deleted ${item}`;
    } else if (type === 'adjustment' && item && qty && unit) {
      return `${name} adjusted ${item} stock by ${qty} ${unit}(s)`;
    } else if (type === 'added' && item) {
      return `${name} added new item: ${item}`;
    } else if (type === 'archive' && item) {
      return `${name} archived ${item}`;
    } else if (type === 'restore' && item) {
      return `${name} restored ${item}`;
    }
    
    return transaction.notes || `${name} performed an action`;
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
              <p className="dashboard-subtitle">Here&apos;s your cafe inventory overview</p>
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
                      <div style={{ flex: 1 }}>
                        <h3 className="item-name">{item.name}</h3>
                        <p className="item-remaining">
                          {item.current_quantity} {item.unit} remaining 
                          (Min: {item.min_threshold}, Max: {item.max_threshold})
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {getStatusBadge(item.status)}
                        {item.ordered === 1 ? (
                          <button
                            className="log-usage-button"
                            style={{ 
                              padding: '0.5rem 1rem', 
                              fontSize: '0.875rem',
                              backgroundColor: '#16a34a'
                            }}
                            onClick={() => handleRestock(item)}
                          >
                            <PackagePlus size={16} />
                            Restock
                          </button>
                        ) : (
                          <button
                            className="log-usage-button"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            onClick={() => handleMarkAsOrdered(item)}
                          >
                            <ShoppingCart size={16} />
                            Mark as Ordered
                          </button>
                        )}
                      </div>
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

      {/* Logout Modal */}
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
              <p className="logout-subtext">You&apos;ll need to log in again to access your account.</p>
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

      {/* Order Confirmation Modal */}
      {showOrderConfirmModal && selectedItem && (
        <div className="modal-overlay" onClick={() => !isProcessing && setShowOrderConfirmModal(false)}>
          <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Order</h3>
              <button 
                className="modal-close-button" 
                onClick={() => !isProcessing && setShowOrderConfirmModal(false)}
                disabled={isProcessing}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="logout-warning">
                Mark &quot;{selectedItem.name}&quot; as ordered?
              </p>
              <p className="logout-subtext">
                This will flag the item as ordered in the system.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="modal-button cancel-button"
                onClick={() => setShowOrderConfirmModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="modal-button logout-confirm-button"
                onClick={confirmMarkAsOrdered}
                disabled={isProcessing}
                style={{ backgroundColor: '#775932' }}
              >
                {isProcessing ? 'Processing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {showOrderSuccessModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowOrderSuccessModal(false)}>
          <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Order Confirmed</h3>
              <button className="modal-close-button" onClick={() => setShowOrderSuccessModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="logout-warning" style={{ color: '#16a34a' }}>
                ✓ Successfully marked as ordered!
              </p>
              <p className="logout-subtext">
                &quot;{selectedItem.name}&quot; has been marked as ordered.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="modal-button logout-confirm-button"
                onClick={() => setShowOrderSuccessModal(false)}
                style={{ backgroundColor: '#16a34a' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="modal-overlay" onClick={() => !isProcessing && setShowRestockModal(false)}>
          <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Restock Item</h3>
              <button 
                className="modal-close-button" 
                onClick={() => !isProcessing && setShowRestockModal(false)}
                disabled={isProcessing}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="logout-warning">
                Restock &quot;{selectedItem.name}&quot;
              </p>
              <p className="logout-subtext" style={{ marginBottom: '1rem' }}>
                Current stock: {selectedItem.current_quantity} {selectedItem.unit}
              </p>
              <div style={{ marginTop: '1rem' }}>
                <label 
                  htmlFor="restock-quantity" 
                  style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#170d03'
                  }}
                >
                  Quantity to Add ({selectedItem.unit})
                </label>
                <input
                  id="restock-quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#f7f2f2ff',
                    color: 'black'
                  }}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-button cancel-button"
                onClick={() => setShowRestockModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="modal-button logout-confirm-button"
                onClick={confirmRestock}
                disabled={isProcessing}
                style={{ backgroundColor: '#16a34a' }}
              >
                {isProcessing ? 'Processing...' : 'Confirm Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Success Modal */}
      {showRestockSuccessModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowRestockSuccessModal(false)}>
          <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Restock Successful</h3>
              <button className="modal-close-button" onClick={() => setShowRestockSuccessModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="logout-warning" style={{ color: '#16a34a' }}>
                ✓ Successfully restocked!
              </p>
              <p className="logout-subtext">
                &quot;{selectedItem.name}&quot; has been restocked with {restockQuantity} {selectedItem.unit}.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="modal-button logout-confirm-button"
                onClick={() => setShowRestockSuccessModal(false)}
                style={{ backgroundColor: '#16a34a' }}
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

export default Dashboard;
