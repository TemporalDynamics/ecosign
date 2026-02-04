// ============================================
// DocumentViewer Component
// ============================================
// Fetches the PDF from Supabase Storage, decrypts
// it in-browser (if encryptionKey provided), and
// renders it inside an iframe. Logs forensic
// events when decryption happens.
// ============================================

import { useEffect, useState, useRef } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { downloadDocument, getSignedDocumentUrl } from '@/utils/documentStorage'
import { decryptFile } from '@/utils/encryption'
import { useEcoxLogger } from '@/hooks/useEcoxLogger'
import { getSupabase } from '@/lib/supabaseClient'
import { FileText, RefreshCcw, ShieldCheck } from 'lucide-react'

interface DocumentViewerProps {
  documentPath: string | null
  encryptionKey?: string | null
  workflowId?: string
  signerId?: string
  signedUrl?: string | null
  stamps?: Array<{
    signer?: { id?: string | null; email?: string | null; name?: string | null; signing_order?: number | null; signed_at?: string | null }
    signature_payload: any
    position: { page: number; x: number; y: number; width: number; height: number }
    apply_to_all_pages: boolean
  }>
  onContinue: () => void
  mode?: 'dashboard' | 'signer'
}

export default function DocumentViewer({
  documentPath,
  encryptionKey,
  workflowId,
  signerId,
  signedUrl,
  stamps,
  onContinue,
  mode = 'dashboard'
}: DocumentViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const { logEvent } = useEcoxLogger()
  const objectUrlRef = useRef<string | null>(null)

  // Forensic metrics state
  const [viewStartTime] = useState<number>(Date.now())
  const [loggedDuration, setLoggedDuration] = useState(false)

  const isSignerMode = mode === 'signer'

  // Log view duration on unmount
  useEffect(() => {
    return () => {
      if (!loggedDuration && workflowId && signerId) {
        const duration = Date.now() - viewStartTime
        logEvent({
          workflowId,
          signerId,
          eventType: 'document_view_duration',
          details: { duration_ms: duration }
        }).catch(console.error)
      }
    }
  }, [loggedDuration, logEvent, signerId, viewStartTime, workflowId])

  useEffect(() => {
    let isMounted = true

    const loadDocument = async () => {
        if (!documentPath && !signedUrl) {
          setError('No encontramos el documento asociado a este flujo.')
          setLoading(false)
          return
        }

      try {
        setLoading(true)
        setError(null)

        // Clean up previous object URL
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
        }

        let newObjectUrl: string | null = null
        if (encryptionKey) {
          // Download encrypted PDF, decrypt locally
          let encryptedBlob: Blob | null = null
          if (signedUrl) {
            const resp = await fetch(signedUrl)
            if (!resp.ok) throw new Error('No se pudo descargar el documento')
            encryptedBlob = await resp.blob()
          } else {
            const { success, data, error: downloadError } = await downloadDocument(documentPath || '')
            if (!success || !data) {
              throw new Error(downloadError || 'No se pudo descargar el documento')
            }
            encryptedBlob = data
          }

          const decrypted = await decryptFile(encryptedBlob, encryptionKey)
          const buffer = await decrypted.arrayBuffer()
          let pdfBlob = new Blob([buffer], { type: 'application/pdf' })

          // Derived view: apply prior signature stamps (best-effort)
          if (stamps && stamps.length > 0) {
            try {
              const { PDFDocument } = await import('pdf-lib')
              const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer())
              const pages = pdfDoc.getPages()

              for (const stamp of stamps) {
                const payload = stamp?.signature_payload ?? {}
                const dataUrl = payload?.dataUrl
                if (!dataUrl || typeof dataUrl !== 'string') continue

                const imgBytes = await fetch(dataUrl).then((res) => res.arrayBuffer())
                const img = await pdfDoc.embedPng(imgBytes)

                const placeOnPage = (pageIndex: number) => {
                  const page = pages[pageIndex]
                  if (!page) return
                  const { width: pageW, height: pageH } = page.getSize()

                  const pos = stamp.position
                  const w = pos.width * pageW
                  const h = pos.height * pageH
                  const x = pos.x * pageW
                  // UI coords are top-left; PDF coords are bottom-left
                  const yTop = pos.y * pageH
                  const y = pageH - yTop - h

                  page.drawImage(img, { x, y, width: w, height: h })
                }

                const basePage = Math.max(0, (stamp.position?.page ?? 1) - 1)
                if (stamp.apply_to_all_pages) {
                  for (let i = 0; i < pages.length; i += 1) placeOnPage(i)
                } else {
                  placeOnPage(Math.min(basePage, pages.length - 1))
                }
              }

              const stampedBytes = await pdfDoc.save()
              pdfBlob = new Blob([new Uint8Array(stampedBytes)], { type: 'application/pdf' })
            } catch (err) {
              console.warn('[DocumentViewer] failed to apply signature stamps (best-effort)', err)
            }
          }

          newObjectUrl = URL.createObjectURL(pdfBlob)
          objectUrlRef.current = newObjectUrl

          if (workflowId && signerId) {
            await logEvent({
              workflowId,
              signerId,
              eventType: 'document_decrypted'
            })

            try {
              const supabase = getSupabase()
              await supabase.functions.invoke('log-workflow-event', {
                body: {
                  workflowId,
                  signerId,
                  eventType: 'document.decrypted'
                }
              })
            } catch (err) {
              console.warn('workflow_events document.decrypted failed', err)
            }
          }
        } else {
          const isDirectUrl = !!documentPath && /^https?:\/\//i.test(documentPath)
          const resolvedUrl =
            signedUrl ||
            (isDirectUrl ? documentPath : await getSignedDocumentUrl(documentPath as string))
          if (!resolvedUrl) {
            throw new Error('No se pudo generar un link seguro para visualizar el PDF')
          }
          newObjectUrl = resolvedUrl
        }

        if (isMounted) {
          // Ensure the PDF viewer fits width by requesting page-width zoom when possible.
          // Appending a PDF fragment (#zoom=page-width) hints to browsers' PDF viewers to fit horizontally.
          const fitUrl = newObjectUrl ? `${newObjectUrl}#zoom=page-width` : null
          setPdfUrl(fitUrl)
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
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [documentPath, encryptionKey, logEvent, signerId, workflowId, signedUrl])

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

  // Render different UI based on mode
  if (isSignerMode) {
    // Ultra minimal signer mode
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b132b] via-[#0f172a] to-[#0b132b] text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col rounded-none bg-white/5 backdrop-blur">
          {/* Minimal header with brand accent */}
          <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0ea5e9]/20 text-[#0ea5e9]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">EcoSign</p>
              <h1 className="text-lg font-semibold text-white">
                Revisá el documento antes de firmar
              </h1>
            </div>
          </div>

          {/* PDF Viewer - Full height */}
          <div className="flex-1 bg-white">
            <iframe
              src={pdfUrl}
              title="Documento para firmar"
              className="h-[calc(100vh-200px)] w-full border-0"
              allow="clipboard-write"
            />
          </div>

          {/* Sticky bottom action bar */}
          <div className="sticky bottom-0 border-t border-white/10 bg-[#0b132b]/90 px-6 py-4 shadow-2xl backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-white/80">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                Documento cargado de forma segura en tu navegador
              </div>
              <button
                onClick={onContinue}
                className="inline-flex items-center justify-center rounded-lg bg-[#0ea5e9] px-8 py-3 text-base font-semibold text-white transition hover:bg-[#0284c7] focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-0"
              >
                Firmar documento
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard mode (original UI)
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
