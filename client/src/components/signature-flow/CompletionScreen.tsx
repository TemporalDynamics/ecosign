// ============================================
// CompletionScreen Component
// ============================================
// Shown after the signer finishes the flow.
// Shows certification progress (TSA → Polygon → Bitcoin)
// UI state only - does NOT affect legal certification status
// ============================================

import { CheckCircle, Home, FileText } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface CompletionScreenProps {
  workflowTitle?: string | null
  onDownloadPdf: () => void
  onDownloadEco?: () => void
  isLastSigner?: boolean
  onClose: () => void
  showCloseAction?: boolean
  closeLabel?: string
  showClaimCta?: boolean
  claimToken?: string | null
}

export default function CompletionScreen({
  workflowTitle,
  onDownloadPdf,
  onDownloadEco,
  isLastSigner,
  onClose,
  showCloseAction = true,
  closeLabel = 'Volver al inicio',
  showClaimCta = false,
  claimToken
}: CompletionScreenProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingEco, setDownloadingEco] = useState(false)
  const [pdfDownloaded, setPdfDownloaded] = useState(false)
  const [ecoDownloaded, setEcoDownloaded] = useState(false)
  const hasClaim = showClaimCta && Boolean(claimToken)
  const signupHref = claimToken ? `/login?mode=signup&claim=${encodeURIComponent(claimToken)}` : '/login?mode=signup'
  const loginHref = claimToken ? `/login?claim=${encodeURIComponent(claimToken)}` : '/login'

  const handlePdfClick = async () => {
    if (downloadingPdf) return
    try {
      setDownloadingPdf(true)
      await Promise.resolve(onDownloadPdf())
      setPdfDownloaded(true)
    } finally {
      setTimeout(() => setDownloadingPdf(false), 700)
    }
  }

  const handleEcoClick = async () => {
    if (downloadingEco) return
    if (!onDownloadEco) {
      toast.error('La evidencia ECO aún se está preparando. Reintentá en unos segundos.')
      return
    }
    try {
      setDownloadingEco(true)
      await Promise.resolve(onDownloadEco())
      setEcoDownloaded(true)
    } finally {
      setTimeout(() => setDownloadingEco(false), 700)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-md sm:p-10">
        <div className="mb-4 flex justify-center sm:mb-6">
          <CheckCircle className="h-12 w-12 text-emerald-500 sm:h-16 sm:w-16" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          ¡Firma completada!
        </h1>
        <p className="mb-4 text-center text-gray-600">
          {isLastSigner
            ? <>Con tu firma se completó el flujo de firmas{workflowTitle ? <> de <strong>{workflowTitle}</strong></> : ''}.</>
            : <>El documento {workflowTitle ? <strong>{workflowTitle}</strong> : 'solicitado'} fue firmado correctamente.</>
          }
        </p>

        <div className="space-y-3">
          <button
            onClick={handlePdfClick}
            disabled={downloadingPdf}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FileText className="h-5 w-5" />
            {downloadingPdf ? 'Preparando descarga...' : 'Descargar copia fiel (PDF)'}
          </button>
          <div className="text-[11px] text-gray-500">
            {pdfDownloaded ? 'PDF descargado.' : 'Aún no descargaste el PDF.'}
          </div>
          <button
            onClick={handleEcoClick}
            disabled={downloadingEco}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FileText className="h-5 w-5" />
            {downloadingEco ? 'Preparando descarga...' : 'Descargar evidencia (.ECO)'}
          </button>
          <div className="text-[11px] text-gray-500">
            {ecoDownloaded ? 'ECO descargado.' : 'Aún no descargaste la evidencia ECO.'}
          </div>
          {showCloseAction && (
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              <Home className="h-5 w-5" />
              {closeLabel}
            </button>
          )}
        </div>

        <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Guardá tu PDF firmado y tu archivo .ECO ahora. Son tu evidencia oficial.
          <span className="mt-2 block text-gray-800">
            Si no tenés una cuenta en EcoSign, descargalos ahora. Luego vas a necesitar pedírselos al creador del flujo.
          </span>
        </div>

        {hasClaim && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm text-gray-700">
            <p className="mb-2 text-sm font-semibold text-gray-900">¿Querés conservar esta evidencia?</p>
            <p className="mb-4 text-xs text-gray-600">
              Creá una cuenta gratuita o vinculá la evidencia a tu cuenta actual para acceder siempre que la necesites.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={signupHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-lg border border-blue-500 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Crear cuenta y guardar evidencia
              </a>
              <a
                href={loginHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-lg border border-blue-500 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Conservar en mi cuenta
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
