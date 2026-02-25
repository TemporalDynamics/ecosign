import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { verifyEcoWithOriginal } from '../lib/verificationService';
import { getLatestTsaEvent, formatTsaTimestamp } from '../lib/events/tsa';
import { getAnchorEvent } from '../lib/protectionLevel';
import { getSupabase } from '../lib/supabaseClient';
import type { EcoV2 } from '../lib/eco/v2';
import VerifierTimeline from './VerifierTimeline';
import { buildTimeline } from '../lib/verifier/buildTimeline';
import { extractOperationIds } from '../lib/verifier/normalizeEvents';
import { getLatestPresenceClosedSummary } from '../lib/verifier/presentialEvidence';
import { getPublicPresentialActaByHash } from '../lib/presentialVerificationService';
import type { DocumentEventEntry, OperationEventRow, TimelineEvent } from '../lib/verifier/types';

// INTERFAZ DE RESULTADO (COINCIDE CON BACKEND)
interface VerificationServiceResult {
  valid: boolean
  fileName?: string
  hash?: string
  timestamp?: string
  timestampType?: string
  probativeSignals?: {
    anchorRequested: boolean,
    polygonConfirmed: boolean,
    bitcoinConfirmed: boolean,
    fetchError: boolean,
  }
  anchors?: {
    polygon?: { status?: string } | null;
    bitcoin?: { status?: string } | null;
  } | unknown;
  signedAuthority?: 'internal' | 'external';
  signedAuthorityRef?: Record<string, unknown> | null;
  documentIntegrity?: boolean;
  signatureValid?: boolean;
  timestampValid?: boolean;
  legalTimestamp?: Record<string, unknown> | { enabled?: boolean };
  errors?: string[];
  warnings?: string[];
  error?: string;
  [key: string]: any; // Permite otros campos
}

const TRIPLE_BRAID_LABELS: Record<string, string> = {
  signer: 'Firmante',
  witness: 'Testigo',
  ecosign: 'EcoSign',
};

