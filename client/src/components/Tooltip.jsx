import React, { useState } from 'react';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';

function Tooltip({ term, definition }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-block">
      <span
        className="inline-flex items-center cursor-help border-b-2 border-dotted border-black600 text-cyan-700 font-medium"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {term}
        <HelpCircle className="w-3.5 h-3.5 ml-1 opacity-70" strokeWidth={2.5} />
      </span>

      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl border border-gray-700">
          <div className="relative">
            {definition}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

export default Tooltip;
