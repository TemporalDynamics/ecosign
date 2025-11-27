// ============================================
// MFAChallenge Component - REAL TOTP Implementation
// ============================================
// Verifies TOTP code before allowing document access
// Logs ECOX events for MFA success/failure
// ============================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Shield, AlertTriangle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface MFAChallengeProps {
  workflowId: string
  signerId: string
  onSuccess: () => void
  onMFANotSetup?: () => void
}

export default function MFAChallenge({
  workflowId,
  signerId,
  onSuccess,
  onMFANotSetup
}: MFAChallengeProps) {
  const [factors, setFactors] = useState<any[]>([])
  const [selectedFactor, setSelectedFactor] = useState<any | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    loadMFAFactors()
  }, [])

  useEffect(() => {
    // Auto-submit when 6 digits are entered
    if (verificationCode.length === 6 && challengeId && !isVerifying) {
      verifyCode()
    }
  }, [verificationCode])

  const loadMFAFactors = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No autenticado')
      }

      // Get all enrolled MFA factors
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors()

      if (factorsError) {
        throw factorsError
      }

      const totpFactors = data?.totp || []

      if (totpFactors.length === 0) {
        // No MFA setup, skip for now (or redirect to setup)
        console.warn('⚠️ No MFA factors found for user')
        if (onMFANotSetup) {
          onMFANotSetup()
        } else {
          // For now, allow to continue but log warning
          onSuccess()
        }
        return
      }

      setFactors(totpFactors)
      const firstFactor = totpFactors[0]
      setSelectedFactor(firstFactor)

      // Create challenge for the first factor
      await createChallenge(firstFactor.id)

    } catch (err: any) {
      console.error('Error loading MFA factors:', err)
      setError('Error al cargar configuración MFA')
    } finally {
      setIsLoading(false)
    }
  }

  const createChallenge = async (factorId: string) => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId })

      if (error) {
        throw error
      }

      setChallengeId(data.id)

      // Log ECOX event
      await logEvent('mfa_challenged')

    } catch (err: any) {
      console.error('Error creating MFA challenge:', err)
      setError('Error al generar desafío MFA')
    }
  }

  const verifyCode = async () => {
    if (!selectedFactor || !challengeId || verificationCode.length !== 6) {
      return
    }

    try {
      setIsVerifying(true)
      setError(null)

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: selectedFactor.id,
        challengeId: challengeId,
        code: verificationCode
      })

      if (verifyError) {
        throw verifyError
      }

      // Success!
      await logEvent('mfa_success', { attempts: attempts + 1 })
      onSuccess()

    } catch (err: any) {
      console.error('Error verifying MFA code:', err)
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      await logEvent('mfa_failed', { attempts: newAttempts })

      if (err.message?.includes('Invalid code') || err.message?.includes('invalid')) {
        setError(`Código incorrecto (intento ${newAttempts}/5). Por favor, verificá e intentá nuevamente.`)
      } else if (err.message?.includes('expired')) {
        setError('El desafío expiró. Generando uno nuevo...')
        setVerificationCode('')
        await createChallenge(selectedFactor.id)
      } else {
        setError('Error al verificar el código. Por favor, intentá nuevamente.')
      }

      // Clear code on error
      setVerificationCode('')

      // Lock after 5 failed attempts
      if (newAttempts >= 5) {
        setError('Demasiados intentos fallidos. Por favor, contactá al administrador.')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const logEvent = async (eventType: string, metadata: any = {}) => {
    try {
      await supabase.functions.invoke('log-ecox-event', {
        body: {
          workflow_id: workflowId,
          signer_id: signerId,
          event_type: eventType,
          metadata
        }
      })
    } catch (err) {
      console.error('Error logging ECOX event:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" message="Cargando verificación de seguridad..." />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verificación de Seguridad</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ingresá el código de tu aplicación autenticadora
          </p>
        </div>

        {/* Factor selector (if multiple) */}
        {factors.length > 1 && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Método de autenticación
            </label>
            <select
              value={selectedFactor?.id || ''}
              onChange={(e) => {
                const factor = factors.find(f => f.id === e.target.value)
                setSelectedFactor(factor)
                createChallenge(factor.id)
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              {factors.map((factor) => (
                <option key={factor.id} value={factor.id}>
                  {factor.friendly_name || 'Autenticador TOTP'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Verification code input */}
        <div className="mb-4">
          <label htmlFor="code" className="mb-2 block text-sm font-medium text-gray-700">
            Código de 6 dígitos
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-widest focus:border-blue-500 focus:outline-none"
            placeholder="000000"
            autoFocus
            disabled={isVerifying || attempts >= 5}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Attempts warning */}
        {attempts > 0 && attempts < 5 && !error && (
          <div className="mb-4 rounded-lg bg-yellow-50 p-3">
            <p className="text-xs text-yellow-800">
              {5 - attempts} intento{5 - attempts !== 1 ? 's' : ''} restante{5 - attempts !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Verify button (shown if not auto-submitting) */}
        {verificationCode.length === 6 && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>Verificando...</span>
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Abrí tu aplicación autenticadora (Google Authenticator, Authy, etc.) e ingresá el código de 6 dígitos.
          </p>
        </div>
      </div>
    </div>
  )
}
