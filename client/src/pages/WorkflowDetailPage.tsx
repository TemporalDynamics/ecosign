// ============================================
// WorkflowDetailPage - Detalles completos del workflow
// ============================================
// Muestra información detallada, firmantes, audit trail
// Acciones: descargar PDF/.ECO, cancelar, reenviar email
// ============================================

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import DashboardNav from '@/components/DashboardNav'
import FooterInternal from '@/components/FooterInternal'
import { WorkflowStatusBadge } from '@/components/workflows/WorkflowStatus'
import SignersList from '@/components/workflows/SignersList'
import AuditTrailTimeline from '@/components/workflows/AuditTrailTimeline'
import {
  ArrowLeft,
  Download,
  FileText,
  Shield,
  XCircle,
  Mail,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Workflow {
  id: string
  title: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  expires_at: string | null
  document_path: string
  document_hash: string
  encryption_key: string
  require_sequential: boolean
  owner_id: string
}

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

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [signers, setSigners] = useState<Signer[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadWorkflowDetails()
    }
  }, [id])

  const loadWorkflowDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No autenticado')
      }

      // Load workflow
      const { data: workflowData, error: workflowError } = await supabase
        .from('signature_workflows')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user.id)
        .single()

      if (workflowError) throw workflowError
      if (!workflowData) throw new Error('Workflow no encontrado')

      setWorkflow(workflowData)

      // Load signers
      const { data: signersData, error: signersError } = await supabase
        .from('workflow_signers')
        .select('*')
        .eq('workflow_id', id)
        .order('signing_order', { ascending: true })

      if (signersError) throw signersError
      setSigners(signersData || [])

      // Load audit trail
      const { data: auditData, error: auditError } = await supabase
        .from('ecox_audit_trail')
        .select('*')
        .eq('workflow_id', id)
        .order('event_timestamp', { ascending: false })

      if (auditError) throw auditError
      setAuditEvents(auditData || [])

    } catch (err: any) {
      console.error('Error loading workflow details:', err)
      setError(err.message || 'Error al cargar detalles del workflow')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!workflow) return

    try {
      toast.loading('Descargando PDF...', { id: 'download-pdf' })

      const { data, error } = await supabase.storage
        .from('documents')
        .download(workflow.document_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflow.title}_firmado.pdf.enc`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('PDF descargado', { id: 'download-pdf' })
    } catch (err: any) {
      console.error('Error downloading PDF:', err)
      toast.error(`Error al descargar PDF: ${err.message}`, { id: 'download-pdf' })
    }
  }

  const handleDownloadECO = async () => {
    if (!workflow) return

    try {
      toast.loading('Generando certificado .ECO...', { id: 'download-eco' })

      const { data, error } = await supabase.rpc('generate_ecox_certificate', {
        p_workflow_id: workflow.id
      })

      if (error) throw error

      // Create .ECO file blob
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflow.title}_certificado.eco`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Certificado .ECO descargado', { id: 'download-eco' })
    } catch (err: any) {
      console.error('Error generating .ECO:', err)
      toast.error(`Error al generar .ECO: ${err.message}`, { id: 'download-eco' })
    }
  }

  const handleCancelWorkflow = async () => {
    if (!workflow) return
    if (!confirm('¿Estás seguro de cancelar este workflow? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      toast.loading('Cancelando workflow...', { id: 'cancel-workflow' })

      const { error } = await supabase
        .from('signature_workflows')
        .update({ status: 'cancelled' })
        .eq('id', workflow.id)

      if (error) throw error

      // Update local state
      setWorkflow({ ...workflow, status: 'cancelled' })

      toast.success('Workflow cancelado', { id: 'cancel-workflow' })
    } catch (err: any) {
      console.error('Error cancelling workflow:', err)
      toast.error(`Error al cancelar: ${err.message}`, { id: 'cancel-workflow' })
    }
  }

  const handleResendEmail = async (signerId: string) => {
    try {
      toast.loading('Reenviando invitación...', { id: `resend-${signerId}` })

      // Insert notification into queue
      const { error } = await supabase
        .from('workflow_notifications')
        .insert({
          workflow_id: workflow!.id,
          signer_id: signerId,
          notification_type: 'signer_invitation',
          sent: false
        })

      if (error) throw error

      toast.success('Invitación reenviada', { id: `resend-${signerId}` })
    } catch (err: any) {
      console.error('Error resending email:', err)
      toast.error(`Error al reenviar: ${err.message}`, { id: `resend-${signerId}` })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <DashboardNav />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-gray-600">Cargando workflow...</p>
          </div>
        </main>
        <FooterInternal />
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <DashboardNav />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Error</h2>
            <p className="mt-2 text-gray-600">{error || 'Workflow no encontrado'}</p>
            <button
              onClick={() => navigate('/dashboard/workflows')}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Volver a Workflows
            </button>
          </div>
        </main>
        <FooterInternal />
      </div>
    )
  }

  const signedCount = signers.filter(s => s.status === 'signed').length
  const totalSigners = signers.length
  const progress = totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <DashboardNav />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard/workflows')}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Volver a Workflows</span>
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">{workflow.title}</h1>
                  <WorkflowStatusBadge status={workflow.status} />
                </div>
                <p className="mt-2 text-gray-600">
                  Creado {new Date(workflow.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Download className="h-5 w-5" />
                  <span>Descargar PDF</span>
                </button>

                <button
                  onClick={handleDownloadECO}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  <Shield className="h-5 w-5" />
                  <span>Descargar .ECO</span>
                </button>

                {workflow.status === 'active' && (
                  <button
                    onClick={handleCancelWorkflow}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    <XCircle className="h-5 w-5" />
                    <span>Cancelar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Progreso</h2>
              <span className="text-2xl font-bold text-blue-600">
                {signedCount}/{totalSigners}
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {signedCount === totalSigners
                ? '¡Todas las firmas completadas!'
                : `${totalSigners - signedCount} firma${totalSigners - signedCount !== 1 ? 's' : ''} pendiente${totalSigners - signedCount !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Signers List */}
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Firmantes</h2>
              <SignersList
                signers={signers}
                onResendEmail={handleResendEmail}
              />
            </div>

            {/* Audit Trail */}
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Historial de Eventos</h2>
              <AuditTrailTimeline events={auditEvents} />
            </div>
          </div>

          {/* Workflow Info */}
          <div className="mt-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Información del Workflow</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-600">Hash del Documento</dt>
                <dd className="mt-1 font-mono text-sm text-gray-900">{workflow.document_hash.slice(0, 32)}...</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Orden de Firma</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {workflow.require_sequential ? 'Secuencial' : 'Paralelo'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Fecha de Expiración</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {workflow.expires_at
                    ? new Date(workflow.expires_at).toLocaleDateString('es-AR')
                    : 'Sin expiración'
                  }
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Última Actualización</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(workflow.updated_at).toLocaleString('es-AR')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>

      <FooterInternal />
    </div>
  )
}
