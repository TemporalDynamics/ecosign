import React, { ReactNode } from 'react';
import Tooltip from './Tooltip';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function SelloDeIntegridadTooltip({ children, className = '' }: Props) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>{children || 'Sello de Integridad'}</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Sello de Integridad:</p>
          <p>Un tipo de huella digital ultra segura (SHA-256) que sella tu documento en el tiempo, garantizando su integridad.</p>
        </div>
      }
    />
  );
}
