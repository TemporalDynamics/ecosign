import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabaseClient";
import { AlertCircle, CheckCircle, Copy, Download, Eye, FileText, MoreVertical, Search, Share2, Shield, X } from "lucide-react";
import toast from "react-hot-toast";
import Header from "../components/Header";
import FooterInternal from "../components/FooterInternal";
import InhackeableTooltip from "../components/InhackeableTooltip";
import ShareDocumentModal from "../components/ShareDocumentModal";
import { ProtectedBadge } from "../components/ProtectedBadge";
import { disableGuestMode, isGuestMode } from "../utils/guestMode";
import { useLegalCenter } from "../contexts/LegalCenterContext";
import { decryptFile, ensureCryptoSession, getSessionUnwrapKey, unwrapDocumentKey } from "../lib/e2e";

type DocumentRecord = {
  id: string;
  document_name: string;
  document_hash: string;
  eco_hash?: string | null;
  ecox_hash?: string | null;
  content_hash?: string | null;
  created_at?: string;
  last_event_at?: string | null;
  has_legal_timestamp?: boolean;
  has_polygon_anchor?: boolean;
  has_bitcoin_anchor?: boolean;
  polygon_status?: string | null;
  bitcoin_status?: string | null;
  bitcoin_confirmed_at?: string | null;
  pdf_storage_path?: string | null;
  encrypted_path?: string | null;
  encrypted?: boolean | null;
  wrapped_key?: string | null;
  wrap_iv?: string | null;
  pdf_url?: string | null;
  eco_storage_path?: string | null;
  ecox_storage_path?: string | null;
  eco_file_data?: string | null;
  ecox_file_data?: string | null;
  status?: string | null;
  events?: any[];
  signer_links?: any[];
};

type PlanTier = "guest" | "free" | "pro" | "business" | "enterprise" | null | string;

type VerificationResult = {
  matches: boolean | null;
  matchesDocument?: boolean | null;
  matchesContent?: boolean | null;
  hash?: string;
  source?: "upload" | "stored";
  extended?: string | null;
  error?: string;
};

const PROBATIVE_STATES = {
  none: {
    label: "Sin protección",
    color: "text-gray-600",
    bg: "bg-gray-100",
    tooltip: "Aún no se generó un certificado para este documento."
  },
  active: {
    label: "Protección\ncertificada",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    tooltip: "Sello de tiempo legal (TSA) y huella digital única confirmados."
  },
  reinforced: {
    label: "Protección\nreforzada",
    color: "text-blue-700",
    bg: "bg-blue-100",
    tooltip: "Registro digital inmutable en red pública independiente."
  },
  total: {
    label: "Protección\ntotal",
    color: "text-gray-700",
    bg: "bg-gray-100",
    tooltip: "Máxima fortaleza probatoria con verificación independiente adicional."
  }
} as const;

type ProbativeLevel = keyof typeof PROBATIVE_STATES;
type ProbativeStateResult = {
  level: ProbativeLevel;
  config: (typeof PROBATIVE_STATES)[ProbativeLevel];
  ecoAvailable: boolean;
  ecoxAvailable: boolean;
  bitcoinConfirmed: boolean;
  ecoxPlanAllowed: boolean;
};

