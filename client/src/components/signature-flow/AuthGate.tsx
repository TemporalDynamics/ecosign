// ============================================
// AuthGate Component
// ============================================
// Lightweight Supabase email/password auth gate
// used in the /sign/[token] flow. Keeps the UI
// minimal to avoid distracting the signer.
// ============================================

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';

interface AuthGateProps {
  onComplete: () => void
}

export default function AuthGate({ onComplete }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If the user is already authenticated, skip the gate
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        onComplete()
      }
    }

    checkSession().catch(console.error)
  }, [onComplete])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Ingresá email y contraseña para continuar')
      return
    }

    try {
      setLoading(true)

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          throw error
        }
      }

      onComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Identificate para continuar
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Necesitamos validar tu identidad antes de mostrar el documento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            {loading ? (
              <LoadingSpinner size="sm" message="" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4" />
                Ingresar
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Crear cuenta
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <>
              ¿No tenés cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Registrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
