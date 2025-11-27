import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { formatHashForDisplay } from '@/utils/hashDocument'
import DashboardNav from '@/components/DashboardNav'
import FooterInternal from '@/components/FooterInternal'
import { ArrowLeft, Download, FileText, RefreshCw, Users, ShieldCheck, XCircle, Clock } from 'lucide-react'

type Workflow = {
  id: string
  title: string
  status: string
  document_hash: string | null
  document_path: string | null
  created_at: string
  updated_at: string
}

type Signer = {
  id: string
  email: string
  name: string | null
  status: string
  signed_at: string | null
}

type AuditEvent = {
  id: string
  event_type: string
  created_at: string
  signer_id: string | null
  details: Record<string, any> | null
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function SignersList({ signers }: { signers: Signer[] }) {
  return (
    <div className="space-y-2">
      {signers.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">{s.name || s.email}</div>
            <div className="text-xs text-gray-600">{s.email}</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              s.status === 'signed'
                ? 'bg-green-100 text-green-800'
                : s.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {s.status}
            </span>
            {s.signed_at && (
              <span className="text-gray-500">{new Date(s.signed_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      ))}
      {signers.length === 0 && (
        <p className="text-sm text-gray-600">No hay firmantes.</p>
      )}
    </div>
  )
}

function AuditTrailTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{e.event_type}</span>
            <span className="text-gray-600">{new Date(e.created_at).toLocaleString()}</span>
          </div>
          {e.details && (
            <pre className="mt-2 rounded bg-gray-50 p-2 text-[11px] text-gray-700 overflow-x-auto">
              {JSON.stringify(e.details, null, 2)}
            </pre>
          )}
        </div>
      ))}
      {events.length === 0 && (
        <p className="text-sm text-gray-600">Sin eventos forenses registrados.</p>
      )}
    </div>
  )
}

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [signers, setSigners] = useState<Signer[]>([])
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadData(id)
    }
  }, [id])

  const loadData = async (workflowId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data: wf, error: wfError } = await supabase
        .from('signature_workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (wfError) throw wfError
      setWorkflow(wf as Workflow)

      const { data: signerData, error: signerError } = await supabase
        .from('workflow_signers')
        .select('id, email, name, status, signed_at')
        .eq('workflow_id', workflowId)
        .order('signed_at', { ascending: true })

      if (signerError) throw signerError
      setSigners((signerData || []) as Signer[])

      const { data: auditData, error: auditError } = await supabase
        .from('ecox_audit_trail')
        .select('id, event_type, created_at, signer_id, details')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (auditError) throw auditError
      setAuditTrail((auditData || []) as AuditEvent[])
    } catch (err: any) {
      console.error('Error loading workflow detail:', err)
      setError(err.message || 'Error al cargar el workflow')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!workflow?.document_path) return
    try {
      const { data, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(workflow.document_path, 3600)
      if (urlError || !data?.signedUrl) {
        throw urlError
      }
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      alert('No se pudo descargar el PDF firmado')
      console.error(err)
    }
  }

  const downloadECO = async () => {
    if (!workflow) return
    try {
      const { data, error: rpcError } = await supabase.rpc('generate_ecox_certificate', {
        p_workflow_id: workflow.id
      })
      if (rpcError) throw rpcError
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflow.title || 'documento'}.eco.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('No se pudo descargar el certificado ECOX')
      console.error(err)
    }
  }

  const cancelWorkflow = async () => {
    if (!workflow) return
    try {
      setActionLoading(true)
      const { error: updateError } = await supabase
        .from('signature_workflows')
        .update({ status: 'cancelled' })
        .eq('id', workflow.id)
      if (updateError) throw updateError
      await loadData(workflow.id)
    } catch (err) {
      alert('No se pudo cancelar el workflow')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-700" />
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span className="font-semibold">{error || 'Workflow no encontrado'}</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <DashboardNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/workflows')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a workflows
          </button>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Workflow</p>
              <h1 className="text-2xl font-bold text-gray-900">{workflow.title || 'Sin título'}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                <StatusBadge status={workflow.status} />
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-4 w-4" />
                  Creado: {new Date(workflow.created_at).toLocaleString()}
                </span>
                {workflow.document_hash && (
                  <span className="font-mono text-xs text-gray-600">
                    Hash: {formatHashForDisplay(workflow.document_hash)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadPDF}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> PDF firmado
              </button>
              <button
                onClick={downloadECO}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                <ShieldCheck className="h-4 w-4" /> Certificado ECOX
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
            <Link to={`/verify`} className="inline-flex items-center gap-2 text-blue-700 hover:underline">
              <FileText className="h-4 w-4" /> Verificar por hash
            </Link>
            {workflow.document_path && (
              <span className="inline-flex items-center gap-2 text-gray-600">
                <FileText className="h-4 w-4" /> Ruta: {workflow.document_path}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Firmantes</h3>
              </div>
              <button
                onClick={() => loadData(workflow.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" /> Actualizar
              </button>
            </div>
            <SignersList signers={signers} />
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Audit Trail ECOX</h3>
            </div>
            <AuditTrailTimeline events={auditTrail} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={cancelWorkflow}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" /> Cancelar workflow
          </button>
        </div>
      </main>
      <FooterInternal />
    </div>
  )
}
