/**
 * Protection Layer Badge Component
 *
 * Workstream 3: Honest UI - muestra el nivel REAL de protección
 *
 * Layers:
 * - NONE: Sin protección
 * - ACTIVE: Protección garantizada
 * - REINFORCED: Protección reforzada
 * - TOTAL: Protección máxima
 */

import React from 'react';
import { Shield } from 'lucide-react';

type ProtectionLevel = 'NONE' | 'ACTIVE' | 'REINFORCED' | 'TOTAL';
type AnchorStatus = 'pending' | 'confirmed' | 'failed' | null;

interface ProtectionLayerBadgeProps {
  layer: ProtectionLevel;
  polygonStatus?: AnchorStatus;
  bitcoinStatus?: AnchorStatus;
  showDetails?: boolean;
  className?: string;
}

export function ProtectionLayerBadge({
  layer,
  polygonStatus = null,
  bitcoinStatus = null,
  showDetails = false,
  className = ''
}: ProtectionLayerBadgeProps) {
  const layerConfig: Record<ProtectionLevel, { color: string; icon: string; label: string; description: string }> = {
    NONE: {
      color: 'gray',
      icon: '⚪',
      label: 'Sin protección',
      description: 'Documento no protegido'
    },
    ACTIVE: {
      color: 'blue',
      icon: '🔵',
      label: 'Protección garantizada',
      description: 'Integridad y fecha cierta confirmadas'
    },
    REINFORCED: {
      color: 'purple',
      icon: '🟣',
      label: 'Protección reforzada',
      description: 'Refuerzo probatorio adicional confirmado'
    },
    TOTAL: {
      color: 'green',
      icon: '🟢',
      label: 'Protección máxima',
      description: 'Máxima fortaleza probatoria disponible'
    }
  };

  const config = layerConfig[layer];
  const statuses = [polygonStatus, bitcoinStatus].filter(Boolean) as Exclude<AnchorStatus, null>[];
  const confirmedCount = statuses.filter((status) => status === 'confirmed').length;
  const pendingCount = statuses.filter((status) => status === 'pending').length;
  const failedCount = statuses.filter((status) => status === 'failed').length;

  return (
    <div className={`protection-layer-badge layer-${config.color} ${className}`}>
      <div className="layer-primary">
        <Shield className="layer-icon" size={16} />
        <span className="layer-emoji">{config.icon}</span>
        <span className="layer-label">{config.label}</span>
      </div>

      {showDetails && (
        <div className="layer-details">
          <p className="layer-description">{config.description}</p>
          {statuses.length > 0 && (
            <div className="anchor-statuses">
              <div className="status-item status-confirmed">
                <span className="status-label">✅ Refuerzos confirmados: {confirmedCount}/{statuses.length}</span>
              </div>
              {pendingCount > 0 && (
                <div className="status-item status-pending">
                  <span className="status-label">⏳ Refuerzos pendientes: {pendingCount}</span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="status-item status-failed">
                  <span className="status-label">❌ Refuerzos con fallo: {failedCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .protection-layer-badge {
          display: inline-flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .layer-gray {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #6b7280;
        }

        .layer-blue {
          background: #dbeafe;
          border-color: #93c5fd;
          color: #1e40af;
        }

        .layer-purple {
          background: #ede9fe;
          border-color: #c4b5fd;
          color: #6b21a8;
        }

        .layer-green {
          background: #dcfce7;
          border-color: #86efac;
          color: #15803d;
        }

        .layer-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }

        .layer-icon {
          flex-shrink: 0;
        }

        .layer-emoji {
          font-size: 1rem;
        }

        .layer-label {
          white-space: nowrap;
        }

        .layer-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid currentColor;
          opacity: 0.8;
        }

        .layer-description {
          margin: 0;
          font-size: 0.75rem;
          opacity: 0.9;
        }

        .anchor-statuses {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
        }

        .status-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .status-confirmed {
          color: #15803d;
        }

        .status-pending {
          color: #ca8a04;
        }

        .status-failed {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}
