// ============================================
// WorkflowsPage - NEW Dashboard for Workflows
// ============================================
// Replaces DashboardPage for new schema
// Reuses DashboardNav and FooterInternal
// ============================================

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import DashboardNav from '../components/DashboardNav'
import FooterInternal from '../components/FooterInternal'
import WorkflowList from '@/components/workflows/WorkflowList'
import CreateWorkflowWizard from '@/components/workflows/CreateWorkflowWizard'
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Users from 'lucide-react/dist/esm/icons/users';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';

interface Workflow {
  id: string
  title: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  expires_at: string | null
}

interface WorkflowSigner {
  id: string
  workflow_id: string
  status: 'pending' | 'signed' | 'cancelled'
}

export default function WorkflowsPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [signers, setSigners] = useState<WorkflowSigner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No autenticado')
      }

      // Load workflows owned by user
      const { data: workflowsData, error: workflowsError } = await supabase
        .from('signature_workflows')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (workflowsError) throw workflowsError

      // Load all signers for these workflows
      if (workflowsData && workflowsData.length > 0) {
        const workflowIds = workflowsData.map(w => w.id)
        const { data: signersData, error: signersError } = await supabase
          .from('workflow_signers')
          .select('id, workflow_id, status')
          .in('workflow_id', workflowIds)

        if (signersError) throw signersError
        setSigners(signersData || [])
      }

      setWorkflows(workflowsData || [])
    } catch (err: any) {
      console.error('Error loading workflows:', err)
      setError(err.message || 'Error al cargar workflows')
    } finally {
      setLoading(false)
    }
  }

  const handleWorkflowCreated = (workflowId: string) => {
    console.log('Workflow created:', workflowId)
    loadWorkflows()
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalWorkflows = workflows.length
    const activeWorkflows = workflows.filter(w => w.status === 'active').length
    const completedWorkflows = workflows.filter(w => w.status === 'completed').length
    const totalSigners = signers.length
    const signedCount = signers.filter(s => s.status === 'signed').length

    return [
      {
        title: 'Total Workflows',
        value: totalWorkflows,
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      {
        title: 'Activos',
        value: activeWorkflows,
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      },
      {
        title: 'Completados',
        value: completedWorkflows,
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      {
        title: 'Firmas Totales',
        value: `${signedCount}/${totalSigners}`,
        icon: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      }
    ]
  }, [workflows, signers])

  // Enhance workflows with signer counts
  const workflowsWithCounts = useMemo(() => {
    return workflows.map(workflow => {
      const workflowSigners = signers.filter(s => s.workflow_id === workflow.id)
      const signedCount = workflowSigners.filter(s => s.status === 'signed').length
      const pendingCount = workflowSigners.filter(s => s.status === 'pending').length

      return {
        ...workflow,
        total_signers: workflowSigners.length,
        signed_count: signedCount,
        pending_count: pendingCount
      }
    })
  }, [workflows, signers])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <DashboardNav />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Workflows</h1>
              <p className="mt-2 text-gray-600">
                Gestiona tus workflows de firma electrónica
              </p>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700"
            >
              + Nuevo Workflow
            </button>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`rounded-full ${stat.bgColor} p-3`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Workflows List */}
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Workflows Recientes</h2>
            <WorkflowList
              workflows={workflowsWithCounts}
              loading={loading}
              error={error}
              onRefresh={loadWorkflows}
            />
          </div>
        </div>
      </main>

      <FooterInternal />

      {/* Create Workflow Wizard */}
      <CreateWorkflowWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onWorkflowCreated={handleWorkflowCreated}
      />
    </div>
  )
}