const deriveProbativeState = (doc: DocumentRecord, planTier: PlanTier): ProbativeStateResult => {
  const hasTsa = !!doc.has_legal_timestamp;
  const hasPolygon = !!doc.has_polygon_anchor;
  const ecoAvailable = !!(doc.eco_storage_path || doc.eco_file_data || doc.eco_hash);
  const bitcoinStatus = doc.bitcoin_status;
  const bitcoinConfirmed = bitcoinStatus === "confirmed" || !!doc.has_bitcoin_anchor;
  let level: ProbativeLevel = "none";

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

const formatDate = (date: string | number | Date | null | undefined) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const computeHash = async (fileOrBlob: Blob | File): Promise<string> => {
  const buffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const GUEST_DEMO_DOCS: DocumentRecord[] = [
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
  const { open: openLegalCenter } = useLegalCenter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [planTier, setPlanTier] = useState<PlanTier>(null); // free | pro | business | enterprise
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyDoc, setVerifyDoc] = useState<DocumentRecord | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
  const [search, setSearch] = useState("");
  const [shareDoc, setShareDoc] = useState<DocumentRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const isSearchActive = search.trim().length > 0;
  const hasDocuments = documents.length > 0;

  const handleLogout = () => navigate("/");

  const loadDocuments = useCallback(async () => {
    try {
      const supabase = getSupabase();
      setLoading(true);
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (!user && isGuestMode()) {
        setDocuments(GUEST_DEMO_DOCS);
        setLoading(false);
        return;
      }

      if (userError || !user) {
        console.error("Error getting user:", userError);
        setDocuments([]);
        return;
      }
      disableGuestMode();

      const query = supabase
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

      setDocuments((data as DocumentRecord[] | null) || []);
    } catch (error) {
      console.error("Error in loadDocuments:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlan = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user && isGuestMode()) {
        setPlanTier("guest");
        return;
      }
      const tier = user?.user_metadata?.plan || user?.user_metadata?.tier || null;
      setPlanTier(tier);
      if (user) {
        disableGuestMode();
      }
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
    const handleDocumentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; pdf_storage_path?: string | null }>).detail;
      if (!detail?.id) {
        loadDocuments();
        return;
      }
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === detail.id ? { ...doc, pdf_storage_path: detail.pdf_storage_path ?? doc.pdf_storage_path } : doc
        )
      );
    };
    window.addEventListener("ecosign:document-created", handleDocumentCreated);
    window.addEventListener("ecosign:document-updated", handleDocumentUpdated);
    return () => {
      window.removeEventListener("ecosign:document-created", handleDocumentCreated);
      window.removeEventListener("ecosign:document-updated", handleDocumentUpdated);
    };
  }, [loadDocuments]);

  const triggerDownload = (blob: Blob, fileName: string) => {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = "none";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    }, 200);
  };

  const downloadFromPath = async (storagePath: string | null | undefined, fileName: string | null = null) => {
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
        window.alert("No pudimos preparar la descarga. Probá regenerar el certificado y reintentá.");
        return;
      }

      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        console.error("Error descargando archivo:", response.status, response.statusText);
        window.alert("La descarga falló. Probá regenerar el archivo y volver a intentar.");
        return;
      }

      const blob = await response.blob();
      const fallbackName = storagePath.split("/").pop() || "archivo.eco";
      triggerDownload(blob, fileName || fallbackName);
    } catch (err) {
      console.error("Error descargando:", err);
      window.alert("No pudimos completar la descarga. Revisá tu conexión e intentá de nuevo.");
    }
  };

  const fetchEncryptedPdfBlob = async (doc: DocumentRecord) => {
    if (!doc.encrypted_path || !doc.wrapped_key || !doc.wrap_iv) {
      throw new Error("No tenemos la información de cifrado para este documento.");
    }

    const supabase = getSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Necesitás iniciar sesión para descargar este PDF.");
    }

    const cryptoReady = await ensureCryptoSession(user.id);
    if (!cryptoReady) {
      throw new Error("No se pudo inicializar el cifrado de sesión. Cerrá sesión e ingresá nuevamente.");
    }

    const { data, error } = await supabase.storage
      .from("user-documents")
      .createSignedUrl(doc.encrypted_path, 3600);

    if (error || !data?.signedUrl) {
      throw new Error("No pudimos preparar la descarga del PDF.");
    }

    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      throw new Error("No se pudo descargar el PDF cifrado.");
    }

    const encryptedBlob = await response.blob();
    const sessionUnwrapKey = getSessionUnwrapKey();
    const documentKey = await unwrapDocumentKey(doc.wrapped_key, doc.wrap_iv, sessionUnwrapKey);
    return decryptFile(encryptedBlob, documentKey);
  };

  const requestRegeneration = async (docId: string, type: string) => {
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
        window.alert("No pudimos solicitar la regeneración. Probá de nuevo en unos segundos.");
        return;
      }
      window.alert("Listo: estamos regenerando el certificado. Te avisamos cuando esté.");
    } catch (err) {
      console.error("Error solicitando regeneración:", err);
      window.alert("No pudimos solicitar la regeneración. Probá de nuevo en unos segundos.");
    }
  };

  const performEcoDownload = (doc: DocumentRecord | null) => {
    if (!doc) return;

    if (doc.eco_storage_path) {
      const ecoName = doc.document_name.replace(/\.pdf$/i, ".eco");
      downloadFromPath(doc.eco_storage_path, ecoName);
      return;
    }
    if (doc.eco_hash) {
      requestRegeneration(doc.id, "eco");
      return;
    }
    window.alert("Todavía no hay certificado .ECO para este documento. Puede estar generándose; reintentá en unos minutos.");
  };

  const performEcoxDownload = (doc: DocumentRecord | null) => {
    if (!doc) return;
    if (doc.ecox_storage_path) {
      const ecoxName = doc.document_name.replace(/\.pdf$/i, ".ecox");
      downloadFromPath(doc.ecox_storage_path, ecoxName);
      return;
    }
    requestRegeneration(doc.id, "ecox");
  };

  const handleEcoDownload = (doc: DocumentRecord | null) => {
    if (!doc) return;
    performEcoDownload(doc);
  };

  const handleEcoxDownload = (doc: DocumentRecord | null) => {
    if (!doc) return;
    performEcoxDownload(doc);
  };

  const handlePdfDownload = (doc: DocumentRecord | null) => {
    if (!doc) return;
    if (doc.pdf_storage_path) {
      downloadFromPath(doc.pdf_storage_path, doc.document_name);
      return;
    }
    if (doc.encrypted_path) {
      fetchEncryptedPdfBlob(doc)
        .then((blob) => triggerDownload(blob, doc.document_name))
        .catch((err) => {
          console.error("Error descargando PDF cifrado:", err);
          window.alert(err instanceof Error ? err.message : "No pudimos descargar el PDF.");
        });
      return;
    }
    window.alert("Este documento no tiene copia guardada.");
  };

  const handleVerifyDoc = (doc: DocumentRecord | null) => {
    if (!doc) return;
    setVerifyDoc(doc);
    setVerifyResult(null);
    setVerifying(false);
    setAutoVerifyAttempted(false);
    setShowVerifyModal(true);
  };

  const handleShareDoc = (doc: DocumentRecord | null) => {
    if (!doc) return;
    if (isGuestMode()) {
      toast("Modo invitado: compartir documentos disponible solo con cuenta.", { position: "top-right" });
      return;
    }
    setShareDoc(doc);
  };

  const onVerifyFile = async (file: File, doc: DocumentRecord | null) => {
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
        error: "No pudimos verificar el documento. Probá nuevamente."
      });
    } finally {
      setVerifying(false);
    }
  };

  const autoVerifyStoredPdf = async (doc: DocumentRecord) => {
    if (!doc.pdf_storage_path && !doc.encrypted_path) return;
    try {
      const supabase = getSupabase();
      setVerifying(true);
      setVerifyResult(null);
      let blob: Blob;
      if (doc.pdf_storage_path) {
        const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(doc.pdf_storage_path, 600);
        if (error || !data?.signedUrl) {
          throw error || new Error("No se pudo crear el enlace de verificación automática.");
        }
        const response = await fetch(data.signedUrl);
        if (!response.ok) {
          throw new Error("No se pudo descargar el PDF almacenado.");
        }
        blob = await response.blob();
      } else {
        blob = await fetchEncryptedPdfBlob(doc);
      }
      const hash = await computeHash(blob);
      const result = buildVerificationResult(hash, doc, "stored");
      setVerifyResult(result);
    } catch (err) {
      console.warn("Verificación automática falló, se pedirá el PDF al usuario:", err);
      setVerifyResult({
        matches: null,
        error: "No pudimos verificarlo automáticamente. Subí el PDF para compararlo con el certificado."
      });
    } finally {
      setVerifying(false);
    }
  };

  const buildVerificationResult = (hash: string, doc: DocumentRecord, source: "upload" | "stored"): VerificationResult => {
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
      <Header variant="private" onLogout={handleLogout} openLegalCenter={openLegalCenter} />
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
            <div className="text-center py-16">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isSearchActive && hasDocuments ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay resultados</h3>
                  <p className="text-gray-500 mb-4">
                    No encontramos documentos que coincidan con “{search.trim()}”.
                  </p>
                  <button
                    onClick={() => setSearch("")}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition"
                  >
                    Borrar búsqueda
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Todavía no hay documentos</h3>
                  <p className="text-gray-500 mb-6">
                    Empezá certificando tu primer archivo y vas a verlo acá.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => (isGuestMode() ? navigate("/login") : openLegalCenter("certify"))}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition"
                    >
                      {isGuestMode() ? "Crear cuenta" : "Certificar documento"}
                    </button>
                    <button
                      onClick={() => navigate("/inicio")}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition"
                    >
                      Ir al centro de acciones
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-4">
                {filteredDocuments.map((doc) => {
                  const {
                    config,
                    ecoAvailable
                  } = deriveProbativeState(doc, planTier);
                  const pdfAvailable = !!(doc.pdf_storage_path || doc.encrypted_path);
                  const ecoEnabled = ecoAvailable || doc.eco_hash;
                  const menuOpen = openMenuId === doc.id;
                  return (
                    <div key={doc.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Escudo sin tooltip */}
                          <Shield className="h-5 w-5 text-gray-700 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {/* Nombre sin extensión ni badge */}
                            <span className="text-sm font-semibold text-gray-900 truncate block">
                              {doc.document_name.replace(/\.(pdf|eco|ecox)$/i, '')}
                            </span>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {/* Estado probatorio con color */}
                              <span className={`text-xs font-semibold ${config.color}`}>
                                {config.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(doc.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setOpenMenuId(menuOpen ? null : doc.id)}
                          className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-md px-2 py-1 flex-shrink-0"
                        >
                          {menuOpen ? "Cerrar" : "Más"}
                        </button>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                          onClick={() => {
                            setPreviewDoc(doc);
                            setOpenMenuId(null);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </button>
                        <button
                          onClick={() => {
                            handleShareDoc(doc);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                          title="Compartir enlace seguro"
                        >
                          <Share2 className="h-4 w-4" />
                          Compartir
                        </button>
                      </div>

                      {menuOpen && (
                        <div className="mt-4 border-t border-gray-200 pt-3 grid gap-2">
                          <button
                            onClick={() => {
                              handleEcoDownload(doc);
                              setOpenMenuId(null);
                            }}
                            className={`text-left text-sm font-medium ${ecoEnabled ? "text-gray-700" : "text-gray-300"}`}
                            disabled={!ecoEnabled}
                          >
                            Descargar certificado .ECO
                          </button>
                          <button
                            onClick={() => {
                              if (pdfAvailable) {
                                handlePdfDownload(doc);
                              }
                              setOpenMenuId(null);
                            }}
                            className={`text-left text-sm font-medium ${pdfAvailable ? "text-gray-700" : "text-gray-300"}`}
                            disabled={!pdfAvailable}
                          >
                            Descargar PDF
                          </button>
                          <button
                            onClick={() => {
                              handleVerifyDoc(doc);
                              setOpenMenuId(null);
                            }}
                            className="text-left text-sm font-medium text-gray-700"
                          >
                            Verificar documento
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block bg-white border border-gray-200 rounded-lg">
                <div className="overflow-x-auto overflow-y-visible">
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
                    const pdfAvailable = !!(doc.pdf_storage_path || doc.encrypted_path);
                    const ecoEnabled = ecoAvailable || doc.eco_hash;
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Escudo sin tooltip */}
                            <Shield className="h-5 w-5 text-gray-700 flex-shrink-0" />
                            {/* Nombre sin extensión ni badge */}
                            <span className="text-sm font-medium text-gray-900 truncate max-w-[320px]">
                              {doc.document_name.replace(/\.(pdf|eco|ecox)$/i, '')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {/* Estado probatorio con color */}
                          <span
                            className={`text-xs font-semibold ${config.color} whitespace-pre-line cursor-help`}
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
                              onClick={() => handleShareDoc(doc)}
                              className="text-black hover:text-gray-600"
                              title="Compartir enlace seguro"
                            >
                              <Share2 className="h-5 w-5" />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                                className="text-gray-500 hover:text-gray-700"
                                title="Mas acciones"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                              {openMenuId === doc.id && (
                                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-10 flex flex-col items-stretch">
                                  <button
                                    onClick={() => {
                                      handleEcoDownload(doc);
                                      setOpenMenuId(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm ${ecoEnabled ? "text-gray-700 hover:bg-gray-50" : "text-gray-300 cursor-not-allowed"}`}
                                    disabled={!ecoEnabled}
                                  >
                                    Descargar certificado .ECO
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (pdfAvailable) {
                                        handlePdfDownload(doc);
                                      }
                                      setOpenMenuId(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm ${pdfAvailable ? "text-gray-700 hover:bg-gray-50" : "text-gray-300 cursor-not-allowed"}`}
                                    disabled={!pdfAvailable}
                                  >
                                    Descargar PDF
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleVerifyDoc(doc);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    Verificar documento
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                </div>
              </div>
            </>
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
                      onClick={() => navigator.clipboard.writeText(previewDoc.eco_hash || "")}
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

      {/* Modal Compartir Documento */}
      {shareDoc && (
        <ShareDocumentModal
          document={{
            id: shareDoc.id,
            document_name: shareDoc.document_name,
            encrypted: true, // Todos los documentos en EcoSign son cifrados
            pdf_storage_path: shareDoc.encrypted_path || shareDoc.pdf_storage_path,
            eco_storage_path: shareDoc.eco_storage_path,
            eco_file_data: shareDoc.eco_file_data,
          }}
          onClose={() => setShareDoc(null)}
        />
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
                <p className={`font-semibold ${verifyResult.matches === false ? "text-red-700" : verifyResult.matches ? "text-green-700" : "text-gray-700"}`}>
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

function PreviewBadges({ doc, planTier }: { doc: DocumentRecord; planTier: PlanTier }) {
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

function ProbativeTimeline({ doc }: { doc: DocumentRecord }) {
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
