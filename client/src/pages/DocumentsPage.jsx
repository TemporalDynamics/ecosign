import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabaseClient";
import { AlertCircle, CheckCircle, Copy, Download, Eye, FileText, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";
import InhackeableTooltip from "../components/InhackeableTooltip";
import { isGuestMode } from "../utils/guestMode";

const PROBATIVE_STATES = {
  none: {
    label: "Sin protección",
    color: "text-gray-600",
    bg: "bg-gray-100",
    tooltip: "Aún no se generó un certificado para este documento."
  },
  active: {
    label: "Protección\ncertificada",
    color: "text-blue-700",
    bg: "bg-blue-100",
    tooltip: "Sello de tiempo legal (TSA) y huella digital única confirmados."
  },
  reinforced: {
    label: "Protección\nreforzada",
    color: "text-green-700",
    bg: "bg-green-100",
    tooltip: "Registro digital inmutable en red pública independiente."
  },
  total: {
    label: "Protección\ntotal",
    color: "text-gray-700",
    bg: "bg-gray-100",
    tooltip: "Máxima fortaleza probatoria con verificación independiente adicional."
  }
};

const deriveProbativeState = (doc, planTier) => {
  const hasTsa = !!doc.has_legal_timestamp;
  const hasPolygon = !!doc.has_polygon_anchor;
  const ecoAvailable = !!(doc.eco_storage_path || doc.eco_file_data || doc.eco_hash);
  const bitcoinStatus = doc.bitcoin_status;
  const bitcoinConfirmed = bitcoinStatus === "confirmed" || !!doc.has_bitcoin_anchor;
  let level = "none";

  if (hasTsa) {
    level = "active";
  }

  if (hasTsa && hasPolygon) {
    level = "reinforced";
  }

  if (hasTsa && hasPolygon && bitcoinConfirmed) {
    level = "total";
  }

  const ecoxPlanAllowed = ["business", "enterprise"].includes((planTier || "").toLowerCase());
  const ecoxAvailable = ecoxPlanAllowed && !!doc.ecox_storage_path;

  return {
    level,
    config: PROBATIVE_STATES[level],
    ecoAvailable,
    ecoxAvailable,
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

const GUEST_DEMO_DOCS = [
  {
    id: "guest-doc-1",
    document_name: "Demo_Proteccion_Certificada.pdf",
    document_hash: "guest-hash-1",
    eco_hash: "guest-eco-1",
    created_at: new Date().toISOString(),
    last_event_at: new Date().toISOString(),
    has_legal_timestamp: true,
    has_polygon_anchor: false,
    has_bitcoin_anchor: false,
    polygon_status: "pending",
    bitcoin_status: "pending",
    pdf_storage_path: null,
    eco_storage_path: null,
    eco_file_data: null,
    ecox_storage_path: null,
    status: "certified"
  },
  {
    id: "guest-doc-2",
    document_name: "Demo_Proteccion_Reforzada.pdf",
    document_hash: "guest-hash-2",
    eco_hash: "guest-eco-2",
    created_at: new Date().toISOString(),
    last_event_at: new Date().toISOString(),
    has_legal_timestamp: true,
    has_polygon_anchor: true,
    has_bitcoin_anchor: false,
    polygon_status: "confirmed",
    bitcoin_status: "pending",
    pdf_storage_path: null,
    eco_storage_path: null,
    eco_file_data: null,
    ecox_storage_path: null,
    status: "certified"
  },
  {
    id: "guest-doc-3",
    document_name: "Demo_Proteccion_Total.pdf",
    document_hash: "guest-hash-3",
    eco_hash: "guest-eco-3",
    created_at: new Date().toISOString(),
    last_event_at: new Date().toISOString(),
    has_legal_timestamp: true,
    has_polygon_anchor: true,
    has_bitcoin_anchor: true,
    polygon_status: "confirmed",
    bitcoin_status: "confirmed",
    pdf_storage_path: null,
    eco_storage_path: null,
    eco_file_data: null,
    ecox_storage_path: null,
    status: "certified"
  }
];

function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planTier, setPlanTier] = useState(null); // free | pro | business | enterprise
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyDoc, setVerifyDoc] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
  const [search, setSearch] = useState("");

  const handleLogout = () => navigate("/");

  const loadDocuments = useCallback(async () => {
    try {
      if (isGuestMode()) {
        setDocuments(GUEST_DEMO_DOCS);
        setLoading(false);
        return;
      }
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
  }, []);

  const loadPlan = useCallback(async () => {
    try {
      if (isGuestMode()) {
        setPlanTier("guest");
        return;
      }
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
  }, []);

  useEffect(() => {
    loadDocuments();
    loadPlan();
  }, [loadDocuments, loadPlan]);

  useEffect(() => {
    if (isGuestMode()) return;
    if (showVerifyModal && verifyDoc?.pdf_storage_path && !autoVerifyAttempted) {
      setAutoVerifyAttempted(true);
      autoVerifyStoredPdf(verifyDoc);
    }
  }, [showVerifyModal, verifyDoc, autoVerifyAttempted]);

  useEffect(() => {
    const handleDocumentCreated = () => {
      loadDocuments();
    };
    window.addEventListener("ecosign:document-created", handleDocumentCreated);
    return () => window.removeEventListener("ecosign:document-created", handleDocumentCreated);
  }, [loadDocuments]);

  const downloadFromPath = async (storagePath, fileName = null) => {
    if (isGuestMode()) {
      toast("Modo invitado: descarga disponible solo con cuenta.", { position: "top-right" });
      return;
    }
    if (!storagePath) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(storagePath, 3600);
      if (error) {
        console.error("Error creando URL de descarga:", error);
        window.alert("No se pudo generar la descarga. Intenta regenerar el archivo.");
        return;
      }

      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        console.error("Error descargando archivo:", response.status, response.statusText);
        window.alert("No se pudo descargar el archivo. Intenta regenerarlo.");
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fallbackName = storagePath.split("/").pop() || "archivo.eco";

      link.href = downloadUrl;
      link.download = fileName || fallbackName;
      link.style.display = "none";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }, 200);
    } catch (err) {
      console.error("Error descargando:", err);
      window.alert("No se pudo descargar el archivo.");
    }
  };

  const requestRegeneration = async (docId, type) => {
    if (isGuestMode()) {
      toast("Modo invitado: regeneración disponible solo con cuenta.", { position: "top-right" });
      return;
    }
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

    console.log('📦 Intentando descargar .ECO:', {
      eco_storage_path: doc.eco_storage_path,
      eco_hash: doc.eco_hash,
      eco_file_data: doc.eco_file_data
    });

    if (doc.eco_storage_path) {
      console.log('✅ Descargando desde eco_storage_path');
      const ecoName = doc.document_name.replace(/\.pdf$/i, ".eco");
      downloadFromPath(doc.eco_storage_path, ecoName);
      return;
    }
    if (doc.eco_hash) {
      console.log('🔄 Solicitando regeneración del .ECO');
      requestRegeneration(doc.id, "eco");
      return;
    }
    console.warn('❌ No hay certificado .ECO disponible');
    window.alert("No hay certificado .ECO disponible para este documento. El archivo puede estar generándose.");
  };

  const performEcoxDownload = (doc) => {
    if (!doc) return;
    if (doc.ecox_storage_path) {
      const ecoxName = doc.document_name.replace(/\.pdf$/i, ".ecox");
      downloadFromPath(doc.ecox_storage_path, ecoxName);
      return;
    }
    requestRegeneration(doc.id, "ecox");
  };

  const handleEcoDownload = (doc) => {
    if (!doc) return;
    performEcoDownload(doc);
  };

  const handleEcoxDownload = (doc) => {
    if (!doc) return;
    performEcoxDownload(doc);
  };

  const handlePdfDownload = (doc) => {
    if (!doc?.pdf_storage_path) {
      window.alert("Este documento no fue almacenado. EcoSign no guarda documentos sin tu permiso.");
      return;
    }
    downloadFromPath(doc.pdf_storage_path, doc.document_name);
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
      extended: doc.bitcoin_status === "confirmed" ? "Protección total confirmada." : null
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
                      ecoAvailable
                    } = deriveProbativeState(doc, planTier);
                    const pdfAvailable = !!doc.pdf_storage_path;
                    const ecoEnabled = ecoAvailable || doc.eco_hash;
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start">
                            <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {doc.document_name.replace(/\.pdf$/i, '.eco')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.color} whitespace-pre-line text-center cursor-help`}
                            title={config.tooltip}
                          >
                            {config.label}
                          </span>
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
                              className={`${ecoEnabled ? "text-black hover:text-gray-600" : "text-gray-300 cursor-not-allowed"}`}
                              disabled={!ecoEnabled}
                              title={ecoEnabled ? "Descargar certificado .ECO" : "Certificado .ECO no disponible"}
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => pdfAvailable && handlePdfDownload(doc)}
                              className={`${pdfAvailable ? "text-black hover:text-gray-600" : "text-gray-300 cursor-not-allowed"}`}
                              disabled={!pdfAvailable}
                              title={pdfAvailable ? "PDF: descarga disponible" : "PDF: descarga no disponible"}
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
                  Validá que tu PDF coincide con el certificado almacenado.
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

            {!verifyResult && (
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
            )}

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
                <div className="pt-2 flex justify-end">
                  <button
                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                    onClick={() => {
                      setVerifyResult(null);
                      setVerifying(false);
                    }}
                  >
                    Verificar otro PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewBadges({ doc, planTier }) {
  const { config } = deriveProbativeState(doc, planTier);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.color} whitespace-pre-line text-center cursor-help`}
        title={config.tooltip}
      >
        {config.label}
      </span>
    </div>
  );
}

