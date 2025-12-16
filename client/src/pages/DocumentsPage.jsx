import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabaseClient";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Search,
  Shield,
  ShieldCheck,
  X
} from "lucide-react";
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";
import InhackeableTooltip from "../components/InhackeableTooltip";

const PROBATIVE_STATES = {
  uncertified: { label: "No certificado", color: "text-gray-700", bg: "bg-gray-100", dot: "bg-gray-400" },
  certified: { label: "Certificado", color: "text-green-700", bg: "bg-green-100", dot: "bg-green-500" },
  irrefutable: { 
    label: "Certificado\nReforzado", 
    color: "text-blue-700", 
    bg: "bg-blue-100", 
    dot: "bg-blue-500" 
  }
};

const deriveProbativeState = (doc, planTier) => {
  const hasTsa = !!doc.has_legal_timestamp;
  const hasPolygon = !!doc.has_polygon_anchor;
  const ecoAvailable = !!(doc.eco_storage_path || doc.eco_file_data || doc.eco_hash);
  const bitcoinStatus = doc.bitcoin_status;
  const bitcoinPending = bitcoinStatus === "pending";
  const bitcoinConfirmed = bitcoinStatus === "confirmed";

  const certified = hasTsa && hasPolygon && ecoAvailable;
  const irrefutable = certified && bitcoinConfirmed;
  let level = "uncertified";

  if (irrefutable) {
    level = "irrefutable";
  } else if (certified) {
    level = "certified";
  }

  const ecoxPlanAllowed = ["business", "enterprise"].includes((planTier || "").toLowerCase());
  const ecoxAvailable = ecoxPlanAllowed && !!doc.ecox_storage_path;

  return {
    level,
    config: PROBATIVE_STATES[level],
    hasTsa,
    hasPolygon,
    ecoAvailable,
    ecoxAvailable,
    bitcoinPending,
    bitcoinConfirmed,
    ecoxPlanAllowed
  };
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const computeHash = async (fileOrBlob) => {
  const buffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planTier, setPlanTier] = useState(null); // free | pro | business | enterprise
  const [ecoPendingDoc, setEcoPendingDoc] = useState(null);
  const [showEcoPendingModal, setShowEcoPendingModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyDoc, setVerifyDoc] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
  const [search, setSearch] = useState("");

  const handleLogout = () => navigate("/");

  useEffect(() => {
    loadDocuments();
    loadPlan();
  }, []);

  useEffect(() => {
    if (showVerifyModal && verifyDoc?.pdf_storage_path && !autoVerifyAttempted) {
      setAutoVerifyAttempted(true);
      autoVerifyStoredPdf(verifyDoc);
    }
  }, [showVerifyModal, verifyDoc, autoVerifyAttempted]);

  const loadPlan = async () => {
    try {
      const supabase = getSupabase();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const tier = user?.user_metadata?.plan || user?.user_metadata?.tier || null;
      setPlanTier(tier);
    } catch (err) {
      console.warn("No se pudo obtener el plan del usuario:", err);
      setPlanTier(null);
    }
  };

  const loadDocuments = async () => {
    try {
      const supabase = getSupabase();
      setLoading(true);
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        setDocuments([]);
        return;
      }

      let query = supabase
        .from("user_documents")
        .select(
          `
          *,
          document_hash,
          events(id, event_type, timestamp, metadata),
          signer_links(id, signer_email, status, signed_at),
          anchors!user_document_id(id, anchor_status, bitcoin_tx_id, confirmed_at)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error loading documents:", error);
        throw error;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error("Error in loadDocuments:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadFromPath = async (storagePath) => {
    if (!storagePath) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(storagePath, 3600);
      if (error) {
        console.error("Error creando URL de descarga:", error);
        window.alert("No se pudo generar la descarga. Intenta regenerar el archivo.");
        return;
      }
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error("Error descargando:", err);
      window.alert("No se pudo descargar el archivo.");
    }
  };

  const requestRegeneration = async (docId, type) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.rpc("request_certificate_regeneration", {
        _document_id: docId,
        _request_type: type
      });
      if (error) {
        console.error("Error solicitando regeneración:", error);
        window.alert("No se pudo solicitar la regeneración.");
        return;
      }
      window.alert("Solicitud de regeneración enviada");
    } catch (err) {
      console.error("Error solicitando regeneración:", err);
      window.alert("No se pudo solicitar la regeneración.");
    }
  };

  const performEcoDownload = (doc) => {
    if (!doc) return;
    if (doc.eco_storage_path) {
      downloadFromPath(doc.eco_storage_path);
      return;
    }
    if (doc.eco_hash) {
      requestRegeneration(doc.id, "eco");
      return;
    }
    window.alert("No hay certificado .ECO disponible para este documento.");
  };

  const performEcoxDownload = (doc) => {
    if (!doc) return;
    if (doc.ecox_storage_path) {
      downloadFromPath(doc.ecox_storage_path);
      return;
    }
    requestRegeneration(doc.id, "ecox");
  };

  const handleEcoDownload = (doc) => {
    if (!doc) return;
    if (doc.bitcoin_status === "pending") {
      setEcoPendingDoc({ ...doc, pendingType: "eco" });
      setShowEcoPendingModal(true);
      return;
    }
    performEcoDownload(doc);
  };

  const handleEcoxDownload = (doc) => {
    if (!doc) return;
    if (doc.bitcoin_status === "pending") {
      setEcoPendingDoc({ ...doc, pendingType: "ecox" });
      setShowEcoPendingModal(true);
      return;
    }
    performEcoxDownload(doc);
  };

  const proceedBitcoinPending = () => {
    if (!ecoPendingDoc) return;
    const pendingType = ecoPendingDoc.pendingType;
    const docCopy = { ...ecoPendingDoc };
    setShowEcoPendingModal(false);
    setEcoPendingDoc(null);

    // Recordatorio al usuario: la descarga no detiene el refuerzo.
    window.setTimeout(() => window.alert("Esta descarga no cancela el refuerzo probatorio."), 50);

    if (pendingType === "eco") {
      performEcoDownload(docCopy);
    } else {
      performEcoxDownload(docCopy);
    }
  };

  const handlePdfDownload = (doc) => {
    if (!doc?.pdf_storage_path) {
      window.alert("Este documento no fue almacenado. EcoSign no guarda documentos sin tu permiso.");
      return;
    }
    downloadFromPath(doc.pdf_storage_path);
  };

  const handleVerifyDoc = (doc) => {
    if (!doc) return;
    setVerifyDoc(doc);
    setVerifyResult(null);
    setVerifying(false);
    setAutoVerifyAttempted(false);
    setShowVerifyModal(true);
  };

  const onVerifyFile = async (file, doc) => {
    if (!doc || !file) return;
    setVerifying(true);
    try {
      const hash = await computeHash(file);
      const result = buildVerificationResult(hash, doc, "upload");
      setVerifyResult(result);
    } catch (err) {
      console.error("Error verificando PDF:", err);
      setVerifyResult({
        matches: false,
        error: "No se pudo verificar el documento."
      });
    } finally {
      setVerifying(false);
    }
  };

  const autoVerifyStoredPdf = async (doc) => {
    try {
      const supabase = getSupabase();
      setVerifying(true);
      setVerifyResult(null);
      const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(doc.pdf_storage_path, 600);
      if (error || !data?.signedUrl) {
        throw error || new Error("No se pudo crear el enlace de verificación automática.");
      }
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new Error("No se pudo descargar el PDF almacenado.");
      }
      const blob = await response.blob();
      const hash = await computeHash(blob);
      const result = buildVerificationResult(hash, doc, "stored");
      setVerifyResult(result);
    } catch (err) {
      console.warn("Verificación automática falló, se pedirá el PDF al usuario:", err);
      setVerifyResult({
        matches: null,
        error: "No pudimos verificar automáticamente. Subí el PDF para compararlo."
      });
    } finally {
      setVerifying(false);
    }
  };

  const buildVerificationResult = (hash, doc, source) => {
    const normalizedHash = hash.toLowerCase();
    const expectedDocumentHash = doc.document_hash || doc.eco_hash;
    const expectedContentHash = doc.content_hash;

    const matchesDocument = expectedDocumentHash
      ? normalizedHash === expectedDocumentHash.toLowerCase()
      : null;
    const matchesContent = expectedContentHash ? normalizedHash === expectedContentHash.toLowerCase() : null;

    const matches =
      (matchesDocument === false || matchesContent === false)
        ? false
        : matchesDocument || matchesContent || null;

    return {
      matches,
      matchesDocument,
      matchesContent,
      hash: normalizedHash,
      source,
      extended:
        doc.bitcoin_status === "pending"
          ? "Refuerzo probatorio en proceso (Bitcoin)."
          : doc.bitcoin_status === "confirmed"
            ? "Certificado Reforzado."
            : null
    };
  };

  const filteredDocuments = useMemo(() => {
    if (!search) return documents;
    return documents.filter((doc) =>
      (doc.document_name || "").toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [documents, search]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DashboardNav onLogout={handleLogout} />
      <div className="flex-grow">
        <main className="max-w-7xl mx-auto px-4 pt-8 pb-24">
          <header className="mb-10 text-center">
            <h1 className="mt-0 text-3xl md:text-4xl font-semibold tracking-tight">Mis documentos</h1>
          </header>

          <section className="mb-6 flex flex-col md:flex-row md:items-center md:justify-end gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </section>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
              <p className="text-gray-500">Comienza certificando tu primer documento</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado probatorio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de creación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => {
                    const {
                      config,
                      bitcoinPending,
                      bitcoinConfirmed,
                      ecoAvailable,
                      ecoxAvailable,
                      ecoxPlanAllowed
                    } = deriveProbativeState(doc, planTier);
                    const pdfAvailable = !!doc.pdf_storage_path;
                    const certificationIncomplete = !ecoAvailable && (doc.has_legal_timestamp || doc.has_polygon_anchor);
                    const ecoxDisabled = !ecoxPlanAllowed;

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start">
                            <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{doc.document_name}</div>
                              {bitcoinPending && (
                                <div className="text-xs text-blue-700 mt-0.5">
                                  Refuerzo probatorio en proceso (Bitcoin 4-24h)
                                </div>
                              )}
                              {!pdfAvailable && (
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  PDF no almacenado (modo privacidad)
                                </div>
                              )}
                              {certificationIncomplete && (
                                <div className="text-xs text-orange-700 mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Certificación incompleta. Se reintentará con TSA + Polygon.
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.color} whitespace-pre-line text-center`}>
                            {config.label}
                          </span>
                          {bitcoinConfirmed && (
                            <div className="text-[11px] text-blue-700 mt-1 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Máximo refuerzo probatorio (Bitcoin confirmado)
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              className="text-black hover:text-gray-600"
                              title="Ver detalle"
                              onClick={() => setPreviewDoc(doc)}
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEcoDownload(doc)}
                              className={`${ecoAvailable || doc.eco_hash ? "text-black hover:text-gray-600" : "text-gray-300 cursor-not-allowed"}`}
                              disabled={!ecoAvailable && !doc.eco_hash}
                              title={ecoAvailable ? "Descargar .ECO" : doc.eco_hash ? "Regenerar .ECO" : "No disponible"}
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handlePdfDownload(doc)}
                              className="text-black hover:text-gray-600"
                              title="Descargar PDF (si existe)"
                            >
                              <FileText className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleVerifyDoc(doc)}
                              className="text-black hover:text-gray-600"
                              title="Verificar documento"
                            >
                              <Search className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (!ecoxPlanAllowed) return;
                                return ecoxAvailable ? handleEcoxDownload(doc) : requestRegeneration(doc.id, "ecox");
                              }}
                              className={`${ecoxDisabled ? "text-gray-300 cursor-not-allowed" : "text-black hover:text-gray-600"}`}
                              title={
                                ecoxPlanAllowed
                                  ? ecoxAvailable
                                    ? "Descargar .ECOX"
                                    : "Solicitar .ECOX"
                                  : "Disponible en planes Business / Enterprise"
                              }
                              disabled={ecoxDisabled}
                            >
                              <ShieldCheck className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
      <FooterInternal />

      {/* Modal ECO pendiente (Bitcoin en proceso) */}
      {showEcoPendingModal && ecoPendingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Protección base lista</h3>
                <p className="text-sm text-gray-600 mt-1">
                  TSA + Polygon confirmados. El refuerzo Bitcoin sigue en curso (4-24h).
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEcoPendingModal(false);
                  setEcoPendingDoc(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Podés descargar ahora. La confirmación independiente seguirá su curso y cuando se confirme el estado
              subirá a Certificado Reforzado automáticamente.
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-sm font-semibold"
                onClick={() => {
                  setShowEcoPendingModal(false);
                  setEcoPendingDoc(null);
                }}
              >
                ⏳ Esperar refuerzo probatorio
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:border-gray-400"
                onClick={proceedBitcoinPending}
              >
                ⬇️ Descargar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{previewDoc.document_name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Creado: {formatDate(previewDoc.created_at)}
                  {previewDoc.last_event_at && (
                    <> · Última actualización: {formatDate(previewDoc.last_event_at)}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <PreviewBadges doc={previewDoc} planTier={planTier} />

            <div className="mt-6 space-y-4">
              <ProbativeTimeline doc={previewDoc} />
              {previewDoc.eco_hash && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Hash SHA-256</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-x-auto">
                      {previewDoc.eco_hash}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(previewDoc.eco_hash)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Verificar documento */}
      {showVerifyModal && verifyDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verificar documento</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Validá integridad comparando hashes (content_hash y document_hash) sin subir tu archivo.
                </p>
                <p className="text-xs text-gray-500">
                  Si guardaste el PDF, la verificación se intenta de forma automática.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyResult(null);
                  setVerifyDoc(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!verifyDoc.pdf_storage_path && (
              <p className="text-xs text-gray-600 mb-3">
                Este documento no fue almacenado. EcoSign no guarda documentos sin tu permiso.
              </p>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center mb-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => e.target.files?.[0] && onVerifyFile(e.target.files[0], verifyDoc)}
                className="hidden"
                id="verify-upload"
              />
              <label htmlFor="verify-upload" className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                {verifying ? "Verificando…" : "Arrastrá o hacé clic para subir el PDF firmado"}
              </label>
            </div>

            {verifyResult && (
              <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm space-y-2">
                <p className={`font-semibold ${
                  verifyResult.matches === false ? "text-red-700" :
                  verifyResult.matches ? "text-green-700" : "text-gray-700"
                }`}>
                  {verifyResult.matches === false
                    ? "❌ Documento alterado"
                    : verifyResult.matches
                      ? "✅ Documento válido"
                      : verifyResult.error || "Comparación pendiente"}
                </p>
                {verifyResult.extended && verifyResult.matches && (
                  <p className="text-xs text-gray-700">{verifyResult.extended}</p>
                )}
                {verifyResult.hash && (
                  <p className="text-xs text-gray-600">Hash calculado: {verifyResult.hash}</p>
                )}
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    document_hash:{" "}
                    {verifyDoc.document_hash ? (
                      <span className={verifyResult.matchesDocument === false ? "text-red-700 font-semibold" : ""}>
                        {verifyDoc.document_hash}
                      </span>
                    ) : (
                      "no disponible"
                    )}
                  </p>
                  <p>
                    content_hash:{" "}
                    {verifyDoc.content_hash ? (
                      <span className={verifyResult.matchesContent === false ? "text-red-700 font-semibold" : ""}>
                        {verifyDoc.content_hash}
                      </span>
                    ) : (
                      "no disponible"
                    )}
                  </p>
                  {verifyResult.source && (
                    <p className="text-[11px] text-gray-500">
                      Origen de verificación: {verifyResult.source === "stored" ? "PDF guardado" : "PDF cargado"}
                    </p>
                  )}
                </div>
                {verifyResult.error && (
                  <p className="text-xs text-red-600">
                    {verifyResult.error} Revisá que estés verificando el archivo correcto.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewBadges({ doc, planTier }) {
  const { config, level, bitcoinPending, bitcoinConfirmed, ecoxAvailable, ecoxPlanAllowed } = deriveProbativeState(doc, planTier);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.color} whitespace-pre-line text-center`}>
        {config.label}
      </span>
      <div className="text-xs text-gray-700 flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Escudo {level === "uncertified" ? "apagado" : "activo"} · TSA + Polygon garantizan "Certificado"
      </div>
      {bitcoinPending && (
        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
          Refuerzo probatorio en proceso (Bitcoin)
        </span>
      )}
      {bitcoinConfirmed && (
        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
          Máximo refuerzo probatorio disponible (Bitcoin confirmado)
        </span>
      )}
      {!ecoxPlanAllowed && (
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
          .ECOX disponible en planes Business / Enterprise
        </span>
      )}
      {ecoxAvailable && (
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
          .ECOX listo para descargar
        </span>
      )}
    </div>
  );
}

function ProbativeTimeline({ doc }) {
  const hasTsa = !!doc.has_legal_timestamp;
  const hasPolygon = !!doc.has_polygon_anchor;
  const bitcoinStatus = doc.bitcoin_status;
  const bitcoinPending = bitcoinStatus === "pending";
  const bitcoinConfirmed = bitcoinStatus === "confirmed" || !!doc.has_bitcoin_anchor;

  const timelineItems = [
    {
      label: "Sello de tiempo legal (TSA)",
      status: hasTsa ? "ok" : "off",
      description: hasTsa ? "Certificado por TSA" : "No solicitado"
    },
    {
      label: "Blockchain Polygon (huella publicada)",
      status: hasPolygon ? "ok" : "off",
      description: hasPolygon ? "Confirmado en blockchain" : "No solicitado"
    },
    {
      label: "Confirmación independiente (Bitcoin)",
      status: bitcoinConfirmed ? "ok" : bitcoinPending ? "pending" : "off",
      description: bitcoinConfirmed
        ? `Confirmado${doc.bitcoin_confirmed_at ? `: ${formatDate(doc.bitcoin_confirmed_at)}` : ""}`
        : bitcoinPending
          ? "Pendiente: 4-24 horas"
          : "No solicitado"
    }
  ];

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">
        Timeline de blindaje <InhackeableTooltip className="font-semibold" />
      </label>
      <div className="space-y-3">
        {timelineItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            {item.status === "ok" ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : item.status === "pending" ? (
              <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 animate-pulse" />
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className={`text-sm font-medium ${
                item.status === "ok" ? "text-gray-900" :
                item.status === "pending" ? "text-orange-700" : "text-gray-400"
              }`}>
                {item.label}
              </div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentsPage;
