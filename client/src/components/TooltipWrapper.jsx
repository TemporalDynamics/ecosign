import React, { useState } from 'react';

/**
 * Un componente de tooltip genérico que envuelve a sus hijos.
 * Muestra un texto de ayuda al pasar el cursor sobre el elemento envuelto.
 *
 * @param {React.ReactNode} children - El elemento a envolver (e.g., un botón).
 * @param {string} content - El texto que se mostrará en el tooltip.
 * @param {'top' | 'bottom' | 'left' | 'right'} [position='top'] - La posición del tooltip.
 */
function TooltipWrapper({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 w-max max-w-xs px-3 py-2 bg-gray-900 text-white text-sm rounded-md shadow-lg ${positionClasses[position]}`}
        >
          {content}
          <div className={`absolute w-0 h-0 border-8 border-transparent ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}

export default TooltipWrapper;
