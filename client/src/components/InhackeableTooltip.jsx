import React from 'react';
import Tooltip from './Tooltip';

// Reusable label for the “inhackeable” concept with a concise explainer.
export default function InhackeableTooltip({ className = '' }) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>Inhackeable</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Blindaje inhackeable:</p>
          <p>• Huella SHA-256 local (tu archivo no se sube).</p>
          <p>• Sello de tiempo legal RFC 3161 (TSA).</p>
          <p>• Anchoring blockchain: hoy Polygon y Bitcoin; más redes en camino.</p>
        </div>
      }
    />
  );
}
