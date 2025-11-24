import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { FileText, Filter, Search, Download, Eye, Copy, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";

const STATUS_CONFIG = {
  draft: { label: "Borrador", color: "text-gray-600", bg: "bg-gray-100" },
  sent: { label: "Enviado", color: "text-blue-600", bg: "bg-blue-100" },
  pending: { label: "Pendiente", color: "text-yellow-600", bg: "bg-yellow-100" },
  signed: { label: "Firmado", color: "text-green-600", bg: "bg-green-100" },
  rejected: { label: "Rechazado", color: "text-red-600", bg: "bg-red-100" },
  expired: { label: "Expirado", color: "text-gray-500", bg: "bg-gray-100" }
};

const OVERALL_STATUS_CONFIG = {
  draft: { label: "Borrador", color: "text-gray-600", bg: "bg-gray-100", icon: FileText },
  pending: { label: "Pendiente", color: "text-yellow-600", bg: "bg-yellow-100", icon: Clock },
  pending_anchor: { label: "⏳ Anclando en Bitcoin", color: "text-orange-600", bg: "bg-orange-100", icon: Clock },
  certified: { label: "✓ Certificado", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle },
  rejected: { label: "Rechazado", color: "text-red-600", bg: "bg-red-100", icon: XCircle },
  expired: { label: "Expirado", color: "text-gray-500", bg: "bg-gray-100", icon: AlertCircle },
  revoked: { label: "Revocado", color: "text-red-700", bg: "bg-red-100", icon: XCircle }
};

function DocumentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    fileType: "all",
    search: ""
  });

  const handleLogout = () => {
    navigate('/');
  };

  useEffect(() => {
    loadDocuments();
  }, [activeTab, filters]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Error getting user:", userError);
        setDocuments([]);
        return;
      }

      console.log("Loading documents for user:", user.id);
      
      let query = supabase
        .from("user_documents")
        .select(`
          *,
          events(id, event_type, timestamp, metadata),
          signer_links(id, signer_email, status, signed_at),
          anchors!user_document_id(id, anchor_status, bitcoin_tx_id, confirmed_at)
        `)
        .eq("user_id", user.id)
        .order("last_event_at", { ascending: false });

      // Filtros por pestaña
      if (activeTab === "certified") {
        query = query.not("eco_hash", "is", null);
      }

      // Filtros adicionales
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.fileType !== "all") {
        query = query.eq("file_type", filters.fileType);
      }

      if (filters.search) {
        query = query.ilike("document_name", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading documents:", error);
        throw error;
      }
      
      console.log("Documents loaded:", data?.length || 0);
      setDocuments(data || []);
    } catch (error) {
      console.error("Error in loadDocuments:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // TODO: Agregar toast notification
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DashboardNav onLogout={handleLogout} />
      <div className="flex-grow">
        <main className="max-w-7xl mx-auto px-4 pt-8 pb-24">
          {/* Header */}
          <header className="mb-10">
            <h1 className="mt-0 text-3xl md:text-4xl font-semibold tracking-tight text-center">
              Mis Documentos
            </h1>
            <p className="mt-3 text-base md:text-lg text-neutral-600 max-w-2xl mx-auto text-center">
              Gestión completa de tus documentos certificados y firmados
            </p>
          </header>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="flex space-x-8 justify-center">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "all"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Todos los Documentos
              </button>
              <button
                onClick={() => setActiveTab("certified")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "certified"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Documentos Certificados (.ECO)
              </button>
              <button
                onClick={() => setActiveTab("forensic")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "forensic"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Registro Forense
              </button>
            </nav>
          </div>

          {/* Filters */}
          {activeTab !== "forensic" && (
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar documentos..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="sent">Enviado</option>
                  <option value="pending">Pendiente</option>
                  <option value="signed">Firmado</option>
                  <option value="rejected">Rechazado</option>
                  <option value="expired">Expirado</option>
                </select>

                <select
                  value={filters.fileType}
                  onChange={(e) => setFilters({ ...filters, fileType: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="image">Imagen</option>
                </select>
              </div>
            </div>
          )}

          {/* Content */}
          {activeTab === "all" && <AllDocumentsTab documents={documents} loading={loading} formatDate={formatDate} copyToClipboard={copyToClipboard} />}
          {activeTab === "certified" && <CertifiedDocumentsTab documents={documents} loading={loading} formatDate={formatDate} copyToClipboard={copyToClipboard} />}
          {activeTab === "forensic" && <ForensicTab documents={documents} formatDate={formatDate} copyToClipboard={copyToClipboard} />}
        </main>
      </div>
      <FooterInternal />
    </div>
  );
}

// Tab 1: Todos los Documentos
function AllDocumentsTab({ documents, loading, formatDate, copyToClipboard }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-20">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
        <p className="text-gray-500">Comienza certificando tu primer documento</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Última Actividad
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((doc) => {
            const overallConfig = OVERALL_STATUS_CONFIG[doc.overall_status] || OVERALL_STATUS_CONFIG.draft;
            const downloadEnabled = doc.download_enabled !== false;
            const bitcoinPending = doc.bitcoin_status === 'pending';

            return (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doc.document_name}</div>
                      {bitcoinPending && (
                        <div className="text-xs text-orange-600 mt-0.5">
                          Anclaje Bitcoin: 4-24h restantes
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 uppercase">{doc.file_type || "PDF"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${overallConfig.bg} ${overallConfig.color}`}>
                    {overallConfig.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(doc.last_event_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-black hover:text-gray-600 mr-4">
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    className={`${downloadEnabled ? 'text-black hover:text-gray-600' : 'text-gray-300 cursor-not-allowed'}`}
                    disabled={!downloadEnabled}
                    title={!downloadEnabled ? 'Descarga disponible cuando Bitcoin confirme' : 'Descargar .ECO'}
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Tab 2: Documentos Certificados
function CertifiedDocumentsTab({ documents, loading, formatDate, copyToClipboard }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  const certifiedDocs = documents.filter(doc => doc.eco_hash);

  if (certifiedDocs.length === 0) {
    return (
      <div className="text-center py-20">
        <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos certificados</h3>
        <p className="text-gray-500">Los documentos con blindaje forense aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {certifiedDocs.map((doc) => {
        const downloadEnabled = doc.download_enabled !== false;
        const bitcoinPending = doc.bitcoin_status === 'pending';
        const bitcoinConfirmed = doc.bitcoin_status === 'confirmed';

        return (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-6">
            {/* Bitcoin Pending Warning */}
            {bitcoinPending && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-semibold text-orange-900">
                      Anclaje Bitcoin en progreso (4-24 horas)
                    </h4>
                    <p className="text-xs text-orange-700 mt-1">
                      Tu documento está siendo anclado en la blockchain de Bitcoin.
                      Recibirás un email cuando el certificado .ECO esté listo para descargar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{doc.document_name}</h3>
                <p className="text-sm text-gray-500 mt-1">Certificado el {formatDate(doc.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 text-sm">
                  <Download className="h-4 w-4 inline mr-2" />
                  PDF Firmado
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm ${
                    downloadEnabled
                      ? 'border border-gray-300 hover:bg-gray-50'
                      : 'border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!downloadEnabled}
                  title={!downloadEnabled ? 'Disponible cuando Bitcoin confirme' : 'Descargar certificado'}
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  {bitcoinPending ? 'Certificado .ECO (Pendiente)' : 'Certificado .ECO'}
                </button>
              </div>
            </div>

          {/* Hash */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase">Hash SHA-256</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-x-auto">
                {doc.eco_hash}
              </code>
              <button
                onClick={() => copyToClipboard(doc.eco_hash)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Copy className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

            {/* Anchoring Timeline */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">
                Timeline de Anclajes
              </label>
              <div className="space-y-3">
                {/* RFC 3161 Timestamp */}
                <div className="flex items-center gap-3">
                  {doc.has_legal_timestamp ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${doc.has_legal_timestamp ? 'text-gray-900' : 'text-gray-400'}`}>
                      RFC 3161 Legal Timestamp
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.has_legal_timestamp ? 'Certificado por TSA' : 'No solicitado'}
                    </div>
                  </div>
                </div>

                {/* Polygon Anchor */}
                <div className="flex items-center gap-3">
                  {doc.has_polygon_anchor ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${doc.has_polygon_anchor ? 'text-gray-900' : 'text-gray-400'}`}>
                      Polygon Mainnet
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.has_polygon_anchor ? 'Confirmado en blockchain' : 'No solicitado'}
                    </div>
                  </div>
                </div>

                {/* Bitcoin Anchor */}
                <div className="flex items-center gap-3">
                  {bitcoinConfirmed ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : bitcoinPending ? (
                    <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 animate-pulse" />
                  ) : doc.has_bitcoin_anchor ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      bitcoinConfirmed || doc.has_bitcoin_anchor ? 'text-gray-900' :
                      bitcoinPending ? 'text-orange-600' : 'text-gray-400'
                    }`}>
                      Bitcoin Blockchain (OpenTimestamps)
                    </div>
                    <div className="text-xs text-gray-500">
                      {bitcoinConfirmed && doc.bitcoin_confirmed_at
                        ? `Confirmado: ${formatDate(doc.bitcoin_confirmed_at)}`
                        : bitcoinPending
                        ? 'Pendiente: 4-24 horas'
                        : doc.has_bitcoin_anchor
                        ? 'Confirmado'
                        : 'No solicitado'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Tab 3: Registro Forense
function ForensicTab({ documents, formatDate, copyToClipboard }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    if (documents.length > 0 && !selectedDoc) {
      setSelectedDoc(documents[0]);
    }
  }, [documents]);

  if (!selectedDoc) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un documento</h3>
        <p className="text-gray-500">Elige un documento para ver su registro forense completo</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Document Selector */}
      <div className="col-span-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Seleccionar Documento</h3>
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            className={`w-full text-left px-4 py-3 rounded-lg border ${
              selectedDoc?.id === doc.id
                ? "border-black bg-gray-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium text-sm text-gray-900 truncate">{doc.document_name}</div>
            <div className="text-xs text-gray-500 mt-1">{formatDate(doc.created_at)}</div>
          </button>
        ))}
      </div>

      {/* Forensic Details */}
      <div className="col-span-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{selectedDoc.document_name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>Hash: {selectedDoc.eco_hash?.substring(0, 16)}...</span>
              <button
                onClick={() => copyToClipboard(selectedDoc.eco_hash)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Timeline Forense (ChainLog) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Forense (ChainLog)</h3>
            <div className="space-y-4">
              {selectedDoc.events && selectedDoc.events.length > 0 ? (
                selectedDoc.events.map((event, idx) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-black rounded-full"></div>
                      {idx < selectedDoc.events.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-900">{event.event_type}</span>
                        <span className="text-sm text-gray-500">{formatDate(event.timestamp)}</span>
                      </div>
                      {event.metadata && (
                        <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No hay eventos registrados</p>
              )}
            </div>
          </div>

          {/* Firmantes */}
          {selectedDoc.signer_links && selectedDoc.signer_links.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Firmantes</h3>
              <div className="space-y-2">
                {selectedDoc.signer_links.map((signer) => (
                  <div key={signer.id} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">{signer.signer_email}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      signer.status === "signed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {signer.status === "signed" ? `Firmado ${formatDate(signer.signed_at)}` : "Pendiente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anclaje Blockchain */}
          {selectedDoc.anchors && selectedDoc.anchors.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Anclaje Blockchain</h3>
              {selectedDoc.anchors.map((anchor) => (
                <div key={anchor.id} className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">TX Hash:</span>
                    <code className="text-xs text-gray-600">{anchor.bitcoin_tx_id || 'Pendiente'}</code>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">Estado:</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      anchor.anchor_status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {anchor.anchor_status}
                    </span>
                  </div>
                  {anchor.confirmed_at && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-medium">Confirmado:</span>
                      <span className="text-xs text-gray-600">{formatDate(anchor.confirmed_at)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentsPage;
