// ============================================
// WorkflowStatus Component
// ============================================
// Badge and progress display for workflow status
// ============================================

type WorkflowStatusType = 'draft' | 'active' | 'completed' | 'cancelled'

interface WorkflowStatusProps {
  status: WorkflowStatusType
  showLabel?: boolean
}

interface WorkflowProgressProps {
  totalSigners: number
  completedSigners: number
  showPercentage?: boolean
}

// Status Badge Component
export function WorkflowStatusBadge({ status, showLabel = true }: WorkflowStatusProps) {
  const statusConfig = {
    draft: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      label: 'Borrador',
      icon: '📝'
    },
    active: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: 'Activo',
      icon: '🔄'
    },
    completed: {
      color: 'bg-green-100 text-green-700 border-green-200',
      label: 'Completado',
      icon: '✅'
    },
    cancelled: {
      color: 'bg-red-100 text-red-700 border-red-200',
      label: 'Cancelado',
      icon: '❌'
    }
  }

  const config = statusConfig[status] || statusConfig.draft

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Progress Bar Component
export function WorkflowProgress({
  totalSigners,
  completedSigners,
  showPercentage = true
}: WorkflowProgressProps) {
  const percentage = totalSigners > 0 ? Math.round((completedSigners / totalSigners) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">
          {completedSigners}/{totalSigners}
        </span>
        {showPercentage && (
          <span className="text-gray-500">({percentage}%)</span>
        )}
      </div>
    </div>
  )
}

// Combined Status + Progress Component
interface WorkflowStatusCardProps {
  status: WorkflowStatusType
  totalSigners: number
  completedSigners: number
}

export function WorkflowStatusCard({
  status,
  totalSigners,
  completedSigners
}: WorkflowStatusCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Estado del workflow</h3>
        <WorkflowStatusBadge status={status} />
      </div>

      {status === 'active' && (
        <div>
          <p className="mb-2 text-xs text-gray-500">Progreso de firmas</p>
          <WorkflowProgress
            totalSigners={totalSigners}
            completedSigners={completedSigners}
          />
        </div>
      )}

      {status === 'completed' && (
        <p className="text-sm text-green-600">
          Todas las firmas completadas
        </p>
      )}
    </div>
  )
}

// Export all components
export default WorkflowStatusBadge
