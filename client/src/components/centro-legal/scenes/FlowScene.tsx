import React from 'react';
import { Mail, User, Shield } from 'lucide-react';

interface FlowSceneProps {
  file: File | null;
  filePreviewUrl: string | null;
  signerEmails: string[];
  onSignerEmailsChange: (emails: string[]) => void;
  isMobile: boolean;
}

/**
 * SCENE 4: Signature Flow Configuration
 * Responsabilidad: Configuración de firmantes y orden de firma
 */
export function FlowScene({
  file,
  filePreviewUrl,
  signerEmails,
  onSignerEmailsChange,
  isMobile
}: FlowSceneProps) {
  if (!file) {
    return null;
  }

  const extractEmailsFromText = (text: string): string[] => {
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (!matches) return [];
    return matches.map((email) => email.trim()).filter(Boolean);
  };

  const handleEmailChange = (index: number, email: string) => {
    const newEmails = [...signerEmails];
    newEmails[index] = email;
    onSignerEmailsChange(newEmails);
  };

  const handleEmailPaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    const extracted = extractEmailsFromText(text);
    if (extracted.length <= 1) return;

    event.preventDefault();

    const existing = new Set(
      signerEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)
    );
    const unique: string[] = [];
    for (const raw of extracted) {
      const email = raw.toLowerCase();
      if (!email || existing.has(email)) continue;
      existing.add(email);
      unique.push(email);
    }

    if (unique.length === 0) return;

    const next = [...signerEmails];
    next[index] = unique[0];
    for (let i = 1; i < unique.length; i += 1) {
      next.push(unique[i]);
    }
    onSignerEmailsChange(next);
  };

  const handleAddSigner = () => {
    onSignerEmailsChange([...signerEmails, '']);
  };

  const handleRemoveSigner = (index: number) => {
    const newEmails = signerEmails.filter((_, i) => i !== index);
    onSignerEmailsChange(newEmails);
  };

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
      {/* Panel Izquierdo: Configuración de Firmantes */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Firmantes</h3>
          </div>

          <div className="space-y-3">
            {signerEmails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                </div>
                
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  onPaste={(e) => handleEmailPaste(index, e)}
                  placeholder="email@ejemplo.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {signerEmails.length > 1 && (
                  <button
                    onClick={() => handleRemoveSigner(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={handleAddSigner}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              + Agregar firmante
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Los firmantes recibirán un email con link seguro y OTP para acceder al documento.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Document Preview */}
      <div className="space-y-3">
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden min-h-[480px] bg-gray-50">
          {filePreviewUrl ? (
            <iframe
              src={filePreviewUrl}
              className="w-full h-[600px]"
              title="Document Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <p className="text-gray-500">Cargando preview...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
