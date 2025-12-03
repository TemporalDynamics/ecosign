// ============================================
// SignWorkflowPage - NEW Signature Flow
// ============================================
// Uses the new signature_workflows schema
// Includes all critical security features:
// - Token validation
// - NDA acceptance
// - Auth gate (login/register required)
// - MFA TOTP challenge (implemented in MFAChallenge.tsx)
// - Document viewer with PDF.js
// - ECOX logging at each step
// - Signature pad
// - Completion screen with .ECO download
// ============================================

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSupabase } from '@/lib/supabaseClient'
import { useEcoxLogger } from '@/hooks/useEcoxLogger'
import { applySignatureToPDF } from '@/utils/pdfSigner'
import { decryptFile } from '@/utils/encryption'
import { encryptFile, generateEncryptionKey } from '@/utils/encryption'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

// Step components
import TokenValidator from '@/components/signature-flow/TokenValidator'
import NDAAcceptance from '@/components/signature-flow/NDAAcceptance'
import DocumentViewer from '@/components/signature-flow/DocumentViewer'
import SignaturePad from '@/components/signature-flow/SignaturePad'
import CompletionScreen from '@/components/signature-flow/CompletionScreen'

type SignatureStep =
  | 'validating'
  | 'nda'
  | 'receipt'
  | 'otp'
  | 'viewing'
  | 'signing'
  | 'completed'
  | 'error'

