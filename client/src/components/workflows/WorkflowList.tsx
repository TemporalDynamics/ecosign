// ============================================
// WorkflowList Component
// ============================================
// Displays list of signature workflows
// Similar to DocumentList but for new schema
// ============================================

import { useNavigate } from 'react-router-dom'
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Users from 'lucide-react/dist/esm/icons/users';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { WorkflowStatusBadge } from './WorkflowStatus'

interface Workflow {
  id: string
  title: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  expires_at: string | null
  total_signers: number
  signed_count: number
  pending_count: number
}

interface WorkflowListProps {
  workflows: Workflow[]
  loading: boolean
  error: string | null
  onRefresh?: () => void
}

export default function WorkflowList({
  workflows,
  loading,
  error,
  onRefresh
}: WorkflowListProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600">Cargando workflows...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-medium text-red-900">Error al cargar workflows</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        )}
      </div>
    )
  }

  if (workflows.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <FileText className="mx-auto h-16 w-16 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No hay workflows aún</h3>
        <p className="mt-2 text-sm text-gray-600">
          Comenzá creando tu primer workflow de firma
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          onClick={() => navigate(`/dashboard/workflows/${workflow.id}`)}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{workflow.title}</h3>
                <WorkflowStatusBadge status={workflow.status} />
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {workflow.signed_count}/{workflow.total_signers} firmado
                    {workflow.total_signers !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    Creado {new Date(workflow.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>

                {workflow.expires_at && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Expira {new Date(workflow.expires_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {workflow.status === 'active' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Progreso</span>
                    <span>
                      {Math.round((workflow.signed_count / workflow.total_signers) * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${(workflow.signed_count / workflow.total_signers) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status Icon */}
            <div className="ml-4">
              {workflow.status === 'completed' && (
                <div className="rounded-full bg-green-100 p-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              )}
              {workflow.status === 'active' && (
                <div className="rounded-full bg-blue-100 p-2">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              )}
              {workflow.status === 'cancelled' && (
                <div className="rounded-full bg-red-100 p-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
