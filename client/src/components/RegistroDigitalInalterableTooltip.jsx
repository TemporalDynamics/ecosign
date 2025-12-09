import React from 'react';
import Tooltip from './Tooltip';

export default function RegistroDigitalInalterableTooltip({ children, className = '' }) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>{children || 'Registro Digital Inalterable'}</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Registro Digital Inalterable:</p>
          <p>Un libro contable público y distribuido donde se anota la huella digital de tu documento, haciéndolo imposible de alterar o borrar.</p>
        </div>
      }
    />
  );
}
