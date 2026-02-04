import React from 'react';
import { PenLine, Type, Calendar } from 'lucide-react';
import type { FieldType } from '@/types/signature-fields';

interface FieldToolbarProps {
  onFieldSelect: (type: FieldType) => void;
  selectedField: FieldType | null;
}

const FieldToolbar: React.FC<FieldToolbarProps> = ({
  onFieldSelect,
  selectedField
}) => {
  const fields = [
    { type: 'signature' as FieldType, icon: PenLine, label: 'Firma' },
    { type: 'text' as FieldType, icon: Type, label: 'Texto' },
    { type: 'date' as FieldType, icon: Calendar, label: 'Fecha' }
  ];

  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200">
      <span className="text-sm text-gray-600 font-medium mr-2">
        Agregar campo:
      </span>
      
      {fields.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => onFieldSelect(type)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            transition-all duration-200
            ${
              selectedField === type
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          title={`Agregar campo de ${label.toLowerCase()}`}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
      
      {selectedField && (
        <button
          onClick={() => onFieldSelect(selectedField)}
          className="ml-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          title="Cancelar selección"
        >
          Cancelar
        </button>
      )}
    </div>
  );
};

export default FieldToolbar;
