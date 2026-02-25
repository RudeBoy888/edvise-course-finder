import React, { useState, useEffect } from 'react';
import '../styles/AdminPanel.css';
import { OfferModal } from './OfferModal';

export function AdminPanel({ isOpen, setIsOpen, isAuthenticated: propsIsAuthenticated, onAuthChange, selectedCourses, onClearSelection }) {
  const [localIsAuthenticated, setLocalIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [report, setReport] = useState(null);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [clientEmail, setClientEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  // Sync with parent authentication state
  const isAuthenticated = propsIsAuthenticated !== undefined ? propsIsAuthenticated : localIsAuthenticated;

  // Load report from window context (would come from backend)
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = () => {
    // In production, this would come from backend API
    // For now, we'll create mock data structure
    const mockReport = {
      timestamp: new Date().toISOString(),
      summary: {
        old_institutions: 1536,
        new_institutions: 1536,
        old_total_courses: 25157,
        new_total_courses: 25928
      },
      changes: {
        added_courses: 771,
        removed_courses: 0,
        modified_courses: 11,
        added_institutions: 0,
        removed_institutions: 0
      }
    };

    setReport(mockReport);

    // Mock history
    const mockHistory = [
      {
        date: '2026-02-25',
        time: '11:00:16',
        institutions: 1536,
        courses: 25928,
        changes: 782,
        status: 'success'
      },
      {
        date: '2026-01-25',
        time: '09:30:45',
        institutions: 1536,
        courses: 25157,
        changes: 45,
        status: 'success'
      }
    ];

    setUpdateHistory(mockHistory);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026';
    // Simple password check (in production use proper auth)
    if (password === correctPassword) {
      setLocalIsAuthenticated(true);
      if (onAuthChange) onAuthChange(true);
      setPassword('');
    } else {
      alert('❌ Incorrect password');
    }
  };

  const handleClosePanel = () => {
    // Just close panel without logout
    setIsOpen(false);
  };

  const handleLogout = () => {
    setLocalIsAuthenticated(false);
    if (onAuthChange) onAuthChange(false);
    setIsOpen(false);
    setActiveTab('summary');
  };

  const handleCheckUpdates = async () => {
    // In production, this would call backend API
    alert('🔄 Checking for updates from CRICOS...\n\nIn production, this would:\n1. Download latest data\n2. Compare with current\n3. Update if changes found\n4. Generate report');
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!clientEmail) {
      alert('Please enter client email');
      return;
    }

    setEmailStatus('sending');
    // In production, this would call backend API
    setTimeout(() => {
      setEmailStatus('sent');
      alert(`✅ Email sent to ${clientEmail} with update report!`);
      setClientEmail('');
      setTimeout(() => setEmailStatus(null), 3000);
    }, 1000);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    return timeStr || '00:00:00';
  };

  if (!isOpen) {
    // When not authenticated, show floating button to open login
    if (!isAuthenticated) {
      return (
        <button
          className="admin-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Admin Panel (Password Protected)"
          aria-label="Open Admin Panel"
        >
          ⚙️
        </button>
      );
    }
    // When authenticated, don't show floating button (use header dashboard button instead)
    return null;
  }

  return (
    <div className="admin-panel-overlay" onClick={handleClosePanel}>
      <div className="admin-panel-content" onClick={(e) => e.stopPropagation()}>
        {!isAuthenticated ? (
          // Login Form
          <div className="admin-login">
            <h2>🔐 Admin Panel</h2>
            <p>Enter password to access admin dashboard</p>

            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
              />
              <button type="submit">Login</button>
            </form>

            <button className="admin-close" onClick={handleClosePanel}>✕</button>
          </div>
        ) : (
          // Admin Dashboard
          <div className="admin-dashboard">
            <div className="admin-header">
              <h2>📊 Admin Dashboard</h2>
              <button className="admin-close" onClick={handleClosePanel}>✕</button>
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
              <button
                className={`admin-tab ${activeTab === 'offers' ? 'active' : ''}`}
                onClick={() => setActiveTab('offers')}
              >
                📋 Prepare Offer {selectedCourses && selectedCourses.length > 0 && `(${selectedCourses.length})`}
              </button>
              <button
                className={`admin-tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                📈 Summary
              </button>
              <button
                className={`admin-tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                📋 History
              </button>
              <button
                className={`admin-tab ${activeTab === 'email' ? 'active' : ''}`}
                onClick={() => setActiveTab('email')}
              >
                📧 Send Report
              </button>
            </div>

            {/* Tab Content */}
            <div className="admin-tab-content">
              {/* Offers Tab */}
              {activeTab === 'offers' && (
                <div className="admin-section">
                  <h3>📋 Prepare Offer for Client</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    {selectedCourses && selectedCourses.length > 0
                      ? `You have ${selectedCourses.length} course(s) selected. Click button below to prepare offer.`
                      : 'Go back to course search and click "Add to Offer" on courses to prepare an offer.'}
                  </p>
                  {selectedCourses && selectedCourses.length > 0 && (
                    <button
                      className="admin-btn primary"
                      onClick={() => setIsOfferModalOpen(true)}
                      style={{ marginBottom: '20px' }}
                    >
                      📋 Prepare Offer ({selectedCourses.length})
                    </button>
                  )}
                  <p style={{ color: '#999', fontSize: '12px' }}>
                    Offers are saved to your browser's local storage and can be edited anytime.
                  </p>
                </div>
              )}

              {/* Summary Tab */}
              {activeTab === 'summary' && report && (
                <div className="admin-section">
                  <h3>Latest Update Report</h3>

                  <div className="admin-timestamp">
                    <span>Last Updated:</span>
                    <strong>
                      {formatDate(report.timestamp)} at {formatTime(report.timestamp.split('T')[1])}
                    </strong>
                  </div>

                  <div className="admin-stats">
                    <div className="admin-stat">
                      <span className="stat-label">Institutions</span>
                      <span className="stat-value">{report.summary.new_institutions}</span>
                      <span className="stat-change">
                        {report.summary.new_institutions - report.summary.old_institutions >= 0 ? '+' : ''}
                        {report.summary.new_institutions - report.summary.old_institutions}
                      </span>
                    </div>

                    <div className="admin-stat">
                      <span className="stat-label">Courses</span>
                      <span className="stat-value">{report.summary.new_total_courses.toLocaleString()}</span>
                      <span className="stat-change positive">
                        +{report.summary.new_total_courses - report.summary.old_total_courses}
                      </span>
                    </div>

                    <div className="admin-stat">
                      <span className="stat-label">New Courses</span>
                      <span className="stat-value">{report.changes.added_courses}</span>
                    </div>

                    <div className="admin-stat">
                      <span className="stat-label">Modified</span>
                      <span className="stat-value">{report.changes.modified_courses}</span>
                    </div>
                  </div>

                  <div className="admin-changes-list">
                    <h4>Changes Summary:</h4>
                    <ul>
                      <li>✅ Added Institutions: {report.changes.added_institutions}</li>
                      <li>❌ Removed Institutions: {report.changes.removed_institutions}</li>
                      <li>🆕 Added Courses: {report.changes.added_courses}</li>
                      <li>❌ Removed Courses: {report.changes.removed_courses}</li>
                      <li>✏️ Modified Courses: {report.changes.modified_courses}</li>
                    </ul>
                  </div>

                  <div className="admin-actions">
                    <button className="admin-btn primary" onClick={handleCheckUpdates}>
                      🔄 Check for Updates
                    </button>
                    <a href="/data_reports/html/index.html" className="admin-btn secondary" target="_blank" rel="noopener noreferrer">
                      📄 View Full Report
                    </a>
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="admin-section">
                  <h3>Update History</h3>

                  <div className="admin-history-list">
                    {updateHistory.map((item, idx) => (
                      <div key={idx} className="history-item">
                        <div className="history-date">
                          <strong>{formatDate(item.date)}</strong>
                          <span className="history-time">{item.time}</span>
                        </div>
                        <div className="history-stats">
                          <span className="badge">📊 {item.institutions} institutions</span>
                          <span className="badge">📚 {item.courses.toLocaleString()} courses</span>
                          <span className="badge">⚡ {item.changes} changes</span>
                        </div>
                        <div className="history-status">
                          {item.status === 'success' ? (
                            <span className="status-badge success">✅ Success</span>
                          ) : (
                            <span className="status-badge error">❌ Failed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Tab */}
              {activeTab === 'email' && (
                <div className="admin-section">
                  <h3>📧 Send Update Report to Client</h3>

                  <form onSubmit={handleSendEmail} className="admin-email-form">
                    <div className="form-group">
                      <label>Client Email Address:</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="client@example.com"
                        required
                      />
                    </div>

                    <div className="email-preview">
                      <h4>Email Preview:</h4>
                      <div className="email-content">
                        <p><strong>Subject:</strong> ✅ CRICOS Data Updated - {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                        <hr />
                        <p>Dear Client,</p>
                        <p>We're pleased to inform you that our course database has been updated with the latest CRICOS data.</p>
                        <p><strong>Update Summary:</strong></p>
                        <ul>
                          <li>Total Institutions: {report?.summary.new_institutions}</li>
                          <li>Total Courses: {report?.summary.new_total_courses.toLocaleString()}</li>
                          <li>New Courses Added: {report?.changes.added_courses}</li>
                          <li>Courses Updated: {report?.changes.modified_courses}</li>
                        </ul>
                        <p>You can now search for updated courses in our Course Finder application.</p>
                        <p>Best regards,<br />EDVISE Education Agency</p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="admin-btn primary"
                      disabled={emailStatus === 'sending'}
                    >
                      {emailStatus === 'sending' ? '⏳ Sending...' : '📧 Send Email'}
                    </button>

                    {emailStatus === 'sent' && (
                      <div className="admin-success">
                        ✅ Email sent successfully!
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offer Modal - For Admin Offer Preparation */}
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        selectedCourses={selectedCourses}
        onClearSelection={onClearSelection}
      />
    </div>
  );
}
