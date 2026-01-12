/**
 * FieldPlacer Component
 * 
 * Permite drag & drop de campos sobre el PDF
 */

import { useState, useRef, useEffect } from 'react';
import { SignatureField } from '../../lib/pdf-stamper';

interface FieldPlacerProps {
  pdfUrl: string;
  fields: SignatureField[];
  onFieldsChange: (fields: SignatureField[]) => void;
  signers: Array<{ id: string; name: string; email: string }>;
}

type FieldType = 'signature' | 'text' | 'date';

export function FieldPlacer({
  pdfUrl,
  fields,
  onFieldsChange,
  signers,
}: FieldPlacerProps) {
  const [draggedField, setDraggedField] = useState<FieldType | null>(null);
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.id || '');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (fieldType: FieldType) => {
    setDraggedField(fieldType);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedField || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newField: SignatureField = {
      id: `field-${Date.now()}`,
      type: draggedField,
      signerId: selectedSigner,
      page: 0, // TODO: detectar página actual
      x,
      y,
      width: draggedField === 'signature' ? 200 : 150,
      height: draggedField === 'signature' ? 60 : 30,
    };

    onFieldsChange([...fields, newField]);
    setDraggedField(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFieldMove = (id: string, dx: number, dy: number) => {
    onFieldsChange(
      fields.map(f =>
        f.id === id ? { ...f, x: f.x + dx, y: f.y + dy } : f
      )
    );
  };

  const handleFieldDelete = (id: string) => {
    onFieldsChange(fields.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Firmante
          </label>
          <select
            value={selectedSigner}
            onChange={(e) => setSelectedSigner(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            {signers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            draggable
            onDragStart={() => handleDragStart('signature')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-move"
          >
            ✍️ Firma
          </button>
          <button
            draggable
            onDragStart={() => handleDragStart('text')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-move"
          >
            📝 Texto
          </button>
          <button
            draggable
            onDragStart={() => handleDragStart('date')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-move"
          >
            📅 Fecha
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="relative border border-gray-300 rounded-lg overflow-auto bg-gray-100"
        style={{ minHeight: '600px' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* PDF Preview */}
        <iframe
          src={pdfUrl}
          className="w-full h-full"
          style={{ minHeight: '600px' }}
        />

        {/* Campos posicionados */}
        {fields.map(field => (
          <DraggableField
            key={field.id}
            field={field}
            onMove={handleFieldMove}
            onDelete={handleFieldDelete}
            containerRef={containerRef}
          />
        ))}
      </div>

      {/* Acciones rápidas */}
      {fields.some(f => f.type === 'signature') && (
        <button
          onClick={() => {
            // TODO: duplicar firmas en todas las páginas
            alert('Duplicar en todas las páginas - TODO');
          }}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
        >
          Duplicar firmas en todas las páginas
        </button>
      )}
    </div>
  );
}

/**
 * Campo draggable individual
 */
function DraggableField({
  field,
  onMove,
  onDelete,
  containerRef,
}: {
  field: SignatureField;
  onMove: (id: string, dx: number, dy: number) => void;
  onDelete: (id: string) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const prevScrollRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    // initialize previous scroll position
    prevScrollRef.current = containerRef?.current?.scrollTop ?? window.scrollY;
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      onMove(field.id, dx, dy);
      startPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    const container = containerRef?.current;
    const handleScroll = () => {
      const current = container ? container.scrollTop : window.scrollY;
      const delta = current - prevScrollRef.current;
      if (delta !== 0) {
        // Adjust the field position so it stays under the cursor while scrolling
        onMove(field.id, 0, delta);
        prevScrollRef.current = current;
      }
    };

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (container) container.removeEventListener('scroll', handleScroll);
      else window.removeEventListener('scroll', handleScroll);
    };
  }, [isDragging, containerRef, field.id, onMove]);

  const getFieldIcon = () => {
    switch (field.type) {
      case 'signature': return '✍️';
      case 'text': return '📝';
      case 'date': return '📅';
    }
  };

  return (
    <div
      className="absolute border-2 border-blue-500 bg-blue-50 bg-opacity-50 cursor-move group"
      style={{
        left: field.x,
        top: field.y,
        width: field.width,
        height: field.height,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between px-2 py-1 text-xs">
        <span>
          {getFieldIcon()} {field.type}
        </span>
        <button
          onClick={() => onDelete(field.id)}
          className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
