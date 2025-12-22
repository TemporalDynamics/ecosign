/**
 * ProtectedBadge Component
 * 
 * Badge visual para indicar que un documento está protegido.
 * Zero Server-Side Knowledge Architecture.
 */

import { Shield } from 'lucide-react';

interface ProtectedBadgeProps {
  variant?: 'default' | 'success';
  showText?: boolean;
  compact?: boolean;
  className?: string;
}

export function ProtectedBadge({
  variant = 'default',
  showText = true,
  compact = false,
  className = '',
}: ProtectedBadgeProps) {
  const iconColor = variant === 'success' ? 'text-green-600' : 'text-gray-700';
  const fillColor = variant === 'success' ? 'fill-green-600' : '';
  const textColor = variant === 'success' ? 'text-green-600' : 'text-gray-600';
  const bgColor = variant === 'success' ? 'bg-green-50' : 'bg-gray-100';

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 ${className}`}
        title="Documento privado. Ni EcoSign ni el servidor de la nube pueden ver su contenido."
      >
        <Shield className={`w-3 h-3 ${iconColor} ${fillColor}`} />
        {showText && (
          <span className={`text-xs ${textColor}`}>Protegido</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bgColor} ${className}`}
      title="Documento privado. Ni EcoSign ni el servidor de la nube pueden ver su contenido."
    >
      <Shield className={`w-4 h-4 ${iconColor} ${fillColor}`} />
      {showText && (
        <span className={`text-xs font-medium ${textColor}`}>Protegido</span>
      )}
    </div>
  );
}
