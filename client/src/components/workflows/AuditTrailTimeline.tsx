// ============================================
// AuditTrailTimeline Component
// ============================================
// Timeline visual de eventos ECOX del workflow
// ============================================

import FileText from 'lucide-react/dist/esm/icons/file-text';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Eye from 'lucide-react/dist/esm/icons/eye';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Shield from 'lucide-react/dist/esm/icons/shield';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';

interface AuditEvent {
  id: string
  workflow_id: string
  signer_id: string | null
  event_type: string
  event_timestamp: string
  ip_address: string | null
  user_agent: string | null
  geolocation: any
  metadata: any
}

interface AuditTrailTimelineProps {
  events: AuditEvent[]
}

export default function AuditTrailTimeline({ events }: AuditTrailTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No hay eventos registrados aún</p>
      </div>
    )
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'workflow_created':
        return <FileText className="h-5 w-5 text-blue-600" />
      case 'email_sent':
      case 'signer_invitation_sent':
        return <Mail className="h-5 w-5 text-purple-600" />
      case 'document_viewed':
        return <Eye className="h-5 w-5 text-indigo-600" />
      case 'signature_started':
        return <PenTool className="h-5 w-5 text-orange-600" />
      case 'signature_completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'mfa_success':
      case 'mfa_challenged':
        return <Shield className="h-5 w-5 text-cyan-600" />
      case 'mfa_failed':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'nda_accepted':
        return <FileText className="h-5 w-5 text-teal-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getEventTitle = (eventType: string) => {
    switch (eventType) {
      case 'workflow_created':
        return 'Workflow Creado'
      case 'email_sent':
        return 'Email Enviado'
      case 'signer_invitation_sent':
        return 'Invitación Enviada'
      case 'document_viewed':
        return 'Documento Visualizado'
      case 'signature_started':
        return 'Firma Iniciada'
      case 'signature_completed':
        return 'Firma Completada'
      case 'mfa_challenged':
        return 'Desafío MFA Iniciado'
      case 'mfa_success':
        return 'MFA Verificado'
      case 'mfa_failed':
        return 'MFA Fallido'
      case 'nda_accepted':
        return 'NDA Aceptado'
      default:
        return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'workflow_created':
        return 'bg-blue-100 border-blue-300'
      case 'email_sent':
      case 'signer_invitation_sent':
        return 'bg-purple-100 border-purple-300'
      case 'document_viewed':
        return 'bg-indigo-100 border-indigo-300'
      case 'signature_started':
        return 'bg-orange-100 border-orange-300'
      case 'signature_completed':
        return 'bg-green-100 border-green-300'
      case 'mfa_success':
      case 'mfa_challenged':
        return 'bg-cyan-100 border-cyan-300'
      case 'mfa_failed':
        return 'bg-red-100 border-red-300'
      case 'nda_accepted':
        return 'bg-teal-100 border-teal-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200" />

      {events.map((event, index) => (
        <div key={event.id} className="relative pl-12">
          {/* Timeline dot */}
          <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white">
            {getEventIcon(event.event_type)}
          </div>

          {/* Event card */}
          <div className={`rounded-lg border p-4 ${getEventColor(event.event_type)}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">
                  {getEventTitle(event.event_type)}
                </h4>
                <p className="mt-1 text-xs text-gray-600">
                  {new Date(event.event_timestamp).toLocaleString('es-AR', {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                  })}
                </p>

                {/* Additional info */}
                <div className="mt-2 space-y-1 text-xs text-gray-700">
                  {event.ip_address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>IP: {event.ip_address}</span>
                    </div>
                  )}

                  {event.geolocation?.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {event.geolocation.city}, {event.geolocation.country}
                      </span>
                    </div>
                  )}

                  {event.metadata?.document_hash && (
                    <div className="mt-2 rounded bg-white/50 p-2 font-mono text-xs">
                      Hash: {event.metadata.document_hash.slice(0, 24)}...
                    </div>
                  )}

                  {event.metadata?.attempts && event.event_type === 'mfa_failed' && (
                    <div className="mt-1 text-red-700">
                      Intento #{event.metadata.attempts}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
