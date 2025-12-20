import React, { ReactNode } from 'react';
import Tooltip from './Tooltip';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function SelloDeTiempoLegalTooltip({ children, className = '' }: Props) {
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
