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
import { downloadDocument } from '@/utils/documentStorage'
import { decryptFile } from '@/utils/encryption'
import { encryptFile, generateEncryptionKey } from '@/utils/encryption'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { AlertTriangle, Loader2 } from 'lucide-react'

// Step components
import TokenValidator from '@/components/signature-flow/TokenValidator'
import PreAccess from '@/components/signature-flow/PreAccess'
import DocumentViewer from '@/components/signature-flow/DocumentViewer'
import SignaturePad from '@/components/signature-flow/SignaturePad'
import CompletionScreen from '@/components/signature-flow/CompletionScreen'
import NDAAcceptance from '@/components/signature-flow/NDAAcceptance'

type SignatureStep =
  | 'validating'
  | 'preaccess'
  | 'nda'
  | 'otp'
  | 'viewing'
  | 'signing'
  | 'completed'
  | 'cancelled_info'
  | 'rejected'
  | 'error'

interface SignerData {
  signer_id: string
  workflow_id: string
  email: string
  name: string | null
  signing_order: number
  status: string
  require_login: boolean
  require_nda: boolean
  quick_access: boolean
  nda_accepted?: boolean
  nda_accepted_at?: string | null
  signature_type?: 'ECOSIGN' | 'SIGNNOW'
  signnow_embed_url?: string | null
  encrypted_pdf_url?: string | null
  otp_verified?: boolean
  workflow_fields?: Array<{
    id: string
    field_type: 'signature' | 'text' | 'date'
    label?: string | null
    placeholder?: string | null
    position: { page: number; x: number; y: number; width: number; height: number }
    required: boolean
    value?: string | null
    metadata?: any
    batch_id?: string | null
    apply_to_all_pages?: boolean | null
  }>
  prior_signature_stamps?: Array<{
    kind?: 'signature' | 'text' | 'date'
    signer: { id?: string | null; email?: string | null; name?: string | null; signing_order?: number | null; signed_at?: string | null }
    signature_payload?: any
    value?: string | null
    position: { page: number; x: number; y: number; width: number; height: number }
    apply_to_all_pages?: boolean
  }>
  workflow: {
    title: string
    document_path: string | null
    document_hash: string | null
    encryption_key: string | null // For decryption
    status: string
    require_sequential: boolean
    original_filename?: string | null
    signature_type?: 'ECOSIGN' | 'SIGNNOW'
    signnow_embed_url?: string | null
    owner_email?: string | null
    owner_name?: string | null
    nda_text?: string | null
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
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [accessMeta, setAccessMeta] = useState<any>(null)
  const [embedError, setEmbedError] = useState(false)
  const [embedTimeout, setEmbedTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [preAccessSubmitting, setPreAccessSubmitting] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [ecoUrl, setEcoUrl] = useState<string | null>(null)
  const [ecoPath, setEcoPath] = useState<string | null>(null)
  const [isLastSigner, setIsLastSigner] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)

  const homePath = isSignerMode ? '/firma' : '/documentos'

  const handleCloseAction = () => {
    if (isSignerMode && typeof window !== 'undefined') {
      window.close()
    }
    navigate(homePath)
  }

  const mapOtpErrorMessage = (errorCodeOrMessage?: string | null) => {
    const raw = String(errorCodeOrMessage || '').toLowerCase()
    if (
      raw.includes('otp inválido') ||
      raw.includes('otp invalido') ||
      raw.includes('invalid') ||
      raw.includes('not found')
    ) {
      return 'El código ingresado no es válido. Revisá el correo e intentá nuevamente.'
    }
    if (raw.includes('expired')) {
      return 'El código expiró. Solicitá uno nuevo para continuar.'
    }
    if (raw.includes('too many attempts') || raw.includes('429')) {
      return 'Superaste el límite de intentos. Esperá unos minutos y volvé a intentar.'
    }
    return 'No pudimos verificar el código. Intentá nuevamente.'
  }

  const mapRejectErrorMessage = (errorCodeOrMessage?: string | null) => {
    const raw = String(errorCodeOrMessage || '').toLowerCase()
    if (raw.includes('invalid') || raw.includes('expired') || raw.includes('token')) {
      return 'El enlace ya no es válido para rechazar este documento. Pedile al remitente un nuevo enlace.'
    }
    if (raw.includes('not found')) {
      return 'No encontramos este flujo de firma. Verificá el enlace recibido.'
    }
    return 'No pudimos registrar el rechazo. Intentá nuevamente.'
  }

  const isOtpRequired = (signer?: SignerData | null) => {
    if (!signer) return true
    return !(signer.quick_access || signer.require_login === false)
  }

  const getInitialNameParts = (name?: string | null) => {
    if (!name) return { firstName: '', lastName: '' }
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return { firstName: parts[0], lastName: '' }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }

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

  // Detect iframe load timeout for SignNow embed
  useEffect(() => {
    if (step === 'signing' && signerData?.workflow.signature_type === 'SIGNNOW') {
      // Set timeout of 15 seconds to detect if iframe fails to load
      const timeout = setTimeout(() => {
        setEmbedError(true)
      }, 15000)

      setEmbedTimeout(timeout)

      return () => {
        if (timeout) clearTimeout(timeout)
      }
    } else {
      // Clear timeout if we leave the signing step
      if (embedTimeout) {
        clearTimeout(embedTimeout)
        setEmbedTimeout(null)
      }
    }
  }, [step, signerData?.workflow.signature_type])

  const checkAuth = async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchSignerData = async (accessToken: string) => {
    try {
      const supabase = getSupabase();
      setStep('validating')
      setError(null)

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
        const body = await response.json().catch(() => ({} as any))
        const backendMessage = String(body?.error || body?.message || '')
        const lowered = backendMessage.toLowerCase()

        if (
          response.status === 403 &&
          (lowered.includes('no longer active') ||
            lowered.includes('flow is no longer active') ||
            lowered.includes('link is no longer active'))
        ) {
          setStep('cancelled_info')
          return null
        }

        setError('Link de firma inválido o no encontrado')
        setStep('error')
        return null
      }

      const signer = await response.json()
      setAccessMeta(signer)
      return signer
    } catch (err) {
      console.error('Error fetching signer data:', err)
      setError('Error al cargar el documento')
      setStep('error')
      return null
    }
  }

