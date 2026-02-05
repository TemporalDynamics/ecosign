import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSupabase } from '@/lib/supabaseClient'
import { formatHashForDisplay } from '@/utils/hashDocument'
import Header from '@/components/Header'
import FooterInternal from '@/components/FooterInternal'
import { ArrowLeft, Clock, Download, FileText, RefreshCw, ShieldCheck, Users, XCircle } from 'lucide-react';
import { deriveHumanState } from '@/lib/deriveHumanState'

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
  signing_order?: number | null
}

type AuditEvent = {
  id: string
  event_type: string
  created_at: string
  signer_id: string | null
  details: Record<string, any> | null
}

type WorkflowArtifact = {
  id: string
  artifact_hash: string
  artifact_url: string
  finalized_at: string
  status: 'pending' | 'building' | 'ready' | 'failed'
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  ready: 'bg-slate-100 text-slate-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-amber-100 text-amber-800',
  archived: 'bg-gray-100 text-gray-700'
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  ready: 'Listo',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
  archived: 'Archivado'
}

const signerStatusLabels: Record<string, string> = {
  created: 'Creado',
  invited: 'Invitado',
  accessed: 'Accedido',
  verified: 'Verificado',
  ready_to_sign: 'Listo para firmar',
  signed: 'Firmado',
  cancelled: 'Cancelado',
  expired: 'Expirado'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  )
}

function SignersList({ signers }: { signers: Signer[] }) {
  const ordered = [...signers].sort((a, b) => (a.signing_order ?? 999) - (b.signing_order ?? 999))
  const nextSigner = ordered.find((s) => !['signed', 'cancelled', 'expired', 'skipped'].includes(s.status))
  return (
    <div className="space-y-2">
      {ordered.map((s) => {
        const isNext = nextSigner?.id === s.id
        let badgeLabel = signerStatusLabels[s.status] || s.status
        if (s.status === 'signed') badgeLabel = 'Firmado'
        if (isNext && s.status !== 'signed') badgeLabel = 'Siguiente en la lista'
        if (!isNext && !['signed', 'cancelled', 'expired', 'skipped'].includes(s.status)) {
          badgeLabel = 'Esperando firma'
        }
        const badgeClass =
          s.status === 'signed'
            ? 'bg-blue-100 text-blue-800'
            : isNext
            ? 'bg-green-100 text-green-800'
            : ['cancelled', 'expired', 'skipped'].includes(s.status)
            ? 'bg-gray-100 text-gray-700'
            : 'bg-green-50 text-green-700'

        return (
        <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">{s.name || s.email}</div>
            <div className="text-xs text-gray-600">{s.email}</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
              {badgeLabel}
            </span>
            {s.signed_at && (
              <span className="text-gray-500">{new Date(s.signed_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      )})}
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
  const [artifact, setArtifact] = useState<WorkflowArtifact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const humanState = deriveHumanState(workflow, signers)

  useEffect(() => {
    if (id) {
      loadData(id)
    }
  }, [id])

  // C3: Listen for workflow.artifact_finalized event
  useEffect(() => {
    if (!id) return

    const supabase = getSupabase()
    
    const subscription = supabase
      .channel(`workflow-artifacts:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_artifacts',
          filter: `workflow_id=eq.${id}`
        },
        (payload) => {
          console.log('Artifact finalized:', payload)
          setArtifact(payload.new as WorkflowArtifact)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_artifacts',
          filter: `workflow_id=eq.${id}`
        },
        (payload) => {
          console.log('Artifact updated:', payload)
          setArtifact(payload.new as WorkflowArtifact)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [id])

  const loadData = async (workflowId: string) => {
    try {
      const supabase = getSupabase();
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
        .select('id, email, name, status, signed_at, signing_order')
        .eq('workflow_id', workflowId)
        .order('signing_order', { ascending: true })

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

      // C3: Load artifact if exists
      const { data: artifactData, error: artifactError } = await supabase
        .from('workflow_artifacts')
        .select('id, artifact_hash, artifact_url, finalized_at, status')
        .eq('workflow_id', workflowId)
        .maybeSingle()

      if (artifactError) console.warn('Error loading artifact:', artifactError)
      setArtifact(artifactData as WorkflowArtifact | null)
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
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Sesión no válida')
        return
      }

      const { data, error } = await supabase.functions.invoke('get-signed-url', {
        body: { path: workflow.document_path, bucket: 'user-documents', expiresIn: 3600 },
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (error || !data?.signedUrl) {
        throw error || new Error('Error generando URL firmada')
      }

      window.open(data.signedUrl as string, '_blank')
    } catch (err) {
      alert('No se pudo descargar el PDF firmado')
      console.error(err)
    }
  }

  const downloadECO = async () => {
    if (!workflow) return
    try {
      const supabase = getSupabase();
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
      const supabase = getSupabase();
      setActionLoading(true)
      const { error } = await supabase.functions.invoke('cancel-workflow', {
        body: { workflowId: workflow.id }
      })
      if (error) throw error
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
      <Header variant="private" />
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
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm font-medium text-gray-800">{humanState.label}</span>
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
              {/* C3: Show artifact download button only when ready */}
              {artifact?.status === 'ready' && artifact.artifact_url ? (
                <a
                  href={artifact.artifact_url}
                  download
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" /> Artefacto Final
                </a>
              ) : workflow?.status === 'completed' && (artifact?.status === 'building' || artifact?.status === 'pending') ? (
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
                >
                  <RefreshCw className="h-4 w-4 animate-spin" /> Procesando documento final...
                </button>
              ) : workflow?.status === 'completed' && !artifact ? (
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
                >
                  <RefreshCw className="h-4 w-4 animate-spin" /> Procesando documento final...
                </button>
              ) : (
                <button
                  onClick={downloadPDF}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" /> PDF firmado
                </button>
              )}
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
