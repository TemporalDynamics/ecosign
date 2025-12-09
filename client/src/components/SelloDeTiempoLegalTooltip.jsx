import React from 'react';
import Tooltip from './Tooltip';

export default function SelloDeTiempoLegalTooltip({ children, className = '' }) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>{children || 'Sello de Tiempo Legal'}</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Sello de Tiempo Legal (TSA):</p>
          <p>Un servicio que emite un certificado digital con la fecha y hora exactas en que tu documento fue sellado, aportando validez legal internacional.</p>
        </div>
      }
    />
  );
}