  const validateToken = async (accessToken: string) => {
    try {
      const signer = await fetchSignerData(accessToken)
      if (!signer) return

      // Check signer status
      if (signer.status === 'signed') {
        setError('Este documento ya fue firmado')
        setStep('error')
        return
      }

      if (signer.status === 'cancelled' || signer.status === 'rejected' || signer.status === 'expired') {
        setError('Este flujo de firma ha sido cancelado')
        setStep('error')
        return
      }

      if (signer.workflow.require_sequential) {
        const allowedStatuses = ['ready_to_sign', 'verified', 'accessed']
        if (!allowedStatuses.includes(signer.status)) {
          setError('Este documento requiere firma secuencial. Aún no es tu turno.')
          setStep('error')
          return
        }
      }

      // Check if it's their turn (if sequential signing)
      if (signer.workflow.require_sequential) {
        const supabase = getSupabase();
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
            .map((s: any) => s.name || s.email)
            .join(', ')

          setError(
            `Este documento requiere firma secuencial. Aún no es tu turno. ` +
            `Pendientes: ${pendingNames}`
          )
          setStep('error')

          // Log ECOX event for sequential violation
          await logEvent({
            workflowId: signer.workflow_id,
            signerId: signer.signer_id,
            eventType: 'sequential_order_violated',
            details: {
              currentOrder: signer.signing_order,
              pendingSigners: previousSigners.map((s: any) => ({
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
      const getLocalDateInputValue = () => {
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
      }

      // Initialize signer field values
      const initialValues: Record<string, string> = {}
      for (const f of (signer as any)?.workflow_fields ?? []) {
        if (!f?.id) continue
        if (f.field_type === 'signature') continue
        if (typeof f.value === 'string' && f.value.length > 0) {
          initialValues[f.id] = f.value
        } else {
          initialValues[f.id] = f.field_type === 'date' ? getLocalDateInputValue() : ''
        }
      }
      setFieldValues(initialValues)

      setOtpSent(!!signer.otp_verified)
      setOtpCode('')

      // Log ECOX event (non-blocking)
      try {
        await logEvent({
          workflowId: signer.workflow_id,
          signerId: signer.signer_id,
          eventType: 'access_link_opened'
        })
      } catch (err) {
        console.warn('log-ecox-event failed', err)
      }

      // Determine next step based on requirements (PreAccess → NDA → OTP → Viewing)
      const otpRequired = isOtpRequired(signer as any)
      if (otpRequired && !signer.otp_verified) {
        setStep('preaccess')
        return
      }

      if (signer.require_nda && !signer.nda_accepted) {
        setStep('nda')
        return
      }

      setStep('viewing')

    } catch (err) {
      console.error('Error validating token:', err)
      setError('Error al cargar el documento')
      setStep('error')
    }
  }

  const handlePreAccessConfirm = async (payload: {
    firstName: string
    lastName: string
    confirmedRecipient: boolean
    acceptedLogging: boolean
  }) => {
    if (!signerData) return
    const supabase = getSupabase();
    setError(null)
    setPreAccessSubmitting(true)

    try {
      const { error } = await supabase.functions.invoke('confirm-signer-identity', {
        body: {
          signerId: signerData.signer_id,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: signerData.email,
          confirmedRecipient: payload.confirmedRecipient,
          acceptedLogging: payload.acceptedLogging
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      // NDA must be accepted before OTP (legal order)
      if (signerData.require_nda && !signerData.nda_accepted) {
        setStep('nda')
        return
      }

      const otpRequired = isOtpRequired(signerData)
      if (otpRequired) {
        setOtpSent(true)
        setStep('otp')
        await sendOtp()
      } else {
        setStep('viewing')
      }
    } catch (err: any) {
      console.error('Error confirmando identidad', err)
      setError(err?.message || 'No pudimos confirmar tu identidad')
    } finally {
      setPreAccessSubmitting(false)
    }
  }

  type RejectionPhase = 'pre_identity' | 'post_identity' | 'post_view' | 'signature_stage'

  const handleRejectSignature = async (rejectionPhase: RejectionPhase) => {
    if (!signerData) return
    const confirmed = window.confirm(
      '¿Confirmás que querés rechazar este documento? Esta acción quedará registrada.'
    )
    if (!confirmed) return
    const supabase = getSupabase();
    setError(null)
    setRejecting(true)
    try {
      const { data, error } = await supabase.functions.invoke('reject-signature', {
        body: {
          signerId: signerData.signer_id,
          accessToken: token,
          rejectionPhase
        }
      })
      if (error) {
        const backendMessage = (data as any)?.error || error.message
        setError(mapRejectErrorMessage(backendMessage))
        return
      }
      setError('Documento rechazado. Si necesitás ayuda, contactá al remitente.')
      setStep('rejected')
    } catch (err: any) {
      setError(mapRejectErrorMessage(err?.message))
    } finally {
      setRejecting(false)
    }
  }

  const sendOtp = async () => {
    if (!signerData) return
    const supabase = getSupabase();
    setError(null)
    const { data, error } = await supabase.functions.invoke('send-signer-otp', {
      body: { signerId: signerData.signer_id, accessToken: token }
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
    if (verifyingOtp) return
    const supabase = getSupabase();
    try {
      setVerifyingOtp(true)
      setError(null)
      const { data, error } = await supabase.functions.invoke('verify-signer-otp', {
        body: { signerId: signerData.signer_id, otp: otpCode.trim() }
      })
      if (error || !data?.success) {
        const backendMessage = (data as any)?.error || error?.message
        setError(mapOtpErrorMessage(backendMessage))
        return
      }
      if (token) {
        const refreshed = await fetchSignerData(token)
        if (refreshed) {
          setSignerData(refreshed as any)
          if ((refreshed as any).require_nda && !(refreshed as any).nda_accepted) {
            setStep('nda')
            return
          }
        }
      }
      setStep('viewing')
    } catch (err) {
      console.error('verifyOtp error', err)
      const message = err instanceof Error ? err.message : null
      setError(mapOtpErrorMessage(message))
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleDocumentViewed = async () => {
    if (!signerData) return

    // Log ECOX event
    await logEvent({
      workflowId: signerData.workflow_id,
      signerId: signerData.signer_id,
      eventType: 'document_viewed'
    })

    // Move to signature step
    setStep('signing')
  }

  const handleNDAAccept = async () => {
    if (!signerData) return
    const supabase = getSupabase();
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('accept-workflow-nda', {
        body: {
          signer_id: signerData.signer_id,
          signer_email: signerData.email
        }
      })

      if (error || !data?.success) {
        console.error('Error accepting NDA:', error || data?.error)
        setError('No pudimos guardar tu aceptación del NDA. Por favor, intentá de nuevo.')
        return
      }

      setSignerData({
        ...signerData,
        nda_accepted: true,
        nda_accepted_at: data?.accepted_at || new Date().toISOString()
      })

      const otpRequired = isOtpRequired({
        ...signerData,
        nda_accepted: true
      } as any)
      if (otpRequired) {
        setStep('otp')
        await sendOtp()
      } else {
        setStep('viewing')
      }
    } catch (err) {
      console.error('Error in handleNDAAccept:', err)
      setError('Error procesando la aceptación del NDA')
    }
  }

  const handleSignatureApplied = async (signatureData: any) => {
    if (!signerData) return

    try {
      const supabase = getSupabase();
      setError(null)

      // Minimal flow: call backend to record the signature event and mark signer as signed.
      const { data, error } = await supabase.functions.invoke('apply-signer-signature', {
        body: {
          signerId: signerData.signer_id,
          workflowId: signerData.workflow_id,
          witness_pdf_hash: signerData.workflow.document_hash,
          applied_at: new Date().toISOString(),
          identity_level: isOtpRequired(signerData)
            ? (signerData.otp_verified ? 'otp' : 'unknown')
            : 'none',
          signatureData: signatureData,
          fieldValues
        }
      })

      const dataError = (data as any)?.error
      if (error || !data?.success || dataError) {
        console.error('apply-signer-signature failed', error || dataError)
        const errorCode = error?.message || dataError || 'apply_failed'
        if (errorCode === 'missing_required_fields') {
          setError('Completá todos los campos antes de firmar')
          return
        }
        if (errorCode === 'missing_signature_batch') {
          setError('Faltan campos asignados. Pedile al creador que asigne los espacios de firma.')
          return
        }
        throw new Error(errorCode)
      }

      if (data?.eco_url) {
        setEcoUrl(String(data.eco_url))
      }
      if (data?.eco_path) {
        setEcoPath(String(data.eco_path))
      }
      if (data?.pdf_url) {
        setPdfUrl(String(data.pdf_url))
      }
      if (typeof data?.is_last_signer === 'boolean') {
        setIsLastSigner(Boolean(data.is_last_signer))
      }

      // Success: mark completed in UI
      setStep('completed')

    } catch (err) {
      console.error('Error applying signature:', err)
      setError('Error al guardar la firma. Por favor, intentá nuevamente.')
    }
  }

  const handleRetrySignNow = () => {
    setEmbedError(false)
    // Reload the page to regenerate the embed URL
    window.location.reload()
  }

  const handleContinueWithoutSignNow = async () => {
    if (!signerData) return

    // Log that user is bypassing SignNow
    await logEvent({
      workflowId: signerData.workflow_id,
      signerId: signerData.signer_id,
      eventType: 'signnow_bypassed' as any,
      details: { reason: 'embed_error' }
    })

    // Switch to EcoSign signature mode
    setStep('signing')
    // Force update signer data to use ECOSIGN
    setSignerData({
      ...signerData,
      workflow: {
        ...signerData.workflow,
        signature_type: 'ECOSIGN'
      }
    } as any)
  }

  const handleDownloadSignedPdf = async () => {
    if (!signerData) return
    const workflow = signerData.workflow
    const baseName = workflow.original_filename || workflow.title || 'documento'
    const fileName = baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`

    try {
      if (pdfUrl) {
        const resp = await fetch(pdfUrl)
        if (!resp.ok) throw new Error('No se pudo descargar el documento')
        const pdfBlob = await resp.blob()
        const blobUrl = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        link.target = '_self'
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
        return
      }

      let pdfBlob: Blob | null = null

      if (workflow.encryption_key) {
        let encryptedBlob: Blob | null = null
        if (signerData.encrypted_pdf_url) {
          const resp = await fetch(signerData.encrypted_pdf_url)
          if (!resp.ok) throw new Error('No se pudo descargar el documento')
          encryptedBlob = await resp.blob()
        } else if (workflow.document_path) {
          const { success, data, error: downloadError } = await downloadDocument(workflow.document_path)
          if (!success || !data) {
            throw new Error(downloadError || 'No se pudo descargar el documento')
          }
          encryptedBlob = data
        }

        if (!encryptedBlob) {
          throw new Error('No se pudo acceder al documento')
        }

        const decrypted = await decryptFile(encryptedBlob, workflow.encryption_key)
        pdfBlob = new Blob([await decrypted.arrayBuffer()], { type: 'application/pdf' })
      } else {
        const directUrl = signerData.encrypted_pdf_url || workflow.document_path
        if (!directUrl) {
          throw new Error('No se pudo acceder al documento')
        }
        const resp = await fetch(directUrl)
        if (!resp.ok) throw new Error('No se pudo descargar el documento')
        pdfBlob = await resp.blob()
      }

      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.target = '_self'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading signed PDF:', err)
      window.alert('No se pudo descargar el PDF firmado. Intentá nuevamente.')
    }
  }

  const handleDownloadEco = async () => {
    try {
      let url = ecoUrl
      if (!url && ecoPath && signerData) {
        const supabase = getSupabase()
        const { data, error } = await supabase.functions.invoke('get-eco-url', {
          body: {
            path: ecoPath,
            workflowId: signerData.workflow_id,
            signerId: signerData.signer_id
          }
        })
        if (error || !data?.success || !data?.signed_url) {
          throw new Error(error?.message || 'No se pudo generar la URL del ECO')
        }
        url = String(data.signed_url)
      }

      if (!url) {
        throw new Error('No se pudo descargar el ECO')
      }

      const resp = await fetch(url)
      if (!resp.ok) throw new Error('No se pudo descargar el ECO')
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = 'evidencia.ECO'
      link.target = '_self'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Error downloading ECO:', err)
      window.alert('No se pudo descargar el ECO. Intentá nuevamente.')
    }
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
                onClick={handleCloseAction}
                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                {isSignerMode ? 'Cerrar' : 'Ir a documentos'}
              </button>
            </div>
          </div>
        )}

        {step === 'cancelled_info' && (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="max-w-md text-center">
              <div className="mb-6 flex justify-center">
                <svg
                  className="h-20 w-20 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-7 4h8m2 5H6a2 2 0 01-2-2V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Este flujo fue cancelado</h2>
              <p className="mb-6 text-gray-600">
                El propietario canceló este proceso. No hiciste nada mal.
                Si te vuelven a invitar, vas a recibir un nuevo correo.
              </p>
              <button
                onClick={handleCloseAction}
                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {step === 'rejected' && (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="max-w-md text-center">
              <div className="mb-6 flex justify-center">
                <svg
                  className="h-20 w-20 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Documento rechazado</h2>
              <p className="mb-6 text-gray-600">
                {error || 'El rechazo quedó registrado correctamente.'}
              </p>
              <button
                onClick={handleCloseAction}
                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                {isSignerMode ? 'Cerrar' : 'Ir a documentos'}
              </button>
            </div>
          </div>
        )}

        {step === 'preaccess' && signerData && (
          <PreAccess
            documentTitle={signerData.workflow.title || signerData.workflow.original_filename || 'Documento'}
            senderName={signerData.workflow.owner_name}
            senderEmail={signerData.workflow.owner_email}
            signerEmail={signerData.email}
            initialFirstName={getInitialNameParts(signerData.name).firstName}
            initialLastName={getInitialNameParts(signerData.name).lastName}
            isSubmitting={preAccessSubmitting}
            errorMessage={error}
            onConfirm={handlePreAccessConfirm}
            onReject={() => handleRejectSignature('pre_identity')}
          />
        )}

        {step === 'nda' && signerData && (
          <NDAAcceptance
            workflow={signerData.workflow}
            ndaText={signerData.workflow.nda_text || ''}
            onAccept={handleNDAAccept}
          />
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
                {!otpSent && (
                  <button
                    onClick={sendOtp}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Enviar código
                  </button>
                )}
                {otpSent && (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          verifyOtp()
                        }
                      }}
                      placeholder="Código de 6 dígitos"
                      className="w-full rounded-lg border px-4 py-3 text-sm"
                    />
                    <button
                      onClick={verifyOtp}
                      disabled={verifyingOtp}
                      className="w-full rounded-lg border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {verifyingOtp ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verificando...
                        </span>
                      ) : (
                        'Verificar código'
                      )}
                    </button>
                    <button
                      onClick={sendOtp}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Reenviar código
                    </button>
                  </>
                )}
                {error && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button
                  onClick={() => handleRejectSignature('post_identity')}
                  disabled={rejecting}
                  className="w-full rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  {rejecting ? 'Registrando rechazo...' : 'Rechazar documento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'viewing' && signerData && (
          <DocumentViewer
            documentPath={signerData.workflow.document_path}
            encryptionKey={signerData.workflow.encryption_key}
            workflowId={signerData.workflow_id}
            signerId={signerData.signer_id}
            signedUrl={signerData.encrypted_pdf_url}
            stamps={signerData.prior_signature_stamps}
            onContinue={handleDocumentViewed}
            onReject={() => handleRejectSignature('post_view')}
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

                {embedError && (
                  <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-900">
                        Problema cargando la firma legal
                      </h4>
                    </div>
                    <p className="mb-3 text-sm text-yellow-700">
                      El sistema de firma certificada está teniendo problemas temporales.
                      Podés reintentar o continuar con la Firma Legal.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRetrySignNow}
                        className="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={handleContinueWithoutSignNow}
                        className="rounded-lg border border-yellow-600 px-4 py-2 text-yellow-700 hover:bg-yellow-50"
                      >
                        Continuar con Firma Legal
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-lg border">
                  <iframe
                    src={signerData.workflow.signnow_embed_url || accessMeta?.signnow_embed_url || ''}
                    title="SignNow"
                    className="h-[600px] w-full"
                    allow="clipboard-write"
                    onLoad={() => {
                      // Cancel timeout if iframe loads successfully
                      if (embedTimeout) {
                        clearTimeout(embedTimeout)
                        setEmbedTimeout(null)
                      }
                    }}
                  />
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => handleRejectSignature('signature_stage')}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Rechazar documento
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <SignaturePad
              signerName={signerData.name || signerData.email}
              workflowId={signerData.workflow_id}
              signerId={signerData.signer_id}
              fields={(signerData.workflow_fields ?? []).filter((f) => f.field_type !== 'signature')}
              signatureAllPages={(signerData.workflow_fields ?? []).some((f) => f.field_type === 'signature' && Boolean(f.apply_to_all_pages))}
              fieldValues={fieldValues}
              onFieldValueChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
              validate={() => {
                const fields = (signerData.workflow_fields ?? []).filter((f) => f.field_type !== 'signature')
                for (const f of fields) {
                  const raw = (fieldValues[f.id] ?? '').trim()
                  if (!raw) return 'Completá todos los campos antes de firmar'
                  if (f.field_type === 'date') {
                    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(raw)
                    const dateValue = new Date(raw)
                    if (!isValidFormat || Number.isNaN(dateValue.getTime())) {
                      return 'Ingresá una fecha válida'
                    }
                  }
                }
                return null
              }}
              onSign={handleSignatureApplied}
              onReject={() => handleRejectSignature('signature_stage')}
            />
          )
        )}

        {step === 'completed' && signerData && (
          <CompletionScreen
            workflowTitle={signerData.workflow.title}
            onDownloadPdf={handleDownloadSignedPdf}
            onDownloadEco={(ecoUrl || ecoPath) ? handleDownloadEco : undefined}
            isLastSigner={isLastSigner}
            onClose={() => navigate(homePath)}
            showCloseAction={!isSignerMode}
            closeLabel={isSignerMode ? 'Cerrar' : 'Ir a documentos'}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
