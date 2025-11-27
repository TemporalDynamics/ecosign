// ============================================
// MFAChallenge Component
// ============================================
// CRITICAL SECURITY: Required before viewing documents
// Challenges user with TOTP verification
// Used in the signature workflow
// ============================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Shield, AlertTriangle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface MFAChallengeProps {
  workflowId?: string
  signerId?: string
  onSuccess: () => void
  onMFANotSetup?: () => void
}

interface MFAFactor {
  id: string
  friendly_name: string
  factor_type: 'totp'
  status: 'verified' | 'unverified'
}

export default function MFAChallenge({
  workflowId,
  signerId,
  onSuccess,
  onMFANotSetup
}: MFAChallengeProps) {
  const [factors, setFactors] = useState<MFAFactor[]>([])
  const [selectedFactor, setSelectedFactor] = useState<MFAFactor | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isChallenging, setIsChallenging] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    loadMFAFactors()
  }, [])

  const loadMFAFactors = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get user's MFA factors
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors()

      if (factorsError) {
        throw factorsError
      }

      const totpFactors = data.totp || []

      if (totpFactors.length === 0) {
        // User has no MFA set up
        console.log('⚠️ User has no MFA factors enrolled')
        if (onMFANotSetup) {
          onMFANotSetup()
        }
        return
      }

      // Get verified factors only
      const verifiedFactors = totpFactors.filter(
        (f: MFAFactor) => f.status === 'verified'
      )

      if (verifiedFactors.length === 0) {
        setError('No tenés factores MFA verificados. Por favor, configurá MFA primero.')
        return
      }

      setFactors(verifiedFactors)

      // Auto-select first factor and create challenge
      const firstFactor = verifiedFactors[0]
      setSelectedFactor(firstFactor)
      await createChallenge(firstFactor.id)

    } catch (err) {
      console.error('Error loading MFA factors:', err)
      setError('Error al cargar factores de autenticación.')
    } finally {
      setIsLoading(false)
    }
  }

  const createChallenge = async (factorId: string) => {
    try {
      setIsChallenging(true)
      setError(null)

      const { data, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      })

      if (challengeError) {
        throw challengeError
      }

      setChallengeId(data.id)
      console.log('🔒 MFA challenge created')

    } catch (err) {
      console.error('Error creating MFA challenge:', err)
      setError('Error al crear desafío MFA. Por favor, intentá nuevamente.')
    } finally {
      setIsChallenging(false)
    }
  }

  const verifyCode = async () => {
    if (!selectedFactor || !challengeId || !verificationCode || verificationCode.length !== 6) {
      setError('Por favor, ingresá un código válido de 6 dígitos')
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

      // MFA verification successful
      console.log('✅ MFA challenge passed')

      // Log ECOX event if we have workflow context
      if (workflowId && signerId) {
        try {
          await supabase.functions.invoke('log-ecox-event', {
            body: {
              workflow_id: workflowId,
              signer_id: signerId,
              event_type: 'mfa_success',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              user_agent: navigator.userAgent,
              details: {
                factor_type: 'totp',
                attempts: attempts + 1
              }
            }
          })
        } catch (logError) {
          console.warn('Failed to log ECOX event:', logError)
        }
      }

      onSuccess()

    } catch (err: any) {
      console.error('Error verifying MFA code:', err)

      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (err.message?.includes('Invalid code') || err.message?.includes('invalid')) {
        setError(`Código incorrecto. Intentá nuevamente. (Intento ${newAttempts})`)
      } else if (err.message?.includes('expired')) {
        setError('El desafío expiró. Generando uno nuevo...')
        // Regenerate challenge
        if (selectedFactor) {
          await createChallenge(selectedFactor.id)
        }
      } else {
        setError('Error al verificar el código. Por favor, intentá nuevamente.')
      }

      // Log failed attempt
      if (workflowId && signerId) {
        try {
          await supabase.functions.invoke('log-ecox-event', {
            body: {
              workflow_id: workflowId,
              signer_id: signerId,
              event_type: 'mfa_failed',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              user_agent: navigator.userAgent,
              details: {
                factor_type: 'totp',
                attempts: newAttempts,
                error: err.message
              }
            }
          })
        } catch (logError) {
          console.warn('Failed to log ECOX event:', logError)
        }
      }

      setVerificationCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCodeChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '')
    setVerificationCode(numericValue)
    setError(null)

    // Auto-submit when 6 digits are entered
    if (numericValue.length === 6) {
      // Small delay to show the last digit
      setTimeout(() => {
        verifyCode()
      }, 100)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" message="Verificando autenticación..." />
      </div>
    )
  }

  if (factors.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="mb-4 flex justify-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            MFA No Configurado
          </h2>
          <p className="mb-6 text-center text-gray-600">
            {error || 'Necesitás configurar autenticación de dos factores para continuar.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-blue-600" />
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Verificación de Seguridad
          </h1>
          <p className="text-gray-600">
            Ingresá el código de tu app de autenticación
          </p>
        </div>

        {/* MFA Factor Info */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            <strong>Factor:</strong> {selectedFactor?.friendly_name || 'TOTP Authenticator'}
          </p>
        </div>

        {/* Code Input */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Código de verificación
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="000000"
            autoFocus
            className="mb-4 w-full rounded-md border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isVerifying || isChallenging}
          />

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={verifyCode}
            disabled={verificationCode.length !== 6 || isVerifying || isChallenging}
            className="w-full rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isVerifying ? 'Verificando...' : 'Verificar Código'}
          </button>
        </div>

        {/* Helper Text */}
        <div className="mb-4 rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-blue-800">
            💡 <strong>Consejo:</strong> Abrí tu app de autenticación (Google Authenticator,
            Authy, etc.) y copiá el código de 6 dígitos para EcoSign.
          </p>
        </div>

        {/* Attempts Warning */}
        {attempts >= 3 && (
          <div className="rounded-lg bg-yellow-50 p-4">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>Atención:</strong> Llevás {attempts} intentos fallidos. Asegurate de
              estar usando el código correcto de tu app de autenticación.
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 rounded-lg bg-gray-100 p-4">
          <p className="text-xs text-gray-700">
            🔒 Este paso de verificación es obligatorio para acceder a documentos confidenciales.
            Tu intento de acceso está siendo registrado con evidencia forense.
          </p>
        </div>
      </div>
    </div>
  )
}