const getStrandStatus = (strand: { required: boolean | null; ok: boolean | null }) => {
  if (strand.ok === true) return { label: 'OK', tone: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (strand.required === true) return { label: 'Faltante', tone: 'bg-red-100 text-red-800 border-red-300' };
  return { label: 'Opcional', tone: 'bg-amber-100 text-amber-800 border-amber-300' };
};

const buildEvidenceItems = (
  result: VerificationServiceResult,
  presenceSummary: ReturnType<typeof getLatestPresenceClosedSummary>,
): string[] => {
  const items: string[] = [];

  if (result.valid) {
    items.push('Integridad criptográfica verificada.');
  }

  if (result.signatureValid) {
    if (result.signedAuthority === 'internal') {
      items.push('Existe una firma registrada por una autoridad interna.');
    } else if (result.signedAuthority === 'external') {
      items.push('Existe una firma registrada por una autoridad externa.');
    } else {
      items.push('Existe una firma registrada en el certificado.');
    }
  }

  // TSA: read from events[] if eco data exists
  if (result.eco?.events) {
    const tsa = getLatestTsaEvent(result.eco.events);
    if (tsa.present) {
      const formattedTime = formatTsaTimestamp(tsa);
      items.push(formattedTime
        ? `Evidencia temporal presente: ${formattedTime}`
        : 'Evidencia temporal presente en el certificado.'
      );
    }
  }

  // ✅ CANONICAL: Read anchors from events[] with legacy fallback
  const events = result.eco?.events || [];
  const anchors = result.anchors as { polygon?: { status?: string } | null; bitcoin?: { status?: string } | null } | undefined;

  // Polygon: canonical from events[] with legacy fallback
  const polygonAnchor = getAnchorEvent(events, 'polygon');
  const polygonConfirmed =
    polygonAnchor !== null ||
    anchors?.polygon?.status === 'confirmed' ||
    result.probativeSignals?.polygonConfirmed;

  // Bitcoin: canonical from events[] with legacy fallback
  const bitcoinAnchor = getAnchorEvent(events, 'bitcoin');
  const bitcoinConfirmed =
    bitcoinAnchor !== null ||
    anchors?.bitcoin?.status === 'confirmed' ||
    result.probativeSignals?.bitcoinConfirmed;

  if (polygonConfirmed) {
    items.push('Existe un anclaje público confirmado (Polygon).');
  }

  if (bitcoinConfirmed) {
    items.push('Existe un anclaje público confirmado (Bitcoin).');
  }

  if (presenceSummary) {
    items.push('Existe una sesión probatoria cerrada con acta registrada.');
    if (
      presenceSummary.confirmedStrands !== null &&
      presenceSummary.requiredStrands !== null
    ) {
      const statusText = presenceSummary.trenzaStatus
        ? ` (${presenceSummary.trenzaStatus})`
        : '';
      items.push(
        `Trenza probatoria: ${presenceSummary.confirmedStrands}/${presenceSummary.requiredStrands}${statusText}.`,
      );
    }
    if (presenceSummary.tsaStatus) {
      const provider = presenceSummary.tsaProvider
        ? ` · proveedor ${presenceSummary.tsaProvider}`
        : '';
      items.push(`Timestamp de acta (TSA): ${presenceSummary.tsaStatus}${provider}.`);
    }
  }

  return items;
};


interface VerificationComponentProps {
  initialFile?: File | null;
}

const VerificationComponent: React.FC<VerificationComponentProps> = ({ initialFile = null }) => {
  const [ecoFile, setEcoFile] = useState<File | null>(initialFile ?? null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationServiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ecoData, setEcoData] = useState<EcoV2 | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [actaEco, setActaEco] = useState<Record<string, unknown> | null>(null);
  const [actaLoading, setActaLoading] = useState(false);
  const [actaError, setActaError] = useState<string | null>(null);
  const [showActaJson, setShowActaJson] = useState(false);

  const handleEcoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setEcoFile(selectedFile);
      setVerificationResult(null);
      setError(null);
      setEcoData(null);
      setTimelineEvents([]);
      setTimelineError(null);
      setShowTimeline(false);
      setActaEco(null);
      setActaError(null);
      setShowActaJson(false);
    }
  }, []);

  const handlePdfFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setPdfFile(selectedFile);
      setVerificationResult(null);
      setError(null);
      setTimelineEvents([]);
      setTimelineError(null);
      setShowTimeline(false);
      setActaEco(null);
      setActaError(null);
      setShowActaJson(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!ecoFile || !pdfFile) {
      setError('Por favor selecciona ambos archivos (.ECO y PDF firmado)');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyEcoWithOriginal(ecoFile, pdfFile);
      setVerificationResult(result);
      setActaEco(null);
      setActaError(null);
      setShowActaJson(false);
      if (!result.valid) {
        setError(result.error || result.errors?.join(', ') || 'La verificación falló');
      }
      try {
        const parsed = JSON.parse(await ecoFile.text());
        if (parsed && typeof parsed === 'object' && (parsed as { version?: string }).version === 'eco.v2') {
          setEcoData(parsed as EcoV2);
        } else {
          setEcoData(null);
        }
      } catch {
        setEcoData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar el archivo');
    } finally {
      setIsVerifying(false);
    }
  }, [ecoFile, pdfFile]);

  useEffect(() => {
    let isActive = true;
    const loadTimeline = async () => {
      if (!ecoData) {
        setTimelineEvents([]);
        setTimelineError(null);
        setTimelineLoading(false);
        return;
      }

      setTimelineLoading(true);
      setTimelineError(null);

      const docEvents = Array.isArray(ecoData.events) ? ecoData.events : [];
      const operationIds = extractOperationIds(docEvents);
      let operationEvents: OperationEventRow[] = [];

      if (operationIds.length > 0) {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('operations_events')
            .select('id, operation_id, document_entity_id, kind, at, actor, reason, metadata')
            .in('operation_id', operationIds);

          if (error) throw error;
          operationEvents = (data || []) as OperationEventRow[];
        } catch (err) {
          console.warn('Unable to load operations_events:', err);
          setTimelineError(null);
        }
      }

      if (!isActive) return;

      const timeline = buildTimeline({
        documentEvents: docEvents,
        operationEvents,
        createdAt: ecoData.timestamps?.created_at ?? ecoData.source?.captured_at,
      });
      setTimelineEvents(timeline);
      setTimelineLoading(false);
    };

    loadTimeline();
    return () => {
      isActive = false;
    };
  }, [ecoData]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, type: 'eco' | 'pdf') => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (type === 'eco' && droppedFile.name.endsWith('.eco')) {
        setEcoFile(droppedFile);
        setVerificationResult(null);
        setError(null);
        setEcoData(null);
        setTimelineEvents([]);
        setTimelineError(null);
        setShowTimeline(false);
        setActaEco(null);
        setActaError(null);
        setShowActaJson(false);
      } else if (type === 'pdf' && droppedFile.type === 'application/pdf') {
        setPdfFile(droppedFile);
        setVerificationResult(null);
        setError(null);
        setTimelineEvents([]);
        setTimelineError(null);
        setShowTimeline(false);
        setActaEco(null);
        setActaError(null);
        setShowActaJson(false);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const presenceCloseSummary = useMemo(() => {
    const rawEvents = verificationResult?.eco?.events;
    const events = Array.isArray(rawEvents) ? (rawEvents as DocumentEventEntry[]) : [];
    return getLatestPresenceClosedSummary(events);
  }, [verificationResult]);

  const evidenceItems = verificationResult
    ? buildEvidenceItems(verificationResult, presenceCloseSummary)
    : [];

  useEffect(() => {
    let isActive = true;

    const loadActa = async () => {
      setActaError(null);
      setShowActaJson(false);

      if (!presenceCloseSummary?.actaHash) {
        setActaEco(null);
        setActaLoading(false);
        return;
      }

      if (presenceCloseSummary.actaPayload) {
        setActaEco(presenceCloseSummary.actaPayload);
        setActaLoading(false);
        return;
      }

      setActaLoading(true);
      try {
        const result = await getPublicPresentialActaByHash({
          actaHash: presenceCloseSummary.actaHash,
        });
        if (!isActive) return;
        setActaEco(result.actaEco);
      } catch (err) {
        if (!isActive) return;
        const message =
          err instanceof Error ? err.message : 'No se pudo cargar el acta pública.';
        setActaError(message);
        setActaEco(null);
      } finally {
        if (isActive) {
          setActaLoading(false);
        }
      }
    };

    loadActa();
    return () => {
      isActive = false;
    };
  }, [presenceCloseSummary?.actaHash, presenceCloseSummary?.actaPayload]);

  const handleDownloadActaEco = useCallback(() => {
    if (!presenceCloseSummary?.actaHash || !actaEco) return;

    const fileName = `acta-${presenceCloseSummary.actaHash.slice(0, 16)}.eco`;
    const content = `${JSON.stringify(actaEco, null, 2)}\n`;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [actaEco, presenceCloseSummary?.actaHash]);

  return (
    <div className="space-y-6">
      {/* Dual Upload Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* ECO File Upload */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#0A66C2] transition-colors duration-300 bg-white"
          onDrop={(e) => handleDrop(e, 'eco')}
          onDragOver={handleDragOver}
        >
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Certificado .ECO
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Arrastra el archivo .ECO aquí
          </p>
          
          <label htmlFor="eco-upload" className="cursor-pointer">
            <span className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-2 px-5 rounded-lg transition duration-200">
              Seleccionar .ECO
            </span>
            <input
              id="eco-upload"
              type="file"
              accept=".eco"
              onChange={handleEcoFileChange}
              className="hidden"
            />
          </label>
          
          {ecoFile && (
            <div className="mt-4 p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <FileCheck className="w-4 h-4" />
                {ecoFile.name}
              </p>
            </div>
          )}
        </div>

        {/* PDF File Upload */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#0A66C2] transition-colors duration-300 bg-white"
          onDrop={(e) => handleDrop(e, 'pdf')}
          onDragOver={handleDragOver}
        >
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            PDF Firmado
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Arrastra el PDF firmado aquí
          </p>
          
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <span className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-2 px-5 rounded-lg transition duration-200">
              Seleccionar PDF
            </span>
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={handlePdfFileChange}
              className="hidden"
            />
          </label>
          
          {pdfFile && (
            <div className="mt-4 p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium flex items-center justify-center gap-2">
                <FileCheck className="w-4 h-4" />
                {pdfFile.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && !verificationResult?.valid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-semibold">Error de Verificación</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Verification Button */}
      {ecoFile && pdfFile && !verificationResult && (
        <div className="text-center">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="bg-[#0A66C2] hover:bg-[#0E4B8B] text-white font-semibold py-3 px-8 rounded-lg transition duration-200 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Verificar Certificado
              </>
            )}
          </button>
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className={`p-6 ${verificationResult.valid ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
            <div className="flex items-center gap-3">
              {verificationResult.valid ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <h3 className={`text-xl font-bold ${verificationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {verificationResult.valid ? '✓ Verificación Válida' : '✗ Verificación Fallida'}
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  {verificationResult.valid 
                    ? 'La integridad del certificado y el documento son correctas.' 
                    : 'El certificado no es válido o el documento ha sido modificado.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0A66C2]" />
              Resumen Probatorio
            </h4>
            <div className="space-y-2">
              {(evidenceItems.length > 0
                ? evidenceItems
                : ['No hay evidencia verificable en este certificado.']
              ).map((item) => (
                <p key={item} className="text-sm text-gray-700">
                  • {item}
                </p>
              ))}
            </div>
            {presenceCloseSummary && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Sesión Probatoria Reforzada
                </p>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  {presenceCloseSummary.closedAt && (
                    <p>
                      Cierre: <span className="font-medium">{new Date(presenceCloseSummary.closedAt).toLocaleString()}</span>
                    </p>
                  )}
                  {presenceCloseSummary.actaHash && (
                    <p className="break-all">
                      Acta hash: <span className="font-mono text-xs">{presenceCloseSummary.actaHash}</span>
                    </p>
                  )}
                  {presenceCloseSummary.confirmedStrands !== null &&
                    presenceCloseSummary.requiredStrands !== null && (
                      <p>
                        Trenza: <span className="font-medium">{presenceCloseSummary.confirmedStrands}/{presenceCloseSummary.requiredStrands}</span>
                        {presenceCloseSummary.trenzaStatus && (
                          <>
                            {' · '}
                            Estado: <span className="font-medium">{presenceCloseSummary.trenzaStatus}</span>
                          </>
                        )}
                      </p>
                    )}
                  {presenceCloseSummary.strands.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Detalle de strands
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {presenceCloseSummary.strands.map((strand) => {
                          const status = getStrandStatus(strand);
                          const label = TRIPLE_BRAID_LABELS[strand.key] ?? strand.key;
                          return (
                            <div
                              key={strand.key}
                              className={`rounded-md border px-2 py-1 ${status.tone}`}
                            >
                              <p className="text-xs font-semibold">
                                {label}: {status.label}
                              </p>
                              {strand.reason && (
                                <p className="mt-0.5 text-xs">
                                  Motivo: {strand.reason}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {presenceCloseSummary.tsaStatus && (
                    <p className="break-all">
                      TSA: <span className="font-medium">{presenceCloseSummary.tsaStatus}</span>
                      {presenceCloseSummary.tsaProvider && (
                        <>
                          {' · '}
                          Proveedor: <span className="font-medium">{presenceCloseSummary.tsaProvider}</span>
                        </>
                      )}
                      {presenceCloseSummary.tsaTokenHash && (
                        <>
                          {' · '}
                          Token hash: <span className="font-mono text-xs">{presenceCloseSummary.tsaTokenHash}</span>
                        </>
                      )}
                      {presenceCloseSummary.tsaError && (
                        <>
                          {' · '}
                          Error: <span className="font-medium">{presenceCloseSummary.tsaError}</span>
                        </>
                      )}
                    </p>
                  )}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowActaJson((prev) => !prev)}
                      disabled={actaLoading || !actaEco}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showActaJson ? 'Ocultar acta .eco' : 'Ver acta .eco'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadActaEco}
                      disabled={actaLoading || !actaEco}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Descargar acta .eco
                    </button>
                  </div>
                  {actaLoading && (
                    <p className="text-xs text-gray-600">Cargando acta pública…</p>
                  )}
                  {actaError && (
                    <p className="text-xs text-red-700">Acta: {actaError}</p>
                  )}
                  {showActaJson && actaEco && (
                    <pre className="max-h-72 overflow-auto rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-800">
                      {JSON.stringify(actaEco, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
            {verificationResult.valid && (
              <div className="pt-2">
                <button
                  onClick={() => setShowTimeline((prev) => !prev)}
                  className="text-sm font-semibold text-[#0E4B8B] hover:text-[#0A3D73] transition"
                  type="button"
                >
                  {showTimeline ? 'Ocultar historia del documento' : 'Ver historia del documento'}
                </button>
                {showTimeline && (
                  <div className="mt-4">
                    <VerifierTimeline
                      events={timelineEvents}
                      loading={timelineLoading}
                      error={timelineError}
                      note="Cronología basada en el certificado (.eco). No requiere cuenta ni servidor."
                    />
                  </div>
                )}
              </div>
            )}

            {/* Document Info */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0A66C2]" />
                Información del Documento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Nombre del Archivo</p>
                  <p className="font-mono text-sm break-all text-gray-900">{verificationResult.fileName || 'No disponible'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Hash SHA-256</p>
                  <p className="font-mono text-xs break-all text-gray-900">{verificationResult.hash || 'No disponible'}</p>
                </div>
              </div>
            </div>

            {/* Timestamp Info */}
            {verificationResult.timestamp && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0A66C2]" />
                  Información de Timestamp
                </h4>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Fecha de Certificación</p>
                    <p className="font-medium text-sm text-gray-900">{new Date(verificationResult.timestamp).toLocaleString()}</p>
                  </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationComponent;
