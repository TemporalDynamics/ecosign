// ============================================
// CompletionScreen Component
// ============================================
// Shown after the signer finishes the flow.
// ============================================

import { CheckCircle, Download, Home } from 'lucide-react'

interface CompletionScreenProps {
  workflowTitle?: string | null
  onDownloadECO: () => void
  onClose: () => void
}

export default function CompletionScreen({
  workflowTitle,
  onDownloadECO,
  onClose
}: CompletionScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-md">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
        </div>
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          ¡Firma completada!
        </h1>
        <p className="mb-6 text-center text-gray-600">
          El documento {workflowTitle ? <strong>{workflowTitle}</strong> : 'solicitado'} fue firmado correctamente.
          Guardamos el rastro forense y notificamos automáticamente al creador.
        </p>

        <div className="space-y-3">
          <button
            onClick={onDownloadECO}
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
