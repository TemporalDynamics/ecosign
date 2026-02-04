/**
 * SharedDocumentAccessPage
 * 
 * Página pública para acceder a documentos compartidos con OTP.
 * Ruta: /shared/:shareId
 * 
 * Flujo:
 * 1. Si tiene NDA → Mostrar NDAAcceptanceScreen
 * 2. Usuario acepta NDA → Mostrar OTPAccessModal
 * 3. Usuario ingresa código correcto → Descarga documento
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { OTPAccessModal } from '../components/OTPAccessModal';
import { NDAAcceptanceScreen } from '../components/NDAAcceptanceScreen';
import { getSupabase } from '../lib/supabaseClient';

export default function SharedDocumentAccessPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Share data
  const [ndaEnabled, setNdaEnabled] = useState(false);
  const [ndaText, setNdaText] = useState('');
  const [documentName, setDocumentName] = useState('Documento');
  const [recipientEmail, setRecipientEmail] = useState('');
  
  // Flow state
  const [ndaAccepted, setNdaAccepted] = useState(false);

  useEffect(() => {
    if (!shareId) return;

    const fetchShareData = async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.functions.invoke('get-share-metadata', {
          body: { share_id: shareId }
        })

        if (error || !data) {
          setError('Enlace inválido o expirado');
          return;
        }

        if (!data.success) {
          setError('Enlace inválido o expirado');
          return;
        }

        setNdaEnabled(Boolean(data.nda_enabled));
        setNdaText(data.nda_text || '');
        // Capability share: identity is not enforced
        setRecipientEmail('guest@ecosign.local');
        setDocumentName(data.document_name || 'Documento');

        // Canon (P1): registrar share.opened en events[] (best-effort)
        try {
          await supabase.functions.invoke('log-share-event', {
            body: {
              share_id: shareId,
              event_kind: 'share.opened',
            },
          })
        } catch (logError) {
          console.warn('⚠️ Failed to log share.opened (best-effort):', logError)
        }
      } catch (err) {
        console.error('Error fetching share:', err);
        setError('Error al cargar el documento compartido');
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [shareId]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Flujo con NDA
  if (ndaEnabled && !ndaAccepted) {
    return (
      <NDAAcceptanceScreen
        ndaText={ndaText}
        documentName={documentName}
        context="share-link"
        signerEmail={recipientEmail}
        signerName={recipientEmail.split('@')[0]} // Usamos parte del email como nombre
        linkId={shareId}
        onAccept={() => setNdaAccepted(true)}
        onReject={() => window.location.href = '/'}
      />
    );
  }

  // Flujo normal (OTP)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <OTPAccessModal
        isOpen={true}
        onClose={() => window.location.href = '/'}
        shareId={shareId}
        documentName={documentName}
      />
    </div>
  );
}
