// ============================================
// DocumentViewer Component
// ============================================
// Fetches the PDF from Supabase Storage, decrypts
// it in-browser (if encryptionKey provided), and
// renders it inside an iframe. Logs forensic
// events when decryption happens.
// ============================================

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { downloadDocument, getDocumentDownloadUrl } from '@/utils/documentStorage'
import { decryptFile } from '@/utils/encryption'
import { useEcoxLogger } from '@/hooks/useEcoxLogger'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import RefreshCcw from 'lucide-react/dist/esm/icons/refresh-ccw';

interface DocumentViewerProps {
  documentPath: string | null
  encryptionKey?: string | null
  workflowId?: string
  signerId?: string
  onContinue: () => void
}

export default function DocumentViewer({
  documentPath,
  encryptionKey,
  workflowId,
  signerId,
  onContinue
}: DocumentViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const { logEvent } = useEcoxLogger()

  useEffect(() => {
    let isMounted = true
    let objectUrl: string | null = null

    const loadDocument = async () => {
      if (!documentPath) {
        setError('No encontramos el documento asociado a este flujo.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        if (encryptionKey) {
          // Download encrypted PDF, decrypt locally
          const { success, data, error: downloadError } = await downloadDocument(documentPath)
          if (!success || !data) {
            throw new Error(downloadError || 'No se pudo descargar el documento')
          }

          const decrypted = await decryptFile(data, encryptionKey)
          const buffer = await decrypted.arrayBuffer()
          const pdfBlob = new Blob([buffer], { type: 'application/pdf' })
          objectUrl = URL.createObjectURL(pdfBlob)

          if (workflowId && signerId) {
            await logEvent({
              workflowId,
              signerId,
              eventType: 'document_decrypted'
            })
          }
        } else {
          const signedUrl = await getSignedDocumentUrl(documentPath)
          if (!signedUrl) {
            throw new Error('No se pudo generar un link seguro para visualizar el PDF')
          }
          objectUrl = signedUrl
        }

        if (isMounted) {
          setPdfUrl(objectUrl)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo cargar el documento'
        setError(message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDocument().catch(console.error)

    return () => {
      isMounted = false
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [documentPath, encryptionKey, logEvent, signerId, workflowId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" message="Preparando documento..." />
      </div>
    )
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <ShieldCheck className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
            No pudimos cargar el documento
          </h2>
          <p className="mb-4 text-center text-sm text-gray-600">
            {error || 'Hubo un problema al descargar el archivo. Probá nuevamente.'}
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700">Paso 2 de 3</p>
            <h1 className="text-2xl font-bold text-gray-900">
              Revisá el documento antes de firmar
            </h1>
            <p className="text-sm text-gray-600">
              La previsualización se genera de manera segura en tu navegador.
            </p>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <iframe
            src={pdfUrl}
            title="Documento para firmar"
            className="h-[75vh] w-full"
            allow="clipboard-write"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            🔒 El PDF se muestra sin salir de tu navegador. Si fue cifrado, se descifra localmente.
          </div>
          <button
            onClick={onContinue}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Continuar para firmar →
          </button>
        </div>
      </div>
    </div>
  )
}
