"use client"

import React, { useState, useEffect } from 'react';
import { Home, Package, Plus, Settings, Coffee, LogOut, Menu, History, Users, Download, X, ArchiveX } from 'lucide-react';
import './sidebar.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // Get user data 
    const userStr = localStorage.getItem('cafestock_user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  }, []);

  useEffect(() => {
    // Handle responsive behavior
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmSignOut = () => {
    localStorage.removeItem('cafestock_token');
    localStorage.removeItem('cafestock_user');
    window.location.href = '/';
  };

  const handleNavigation = (itemId: string) => {
    setActiveTab(itemId);
    setIsMobileOpen(false);
    
    if (!user) return;
    
    const basePath = `/${user.role}`;
    
    switch(itemId) {
      case 'dashboard':
        window.location.href = `${basePath}/dashboard/`;
        break;
      case 'inventory':
        window.location.href = `${basePath}/inventory/`;
        break;
      case 'add-item':
        window.location.href = `${basePath}/add-item/`;
        break;
      case 'history':
        window.location.href = `${basePath}/history/`;
        break;
      case 'team':
        window.location.href = `${basePath}/team/`;
        break;
      case 'profile':
        window.location.href = `${basePath}/profile/`;
        break;
      case 'export':
        window.location.href = `${basePath}/export/`;
        break;
      case 'archive':
        window.location.href = `${basePath}/archive/`;
        break;
        default:
        break;
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'add-item', label: 'Add Item', icon: Plus },
    { id: 'history', label: 'History', icon: History },
    { id: 'archive', label: 'Archive', icon: ArchiveX },
    { id: 'team', label: 'Team Management', icon: Users },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  if (!user) {
    return (
      <div className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <Coffee className="logo-icon" />
            </div>
            {!isCollapsed && (
              <div className="brand-info">
                <h1 className="brand-name">Beantrack</h1>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-button"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <Menu className="mobile-menu-icon" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <Coffee className="logo-icon" />
            </div>
            {!isCollapsed && (
              <div className="brand-info">
                <h1 className="brand-name">BeanTrack</h1>
                <div className="brand-meta">
                  <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
                  <span className="meta-dot"></span>
                  <span>{user.username}</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-button desktop-only"
          >
            {isCollapsed ? <Menu className="collapse-icon" /> : <X className="collapse-icon" />}
          </button>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="collapse-button mobile-only"
          >
            <X className="collapse-icon" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {!isCollapsed && (
            <p className="nav-label">Navigation</p>
          )}
          <div className="nav-items">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''} ${isCollapsed ? 'nav-item-collapsed' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className="nav-icon" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={handleSignOutClick}
            className={`signout-button ${isCollapsed ? 'signout-button-collapsed' : ''}`}
            title={isCollapsed ? 'Sign Out' : ''}
          >
            <LogOut className="signout-icon" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Sign Out</h3>
              <button 
                className="modal-close-button"
                onClick={() => setShowLogoutModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="logout-warning">Are you sure you want to sign out?</p>
              <p className="logout-subtext">You will need to log in again to access your account.</p>
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
    </>
  );
};