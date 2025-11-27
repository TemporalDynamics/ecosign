// ============================================
// SignersList Component
// ============================================
// Lista de firmantes con estados y acciones
// ============================================

import { Mail, CheckCircle, Clock, XCircle, User } from 'lucide-react'

interface Signer {
  id: string
  workflow_id: string
  email: string
  name: string | null
  status: 'pending' | 'signed' | 'cancelled'
  signing_order: number
  signed_at: string | null
  require_login: boolean
  require_nda: boolean
  quick_access: boolean
}

interface SignersListProps {
  signers: Signer[]
  onResendEmail: (signerId: string) => void
}

export default function SignersList({ signers, onResendEmail }: SignersListProps) {
  if (signers.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No hay firmantes en este workflow</p>
      </div>
    )
  }

  const getStatusIcon = (status: Signer['status']) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusText = (status: Signer['status']) => {
    switch (status) {
      case 'signed':
        return 'Firmado'
      case 'pending':
        return 'Pendiente'
      case 'cancelled':
        return 'Cancelado'
    }
  }

  const getStatusColor = (status: Signer['status']) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="space-y-3">
      {signers.map((signer) => (
        <div
          key={signer.id}
          className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                  {signer.signing_order}
                </span>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {signer.name || signer.email}
                  </h4>
                  {signer.name && (
                    <p className="text-sm text-gray-600">{signer.email}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(signer.status)}`}
                >
                  {getStatusIcon(signer.status)}
                  <span>{getStatusText(signer.status)}</span>
                </span>

                {signer.require_login && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Requiere Login
                  </span>
                )}

                {signer.require_nda && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                    Requiere NDA
                  </span>
                )}

                {signer.quick_access && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    Acceso Rápido
                  </span>
                )}
              </div>

              {signer.signed_at && (
                <p className="mt-2 text-xs text-gray-500">
                  Firmado el {new Date(signer.signed_at).toLocaleString('es-AR')}
                </p>
              )}
            </div>

            {signer.status === 'pending' && (
              <button
                onClick={() => onResendEmail(signer.id)}
                className="ml-4 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                title="Reenviar invitación"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Reenviar</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
