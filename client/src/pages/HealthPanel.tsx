/**
 * Health Panel - Admin Dashboard
 *
 * Workstream 3: Observable Anchoring
 *
 * Muestra el estado de salud del sistema de anchoring blockchain.
 * Permite diagnosticar problemas sin acceso al servidor.
 */

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { Shield, Activity, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';
  timestamp: string;
  crons: {
    polygon: {
      active: boolean;
      last_run: string | null;
      last_status: string | null;
      failures_count: number;
    };
    bitcoin: {
      active: boolean;
      last_run: string | null;
      last_status: string | null;
      failures_count: number;
    };
  };
  pending: {
    polygon: number;
    bitcoin: number;
  };
  recent_anchors_24h: {
    polygon: number;
    bitcoin: number;
  };
  last_success: {
    polygon: string | null;
    bitcoin: string | null;
  };
  issues: string[];
}

export function HealthPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    try {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase.functions.invoke('health-check');

      if (fetchError) throw fetchError;

      setHealth(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health status');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="health-panel loading">
        <Activity className="spinner" />
        <p>Loading system health...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-panel error">
        <AlertCircle size={48} color="#dc2626" />
        <h2>Health Check Failed</h2>
        <p>{error}</p>
        <button onClick={loadHealth} className="btn-retry">
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  if (!health) return null;

  const statusConfig = {
    healthy: { color: '#15803d', icon: <CheckCircle />, label: 'HEALTHY' },
    degraded: { color: '#ca8a04', icon: <AlertCircle />, label: 'DEGRADED' },
    unhealthy: { color: '#dc2626', icon: <AlertCircle />, label: 'UNHEALTHY' },
    error: { color: '#dc2626', icon: <AlertCircle />, label: 'ERROR' }
  };

  const status = statusConfig[health.status];

  return (
    <div className="health-panel">
      <header className="health-header">
        <div className="header-title">
          <Shield size={32} />
          <h1>Blockchain Anchoring Health</h1>
        </div>
        <button onClick={loadHealth} className="btn-refresh" title="Refresh">
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      <div className="status-hero" style={{ borderColor: status.color }}>
        <div className="status-icon" style={{ color: status.color }}>
          {status.icon}
        </div>
        <div className="status-text">
          <h2 style={{ color: status.color }}>{status.label}</h2>
          <p className="timestamp">
            <Clock size={14} />
            Last updated: {lastRefresh.toLocaleString()}
          </p>
        </div>
      </div>

      {health.issues.length > 0 && (
        <section className="issues-section">
          <h3>
            <AlertCircle size={20} />
            Issues Detected ({health.issues.length})
          </h3>
          <ul className="issues-list">
            {health.issues.map((issue, i) => (
              <li key={i} className="issue-item">
                <span className="issue-bullet">⚠️</span>
                {issue}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="metrics-grid">
        <section className="metric-card">
          <h3>Cron Jobs</h3>
          <table className="metric-table">
            <tbody>
              <tr>
                <td>Polygon Worker</td>
                <td className={health.crons.polygon.active ? 'status-ok' : 'status-error'}>
                  {health.crons.polygon.active ? '✅ Active' : '❌ Inactive'}
                </td>
                <td>
                  {health.crons.polygon.failures_count > 0 && (
                    <span className="failures-badge">{health.crons.polygon.failures_count} failures</span>
                  )}
                </td>
              </tr>
              <tr>
                <td>Bitcoin Worker</td>
                <td className={health.crons.bitcoin.active ? 'status-ok' : 'status-error'}>
                  {health.crons.bitcoin.active ? '✅ Active' : '❌ Inactive'}
                </td>
                <td>
                  {health.crons.bitcoin.failures_count > 0 && (
                    <span className="failures-badge">{health.crons.bitcoin.failures_count} failures</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="metric-card">
          <h3>Pending Documents</h3>
          <table className="metric-table">
            <tbody>
              <tr>
                <td>Polygon</td>
                <td className={health.pending.polygon > 10 ? 'status-warning' : 'status-ok'}>
                  {health.pending.polygon}
                </td>
              </tr>
              <tr>
                <td>Bitcoin</td>
                <td className={health.pending.bitcoin > 10 ? 'status-warning' : 'status-ok'}>
                  {health.pending.bitcoin}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="metric-card">
          <h3>Activity (Last 24h)</h3>
          <table className="metric-table">
            <tbody>
              <tr>
                <td>Polygon Anchors</td>
                <td className="status-ok">{health.recent_anchors_24h.polygon}</td>
              </tr>
              <tr>
                <td>Bitcoin Anchors</td>
                <td className="status-ok">{health.recent_anchors_24h.bitcoin}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="metric-card">
          <h3>Last Successful Anchor</h3>
          <table className="metric-table">
            <tbody>
              <tr>
                <td>Polygon</td>
                <td className="timestamp-cell">
                  {health.last_success.polygon
                    ? new Date(health.last_success.polygon).toLocaleString()
                    : '❌ Never'}
                </td>
              </tr>
              <tr>
                <td>Bitcoin</td>
                <td className="timestamp-cell">
                  {health.last_success.bitcoin
                    ? new Date(health.last_success.bitcoin).toLocaleString()
                    : '❌ Never'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <footer className="health-footer">
        <small>Auto-refreshes every 30 seconds</small>
      </footer>

      <style>{`
        .health-panel {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .health-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-title h1 {
          margin: 0;
          font-size: 1.875rem;
          font-weight: 700;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .btn-refresh:hover {
          background: #2563eb;
        }

        .status-hero {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem;
          background: white;
          border: 3px solid;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .status-icon {
          display: flex;
        }

        .status-text h2 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 700;
        }

        .timestamp {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .issues-section {
          background: #fef2f2;
          border: 2px solid #fca5a5;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .issues-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem 0;
          color: #dc2626;
        }

        .issues-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .issue-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.5rem 0;
          color: #991b1b;
        }

        .issue-bullet {
          flex-shrink: 0;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .metric-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .metric-table {
          width: 100%;
          border-collapse: collapse;
        }

        .metric-table td {
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .metric-table tr:last-child td {
          border-bottom: none;
        }

        .metric-table td:first-child {
          font-weight: 500;
          color: #374151;
        }

        .metric-table td:last-child {
          text-align: right;
        }

        .status-ok {
          color: #15803d;
          font-weight: 600;
        }

        .status-warning {
          color: #ca8a04;
          font-weight: 600;
        }

        .status-error {
          color: #dc2626;
          font-weight: 600;
        }

        .failures-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .timestamp-cell {
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .health-footer {
          text-align: center;
          padding: 1rem;
          color: #6b7280;
        }

        .loading,
        .error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .btn-retry {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 500;
          font-size: 1rem;
        }

        .btn-retry:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
