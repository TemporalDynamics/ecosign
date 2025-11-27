import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { calculateDocumentHash, formatHashForDisplay } from '@/utils/hashDocument'
import { Shield, FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface WorkflowVerifierProps {
  className?: string
}

interface VerifyResponse {
  found: boolean
  workflow?: {
    id: string
    title: string
    status: string
    document_hash: string
    created_at?: string
    updated_at?: string
  }
  signers?: Array<{
    id: string
    email: string
    name: string | null
    status: string
    signed_at: string | null
  }>
  auditTrail?: Array<{
    id: string
    event_type: string
    created_at: string
    signer_id: string | null
    details: Record<string, any> | null
  }>
}

export default function WorkflowVerifier({ className }: WorkflowVerifierProps) {
  const [file, setFile] = useState<File | null>(null)
  const [hash, setHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VerifyResponse | null>(null)

  const handleFile = async (selected?: File) => {
    const target = selected
    if (!target) return
    setError(null)
    setResult(null)
    setHash(null)
    setFile(target)
    try {
      setLoading(true)
      const calc = await calculateDocumentHash(target)
      setHash(calc)
      await lookup(calc)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo calcular el hash'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const lookup = async (calcHash: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-workflow-hash', {
        body: { hash: calcHash }
      })
      if (fnError) {
        throw fnError
      }
      setResult(data as VerifyResponse)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo verificar el hash'
      setError(msg)
    }
  }

  const reset = () => {
    setFile(null)
    setHash(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className={className}>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Verificar por hash (workflow nuevo)</h2>
            <p className="text-sm text-gray-600">Subí el PDF firmado; calculamos SHA-256 en tu navegador.</p>
          </div>
        </div>

        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition ${
            file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-500 bg-gray-50'
          }`}
        >
          <FileText className="h-8 w-8 text-gray-700" />
          <div className="text-sm text-gray-700">
            {file ? file.name : 'Arrastra o selecciona un PDF firmado'}
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFile(e.target.files?.[0] || undefined)}
            className="hidden"
          />
        </label>

        {hash && (
          <div className="mt-4 rounded-md bg-gray-100 px-4 py-3 text-sm text-gray-800">
            Hash calculado: <span className="font-mono">{formatHashForDisplay(hash)}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <XCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Verificando...
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => hash && lookup(hash)}
            disabled={!hash || loading}
            className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            Re-verificar
          </button>
          <button
            onClick={reset}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Reiniciar
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {result.found ? (
            <>
              <div className="mb-4 flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Documento verificado</span>
              </div>
              <div className="space-y-3 text-sm text-gray-800">
                <div><span className="font-semibold">Workflow:</span> {result.workflow?.title || 'Sin título'}</div>
                <div><span className="font-semibold">Estado:</span> {result.workflow?.status}</div>
                <div><span className="font-semibold">Hash:</span> {formatHashForDisplay(result.workflow?.document_hash || '')}</div>
              </div>
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">Firmantes</h4>
                <div className="space-y-2">
                  {(result.signers || []).map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
                    >
                      <span>{s.name || s.email}</span>
                      <span className="font-medium">{s.status}</span>
                    </div>
                  ))}
                  {(result.signers || []).length === 0 && (
                    <p className="text-xs text-gray-600">No hay firmantes registrados.</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">Eventos ECOX</h4>
                <div className="space-y-2">
                  {(result.auditTrail || []).map((e) => (
                    <div
                      key={e.id}
                      className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-700"
                    >
                      <div className="font-semibold">{e.event_type}</div>
                      <div className="text-gray-600">{new Date(e.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                  {(result.auditTrail || []).length === 0 && (
                    <p className="text-xs text-gray-600">No hay eventos forenses registrados.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>No se encontró un workflow con este hash.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
