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
      <div className="grid grid-cols-[5fr_1fr_2fr_2fr] gap-x-4 items-center px-6 py-5 bg-gray-50 border-b border-gray-100 rounded-lg">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 text-left w-full"
          aria-expanded={isOpen}
          type="button"
        >
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-600 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600 transition-transform" />
          )}

          {icon && <span className="text-gray-700">{icon}</span>}

          <span className="font-semibold text-gray-900 text-lg uppercase tracking-wide leading-6">
            {title}
          </span>

          {count !== undefined && (
            <span className="text-xs text-gray-500 font-normal">
              ({count})
            </span>
          )}
        </button>
        <div />
        <div />
        <div />
      </div>

      {/* Contenido desplegable */}
      {isOpen && (
        <div className="mt-3" role="region" aria-label={title}>
          {children}
        </div>
      )}
    </div>
  );
}