function ProbativeTimeline({ doc }) {
  const hasTsa = !!doc.has_legal_timestamp;
  const hasPolygon = !!doc.has_polygon_anchor;
  const bitcoinStatus = doc.bitcoin_status;
  const bitcoinConfirmed = bitcoinStatus === "confirmed" || !!doc.has_bitcoin_anchor;
  const timelineItems = [];

  if (hasTsa) {
    timelineItems.push({
      label: "Sello de tiempo verificado",
      description: "Fecha y hora firmadas por autoridad independiente.",
      status: "ok"
    });
  }

  if (hasPolygon) {
    timelineItems.push({
      label: "Registro público confirmado",
      description: "Huella publicada en registro digital independiente.",
      status: "ok"
    });
  }

  if (bitcoinConfirmed) {
    timelineItems.push({
      label: "Refuerzo independiente confirmado",
      description: doc.bitcoin_confirmed_at
        ? `Confirmado: ${formatDate(doc.bitcoin_confirmed_at)}`
        : "Confirmado.",
      status: "ok"
    });
  }

  if (timelineItems.length === 0) {
    timelineItems.push({
      label: "Sin eventos confirmados",
      description: "Todavía no hay refuerzos confirmados para este documento.",
      status: "empty"
    });
  }

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
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentsPage;
