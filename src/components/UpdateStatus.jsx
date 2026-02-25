import React, { useState, useEffect } from 'react';

export function UpdateStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data_reports/update_status.json');
        if (!response.ok) throw new Error('Status file not found');
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError('Update status unavailable');
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return null;
  }

  const lastUpdate = status.last_update ? new Date(status.last_update) : null;
  const formatDate = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      fontSize: '12px',
      zIndex: 1000,
      maxWidth: '300px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>📊</span>
        <strong>Data Status</strong>
      </div>

      <div style={{ color: '#666', lineHeight: '1.5' }}>
        <div>
          Last Update: <strong>{formatDate(lastUpdate)}</strong>
        </div>
        <div>
          Total Updates: <strong>{status.update_count || 0}</strong>
        </div>
        {status.last_update && (
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #eee',
            color: '#999',
            fontSize: '11px'
          }}>
            {new Date(status.last_update).toLocaleString()}
          </div>
        )}
      </div>

      {status.history && status.history[0] && (
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #eee',
          fontSize: '11px',
          color: status.history[0].status === 'success' ? '#28a745' : '#dc3545'
        }}>
          Last status: <strong>{status.history[0].status.toUpperCase()}</strong>
        </div>
      )}

      <a
        href="/data_reports/html/index.html"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: '8px',
          color: '#667eea',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '11px'
        }}
      >
        View Reports →
      </a>
    </div>
  );
}
