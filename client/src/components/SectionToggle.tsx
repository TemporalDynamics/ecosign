// ========================================
// SectionToggle - Componente reutilizable para secciones desplegables
// ========================================

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionToggleProps {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function SectionToggle({
  title,
  count,
  icon,
  defaultOpen = true,
  children,
}: SectionToggleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      {/* Header del toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
        aria-expanded={isOpen}
        type="button"
      >
        <div className="flex items-center gap-3">
          {/* Icono de chevron */}
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-600 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600 transition-transform" />
          )}

          {/* Icono de sección (opcional) */}
          {icon && <span className="text-gray-700">{icon}</span>}

          {/* Título */}
          <span className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
            {title}
          </span>

          {/* Contador */}
          {count !== undefined && (
            <span className="text-xs text-gray-500 font-normal">
              ({count})
            </span>
          )}
        </div>
      </button>

      {/* Contenido desplegable */}
      {isOpen && (
        <div className="mt-3" role="region" aria-label={title}>
          {children}
        </div>
      )}
    </div>
  );
}
