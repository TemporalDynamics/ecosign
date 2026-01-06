import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface BatchEmailInputProps {
  onEmailsExtracted: (emails: string[]) => void;
  existingEmails?: string[];
}

const BatchEmailInput: React.FC<BatchEmailInputProps> = ({
  onEmailsExtracted,
  existingEmails = []
}) => {
  const [inputText, setInputText] = useState('');
  const [extractedEmails, setExtractedEmails] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  const handleExtract = () => {
    const matches = inputText.match(emailRegex);
    
    if (!matches || matches.length === 0) {
      setExtractedEmails([]);
      setShowPreview(false);
      return;
    }

    // Eliminar duplicados y emails ya existentes
    const uniqueEmails = [...new Set(matches)]
      .filter(email => !existingEmails.includes(email.toLowerCase()))
      .map(email => email.toLowerCase());

    setExtractedEmails(uniqueEmails);
    setShowPreview(true);
  };

  const handleConfirm = () => {
    onEmailsExtracted(extractedEmails);
    setInputText('');
    setExtractedEmails([]);
    setShowPreview(false);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setExtractedEmails([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agregar múltiples firmantes
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onBlur={handleExtract}
            placeholder="Pega aquí una lista de emails&#10;juan@example.com, maria@example.com&#10;pedro@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       resize-none"
            rows={4}
          />
          <p className="mt-1 text-xs text-gray-500">
            Pega cualquier texto con emails. Se extraerán automáticamente.
          </p>
        </div>
      </div>

      {showPreview && extractedEmails.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-900">
                {extractedEmails.length} email{extractedEmails.length > 1 ? 's' : ''} encontrado{extractedEmails.length > 1 ? 's' : ''}
              </h4>
            </div>
            <button
              onClick={handleCancel}
              className="text-blue-600 hover:text-blue-800"
              title="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ul className="space-y-1 mb-3 max-h-32 overflow-y-auto">
            {extractedEmails.map((email, index) => (
              <li
                key={index}
                className="text-sm text-gray-700 flex items-center gap-2"
              >
                <Copy className="w-3 h-3 text-gray-400" />
                {email}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium
                         rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar {extractedEmails.length} firmante{extractedEmails.length > 1 ? 's' : ''}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700
                         text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showPreview && extractedEmails.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            No se encontraron emails válidos en el texto pegado.
          </p>
        </div>
      )}
    </div>
  );
};

export default BatchEmailInput;
