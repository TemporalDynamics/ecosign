// ============================================
// CreateWorkflowWizard Component
// ============================================
// Multi-step wizard to create signature workflows
// Integrates DocumentUploader for secure upload
// ============================================

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import X from 'lucide-react/dist/esm/icons/x';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Users from 'lucide-react/dist/esm/icons/users';
import Settings from 'lucide-react/dist/esm/icons/settings';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import DocumentUploader from '@/components/documents/DocumentUploader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface CreateWorkflowWizardProps {
  isOpen: boolean
  onClose: () => void
  onWorkflowCreated: (workflowId: string) => void
}

interface Signer {
  email: string
  name: string
  require_login: boolean
  require_nda: boolean
  signing_order: number
}

type WizardStep = 'document' | 'signers' | 'settings' | 'review' | 'creating'

export default function CreateWorkflowWizard({
  isOpen,
  onClose,
  onWorkflowCreated
}: CreateWorkflowWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('document')
  const [error, setError] = useState<string | null>(null)

  // Step 1: Document data
  const [workflowTitle, setWorkflowTitle] = useState('')
  const [documentData, setDocumentData] = useState<{
    filename: string
    contentHash: string
    encryptionKey: string
    encryptedPath: string
    size: number
  } | null>(null)

  // Step 2: Signers data
  const [signers, setSigners] = useState<Signer[]>([
    { email: '', name: '', require_login: true, require_nda: true, signing_order: 1 }
  ])

  // Step 3: Settings
  const [workflowSettings, setWorkflowSettings] = useState({
    sequential: false,
    expiresInDays: 30,
    sendEmailsImmediately: true
  })

  const handleDocumentUpload = (result: any) => {
    setDocumentData(result)
    setWorkflowTitle(result.filename.replace(/\.pdf$/i, ''))
    setCurrentStep('signers')
  }

  const addSigner = () => {
    setSigners([
      ...signers,
      {
        email: '',
        name: '',
        require_login: true,
        require_nda: true,
        signing_order: signers.length + 1
      }
    ])
  }

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index))
    }
  }

  const updateSigner = (index: number, field: keyof Signer, value: any) => {
    const updated = [...signers]
    updated[index] = { ...updated[index], [field]: value }
    setSigners(updated)
  }

  const validateSigners = (): boolean => {
    for (const signer of signers) {
      if (!signer.email.trim()) {
        setError('Todos los firmantes deben tener un email')
        return false
      }
      if (!signer.email.includes('@')) {
        setError('Todos los emails deben ser válidos')
        return false
      }
    }
    return true
  }

  const createWorkflow = async () => {
    if (!documentData) {
      setError('No hay documento cargado')
      return
    }

    if (!validateSigners()) {
      return
    }

    try {
      setCurrentStep('creating')
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No autenticado')
      }

      // Step 1: Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('signature_workflows')
        .insert({
          title: workflowTitle,
          owner_id: user.id,
          document_path: documentData.encryptedPath,
          document_hash: documentData.contentHash,
          encryption_key: documentData.encryptionKey,
          status: 'active',
          require_sequential: workflowSettings.sequential,
          expires_at: workflowSettings.expiresInDays
            ? new Date(Date.now() + workflowSettings.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null
        })
        .select()
        .single()

      if (workflowError || !workflow) {
        throw workflowError || new Error('No se pudo crear el workflow')
      }

      // Step 2: Create signers
      const signersToInsert = signers.map((signer) => ({
        workflow_id: workflow.id,
        email: signer.email.trim(),
        name: signer.name.trim() || null,
        signing_order: signer.signing_order,
        require_login: signer.require_login,
        require_nda: signer.require_nda,
        quick_access: !signer.require_login,
        status: 'pending',
        // Generate access token hash (simple UUID for now, could be more secure)
        access_token_hash: crypto.randomUUID()
      }))

      const { error: signersError } = await supabase
        .from('workflow_signers')
        .insert(signersToInsert)

      if (signersError) {
        // Rollback: delete workflow
        await supabase.from('signature_workflows').delete().eq('id', workflow.id)
        throw signersError
      }

      console.log('✅ Workflow created successfully:', workflow.id)

      // Triggers will automatically send emails to signers
      onWorkflowCreated(workflow.id)
      handleClose()

    } catch (err: any) {
      console.error('Error creating workflow:', err)
      setError(err.message || 'Error al crear el workflow')
      setCurrentStep('review')
    }
  }

  const handleClose = () => {
    setCurrentStep('document')
    setWorkflowTitle('')
    setDocumentData(null)
    setSigners([{ email: '', name: '', require_login: true, require_nda: true, signing_order: 1 }])
    setWorkflowSettings({ sequential: false, expiresInDays: 30, sendEmailsImmediately: true })
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Crear Workflow de Firma</h2>
            <p className="mt-1 text-sm text-gray-600">
              {currentStep === 'document' && 'Paso 1: Subir documento'}
              {currentStep === 'signers' && 'Paso 2: Agregar firmantes'}
              {currentStep === 'settings' && 'Paso 3: Configuración'}
              {currentStep === 'review' && 'Paso 4: Revisar y crear'}
              {currentStep === 'creating' && 'Creando workflow...'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 hover:bg-gray-100"
            disabled={currentStep === 'creating'}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between">
            {['document', 'signers', 'settings', 'review'].map((step, index) => (
              <div key={step} className="flex flex-1 items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : index < ['document', 'signers', 'settings', 'review'].indexOf(currentStep)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < ['document', 'signers', 'settings', 'review'].indexOf(currentStep) ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div
                    className={`mx-2 h-1 flex-1 ${
                      index < ['document', 'signers', 'settings', 'review'].indexOf(currentStep)
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Document Upload */}
          {currentStep === 'document' && (
            <div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Título del Workflow
                </label>
                <input
                  type="text"
                  value={workflowTitle}
                  onChange={(e) => setWorkflowTitle(e.target.value)}
                  placeholder="Ej: Contrato de Venta de Propiedad"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <DocumentUploader onUploadComplete={handleDocumentUpload} />
            </div>
          )}

          {/* Step 2: Signers */}
          {currentStep === 'signers' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Firmantes</h3>
                <button
                  onClick={addSigner}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  + Agregar Firmante
                </button>
              </div>

              <div className="space-y-4">
                {signers.map((signer, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-gray-700">Firmante {index + 1}</span>
                      {signers.length > 1 && (
                        <button
                          onClick={() => removeSigner(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Email *</label>
                        <input
                          type="email"
                          value={signer.email}
                          onChange={(e) => updateSigner(index, 'email', e.target.value)}
                          placeholder="firmante@ejemplo.com"
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Nombre</label>
                        <input
                          type="text"
                          value={signer.name}
                          onChange={(e) => updateSigner(index, 'name', e.target.value)}
                          placeholder="Juan Pérez"
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={signer.require_login}
                          onChange={(e) => updateSigner(index, 'require_login', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Requiere login
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={signer.require_nda}
                          onChange={(e) => updateSigner(index, 'require_nda', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Requiere NDA
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCurrentStep('document')}
                  className="rounded-md border px-6 py-2 hover:bg-gray-50"
                >
                  Atrás
                </button>
                <button
                  onClick={() => {
                    if (validateSigners()) {
                      setCurrentStep('settings')
                    }
                  }}
                  className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {currentStep === 'settings' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Configuración</h3>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={workflowSettings.sequential}
                    onChange={(e) =>
                      setWorkflowSettings({ ...workflowSettings, sequential: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Firma Secuencial</div>
                    <div className="text-sm text-gray-600">
                      Los firmantes deben firmar en orden
                    </div>
                  </div>
                </label>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Expiración (días)
                  </label>
                  <input
                    type="number"
                    value={workflowSettings.expiresInDays}
                    onChange={(e) =>
                      setWorkflowSettings({
                        ...workflowSettings,
                        expiresInDays: parseInt(e.target.value) || 0
                      })
                    }
                    min="1"
                    max="365"
                    className="w-full rounded-md border px-4 py-2"
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    El workflow expirará después de {workflowSettings.expiresInDays} días
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCurrentStep('signers')}
                  className="rounded-md border px-6 py-2 hover:bg-gray-50"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setCurrentStep('review')}
                  className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Revisar y Crear</h3>

              <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Título</div>
                  <div className="text-gray-900">{workflowTitle}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600">Documento</div>
                  <div className="text-gray-900">{documentData?.filename}</div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-gray-600">
                    Firmantes ({signers.length})
                  </div>
                  {signers.map((signer, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      {index + 1}. {signer.email} {signer.name && `(${signer.name})`}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600">Configuración</div>
                  <div className="text-sm text-gray-700">
                    • Firma {workflowSettings.sequential ? 'secuencial' : 'en paralelo'}
                    <br />• Expira en {workflowSettings.expiresInDays} días
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCurrentStep('settings')}
                  className="rounded-md border px-6 py-2 hover:bg-gray-50"
                >
                  Atrás
                </button>
                <button
                  onClick={createWorkflow}
                  className="rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700"
                >
                  Crear Workflow
                </button>
              </div>
            </div>
          )}

          {/* Creating state */}
          {currentStep === 'creating' && (
            <div className="py-12">
              <LoadingSpinner size="lg" message="Creando workflow y enviando invitaciones..." />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
