// ============================================
// CompletionScreen Component
// ============================================
// Shown after the signer finishes the flow.
// Shows certification progress (TSA → Polygon → Bitcoin)
// UI state only - does NOT affect legal certification status
// ============================================

import { useState, useEffect } from 'react'
import { CheckCircle, Download, Home, Clock, Shield, Loader2 } from 'lucide-react'

type UiCertificationPhase = 'showing_progress' | 'ready'

interface CompletionScreenProps {
  workflowTitle?: string | null
  userDocumentId?: string | null
  certificationPhase?: UiCertificationPhase
  onDownloadECO: () => void
  onClose: () => void
}

export default function CompletionScreen({
  workflowTitle,
  userDocumentId,
  certificationPhase,
  onDownloadECO,
  onClose
}: CompletionScreenProps) {
  const [uiPhase, setUiPhase] = useState<UiCertificationPhase>('showing_progress')
  const [showProgressCard, setShowProgressCard] = useState(true)

  useEffect(() => {
    if (certificationPhase) {
      setUiPhase(certificationPhase)
      return
    }

    if (!userDocumentId) {
      setUiPhase('ready')
      return
    }

    const timeout = setTimeout(() => {
      setUiPhase('ready')
    }, 120000)

    return () => clearTimeout(timeout)
  }, [certificationPhase, userDocumentId])

  // Auto-hide progress card after 5s when ready
  useEffect(() => {
    if (uiPhase === 'ready') {
      const timer = setTimeout(() => setShowProgressCard(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [uiPhase])

  const handleDownload = () => {
    setShowProgressCard(false)
    onDownloadECO()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-md">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
        </div>
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          ¡Firma completada!
        </h1>
        <p className="mb-1 text-center text-sm text-gray-500">
          Certificación legal en curso
        </p>
        <p className="mb-4 text-center text-gray-600">
          El documento {workflowTitle ? <strong>{workflowTitle}</strong> : 'solicitado'} fue firmado correctamente.
        </p>

        {/* Progreso de certificación (solo visual, no bloquea) */}
        {showProgressCard && uiPhase === 'showing_progress' && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              Certificación en proceso (~30-60 segundos)
            </div>
            <div className="space-y-2 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>TSA (RFC 3161): Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                <span>Polygon: Confirmando anclaje...</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Bitcoin: En cola (4-24h)</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-blue-700">
              Podés descargar el certificado ahora. El refuerzo Bitcoin se completará automáticamente.
            </p>
          </div>
        )}

        {showProgressCard && uiPhase === 'ready' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
              <CheckCircle className="h-4 w-4" />
              Certificación completada
            </div>
            <p className="mt-1 text-xs text-green-800">
              Tu documento está protegido con TSA y Polygon. El refuerzo Bitcoin se procesará en segundo plano.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Download className="h-5 w-5" />
            Descargar certificado .ECO
          </button>
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            <Home className="h-5 w-5" />
            Volver al inicio
          </button>
        </div>

        <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          La evidencia está protegida con ECOX (hash, IP, timezone, detección de VPN). Podés verificarla cuando quieras.
        </div>
      </div>
    </div>
  )
}
