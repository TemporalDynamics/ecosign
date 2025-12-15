import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabaseClient";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Search, Eye, Download, Copy, Folder, FolderPlus, MoveRight, ShieldCheck, Shield, X } from 'lucide-react';
import DashboardNav from "../components/DashboardNav";
import FooterInternal from "../components/FooterInternal";
import ShareLinkGenerator from "../components/ShareLinkGenerator";
import InhackeableTooltip from "../components/InhackeableTooltip";

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
  pending_anchor: { label: "Certificado", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle },
  certified: { label: "Certificado", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle },
  rejected: { label: "Rechazado", color: "text-red-600", bg: "bg-red-100", icon: XCircle },
  expired: { label: "Expirado", color: "text-gray-500", bg: "bg-gray-100", icon: AlertCircle },
  revoked: { label: "Revocado", color: "text-red-700", bg: "bg-red-100", icon: XCircle }
};

const deriveDocState = (doc, planTier) => {
  const statusKey = doc.eco_hash ? 'certified' : doc.overall_status;
  const overallConfig = OVERALL_STATUS_CONFIG[statusKey] || OVERALL_STATUS_CONFIG.draft;
  const bitcoinPending = doc.bitcoin_status === 'pending';
  const bitcoinConfirmed = doc.bitcoin_status === 'confirmed';
  const pdfAvailable = !!doc.pdf_storage_path;
  const ecoAvailable = !!(doc.eco_storage_path || doc.eco_file_data || doc.eco_hash);
  const ecoxPlanAllowed = ['business', 'enterprise'].includes((planTier || '').toLowerCase());
  const ecoxAvailable = ecoxPlanAllowed && !!doc.ecox_storage_path;
  return { overallConfig, bitcoinPending, bitcoinConfirmed, pdfAvailable, ecoAvailable, ecoxAvailable };
};

function DocumentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedNdaDoc, setSelectedNdaDoc] = useState(null);
  const [planTier, setPlanTier] = useState(null); // free | pro | business | enterprise
  const [ecoPendingDoc, setEcoPendingDoc] = useState(null);
  const [showEcoPendingModal, setShowEcoPendingModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyDoc, setVerifyDoc] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
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
    loadFolders();
    loadPlan();
  }, [activeTab, filters, selectedFolder]);

  const downloadFromPath = async (storagePath) => {
    if (!storagePath) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(storagePath, 3600);
      if (error) {
        console.error('Error creando URL de descarga:', error);
        window.alert('No se pudo generar la descarga. Intenta regenerar el archivo.');
        return;
      }
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error descargando:', err);
      window.alert('No se pudo descargar el archivo.');
    }
  };

  const requestRegeneration = async (docId, type) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.rpc('request_certificate_regeneration', {
        _document_id: docId,
        _request_type: type
      });
      if (error) {
        console.error('Error solicitando regeneración:', error);
        window.alert('No se pudo solicitar la regeneración.');
        return;
      }
      window.alert('Solicitud de regeneración enviada');
    } catch (err) {
      console.error('Error solicitando regeneración:', err);
      window.alert('No se pudo solicitar la regeneración.');
    }
  };

  const handleEcoDownload = (doc) => {
    if (!doc) return;
    if (doc.bitcoin_status === 'pending') {
      setEcoPendingDoc({ ...doc, pendingType: 'eco' });
      setShowEcoPendingModal(true);
      return;
    }
    if (doc.eco_storage_path) {
      downloadFromPath(doc.eco_storage_path);
      return;
    }
    if (doc.eco_hash) {
      requestRegeneration(doc.id, 'eco');
    }
  };

  const handleEcoxDownload = (doc) => {
    if (!doc) return;
    if (doc.bitcoin_status === 'pending') {
      setEcoPendingDoc({ ...doc, pendingType: 'ecox' });
      setShowEcoPendingModal(true);
      return;
    }
    if (doc.ecox_storage_path) {
      downloadFromPath(doc.ecox_storage_path);
      return;
    }
    requestRegeneration(doc.id, 'ecox');
  };

  const handleVerifyDoc = (doc) => {
    if (!doc) return;
    setVerifyDoc(doc);
    setVerifyResult(null);
    setShowVerifyModal(true);
  };

  // Bitcoin es capa opcional: el usuario puede cancelar la espera y descargar.
  // Una vez cancelado, cualquier confirmación tardía se ignora por diseño.
  const overrideBitcoinPending = async () => {
    if (!ecoPendingDoc) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('user_documents')
        .update({
          bitcoin_status: 'cancelled',
          download_enabled: true
        })
        .eq('id', ecoPendingDoc.id);
      if (error) {
        console.error('No se pudo cancelar Bitcoin:', error);
        return;
      }
      setDocuments(prev => prev.map(d => d.id === ecoPendingDoc.id ? { ...d, bitcoin_status: 'cancelled', download_enabled: true } : d));
      setShowEcoPendingModal(false);
      setEcoPendingDoc(null);

      if (ecoPendingDoc.pendingType === 'eco') {
        if (ecoPendingDoc.eco_storage_path) {
          downloadFromPath(ecoPendingDoc.eco_storage_path);
        } else if (ecoPendingDoc.eco_hash) {
          requestRegeneration(ecoPendingDoc.id, 'eco');
        }
      } else if (ecoPendingDoc.pendingType === 'ecox') {
        if (ecoPendingDoc.ecox_storage_path) {
          downloadFromPath(ecoPendingDoc.ecox_storage_path);
        } else {
          requestRegeneration(ecoPendingDoc.id, 'ecox');
        }
      }
    } catch (err) {
      console.error('Error en override Bitcoin pending:', err);
    }
  };

  const computeHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const onVerifyFile = async (file) => {
    if (!verifyDoc) return;
    setVerifying(true);
    try {
      const hash = await computeHash(file);
      const matches = verifyDoc.document_hash && hash.toLowerCase() === verifyDoc.document_hash.toLowerCase();
      setVerifyResult({
        matches,
        hash,
        extended:
          verifyDoc.bitcoin_status === 'pending'
            ? 'Irrefutabilidad reforzada — en proceso'
            : verifyDoc.bitcoin_status === 'confirmed'
              ? 'Irrefutable'
              : null
      });
    } catch (err) {
      console.error('Error verificando PDF:', err);
      setVerifyResult({
        matches: false,
        error: 'No se pudo verificar el documento.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const supabase = getSupabase();
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
          document_hash,
          events(id, event_type, timestamp, metadata),
          signer_links(id, signer_email, status, signed_at),
          anchors!user_document_id(id, anchor_status, bitcoin_tx_id, confirmed_at),
          folder:document_folders(name)
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

      if (selectedFolder !== "all") {
        if (selectedFolder === "unassigned") {
          query = query.is("folder_id", null);
        } else {
          query = query.eq("folder_id", selectedFolder);
        }
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

  const loadPlan = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const tier = user?.user_metadata?.plan || user?.user_metadata?.tier || null;
      setPlanTier(tier);
    } catch (err) {
      console.warn('No se pudo obtener el plan del usuario:', err);
      setPlanTier(null);
    }
  };

  const loadFolders = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("document_folders")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading folders:", error);
        return;
      }
      setFolders(data || []);
    } catch (err) {
      console.error("Error loading folders:", err);
    }
  };

  const createFolder = async () => {
    const name = window.prompt("Nombre de la carpeta");
    if (!name || !name.trim()) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("create_document_folder", { _name: name.trim() });
      if (error) {
        console.error("Error creating folder:", error);
        window.alert(`No se pudo crear la carpeta: ${error.message}`);
        return;
      }
      console.log("Folder created successfully:", data);
      await loadFolders();
      window.alert("Carpeta creada exitosamente");
    } catch (err) {
      console.error("Error creating folder:", err);
      window.alert(`Error al crear la carpeta: ${err.message}`);
    }
  };

  const moveToFolder = async (docId) => {
    const options = ["Sin carpeta", ...folders.map(f => `${f.id}|${f.name}`)];
    const choice = window.prompt(`Mover a carpeta:\n${options.map((o, idx) => `${idx} - ${o.includes('|') ? o.split('|')[1] : o}`).join('\n')}`);
    if (choice === null || choice === "") return;
    const idx = parseInt(choice, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= options.length) return;
    const selected = options[idx];
    const folderId = selected === "Sin carpeta" ? null : selected.split('|')[0];

    try {
      const supabase = getSupabase();
      const { error } = await supabase.rpc("move_documents_to_folder", { _doc_ids: [docId], _folder_id: folderId });
      if (error) {
        console.error("Error moving document:", error);
        window.alert("No se pudo mover el documento");
        return;
      }
      await loadDocuments();
    } catch (err) {
      console.error("Error moving document:", err);
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
              <div className="flex gap-4 items-center flex-wrap">
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

                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">Todas las carpetas</option>
                  <option value="unassigned">Sin carpeta</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 items-center">
                <button
                  onClick={createFolder}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <FolderPlus className="h-4 w-4" />
                  Nueva carpeta
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {activeTab === "all" && (
            <AllDocumentsTab
              documents={documents}
              loading={loading}
              formatDate={formatDate}
              copyToClipboard={copyToClipboard}
              moveToFolder={moveToFolder}
              planTier={planTier}
              onEcoDownload={handleEcoDownload}
              onEcoxDownload={handleEcoxDownload}
              onVerify={handleVerifyDoc}
              downloadFromPath={downloadFromPath}
              requestRegeneration={requestRegeneration}
            />
          )}
          {activeTab === "certified" && (
            <CertifiedDocumentsTab
              documents={documents}
              loading={loading}
              formatDate={formatDate}
              copyToClipboard={copyToClipboard}
              planTier={planTier}
              onEcoDownload={handleEcoDownload}
              onEcoxDownload={handleEcoxDownload}
              onVerify={handleVerifyDoc}
              downloadFromPath={downloadFromPath}
              requestRegeneration={requestRegeneration}
            />
          )}
          {activeTab === "forensic" && <ForensicTab documents={documents} formatDate={formatDate} copyToClipboard={copyToClipboard} />}
        </main>
    </div>
    <FooterInternal />
    {showShareModal && selectedNdaDoc && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <ShareLinkGenerator
          documentId={selectedNdaDoc.id}
          documentTitle={selectedNdaDoc.document_name}
          onClose={() => { setShowShareModal(false); setSelectedNdaDoc(null); }}
        />
      </div>
    )}

    {/* Modal ECO pendiente (Bitcoin en proceso) */}
    {showEcoPendingModal && ecoPendingDoc && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Certificado listo · Protección adicional en proceso
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Tu certificado ya cuenta con un registro digital inmutable y atemporal.
              </p>
            </div>
            <button
              onClick={() => { setShowEcoPendingModal(false); setEcoPendingDoc(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-700 mb-6">
            Estamos completando una confirmación adicional en una red independiente que refuerza su irrefutabilidad a largo plazo.
          </p>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-sm font-semibold"
              onClick={() => { setShowEcoPendingModal(false); setEcoPendingDoc(null); }}
            >
              ⏳ Esperar y descargar con protección reforzada
            </button>
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:border-gray-400"
              onClick={overrideBitcoinPending}
            >
              ⬇️ Descargar ahora
            </button>
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
                Arrastrá el PDF firmado para verificarlo.
              </p>
              <p className="text-xs text-gray-500">
                Esta verificación se realiza en tu ordenador. Tu documento no se sube ni se guarda.
              </p>
            </div>
            <button
              onClick={() => { setShowVerifyModal(false); setVerifyResult(null); setVerifyDoc(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center mb-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => e.target.files?.[0] && onVerifyFile(e.target.files[0])}
              className="hidden"
              id="verify-upload"
            />
            <label htmlFor="verify-upload" className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
              {verifying ? 'Verificando…' : 'Arrastrá o hacé clic para subir el PDF firmado'}
            </label>
          </div>

          {verifyResult && (
            <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm">
              <p className={`font-semibold ${verifyResult.matches ? 'text-green-700' : 'text-red-700'}`}>
                {verifyResult.matches ? '✅ Documento verificado' : '❌ El PDF no coincide con el certificado'}
              </p>
                  {verifyResult.extended && verifyResult.matches && (
                    <p className="text-xs text-gray-700 mt-2">{verifyResult.extended}</p>
                  )}
                  {verifyResult.error && (
                    <p className="text-xs text-red-600 mt-2">
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

// Tab 1: Todos los Documentos
function AllDocumentsTab({ documents, loading, formatDate, copyToClipboard, moveToFolder, planTier, onEcoDownload, onEcoxDownload, onVerify, downloadFromPath, requestRegeneration }) {
  // Solo UI: los estados se derivan en el padre. No agregar lógica aquí.
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
              Carpeta
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
            const { overallConfig, bitcoinPending, pdfAvailable, ecoAvailable, ecoxAvailable } = deriveDocState(doc, planTier);
            const downloadEnabled = doc.download_enabled !== false;

            return (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doc.document_name}</div>
                      {bitcoinPending && (
                        <div className="text-xs text-orange-600 mt-0.5">
                          Protección adicional en proceso (Bitcoin 4-24h)
                        </div>
                      )}
                      {!pdfAvailable && (
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          PDF no almacenado (modo privacidad)
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.folder_id ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                      <Folder className="h-3 w-3" />
                      {doc.folder?.name || 'Carpeta'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sin carpeta</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 uppercase">{doc.file_type || "PDF"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${overallConfig.bg} ${overallConfig.color}`} title="Este documento ya cuenta con protección legal completa y puede verificarse en cualquier momento.">
                    {overallConfig.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(doc.last_event_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <button
                      className="text-black hover:text-gray-600"
                      title="Ver documento"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => ecoAvailable ? onEcoDownload(doc) : requestRegeneration(doc.id, 'eco')}
                      className={`${ecoAvailable || doc.eco_hash ? 'text-black hover:text-gray-600' : 'text-gray-300 cursor-not-allowed'}`}
                      disabled={!ecoAvailable && !doc.eco_hash}
                      title={ecoAvailable ? 'Descargar .ECO' : doc.eco_hash ? 'Regenerar .ECO' : 'No disponible'}
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => ecoxAvailable ? onEcoxDownload(doc) : requestRegeneration(doc.id, 'ecox')}
                      className="text-black hover:text-gray-600"
                      title={ecoxAvailable ? 'Descargar .ECOX' : 'Solicitar .ECOX'}
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </button>
                  <button
                    className="text-black hover:text-gray-600"
                    title="Verificar documento"
                    onClick={() => onVerify(doc)}
                  >
                    <Search className="h-5 w-5" />
                  </button>
                    <button
                      className="text-black hover:text-gray-600"
                      title="Mover a carpeta"
                      onClick={() => moveToFolder(doc.id)}
                    >
                    <MoveRight className="h-5 w-5" />
                  </button>
                  </div>
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
function CertifiedDocumentsTab({ documents, loading, formatDate, copyToClipboard, planTier, onEcoDownload, onEcoxDownload, onVerify, downloadFromPath, requestRegeneration }) {
  // Solo UI: los estados se derivan en el padre. No agregar lógica aquí.
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
        const pdfAvailable = !!doc.pdf_storage_path;
        const ecoAvailable = !!(doc.eco_storage_path || doc.eco_file_data || doc.eco_hash);
        const ecoxPlanAllowed = ['business', 'enterprise'].includes((planTier || '').toLowerCase());
        const ecoxAvailable = ecoxPlanAllowed && !!doc.ecox_storage_path;

        return (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-6">
            {bitcoinPending && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-semibold text-orange-900">
                      Protección adicional en proceso (Bitcoin 4-24h)
                    </h4>
                    <p className="text-xs text-orange-700 mt-1">
                      Tu certificado ya es válido y verificable. Estamos agregando una confirmación independiente para reforzar su irrefutabilidad a largo plazo.
                    </p>
                  </div>
                </div>
              </div>
            )}

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{doc.document_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Certificado el {formatDate(doc.created_at)}</p>
                  {!pdfAvailable && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      PDF no almacenado (modo privacidad)
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => pdfAvailable && doc.pdf_storage_path && downloadFromPath(doc.pdf_storage_path)}
                  className={`px-4 py-2 rounded-lg text-sm ${pdfAvailable ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                  disabled={!pdfAvailable}
                  title={pdfAvailable ? 'Descargar PDF' : 'No se almacenó el PDF (modo privacidad)'}
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  PDF Firmado
                </button>
                <button
                  onClick={() => ecoAvailable ? onEcoDownload(doc) : doc.eco_hash && requestRegeneration(doc.id, 'eco')}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    ecoAvailable || doc.eco_hash
                      ? 'border border-gray-300 hover:bg-gray-50'
                      : 'border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!ecoAvailable && !doc.eco_hash}
                  title={ecoAvailable ? 'Descargar certificado .ECO' : doc.eco_hash ? 'Regenerar certificado .ECO' : 'No disponible'}
                  >
                  <Download className="h-4 w-4 inline mr-2" />
                  {bitcoinPending ? 'Certificado .ECO (Pendiente)' : ecoAvailable ? 'Certificado .ECO' : 'Regenerar .ECO'}
                </button>
                <button
                  onClick={() => ecoxAvailable ? onEcoxDownload(doc) : requestRegeneration(doc.id, 'ecox')}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                  title={ecoxAvailable ? 'Descargar Certificado Avanzado (.ECOX)' : 'Solicitar certificado avanzado (.ECOX)'}
                >
                  <ShieldCheck className="h-4 w-4 inline mr-2" />
                  {ecoxAvailable ? 'Certificado Avanzado (.ECOX)' : 'Solicitar .ECOX'}
                </button>
                <button
                  onClick={() => onVerify(doc)}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                  title="Verificar documento"
                >
                  <Search className="h-4 w-4 inline mr-2" />
                  Verificar
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

          {/* Registro digital info */}
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">Registro digital</span>
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Inmutable</span>
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Atemporal</span>
            {bitcoinPending && (
              <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                Irrefutabilidad reforzada — en proceso
              </span>
            )}
            {bitcoinConfirmed && (
              <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                Irrefutable
              </span>
            )}
          </div>

            {/* Anchoring Timeline */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">
                Timeline de blindaje <InhackeableTooltip className="font-semibold" />
              </label>
              <div className="space-y-3">
                {/* Sello legal */}
                <div className="flex items-center gap-3">
                  {doc.has_legal_timestamp ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${doc.has_legal_timestamp ? 'text-gray-900' : 'text-gray-400'}`}>
                      Sello de tiempo legal (TSA)
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.has_legal_timestamp ? 'Certificado por TSA' : 'No solicitado'}
                    </div>
                  </div>
                </div>

                {/* Polygon Blockchain */}
                <div className="flex items-center gap-3">
                  {doc.has_polygon_anchor ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${doc.has_polygon_anchor ? 'text-gray-900' : 'text-gray-400'}`}>
                      Blockchain Polygon (huella publicada)
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.has_polygon_anchor ? 'Confirmado en blockchain' : 'No solicitado'}
                    </div>
                  </div>
                </div>

                {/* Confirmación independiente (opcional) */}
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
                      Confirmación independiente (opcional)
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
