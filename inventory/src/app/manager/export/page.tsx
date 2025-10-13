// export.tsx

"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { Download, FileText, Calendar, FileSpreadsheet, Package, Users, History, BookOpen } from 'lucide-react';
import './export.css';

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

interface InventoryItem {
  id: number;
  item_name: string;
  category_name: string;
  unit_name: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
}

interface Transaction {
  id: number;
  item_name: string;
  transaction_type: string;
  quantity: number;
  unit_name: string;
  notes: string;
  created_at: string;
  username: string;
}

interface TeamMember {
  id: number;
  username: string;
  role: string;
  created_at: string;
  last_login: string;
}

const ExportData = () => {
  const [activeTab, setActiveTab] = useState('export');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Export options state
  const [selectedExport, setSelectedExport] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [dateRange, setDateRange] = useState('all');
  
  // Preview data state
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

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
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
      return;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExport) {
      fetchPreviewData();
    } else {
      setPreviewData([]);
      setPreviewHeaders([]);
    }
  }, [selectedExport, dateRange]);

  const fetchPreviewData = async () => {
    const token = localStorage.getItem('cafestock_token');
    if (!token) return;

    try {
      let endpoint = '';
      let headers: string[] = [];
      
  switch (selectedExport) {
    case 'inventory':
      endpoint = 'http://localhost:3001/api/export?type=inventory';
      headers = ['Item Name', 'Category', 'Current Stock', 'Unit', 'Min Stock', 'Max Stock', 'Status'];
      break;

    case 'lowstock':
      endpoint = 'http://localhost:3001/api/export?type=lowstock';
      headers = ['Item Name', 'Category', 'Current Stock', 'Unit', 'Min Stock', 'Stock Level'];
      break;

    case 'history':
      endpoint = 'http://localhost:3001/api/export?type=history';
      headers = ['Date', 'Time', 'User', 'Action', 'Item', 'Quantity', 'Unit', 'Notes'];
      break;

    case 'team':
      endpoint = 'http://localhost:3001/api/export?type=team';
      headers = ['Username', 'Role', 'Created At', 'Last Login'];
      break;

    default:
      console.error('Invalid export type selected');
      return;
  }

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        let data = await response.json();
        
        // Filter by date range if applicable
        if (dateRange !== 'all' && (selectedExport === 'history')) {
          data = filterByDateRange(data);
        }
        
        // Filter low stock items
        if (selectedExport === 'lowstock') {
          data = data.filter((item: any) => item.current_stock <= item.minimum_stock);
        }
        
        setPreviewHeaders(headers);
        setPreviewData(data.slice(0, 50)); // Preview first 50 items
      }
    } catch (error) {
      console.error('Error fetching preview data:', error);
    }
  };

  const filterByDateRange = (data: any[]) => {
    if (dateRange === 'all') return data;
    
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
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return data.filter((item: any) => 
      new Date(item.created_at) >= cutoffDate
    );
  };

  const formatPreviewRow = (item: any, type: string) => {
    switch (type) {
      case 'inventory':
        const status = item.stock_status || 'Unknown';

        return [
          item.item_name,
          item.category_name,
          item.current_stock,
          item.unit_name,
          item.minimum_stock,
          item.maximum_stock,
          status
        ];
      case 'lowstock':
        const level = ((item.current_stock / item.minimum_stock) * 100).toFixed(0) + '%';
        return [
          item.item_name,
          item.category_name,
          item.current_stock,
          item.unit_name,
          item.minimum_stock,
          level
        ];
      case 'history':
        return [
          formatDate(item.created_at),
          formatTime(item.created_at),
          item.username,
          item.transaction_type,
          item.item_name,
          item.quantity,
          item.unit_name,
          item.notes || ''
        ];
      case 'team':
        return [
          item.username,
          item.role,
          formatDate(item.created_at),
          item.last_login ? formatDate(item.last_login) : 'Never'
        ];
      default:
        return [];
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

  const handleExport = async () => {
    if (!selectedExport) return;
    
    setIsExporting(true);
    const token = localStorage.getItem('cafestock_token');
    
    try {
      // Use the same endpoint structure as fetchPreviewData
      const endpoint = `http://localhost:3001/api/export?type=${selectedExport}`;

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        let data = await response.json();
        
        if (dateRange !== 'all' && selectedExport === 'history') {
          data = filterByDateRange(data);
        }
        
        if (selectedExport === 'lowstock') {
          data = data.filter((item: any) => item.current_stock <= item.minimum_stock);
        }
        
        if (exportFormat === 'csv') {
          exportToCSV(data);
        } else {
          exportToExcel(data);
        }
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (data: any[]) => {
    const rows = data.map(item => formatPreviewRow(item, selectedExport));
    const csvContent = [
      previewHeaders,
      ...rows
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExport}-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = (data: any[]) => {
    // Simple Excel export using HTML table method
    const rows = data.map(item => formatPreviewRow(item, selectedExport));
    
    let tableHTML = '<table><thead><tr>';
    previewHeaders.forEach(header => {
      tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    rows.forEach(row => {
      tableHTML += '<tr>';
      row.forEach(cell => {
        tableHTML += `<td>${cell}</td>`;
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExport}-export-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading || !user) {
    return (
      <div className="export-container">
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
    <div className="export-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="export-content">
        <div className="export-inner">
          <div className="export-header">
            <div>
              <h1 className="export-title">Export Data</h1>
              <p className="export-subtitle">Export inventory and operational data for reporting and analysis</p>
            </div>
            <button 
              className="export-button"
              onClick={handleExport}
              disabled={!selectedExport || isExporting}
            >
              <Download className="button-icon" />
              {isExporting ? 'Exporting...' : 'Export Selected Data'}
            </button>
          </div>

          <div className="export-grid">
            {/* Export Options */}
            <div className="options-card">
              <div className="card-header">
                <FileText className="card-icon" />
                <h3 className="card-title">Export Options</h3>
              </div>
              <p className="card-subtitle">Choose which data to include in your export</p>
              
              <div className="options-list">
                <label className="option-item">
                  <input
                    type="radio"
                    name="exportType"
                    value="inventory"
                    checked={selectedExport === 'inventory'}
                    onChange={(e) => setSelectedExport(e.target.value)}
                    className="option-radio"
                  />
                  <div className="option-content">
                    <div className="option-icon-wrapper">
                      <Package className="option-icon" />
                    </div>
                    <div className="option-text">
                      <div className="option-title">Full Inventory</div>
                      <div className="option-description">Complete list of all inventory items with details</div>
                    </div>
                  </div>
                </label>

                <label className="option-item">
                  <input
                    type="radio"
                    name="exportType"
                    value="lowstock"
                    checked={selectedExport === 'lowstock'}
                    onChange={(e) => setSelectedExport(e.target.value)}
                    className="option-radio"
                  />
                  <div className="option-content">
                    <div className="option-icon-wrapper">
                      <Package className="option-icon" />
                    </div>
                    <div className="option-text">
                      <div className="option-title">Low Stock Report</div>
                      <div className="option-description">Items that need restocking (below minimum stock)</div>
                    </div>
                  </div>
                </label>

                <label className="option-item">
                  <input
                    type="radio"
                    name="exportType"
                    value="history"
                    checked={selectedExport === 'history'}
                    onChange={(e) => setSelectedExport(e.target.value)}
                    className="option-radio"
                  />
                  <div className="option-content">
                    <div className="option-icon-wrapper">
                      <History className="option-icon" />
                    </div>
                    <div className="option-text">
                      <div className="option-title">Activity History</div>
                      <div className="option-description">Complete log of all inventory activities</div>
                    </div>
                  </div>
                </label>

                <label className="option-item">
                  <input
                    type="radio"
                    name="exportType"
                    value="team"
                    checked={selectedExport === 'team'}
                    onChange={(e) => setSelectedExport(e.target.value)}
                    className="option-radio"
                  />
                  <div className="option-content">
                    <div className="option-icon-wrapper">
                      <Users className="option-icon" />
                    </div>
                    <div className="option-text">
                      <div className="option-title">Team Members</div>
                      <div className="option-description">List of all barista accounts and their details</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Date Range Filter */}
              {(selectedExport === 'history') && (
                <div className="date-range-section">
                  <label className="filter-label">
                    <Calendar className="label-icon" />
                    Date Range
                  </label>
                  <select
                    className="filter-select"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>
              )}

              {/* Export Format */}
              <div className="format-section">
                <label className="filter-label">
                  <FileSpreadsheet className="label-icon" />
                  Export Format
                </label>
                <select
                  className="filter-select"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
                >
                  <option value="csv">CSV (.csv)</option>
                  <option value="excel">Excel (.xls)</option>
                </select>
              </div>
            </div>

            {/* Export Preview */}
            <div className="preview-card">
              <div className="card-header">
                <BookOpen className="card-icon" />
                <h3 className="card-title">Export Preview</h3>
              </div>
              <p className="card-subtitle">Preview of data to be exported</p>
              
              {!selectedExport ? (
                <div className="preview-empty">
                  <FileText className="empty-icon" />
                  <p className="empty-text">Select an export option to preview data</p>
                </div>
              ) : previewData.length === 0 ? (
                <div className="preview-empty">
                  <FileText className="empty-icon" />
                  <p className="empty-text">No data available for export</p>
                </div>
              ) : (
                <div className="preview-scroll">
                  <div className="preview-info">
                    Showing preview of {previewData.length} items
                    {previewData.length === 50 && ' (first 50)'}
                  </div>
                  
                  <div className="preview-table-wrapper">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          {previewHeaders.map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((item, index) => (
                          <tr key={index}>
                            {formatPreviewRow(item, selectedExport).map((cell, cellIndex) => (
                              <td key={cellIndex}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportData;