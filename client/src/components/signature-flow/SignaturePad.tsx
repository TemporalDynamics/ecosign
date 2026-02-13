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
import { PenLine, Type, UploadIcon, Eraser, CheckCircle2 } from 'lucide-react';

type SignatureMode = 'draw' | 'type' | 'upload'

interface SignaturePadProps {
  signerName: string
  workflowId?: string
  signerId?: string
  fields?: Array<{
    id: string
    field_type: 'signature' | 'text' | 'date'
    label?: string | null
    placeholder?: string | null
    required?: boolean
  }>
  fieldValues?: Record<string, string>
  onFieldValueChange?: (fieldId: string, value: string) => void
  signatureAllPages?: boolean
  validate?: () => string | null
  onSign: (payload: {
    type: SignatureMode
    dataUrl: string
    storeEncryptedSignatureOptIn?: boolean
    storeSignatureVectorsOptIn?: boolean
  }) => Promise<void> | void
  onReject?: () => void
}

export default function SignaturePad({
  signerName,
  workflowId,
  signerId,
  fields,
  fieldValues,
  onFieldValueChange,
  signatureAllPages,
  validate,
  onSign,
  onReject
}: SignaturePadProps) {
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas()
  const [signatureTab, setSignatureTab] = useState<SignatureMode>('draw')
  const [typedSignature, setTypedSignature] = useState('')
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)
  const [storeEncryptedSignatureOptIn, setStoreEncryptedSignatureOptIn] = useState(false)
  const [storeSignatureVectorsOptIn, setStoreSignatureVectorsOptIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { logEvent } = useEcoxLogger()
  const validationError = validate?.() ?? null

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
    const validationError = validate?.() ?? null
    if (validationError) {
      setError(validationError)
      return
    }

    const signature = resolveSignature()
    if (!signature) return

    try {
      setSubmitting(true)
      setError(null)
      await onSign({
        ...signature,
        storeEncryptedSignatureOptIn: signature.type === 'draw' ? storeEncryptedSignatureOptIn : false,
        storeSignatureVectorsOptIn: signature.type === 'draw' ? storeSignatureVectorsOptIn : false
      })
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

        {/* Fields */}
        {(fields && fields.length > 0) || signatureAllPages ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Completá para firmar</h2>
            {signatureAllPages && (
              <p className="mt-1 text-sm text-gray-600">
                Tu firma se aplicará automáticamente en todas las páginas.
              </p>
            )}
            {fields && fields.length > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                Todos los campos son obligatorios.
              </p>
            )}
            {fields && fields.length > 0 && (
              <div className="mt-4 grid gap-3">
                {fields.map((f) => {
                  const logicalKind =
                    (f as any).logical_field_kind ||
                    (f as any).logical_field_id ||
                    f.metadata?.logical_field_kind ||
                    f.metadata?.logical_field_id ||
                    null
                  const fallbackLabel = f.field_type === 'date' ? 'Fecha' : 'Texto'
                  const rawLabel = (f.label || fallbackLabel) as string
                  const label =
                    logicalKind === 'name'
                      ? 'Nombre completo'
                      : rawLabel === 'Nombre'
                        ? 'Nombre completo'
                        : rawLabel
                  const placeholder = (f.placeholder || '') as string
                  const required = f.required ?? true
                  return (
                    <label key={f.id} className="grid gap-1">
                      <span className="text-sm font-medium text-gray-800">
                        {label}{required ? ' *' : ''}
                      </span>
                      <input
                        type={f.field_type === 'date' ? 'date' : 'text'}
                        value={fieldValues?.[f.id] ?? ''}
                        onChange={
                          f.field_type === 'date'
                            ? undefined
                            : (e) => onFieldValueChange?.(f.id, e.target.value)
                        }
                        placeholder={f.field_type === 'date' ? undefined : placeholder}
                        disabled={f.field_type === 'date'}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-not-allowed"
                      />
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

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
              <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={storeEncryptedSignatureOptIn}
                    onChange={(e) => setStoreEncryptedSignatureOptIn(e.target.checked)}
                    className="eco-checkbox mt-1 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Opcional: guardar la imagen de tu firma encriptada para facilitar futuras firmas.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={storeSignatureVectorsOptIn}
                    onChange={(e) => setStoreSignatureVectorsOptIn(e.target.checked)}
                    className="eco-checkbox mt-1 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Opcional: registrar datos técnicos del trazo (coordenadas) para reforzar verificación en caso de disputa.
                  </span>
                </label>
              </div>
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
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Firmá solo si revisaste el documento completo.
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              disabled={submitting || Boolean(validationError)}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" message="" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar firma
                </>
              )}
            </button>
            {submitting && (
              <span className="text-xs text-gray-500">Estamos guardando tu firma.</span>
            )}
            {validationError && (
              <span className="text-xs text-gray-500">{validationError}</span>
            )}
            {onReject && (
              <button
                onClick={onReject}
                disabled={submitting}
                className="inline-flex min-w-[180px] items-center justify-center rounded-lg border border-red-200 px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Rechazar documento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
