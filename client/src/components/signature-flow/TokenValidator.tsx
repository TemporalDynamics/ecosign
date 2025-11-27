// ============================================
// TokenValidator Component
// ============================================
// Simple loading screen while validating the
// access token for a signature workflow.
// ============================================

import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface TokenValidatorProps {
  message?: string
}

export default function TokenValidator({
  message = 'Validando link de firma...'
}: TokenValidatorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <LoadingSpinner size="lg" message={message} />
        <p className="mt-4 text-center text-sm text-gray-600">
          Esto puede tardar unos segundos mientras verificamos la vigencia del enlace.
        </p>
      </div>
    </div>
  )
}
