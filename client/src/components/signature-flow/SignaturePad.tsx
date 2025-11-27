// ============================================
// SignaturePad Component
// ============================================
// Canvas-based signature capture with typing and
// upload fallbacks. Designed for the new workflow
// signer experience at /sign/[token].
// ============================================

import { useEffect, useState } from 'react'
import { useSignatureCanvas } from '@/hooks/useSignatureCanvas'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useEcoxLogger } from '@/hooks/useEcoxLogger'
import { PenLine, Type, Upload as UploadIcon, Eraser, CheckCircle2 } from 'lucide-react'

type SignatureMode = 'draw' | 'type' | 'upload'

interface SignaturePadProps {
  signerName: string
  workflowId?: string
  signerId?: string
  onSign: (payload: { type: SignatureMode, dataUrl: string }) => Promise<void> | void
}

export default function SignaturePad({
  signerName,
  workflowId,
  signerId,
  onSign
}: SignaturePadProps) {
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas()
  const [signatureTab, setSignatureTab] = useState<SignatureMode>('draw')
  const [typedSignature, setTypedSignature] = useState('')
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { logEvent } = useEcoxLogger()

  // Log when the signer lands on the signature step
  useEffect(() => {
    if (workflowId && signerId) {
      logEvent({
        workflowId,
        signerId,
        eventType: 'signature_started'
      }).catch(console.error)
    }
  }, [logEvent, signerId, workflowId])

  const handleUploadSignature = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Subí una imagen en PNG o JPG')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setUploadedSignature(reader.result as string)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const getTypedSignatureDataUrl = () => {
    if (!typedSignature.trim()) return null

    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 180
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = "56px 'Dancing Script', cursive"
    ctx.fillStyle = '#111827'
    ctx.fillText(typedSignature.trim(), 30, 115)

    return canvas.toDataURL('image/png')
  }

  const resolveSignature = (): { type: SignatureMode, dataUrl: string } | null => {
    if (signatureTab === 'draw') {
      const dataUrl = getSignatureData()
      if (!dataUrl) {
        setError('Dibujá tu firma en el recuadro')
        return null
      }
      return { type: 'draw', dataUrl }
    }

    if (signatureTab === 'type') {
      const dataUrl = getTypedSignatureDataUrl()
      if (!dataUrl) {
        setError('Escribí tu nombre para generar la firma')
        return null
      }
      return { type: 'type', dataUrl }
    }

    if (signatureTab === 'upload') {
      if (!uploadedSignature) {
        setError('Subí una imagen de tu firma')
        return null
      }
      return { type: 'upload', dataUrl: uploadedSignature }
    }

    return null
  }

  const handleConfirm = async () => {
    const signature = resolveSignature()
    if (!signature) return

    try {
      setSubmitting(true)
      setError(null)
      await onSign(signature)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos guardar tu firma'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <PenLine className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-700">Paso 3 de 3</p>
            <h1 className="text-2xl font-bold text-gray-900">Firmá como {signerName}</h1>
            <p className="text-sm text-gray-600">
              Elegí cómo querés firmar. Podés dibujar, escribir o subir una imagen de tu firma.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setSignatureTab('draw')}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
              signatureTab === 'draw' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <PenLine className="h-4 w-4" />
            Dibujar
          </button>
          <button
            onClick={() => setSignatureTab('type')}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
              signatureTab === 'type' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Type className="h-4 w-4" />
            Teclear
          </button>
          <button
            onClick={() => setSignatureTab('upload')}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
              signatureTab === 'upload' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <UploadIcon className="h-4 w-4" />
            Subir
          </button>
        </div>

        {/* Panels */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {signatureTab === 'draw' && (
            <div>
              <canvas
                ref={canvasRef}
                {...handlers}
                className="h-64 w-full rounded-lg border border-gray-300 bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  clearCanvas()
                  setError(null)
                }}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Eraser className="h-4 w-4" />
                Limpiar firma
              </button>
            </div>
          )}

          {signatureTab === 'type' && (
            <div className="space-y-4">
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder={signerName || 'Tu nombre completo'}
              />
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4">
                {typedSignature ? (
                  <p style={{ fontFamily: "'Dancing Script', cursive" }} className="text-5xl text-gray-900">
                    {typedSignature}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Escribí tu nombre para generar la firma</p>
                )}
              </div>
            </div>
          )}

          {signatureTab === 'upload' && (
            <div className="space-y-4">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadSignature(file)
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4">
                {uploadedSignature ? (
                  <img src={uploadedSignature} alt="Firma subida" className="max-h-32 object-contain" />
                ) : (
                  <p className="text-sm text-gray-500">Subí un PNG o JPG con tu firma</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Firmá solo si revisaste el documento completo. La evidencia se guarda en el ECOX.
          </div>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
          >
            {submitting ? (
              <LoadingSpinner size="sm" message="" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar firma
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
