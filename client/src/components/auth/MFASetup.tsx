// ============================================
// MFASetup Component
// ============================================
// Allows users to enroll in TOTP MFA
// Shows QR code and allows verification
// ============================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Shield from 'lucide-react/dist/esm/icons/shield';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface MFASetupProps {
  onComplete: () => void
  onSkip?: () => void
  allowSkip?: boolean
}

interface MFAEnrollment {
  id: string
  type: 'totp'
  totp: {
    qr_code: string
    secret: string
    uri: string
  }
}

export default function MFASetup({ onComplete, onSkip, allowSkip = false }: MFASetupProps) {
  const [enrollmentData, setEnrollmentData] = useState<MFAEnrollment | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  useEffect(() => {
    enrollMFA()
  }, [])

  const enrollMFA = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'EcoSign Authenticator'
      })

      if (enrollError) {
        throw enrollError
      }

      setEnrollmentData(data as MFAEnrollment)
    } catch (err) {
      console.error('Error enrolling MFA:', err)
      setError('Error al configurar MFA. Por favor, intentá nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (!enrollmentData || !verificationCode || verificationCode.length !== 6) {
      setError('Por favor, ingresá un código válido de 6 dígitos')
      return
    }

    try {
      setIsVerifying(true)
      setError(null)

      const { data, error: verifyError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id
      })

      if (verifyError) {
        throw verifyError
      }

      const { error: verifyCodeError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: data.id,
        code: verificationCode
      })

      if (verifyCodeError) {
        throw verifyCodeError
      }

      // MFA successfully enabled
      console.log('✅ MFA enabled successfully')
      onComplete()

    } catch (err: any) {
      console.error('Error verifying MFA code:', err)
      if (err.message?.includes('Invalid code') || err.message?.includes('invalid')) {
        setError('Código incorrecto. Por favor, verificá e intentá nuevamente.')
      } else {
        setError('Error al verificar el código. Por favor, intentá nuevamente.')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const copySecret = () => {
    if (enrollmentData?.totp.secret) {
      navigator.clipboard.writeText(enrollmentData.totp.secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" message="Configurando autenticación de dos factores..." />
      </div>
    )
  }

  if (!enrollmentData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="mb-4 flex justify-center">
            <Shield className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Error de Configuración
          </h2>
          <p className="mb-6 text-center text-gray-600">{error}</p>
          <button
            onClick={enrollMFA}
            className="w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-blue-600" />
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Configurar Autenticación de Dos Factores
          </h1>
          <p className="text-gray-600">
            Protegé tu cuenta con un código de verificación adicional
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Paso 1: Escaneá el código QR
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Usá una app de autenticación como Google Authenticator, Authy, o 1Password para
            escanear el siguiente código QR:
          </p>

          {/* QR Code */}
          <div className="mb-4 flex justify-center rounded-lg bg-white p-6">
            <img
              src={enrollmentData.totp.qr_code}
              alt="QR Code for TOTP"
              className="h-64 w-64"
            />
          </div>

          {/* Manual Secret */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              ¿No podés escanear el código?
            </p>
            <p className="mb-2 text-xs text-gray-600">
              Ingresá este código manualmente en tu app de autenticación:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-gray-100 px-3 py-2 font-mono text-sm text-gray-900">
                {enrollmentData.totp.secret}
              </code>
              <button
                onClick={copySecret}
                className="rounded-md bg-gray-200 p-2 hover:bg-gray-300"
                title="Copiar código"
              >
                {secretCopied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Paso 2: Ingresá el código de verificación
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Ingresá el código de 6 dígitos que aparece en tu app de autenticación:
          </p>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              setVerificationCode(value)
              setError(null)
            }}
            placeholder="000000"
            className="mb-4 w-full rounded-md border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isVerifying}
          />

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={verifyAndEnable}
            disabled={verificationCode.length !== 6 || isVerifying}
            className="w-full rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isVerifying ? 'Verificando...' : 'Verificar y Habilitar MFA'}
          </button>
        </div>

        {/* Skip Option */}
        {allowSkip && onSkip && (
          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Omitir por ahora
            </button>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-blue-800">
            🔒 <strong>Seguridad:</strong> La autenticación de dos factores protege tu cuenta
            incluso si alguien descubre tu contraseña. Recomendamos encarecidamente habilitarla.
          </p>
        </div>
      </div>
    </div>
  )
}
