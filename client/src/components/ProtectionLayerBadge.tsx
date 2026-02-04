/**
 * Protection Layer Badge Component
 *
 * Workstream 3: Honest UI - muestra el nivel REAL de protección
 *
 * Layers:
 * - NONE: Sin protección
 * - ACTIVE: TSA (RFC 3161)
 * - REINFORCED: TSA + Polygon
 * - TOTAL: TSA + Polygon + Bitcoin
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
      label: 'TSA',
      description: 'Sellado de tiempo RFC 3161'
    },
    REINFORCED: {
      color: 'purple',
      icon: '🟣',
      label: 'TSA + Polygon',
      description: 'Anclado en blockchain Polygon'
    },
    TOTAL: {
      color: 'green',
      icon: '🟢',
      label: 'Protección Total',
      description: 'Anclado en Polygon + Bitcoin'
    }
  };

  const config = layerConfig[layer];

  const renderAnchorStatus = (network: 'Polygon' | 'Bitcoin', status: AnchorStatus) => {
    if (!status) return null;

    const statusConfig = {
      confirmed: { icon: '✅', label: 'Confirmado', className: 'status-confirmed' },
      pending: { icon: '⏳', label: 'Confirmando...', className: 'status-pending' },
      failed: { icon: '❌', label: 'Falló', className: 'status-failed' }
    };

    const { icon, label, className: statusClass } = statusConfig[status];

    return (
      <div className={`status-item ${statusClass}`}>
        <span className="network-name">{network}:</span>
        <span className="status-label">{icon} {label}</span>
        {network === 'Bitcoin' && status === 'pending' && (
          <small className="status-note">(puede tardar horas)</small>
        )}
      </div>
    );
  };

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
          <div className="anchor-statuses">
            {polygonStatus && renderAnchorStatus('Polygon', polygonStatus)}
            {bitcoinStatus && renderAnchorStatus('Bitcoin', bitcoinStatus)}
          </div>
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

        .network-name {
          font-weight: 600;
          min-width: 4rem;
        }

        .status-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .status-note {
          opacity: 0.7;
          font-style: italic;
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
