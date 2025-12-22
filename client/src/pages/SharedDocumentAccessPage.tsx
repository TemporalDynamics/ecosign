/**
 * SharedDocumentAccessPage
 * 
 * Página pública para acceder a documentos compartidos con OTP.
 * Ruta: /shared/:shareId
 */

import { useParams } from 'react-router-dom';
import { OTPAccessModal } from '../components/OTPAccessModal';

export function SharedDocumentAccessPage() {
  const { shareId } = useParams<{ shareId: string }>();

  if (!shareId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Enlace inválido
          </h1>
          <p className="text-gray-600">
            Este enlace no es válido o ha expirado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <OTPAccessModal
        isOpen={true}
        onClose={() => window.location.href = '/'}
        shareId={shareId}
      />
    </div>
  );
}
