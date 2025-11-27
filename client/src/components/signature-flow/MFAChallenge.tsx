// ============================================
// MFAChallenge Component (placeholder)
// ============================================
// Minimal UI to gate the flow while full TOTP
// enrollment/verification is implemented. For
// now it calls onSuccess directly.
// ============================================

interface MFAChallengeProps {
  workflowId: string
  signerId: string
  onSuccess: () => void
  onMFANotSetup?: () => void
}

export default function MFAChallenge({
  onSuccess
}: MFAChallengeProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación MFA pendiente</h1>
        <p className="text-sm text-gray-600 mb-6">
          (Placeholder) Falta implementar el desafío TOTP. Mientras tanto, continúa para completar la firma.
        </p>
        <button
          onClick={onSuccess}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
