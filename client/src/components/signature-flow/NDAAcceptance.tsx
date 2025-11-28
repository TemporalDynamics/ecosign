// ============================================
// NDAAcceptance Component
// ============================================
// Shows NDA and requires acceptance before proceeding
// ============================================

import { useState } from 'react'
import Shield from 'lucide-react/dist/esm/icons/shield';
import Check from 'lucide-react/dist/esm/icons/check';

interface NDAAcceptanceProps {
  workflow: {
    title: string
  }
  onAccept: () => void
}

export default function NDAAcceptance({ workflow, onAccept }: NDAAcceptanceProps) {
  const [accepted, setAccepted] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isAtBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 10
    if (isAtBottom && !scrolledToBottom) {
      setScrolledToBottom(true)
    }
  }

  const handleAccept = () => {
    if (!accepted) {
      return
    }
    onAccept()
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-blue-600" />
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Acuerdo de Confidencialidad
          </h1>
          <p className="text-gray-600">
            Documento: <strong>{workflow.title}</strong>
          </p>
        </div>

        {/* NDA Content */}
        <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
          <div
            className="prose max-h-96 overflow-y-auto pr-4"
            onScroll={handleScroll}
          >
            <h2 className="text-xl font-bold text-gray-900">
              Acuerdo de No Divulgación (NDA)
            </h2>

            <p className="text-gray-700">
              Al aceptar este acuerdo y acceder al documento, te comprometes a:
            </p>

            <ul className="text-gray-700">
              <li>
                Mantener en estricta <strong>confidencialidad</strong> todo el contenido
                del documento
              </li>
              <li>
                <strong>No divulgar, copiar, reproducir o transmitir</strong> el
                contenido a terceros sin autorización expresa
              </li>
              <li>
                Utilizar el contenido <strong>únicamente para los fines acordados</strong>
              </li>
              <li>
                Proteger el documento con medidas de seguridad razonables
              </li>
              <li>
                Notificar inmediatamente cualquier acceso no autorizado o violación de
                seguridad
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900">
              Duración de la Confidencialidad
            </h3>
            <p className="text-gray-700">
              Las obligaciones de confidencialidad permanecerán vigentes por un período
              de <strong>5 años</strong> desde la fecha de firma, o hasta que la
              información deje de ser confidencial por medios legítimos.
            </p>

            <h3 className="text-lg font-semibold text-gray-900">Consecuencias</h3>
            <p className="text-gray-700">
              El incumplimiento de este acuerdo puede resultar en acciones legales y la
              obligación de compensar daños y perjuicios.
            </p>

            <h3 className="text-lg font-semibold text-gray-900">
              Registro Forense
            </h3>
            <p className="text-gray-700">
              Tu aceptación de este NDA quedará registrada con evidencia forense
              (timestamp, IP, geolocalización) como parte del certificado ECOX.
            </p>

            {!scrolledToBottom && (
              <div className="mt-4 text-center text-sm text-gray-500">
                ↓ Desplázate hasta el final para continuar ↓
              </div>
            )}
          </div>
        </div>

        {/* Acceptance Checkbox */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={!scrolledToBottom}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">
              He leído y <strong>acepto el Acuerdo de Confidencialidad (NDA)</strong>.
              Entiendo que estoy obligado legalmente a mantener la confidencialidad del
              contenido de este documento.
            </span>
          </label>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleAccept}
          disabled={!accepted || !scrolledToBottom}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {accepted && scrolledToBottom ? (
            <>
              <Check className="h-5 w-5" />
              Continuar →
            </>
          ) : (
            <>
              {!scrolledToBottom
                ? 'Lee el NDA completo para continuar'
                : 'Acepta el NDA para continuar'}
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-blue-800">
            🔒 <strong>Seguridad:</strong> Este NDA queda registrado con tu IP,
            ubicación y timestamp como evidencia forense. El registro es inmutable y
            puede ser verificado en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  )
}
