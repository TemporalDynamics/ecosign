import React from 'react';
import Tooltip from './Tooltip';

export default function PolygonTooltip({ children, className = '' }) {
  return (
    <Tooltip
      term={<span className={`inline-flex items-center gap-1 ${className}`}>{children || 'Polygon'}</span>}
      definition={
        <div className="space-y-1">
          <p className="font-semibold text-white">Polygon (Tecnología de Registro Rápido):</p>
          <p>EcoSign utiliza la tecnología de Polygon únicamente para registrar la huella digital de tu documento en un registro público inalterable.</p>
          <p>No se usa como moneda, no necesitas una billetera ni saber nada sobre criptomonedas.</p>
          <p>Su función aquí es simplemente crear un comprobante público, rápido y económico, que confirma que tu documento existía exactamente en ese momento.</p>
          <p>En el futuro podrás elegir otras redes, pero todas cumplen la misma función: validar la integridad de tu documentación.</p>
        </div>
      }
    />
  );
}
