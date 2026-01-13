import { useState } from 'react'
import { ShieldCheck, FileText, Mail } from 'lucide-react'

interface PreAccessProps {
  documentTitle: string
  senderName?: string | null
  senderEmail?: string | null
  signerEmail: string
  initialFirstName?: string
  initialLastName?: string
  isSubmitting?: boolean
  errorMessage?: string | null
  onConfirm: (data: {
    firstName: string
    lastName: string
    confirmedRecipient: boolean
    acceptedLogging: boolean
  }) => void
  onReject?: () => void
}

export default function PreAccess({
  documentTitle,
  senderName,
  senderEmail,
  signerEmail,
  initialFirstName = '',
  initialLastName = '',
  isSubmitting = false,
  errorMessage,
  onConfirm,
  onReject
}: PreAccessProps) {
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [confirmedRecipient, setConfirmedRecipient] = useState(false)
  const [acceptedLogging, setAcceptedLogging] = useState(false)

  const isReady =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    confirmedRecipient &&
    acceptedLogging

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Confirmar identidad para ver el documento
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Documento: <strong>{documentTitle}</strong>
            </p>
            {(senderName || senderEmail) && (
              <p className="mt-1 text-sm text-gray-600">
                Enviado por {senderName || senderEmail}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span>{signerEmail}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Apellido</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Tu apellido"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={confirmedRecipient}
              onChange={(e) => setConfirmedRecipient(e.target.checked)}
              className="eco-checkbox mt-1 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Confirmo que soy el destinatario de este documento.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedLogging}
              onChange={(e) => setAcceptedLogging(e.target.checked)}
              className="eco-checkbox mt-1 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Acepto que se registre mi acceso (fecha, IP y dispositivo) para
              proteger a todas las partes.
            </span>
          </label>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Al continuar aceptás el registro técnico mínimo necesario para certificar
          autenticidad e integridad. EcoSign no analiza el contenido del documento.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() =>
              onConfirm({
                firstName,
                lastName,
                confirmedRecipient,
                acceptedLogging
              })
            }
            disabled={!isReady || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <ShieldCheck className="h-5 w-5" />
            {isSubmitting ? 'Procesando...' : 'Continuar'}
          </button>
          {!isReady && (
            <p className="text-center text-xs text-gray-500">
              Completá nombre y apellido y aceptá las dos confirmaciones para continuar.
            </p>
          )}
          {errorMessage && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="w-full rounded-lg border border-red-200 px-6 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Rechazar documento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
