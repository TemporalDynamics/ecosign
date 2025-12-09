import React from 'react';
import Tooltip from './Tooltip';

export default function HuellaDigitalTooltip({ children, className = '' }) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>{children || 'Huella Digital'}</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Huella Digital:</p>
          <p>Es como la huella dactilar de tu documento. Un código único que garantiza que no ha sido modificado.</p>
        </div>
      }
    />
  );
}