interface SignerData {
  id: string
  workflow_id: string
  email: string
  name: string | null
  signing_order: number
  status: string
  access_token_hash: string
  require_login: boolean
  require_nda: boolean
  quick_access: boolean
  nda_accepted?: boolean
  nda_accepted_at?: string | null
  signature_type?: 'ECOSIGN' | 'SIGNNOW'
  signnow_embed_url?: string | null
  encrypted_pdf_url?: string | null
  workflow: {
    id: string
    title: string
    document_path: string | null
    document_hash: string | null
    encryption_key: string | null // For decryption
    owner_id: string
    status: string
    require_sequential: boolean
    original_filename?: string | null
    signature_type?: 'ECOSIGN' | 'SIGNNOW'
    signnow_embed_url?: string | null
  }
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

interface SignWorkflowPageProps {
  mode?: 'dashboard' | 'signer'
}

export default function SignWorkflowPage({ mode = 'dashboard' }: SignWorkflowPageProps) {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { logEvent } = useEcoxLogger()

  // Determine if we're in signer mode (ultra clean UX)
  const isSignerMode = mode === 'signer'

  // State
  const [step, setStep] = useState<SignatureStep>('validating')
  const [signerData, setSignerData] = useState<SignerData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [accessMeta, setAccessMeta] = useState<any>(null)
  const [receiptData, setReceiptData] = useState({
    docId: '',
    docIdType: 'DNI',
    phone: ''
  })

  // Initialize - validate token
  useEffect(() => {
    if (token) {
      validateToken(token)
    } else {
      setError('Token de firma inválido')
      setStep('error')
    }
  }, [token])

  // Check if user is authenticated
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const validateToken = async (accessToken: string) => {
    try {
      const supabase = getSupabase();
      setStep('validating')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const response = await fetch(`${supabaseUrl}/functions/v1/signer-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ token: accessToken })
      })

      if (!response.ok) {
        setError('Link de firma inválido o no encontrado')
        setStep('error')
        return
      }

      const signer = await response.json()
      setAccessMeta(signer)

      // Check signer status
      if (signer.status === 'signed') {
        setError('Este documento ya fue firmado')
        setStep('error')
        return
      }

      if (signer.status === 'cancelled') {
        setError('Este flujo de firma ha sido cancelado')
        setStep('error')
        return
      }

      // Check if it's their turn (if sequential signing)
      if (signer.workflow.require_sequential) {
        // Get all signers with lower signing_order who haven't signed yet
        const { data: previousSigners, error: prevError } = await supabase
          .from('workflow_signers')
          .select('id, signing_order, status, name, email')
          .eq('workflow_id', signer.workflow_id)
          .lt('signing_order', signer.signing_order)
          .neq('status', 'signed')

        if (prevError) {
          console.error('Error checking sequential order:', prevError)
          setError('Error al validar el orden de firma')
          setStep('error')
          return
        }

        if (previousSigners && previousSigners.length > 0) {
          // There are signers who should sign before this one
          const pendingNames = previousSigners
            .map(s => s.name || s.email)
            .join(', ')

          setError(
            `Este documento requiere firma secuencial. Aún no es tu turno. ` +
            `Pendientes: ${pendingNames}`
          )
          setStep('error')

          // Log ECOX event for sequential violation
          await logEvent({
            workflowId: signer.workflow_id,
            signerId: signer.id,
            eventType: 'sequential_order_violated',
            details: {
              currentOrder: signer.signing_order,
              pendingSigners: previousSigners.map(s => ({
                id: s.id,
                order: s.signing_order,
                status: s.status
              }))
            }
          })

          return
        }
      }

      setSignerData(signer as any)

      // Log ECOX event: access_link_opened
      await logEvent({
        workflowId: signer.workflow_id,
        signerId: signer.id,
        eventType: 'access_link_opened'
      })

      // Determine next step based on requirements
      if (signer.require_nda && !signer.nda_accepted) {
        setStep('nda')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (signer.require_login && (!user || user.email?.toLowerCase() !== signer.email.toLowerCase())) {
        setStep('receipt')
        return
      }

      setStep('viewing')

    } catch (err) {
      console.error('Error validating token:', err)
      setError('Error al cargar el documento')
      setStep('error')
    }
  }

  const handleNDAAccepted = async () => {
    if (!signerData) return

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      await fetch(`${supabaseUrl}/functions/v1/accept-workflow-nda`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ signer_id: signerData.id, signer_email: signerData.email })
      })

      await logEvent({
        workflowId: signerData.workflow_id,
        signerId: signerData.id,
        eventType: 'nda_accepted'
      })

      setSignerData({ ...signerData, nda_accepted: true, nda_accepted_at: new Date().toISOString() } as any)

      if (signerData.require_login) {
        setStep('receipt')
      } else {
        setStep('viewing')
      }
    } catch (err) {
      console.error('Error aceptando NDA', err)
      setError('No pudimos registrar la NDA. Intenta de nuevo.')
      setStep('error')
    }
  }

  const handleReceiptSubmit = async () => {
    if (!signerData) return
    const supabase = getSupabase();
    setError(null)

    try {
      const { error } = await supabase.functions.invoke('record-signer-receipt', {
        body: {
          signerId: signerData.id,
          workflowId: signerData.workflow_id,
          email: signerData.email,
          signerName: signerData.name,
          docId: receiptData.docId,
          docIdType: receiptData.docIdType,
          phone: receiptData.phone,
          metadata: { quick_access: signerData.quick_access }
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      await sendOtp()
      setStep('otp')
    } catch (err: any) {
      console.error('Error registrando recepción', err)
      setError(err?.message || 'No pudimos registrar la recepción')
    }
  }

  const sendOtp = async () => {
    if (!signerData) return
    const supabase = getSupabase();
    setError(null)
    const { data, error } = await supabase.functions.invoke('send-signer-otp', {
      body: { signerId: signerData.id }
    })
    if (error) {
      setError(error.message)
      return
    }
    if (data?.success) {
      setOtpSent(true)
    }
  }

  const verifyOtp = async () => {
    if (!signerData || !otpCode.trim()) return
    const supabase = getSupabase();
    setError(null)
    const { data, error } = await supabase.functions.invoke('verify-signer-otp', {
      body: { signerId: signerData.id, otp: otpCode.trim() }
    })
    if (error || !data?.success) {
      setError(error?.message || 'OTP inválido')
      return
    }
    setStep('viewing')
  }

  const handleDocumentViewed = async () => {
    if (!signerData) return

    // Log ECOX event
    await logEvent({
      workflowId: signerData.workflow_id,
      signerId: signerData.id,
      eventType: 'document_viewed'
    })

    // Move to signature step
    setStep('signing')
  }

  const handleSignatureApplied = async (signatureData: any) => {
    if (!signerData) return

    try {
      const supabase = getSupabase();
      // Log ECOX event: signature_applied
      await logEvent({
        workflowId: signerData.workflow_id,
        signerId: signerData.id,
        eventType: 'signature_applied',
        details: {
          signature_type: signatureData.type
        }
      })

      // Step 1: Download the PDF from storage (may be encrypted or plain)
      console.log('📄 Downloading PDF from storage...')
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('user-documents')
        .download(signerData.workflow.document_path)

      if (downloadError || !downloadData) {
        throw new Error('No se pudo descargar el documento')
      }

      // Step 2: Decrypt the PDF if it's encrypted
      let pdfBlob = downloadData

      if (signerData.workflow.encryption_key) {
        console.log('🔓 Decrypting PDF in browser...')
        pdfBlob = await decryptFile(
          downloadData,
          signerData.workflow.encryption_key
        )
      } else {
        console.log('📄 PDF is not encrypted, using as-is...')
      }

      // Step 3: Apply signature to PDF using pdf-lib (in browser)
      console.log('✍️ Applying signature to PDF...')
      const { signedPdfBlob, signedPdfHash } = await applySignatureToPDF(
        pdfBlob,
        {
          dataUrl: signatureData.dataUrl,
          type: signatureData.type,
          signerName: signerData.name || signerData.email,
          signedAt: new Date().toISOString()
        }
      )

      // Step 4: Re-encrypt the signed PDF
      console.log('🔒 Re-encrypting signed PDF...')
      // Generate new encryption key for signed document
      const newEncryptionKey = await generateEncryptionKey()
      const encryptedSignedPdf = await encryptFile(
        new File([signedPdfBlob], 'signed.pdf'),
        newEncryptionKey
      )

      // Step 5: Upload signed PDF back to storage
      console.log('☁️ Uploading signed PDF to storage...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const signedPath = `${user.id}/${signerData.workflow_id}/signed_${Date.now()}.pdf.enc`

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(signedPath, encryptedSignedPdf, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error('No se pudo subir el documento firmado')
      }

      // Step 6: Update workflow with signed document path and hash
      const { error: workflowUpdateError } = await supabase
        .from('signature_workflows')
        .update({
          document_path: signedPath,
          document_hash: signedPdfHash,
          encryption_key: newEncryptionKey
        })
        .eq('id', signerData.workflow_id)

      if (workflowUpdateError) {
        throw workflowUpdateError
      }

      // Step 7: Update signer status to 'signed'
      const { error: updateError } = await supabase
        .from('workflow_signers')
        .update({
          status: 'signed',
          signature_data: signatureData.dataUrl,
          signed_at: new Date().toISOString()
        })
        .eq('id', signerData.id)

      if (updateError) {
        throw updateError
      }

      // Log ECOX event: signature_completed
      await logEvent({
        workflowId: signerData.workflow_id,
        signerId: signerData.id,
        eventType: 'signature_completed',
        documentHashSnapshot: signedPdfHash
      })

      console.log('✅ Signature process completed successfully')
      console.log('🔒 Signed PDF hash:', signedPdfHash.substring(0, 16) + '...')

      // Triggers will automatically:
      // 1. Send email to owner (on_signature_completed)
      // 2. Send email to signer (on_signature_completed)
      // 3. Check if workflow is complete and send .ECO to all (on_workflow_completed)

      // Send final package to signer (PDF + ECO)
      try {
        await supabase.functions.invoke('send-signer-package', {
          body: { signerId: signerData.id }
        })
      } catch (err) {
        console.warn('No se pudo enviar el paquete final al firmante', err)
      }

      setStep('completed')

    } catch (err) {
      console.error('Error applying signature:', err)
      setError('Error al guardar la firma. Por favor, intentá nuevamente.')
      setStep('error')
    }
  }

  const handleDownloadECO = async () => {
    if (!signerData) return
    const supabase = getSupabase();

    // Log ECOX event
    await logEvent({
      workflowId: signerData.workflow_id,
      signerId: signerData.id,
      eventType: 'eco_downloaded'
    })

    // Call generate_ecox_certificate function
    const { data, error } = await supabase.rpc('generate_ecox_certificate', {
      p_workflow_id: signerData.workflow_id
    })

    if (error) {
      console.error('Error generating ECO certificate:', error)
      return
    }

    // Trigger download
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${signerData.workflow.title || 'document'}.eco.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Render based on step
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {step === 'validating' && (
          <TokenValidator />
        )}

        {step === 'error' && (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="max-w-md text-center">
              <div className="mb-6 flex justify-center">
                <svg
                  className="h-20 w-20 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Error</h2>
              <p className="mb-6 text-gray-600">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        )}

        {step === 'nda' && signerData && (
          <NDAAcceptance
            workflow={signerData.workflow}
            onAccept={handleNDAAccepted}
          />
        )}

        {step === 'receipt' && signerData && (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg">
              <div className="mb-6">
                <p className="text-sm font-semibold text-blue-600">Validación previa</p>
                <h1 className="text-2xl font-bold text-gray-900">Confirma tus datos para acceder</h1>
                <p className="mt-2 text-gray-600">
                  Registramos la recepción para dejar constancia antes de enviarte el código OTP.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                  <input
                    type="text"
                    value={signerData.name || ''}
                    disabled
                    className="mt-1 w-full rounded-lg border-gray-300 bg-gray-100 px-4 py-3 text-gray-700"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de documento</label>
                    <input
                      type="text"
                      value={receiptData.docIdType}
                      onChange={(e) => setReceiptData({ ...receiptData, docIdType: e.target.value })}
                      placeholder="DNI / Pasaporte"
                      className="mt-1 w-full rounded-lg border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nº de documento</label>
                    <input
                      type="text"
                      value={receiptData.docId}
                      onChange={(e) => setReceiptData({ ...receiptData, docId: e.target.value })}
                      placeholder="Ej: 12345678"
                      className="mt-1 w-full rounded-lg border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono (opcional)</label>
                  <input
                    type="tel"
                    value={receiptData.phone}
                    onChange={(e) => setReceiptData({ ...receiptData, phone: e.target.value })}
                    placeholder="+54 11 5555-5555"
                    className="mt-1 w-full rounded-lg border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                onClick={handleReceiptSubmit}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-blue-700"
              >
                Registrar y enviar OTP
              </button>

              <p className="mt-3 text-xs text-gray-500">
                Guardamos tu IP y dispositivo para asegurar la no repudiación de la recepción. Luego recibirás un código por correo.
              </p>
            </div>
          </div>
        )}

        {step === 'otp' && signerData && (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Verifica tu email</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Enviamos un código a {signerData.email}. Ingresa los 6 dígitos para acceder.
                </p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={sendOtp}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Enviar código
                </button>
                {otpSent && (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Código de 6 dígitos"
                      className="w-full rounded-lg border px-4 py-3 text-sm"
                    />
                    <button
                      onClick={verifyOtp}
                      className="w-full rounded-lg border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Verificar código
                    </button>
                  </>
                )}
                {error && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'viewing' && signerData && (
          <DocumentViewer
            documentPath={signerData.workflow.document_path}
            encryptionKey={signerData.workflow.encryption_key}
            workflowId={signerData.workflow_id}
            signerId={signerData.id}
            signedUrl={accessMeta?.encrypted_pdf_url}
            onContinue={handleDocumentViewed}
            mode={mode}
          />
        )}

        {step === 'signing' && signerData && (
          signerData.workflow.signature_type === 'SIGNNOW' ? (
            <div className="min-h-screen bg-gray-50 px-4 py-8">
              <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Firma con SignNow</h2>
                <p className="mb-4 text-sm text-gray-600">
                  Completa la firma en el formulario embebido. Al finalizar, validaremos el cierre del flujo.
                </p>
                <div className="overflow-hidden rounded-lg border">
                  <iframe
                    src={signerData.workflow.signnow_embed_url || accessMeta?.signnow_embed_url || ''}
                    title="SignNow"
                    className="h-[600px] w-full"
                    allow="clipboard-write"
                  />
                </div>
              </div>
            </div>
          ) : (
            <SignaturePad
              signerName={signerData.name || signerData.email}
              workflowId={signerData.workflow_id}
              signerId={signerData.id}
              onSign={handleSignatureApplied}
            />
          )
        )}

        {step === 'completed' && signerData && (
          <CompletionScreen
            workflowTitle={signerData.workflow.title}
            onDownloadECO={handleDownloadECO}
            onClose={() => navigate('/')}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
