// ============================================
// SignWorkflowPage - NEW Signature Flow
// ============================================
// Uses the new signature_workflows schema
// Includes all critical security features:
// - Token validation
// - NDA acceptance
// - Auth gate (login/register required)
// - MFA challenge (CRITICAL - not yet implemented)
// - Document viewer with PDF.js
// - ECOX logging at each step
// - Signature pad
// - Completion screen with .ECO download
// ============================================

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useEcoxLogger } from '@/hooks/useEcoxLogger'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

// Step components (to be created)
import TokenValidator from '@/components/signature-flow/TokenValidator'
import NDAAcceptance from '@/components/signature-flow/NDAAcceptance'
import AuthGate from '@/components/signature-flow/AuthGate'
// import MFAChallenge from '@/components/signature-flow/MFAChallenge' // TODO
import DocumentViewer from '@/components/signature-flow/DocumentViewer'
import SignaturePad from '@/components/signature-flow/SignaturePad'
import CompletionScreen from '@/components/signature-flow/CompletionScreen'

type SignatureStep =
  | 'validating'
  | 'nda'
  | 'auth'
  | 'mfa'
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
  workflow: {
    id: string
    title: string
    document_path: string | null
    document_hash: string | null
    encryption_key: string | null // For decryption
    owner_id: string
    status: string
  }
}

export default function SignWorkflowPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { logEvent } = useEcoxLogger()

  // State
  const [step, setStep] = useState<SignatureStep>('validating')
  const [signerData, setSignerData] = useState<SignerData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

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
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const validateToken = async (accessToken: string) => {
    try {
      setStep('validating')

      // Query workflow_signers with access_token_hash
      const { data: signer, error: signerError } = await supabase
        .from('workflow_signers')
        .select(`
          *,
          workflow:signature_workflows (
            id,
            title,
            document_path,
            document_hash,
            encryption_key,
            owner_id,
            status
          )
        `)
        .eq('access_token_hash', accessToken)
        .single()

      if (signerError || !signer) {
        setError('Link de firma inválido o no encontrado')
        setStep('error')
        return
      }

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
      // TODO: Implement sequential signing logic if needed

      setSignerData(signer as any)

      // Log ECOX event: access_link_opened
      await logEvent({
        workflowId: signer.workflow_id,
        signerId: signer.id,
        eventType: 'access_link_opened'
      })

      // Determine next step based on requirements
      if (signer.require_nda) {
        setStep('nda')
      } else if (signer.require_login && !user) {
        setStep('auth')
      } else {
        // TODO: MFA challenge should be here
        // For now, skip to viewing
        setStep('viewing')
      }

    } catch (err) {
      console.error('Error validating token:', err)
      setError('Error al cargar el documento')
      setStep('error')
    }
  }

  const handleNDAAccepted = async () => {
    if (!signerData) return

    // Log ECOX event
    await logEvent({
      workflowId: signerData.workflow_id,
      signerId: signerData.id,
      eventType: 'nda_accepted'
    })

    // Move to next step
    if (signerData.require_login && !user) {
      setStep('auth')
    } else {
      // TODO: MFA challenge
      setStep('viewing')
    }
  }

  const handleAuthCompleted = async () => {
    // Refresh user state
    await checkAuth()

    // TODO: MFA challenge should be next
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
      // Log ECOX event: signature_applied
      await logEvent({
        workflowId: signerData.workflow_id,
        signerId: signerData.id,
        eventType: 'signature_applied',
        details: {
          signature_type: signatureData.type
        }
      })

      // Update signer status to 'signed'
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
        eventType: 'signature_completed'
      })

      // Triggers will automatically:
      // 1. Send email to owner (on_signature_completed)
      // 2. Send email to signer (on_signature_completed)
      // 3. Check if workflow is complete and send .ECO to all (on_workflow_completed)

      setStep('completed')

    } catch (err) {
      console.error('Error applying signature:', err)
      setError('Error al guardar la firma. Por favor, intentá nuevamente.')
      setStep('error')
    }
  }

  const handleDownloadECO = async () => {
    if (!signerData) return

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

        {step === 'auth' && signerData && (
          <AuthGate onComplete={handleAuthCompleted} />
        )}

        {step === 'viewing' && signerData && (
          <DocumentViewer
            documentPath={signerData.workflow.document_path}
            encryptionKey={signerData.workflow.encryption_key}
            workflowId={signerData.workflow_id}
            signerId={signerData.id}
            onContinue={handleDocumentViewed}
          />
        )}

        {step === 'signing' && signerData && (
          <SignaturePad
            signerName={signerData.name || signerData.email}
            workflowId={signerData.workflow_id}
            signerId={signerData.id}
            onSign={handleSignatureApplied}
          />
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
