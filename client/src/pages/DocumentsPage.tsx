import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabaseClient";
import { emitEcoVNext } from "../lib/documentEntityService";
import { getLatestTsaEvent, formatTsaTimestamp } from "../lib/events/tsa";
import { deriveProtectionLevel, getAnchorEvent } from "../lib/protectionLevel";
import { AlertCircle, CheckCircle, Copy, Download, Eye, FileText, Folder, FolderPlus, MoreVertical, Search, Share2, Shield, X } from "lucide-react";
import toast from "react-hot-toast";
import Header from "../components/Header";
import VerifierTimeline from "../components/VerifierTimeline";
import { buildTimeline } from "../lib/verifier/buildTimeline";
import FooterInternal from "../components/FooterInternal";
import InhackeableTooltip from "../components/InhackeableTooltip";
import ShareDocumentModal from "../components/ShareDocumentModal";
import CreateOperationModal from "../components/CreateOperationModal";
import MoveToOperationModal from "../components/MoveToOperationModal";
import SectionToggle from "../components/SectionToggle";
import OperationRow from "../components/OperationRow";
import DocumentRow from "../components/DocumentRow";
import { GRID_TOKENS } from "../config/gridTokens";
import { ProtectedBadge } from "../components/ProtectedBadge";
import { getOperations, countDocumentsInOperation, updateOperation, getOperationWithDocuments, protectAndSendOperation } from "../lib/operationsService";
import { getDocumentEntity } from "../lib/documentEntityService";
import type { Operation } from "../types/operations";
import { disableGuestMode, isGuestMode } from "../utils/guestMode";
import { loadDraftOperations } from "../lib/draftOperationsService";
import { useLegalCenter } from "../contexts/LegalCenterContext";
import { decryptFile, ensureCryptoSession, getSessionUnwrapKey, unwrapDocumentKey } from "../lib/e2e";
import { hashSigned, hashSource, hashWitness } from "../lib/canonicalHashing";
import { listDrafts, removeDraft, type DraftMeta } from "../utils/draftStorage";

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
  signed_authority?: 'internal' | 'external' | null;
  events?: any[];
  signer_links?: any[];
};

type DocumentEntityRow = {
  id: string;
  source_name: string;
  source_hash: string;
  source_captured_at: string;
  witness_current_hash?: string | null;
  witness_current_storage_path?: string | null;
  signed_hash?: string | null;
  signed_authority?: 'internal' | 'external' | null;
  composite_hash?: string | null;
  lifecycle_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

type VerificationMode = "source" | "witness" | "signed";

const PROBATIVE_STATES = {
  none: {
    label: "Sin protección",
    color: "text-gray-600",
    bg: "bg-gray-100",
    tooltip: "No hay evidencia probatoria registrada."
  },
  base: {
    label: "Integridad\nverificada",
    color: "text-gray-800",
    bg: "bg-gray-100",
    tooltip: "La integridad criptográfica del documento está verificada."
  },
  active: {
    label: "Protección\ncertificada",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    tooltip: "Sello de tiempo verificable (TSA) y huella digital única confirmados."
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
  // ✅ CANONICAL DERIVATION: Read from events[] with fallback to legacy
  const events = doc.events || [];

  // TSA: already canonical (reads from events[])
  const tsa = getLatestTsaEvent(events);
  const hasTsa = tsa.present;

  // Polygon: canonical from events[] with legacy fallback
  const polygonAnchor = getAnchorEvent(events, 'polygon');
  const hasPolygon = polygonAnchor !== null || !!doc.has_polygon_anchor;

  // Bitcoin: canonical from events[] with legacy fallback
  const bitcoinAnchor = getAnchorEvent(events, 'bitcoin');
  const bitcoinConfirmed = bitcoinAnchor !== null ||
                          doc.bitcoin_status === "confirmed" ||
                          !!doc.has_bitcoin_anchor;

  const ecoAvailable = !!(
    doc.eco_storage_path ||
    doc.eco_file_data ||
    doc.eco_hash ||
    doc.content_hash
  );

  // Derive level using canonical algorithm (matches PROTECTION_LEVEL_RULES.md)
  let level: ProbativeLevel = (doc.content_hash || doc.eco_hash) ? "base" : "none";

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

const computeHash = async (
  mode: VerificationMode,
  fileOrBlob: Blob | File
): Promise<string> => {
  const buffer = await fileOrBlob.arrayBuffer();
  if (mode === "source") {
    return await hashSource(buffer);
  }
  if (mode === "witness") {
    return await hashWitness(buffer);
  }
  return await hashSigned(buffer);
};

const mapDocumentEntityToRecord = (entity: DocumentEntityRow): DocumentRecord => {
  const documentHash = entity.signed_hash || entity.witness_current_hash || entity.source_hash;
  return {
    id: entity.id,
    document_name: entity.source_name,
    document_hash: documentHash,
    content_hash: entity.source_hash,
    created_at: entity.created_at || entity.source_captured_at,
    pdf_storage_path: entity.witness_current_storage_path ?? null,
    status: entity.lifecycle_status ?? null,
    signed_authority: entity.signed_authority ?? null,
    has_legal_timestamp: false,
    has_polygon_anchor: false,
    has_bitcoin_anchor: false,
    events: [],
    signer_links: []
  };
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
  const [verificationMode, setVerificationMode] = useState<VerificationMode>("signed");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [shareDoc, setShareDoc] = useState<DocumentRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCreateOperationModal, setShowCreateOperationModal] = useState(false);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationDocCounts, setOperationDocCounts] = useState<Record<string, number>>({});
  const [moveDoc, setMoveDoc] = useState<DocumentRecord | null>(null);
  const [isCreatingOperationForMove, setIsCreatingOperationForMove] = useState(false);
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
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
      setCurrentUserId(user.id);

      const { data: entityData, error } = await supabase
        .from("document_entities")
        .select(
          `
          id,
          source_name,
          source_hash,
          source_captured_at,
          witness_current_hash,
          witness_current_storage_path,
          signed_hash,
          signed_authority,
          composite_hash,
          lifecycle_status,
          created_at,
          updated_at,
          events,
          tsa_latest
        `
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading document_entities:", error);
        throw error;
      }

      if (entityData && entityData.length > 0) {
        const mapped = (entityData as DocumentEntityRow[]).map(mapDocumentEntityToRecord);
        setDocuments(mapped);
        return;
      }

      // TODO(legacy-cleanup): remove fallback once document_entities is fully populated.
      const { data: legacyData, error: legacyError } = await supabase
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

      if (legacyError) {
        console.error("Error loading user_documents:", legacyError);
        throw legacyError;
      }

      setDocuments((legacyData as DocumentRecord[] | null) || []);
    } catch (error) {
      console.error("Error in loadDocuments:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      // Intentar cargar desde server primero
      const serverDrafts = await loadDraftOperations();

      // Convertir DraftOperation[] a DraftMeta[] para compatibilidad con UI
      const draftsMeta: DraftMeta[] = serverDrafts.flatMap(op =>
        op.documents.map(doc => ({
          id: doc.draft_file_ref.startsWith('local:')
            ? doc.draft_file_ref.replace('local:', '')
            : doc.id,
          name: doc.filename,
          createdAt: op.created_at,
          size: doc.size,
          type: doc.metadata?.type || 'application/pdf'
        }))
      );

      setDrafts(draftsMeta);
    } catch (err) {
      console.error('Error loading server drafts:', err);

      // Fallback a local
      setDrafts(listDrafts());
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
    loadDrafts();
    const handler = () => loadDrafts();
    window.addEventListener('ecosign:draft-saved', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('ecosign:draft-saved', handler);
      window.removeEventListener('storage', handler);
    };
  }, [loadDrafts]);

  // Auto-recovery: mostrar notificación si hay drafts tras posible crash
  useEffect(() => {
    const checkAutoRecovery = async () => {
      try {
        const serverDrafts = await loadDraftOperations();
        const hasDrafts = serverDrafts.length > 0;

        if (hasDrafts && !sessionStorage.getItem('draft-recovery-shown')) {
          sessionStorage.setItem('draft-recovery-shown', 'true');
          toast.success(
            `${serverDrafts.length} borrador(es) recuperado(s) automáticamente`,
            {
              position: 'top-right',
              duration: 5000
            }
          );
        }
      } catch (err) {
        console.warn('Auto-recovery check failed:', err);
      }
    };

    // Solo ejecutar una vez al montar
    checkAutoRecovery();
  }, []);

  useEffect(() => {
    if (isGuestMode()) return;
    if (
      showVerifyModal &&
      verifyDoc?.pdf_storage_path &&
      !autoVerifyAttempted &&
      verificationMode !== "source"
    ) {
      setAutoVerifyAttempted(true);
      autoVerifyStoredPdf(verifyDoc, verificationMode);
    }
  }, [showVerifyModal, verifyDoc, autoVerifyAttempted, verificationMode]);

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

  // Cargar operaciones
  const loadOperations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setOperationsLoading(true);
      const ops = await getOperations(currentUserId);
      setOperations(ops);

      // Contar documentos por operación
      const counts: Record<string, number> = {};
      for (const op of ops) {
        const count = await countDocumentsInOperation(op.id);
        counts[op.id] = count;
      }
      setOperationDocCounts(counts);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setOperationsLoading(false);
    }
  }, [currentUserId]);

  // Cargar operaciones al montar y cuando cambie el usuario
  useEffect(() => {
    if (currentUserId) {
      loadOperations();
    }
  }, [currentUserId, loadOperations]);

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

  const performEcoDownload = async (doc: DocumentRecord | null) => {
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
    try {
      const { json } = await emitEcoVNext(doc.id);
      const ecoName = doc.document_name.replace(/\.pdf$/i, ".eco");
      const bytes = new TextEncoder().encode(json);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = ecoName;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    } catch (err) {
      console.warn("Canonical ECO v2 download skipped:", err);
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
    setVerificationMode("signed");
    setShowVerifyModal(true);
  };

  // Timeline state for verifier modal
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const handleShareDoc = (doc: DocumentRecord | null) => {
    if (!doc) return;
    if (isGuestMode()) {
      toast("Modo invitado: compartir documentos disponible solo con cuenta.", { position: "top-right" });
      return;
    }
    setShareDoc(doc);
  };

  const handleResumeDraft = (draftId: string) => {
    localStorage.setItem('ecosign_draft_to_open', draftId);
    openLegalCenter('certify');
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await removeDraft(draftId);
      loadDrafts();
      toast.success('Borrador eliminado', { position: 'top-right' });
    } catch (err) {
      console.error('Error removing draft:', err);
      toast.error('No se pudo eliminar el borrador', { position: 'top-right' });
    }
  };

  const onVerifyFile = async (file: File, doc: DocumentRecord | null) => {
    if (!doc || !file) return;
    setVerifying(true);
    try {
      const hash = await computeHash(verificationMode, file);
      const result = buildVerificationResult(hash, doc, "upload", verificationMode);
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

  const autoVerifyStoredPdf = async (doc: DocumentRecord, mode: VerificationMode) => {
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
      const hash = await computeHash(mode, blob);
      const result = buildVerificationResult(hash, doc, "stored", mode);
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

  const buildVerificationResult = (
    hash: string,
    doc: DocumentRecord,
    source: "upload" | "stored",
    mode: VerificationMode
  ): VerificationResult => {
    const normalizedHash = hash.toLowerCase();
    const expectedDocumentHash = doc.document_hash || doc.eco_hash;
    const expectedContentHash = doc.content_hash;

    const matchesDocument = mode === "source"
      ? null
      : expectedDocumentHash
        ? normalizedHash === expectedDocumentHash.toLowerCase()
        : null;
    const matchesContent = mode === "source"
      ? expectedContentHash
        ? normalizedHash === expectedContentHash.toLowerCase()
        : null
      : null;
    const matches = matchesDocument ?? matchesContent ?? null;

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

          <section className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

            <button
              onClick={() => {
                if (isGuestMode()) {
                  toast("Modo invitado: operaciones disponibles solo con cuenta.", { position: "top-right" });
                  return;
                }
                setShowCreateOperationModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0E4B8B] text-white rounded-lg hover:bg-[#0A3D73] transition text-sm font-semibold whitespace-nowrap"
            >
              <FolderPlus className="w-4 h-4" />
              Nueva operación
            </button>
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
              {/* Shared header (desktop) — global under search/new operation */}
              <div className={`hidden md:grid ${GRID_TOKENS.documents.columns} ${GRID_TOKENS.documents.gapX} px-6 py-3 bg-gray-50 text-xs text-gray-600 font-medium mb-2`}>
                <div>Nombre</div>
                <div>Estado probatorio</div>
                <div>Fecha de creación</div>
                <div className="justify-self-end" style={{ transform: 'translateX(-110px)' }}>Acciones</div>
              </div>

              {drafts.length > 0 && (
                <SectionToggle
                  title="Borradores"
                  count={drafts.length}
                  icon={<FileText className="w-4 h-4" />}
                  defaultOpen={true}
                >
                  <div className="space-y-2 mt-2">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className={`grid ${GRID_TOKENS.documents.columns} ${GRID_TOKENS.documents.gapX} items-center px-6 py-2 bg-white border border-gray-200 rounded-lg`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate" title={draft.name}>
                              {draft.name}
                            </div>
                            <div className="text-xs text-amber-700">Borrador</div>
                          </div>
                        </div>
                        <div />
                        <div className="text-sm text-gray-500">{formatDate(draft.createdAt)}</div>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleResumeDraft(draft.id)}
                            className="text-sm font-semibold text-[#0E4B8B] hover:text-[#0A3D73]"
                          >
                            Reanudar
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionToggle>
              )}

              {/* Sección de Operaciones */}
              {operations.length > 0 && (
                <SectionToggle
                  title="Operaciones"
                  count={operations.length}
                  icon={<Folder className="w-4 h-4" />}
                  defaultOpen={true}
                >
                  <div className="space-y-3 mt-2">
                      {operations.map((operation) => (
                        <OperationRow
                          key={operation.id}
                          operation={operation}
                          documentCount={operationDocCounts[operation.id] || 0}
                          tableLayout={true}
                          onClick={() => {
                            // TODO: Navegar a detalle de operación
                            console.log('Ver operación:', operation);
                            toast('Detalle de operación próximamente', { position: 'top-right' });
                          }}
                          onEdit={() => {
                            // TODO: Abrir modal de edición
                            console.log('Editar operación:', operation);
                            toast('Edición próximamente', { position: 'top-right' });
                          }}
                          onChangeStatus={async (newStatus) => {
                            try {
                              await updateOperation(operation.id, { status: newStatus }, currentUserId || undefined);
                              toast.success(`Operación ${newStatus === 'closed' ? 'cerrada' : 'archivada'}`, { position: 'top-right' });
                              loadOperations();
                            } catch (error) {
                              console.error('Error updating operation:', error);
                              toast.error('No se pudo actualizar la operación', { position: 'top-right' });
                            }
                          }}
                          onProtectAndSend={async () => {
                            try {
                              // Validar que tenga documentos
                              const docCount = operationDocCounts[operation.id] || 0;
                              if (docCount === 0) {
                                toast.error('No se puede proteger una operación sin documentos', { position: 'top-right' });
                                return;
                              }

                              await protectAndSendOperation(operation.id);
                              toast.success(
                                '🚀 Operación protegida. Los documentos ahora tienen validez legal.',
                                { position: 'top-right', duration: 4000 }
                              );
                              loadOperations();
                            } catch (error: any) {
                              console.error('Error protecting operation:', error);
                              toast.error(error.message || 'No se pudo proteger la operación', { position: 'top-right' });
                            }
                          }}
                          onOpenDocument={async (docId: string) => {
                            try {
                              const found = documents.find((d) => d.id === docId);
                              if (found) {
                                setPreviewDoc(found);
                                return;
                              }
                              const docEntity = await getDocumentEntity(docId);
                              const mapped = mapDocumentEntityToRecord(docEntity as any);
                              setPreviewDoc(mapped);
                            } catch (err) {
                              console.error('Error opening document:', err);
                              toast.error('No se pudo abrir el documento', { position: 'top-right' });
                            }
                          }}
                        />
                      ))}
                    </div>
                </SectionToggle>
              )}

              {/* Sección de Documentos */}
              <SectionToggle
                title="Documentos"
                count={filteredDocuments.length}
                icon={<FileText className="w-4 h-4" />}
                defaultOpen={true}
              >
                <div className="md:hidden space-y-4">
                {filteredDocuments.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    context="documents"
                    onOpen={(d) => setPreviewDoc(d)}
                    onShare={(d) => handleShareDoc(d)}
                    onDownloadEco={(d) => handleEcoDownload(d)}
                    onDownloadPdf={(d) => handlePdfDownload(d)}
                    onVerify={(d) => handleVerifyDoc(d)}
                    onMove={(d) => setMoveDoc({ ...d, document_entity_id: d.document_entity_id ?? d.id })}
                  />
                ))}
              </div>

              <div className="hidden md:block bg-white border border-gray-200 rounded-lg">
                <div className="p-4 space-y-2">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className={`grid ${GRID_TOKENS.documents.columns} ${GRID_TOKENS.documents.gapX} items-center px-6 py-1.5 hover:bg-gray-50 rounded`}>
                      <DocumentRow
                        document={doc}
                        asRow
                        context="documents"
                        onOpen={(d) => setPreviewDoc(d)}
                        onShare={(d) => handleShareDoc(d)}
                        onDownloadEco={(d) => handleEcoDownload(d)}
                        onDownloadPdf={(d) => handlePdfDownload(d)}
                        onVerify={(d) => handleVerifyDoc(d)}
                        onMove={(d) => setMoveDoc({ ...d, document_entity_id: d.document_entity_id ?? d.id })}
                      />
                    </div>
                  ))}
                </div>
              </div>
              </SectionToggle>
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
          userId={currentUserId || ""}
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
                  Validá que tu archivo coincide con el certificado almacenado.
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
              <div className="mb-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Tipo de archivo</label>
                  <select
                    value={verificationMode}
                    onChange={(e) => {
                      setVerificationMode(e.target.value as VerificationMode);
                      setVerifyResult(null);
                      setAutoVerifyAttempted(false);
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                  >
                    <option value="source">Archivo original</option>
                    <option value="witness">PDF testigo</option>
                    <option value="signed">PDF firmado</option>
                  </select>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                  <input
                    type="file"
                    accept={verificationMode === "source" ? undefined : "application/pdf"}
                    onChange={(e) => e.target.files?.[0] && onVerifyFile(e.target.files[0], verifyDoc)}
                    className="hidden"
                    id="verify-upload"
                  />
                  <label htmlFor="verify-upload" className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                    {verifying ? "Verificando…" : "Arrastrá o hacé clic para subir el archivo"}
                  </label>
                </div>
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

                {/* Timeline toggle */}
                {verifyResult && verifyResult.matches && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const next = !showTimeline;
                        setShowTimeline(next);
                        if (next) {
                          setTimelineLoading(true);
                          const docEvents = Array.isArray(verifyDoc?.events) ? verifyDoc!.events : [];
                          const timeline = buildTimeline({ documentEvents: docEvents, createdAt: verifyDoc?.created_at ?? undefined });
                          setTimelineEvents(timeline);
                          setTimelineLoading(false);
                        }
                      }}
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
                          note="Cronología basada en el certificado (.ECO). No requiere cuenta ni servidor."
                        />
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear Operación */}
      {showCreateOperationModal && currentUserId && (
        <CreateOperationModal
          userId={currentUserId}
          onClose={() => setShowCreateOperationModal(false)}
          onSuccess={async (operation) => {
            if (isCreatingOperationForMove && moveDoc) {
              try {
                await addDocumentToOperation(operation.id, moveDoc.document_entity_id ?? moveDoc.id, currentUserId);
                toast.success(
                  `Documento agregado a "${operation.name}". La evidencia no ha cambiado.`,
                  { position: 'top-right', duration: 4000 }
                );
                setMoveDoc(null); // Close MoveToOperationModal
                setIsCreatingOperationForMove(false);
              } catch (error: any) {
                if (error.code === '23505') {
                  toast.error(`El documento "${moveDoc.document_name}" ya pertenece a la operación "${operation.name}".`, { position: 'top-right' });
                } else {
                  console.error('Error adding document to new operation:', error);
                  toast.error('No se pudo agregar el documento a la nueva operación', { position: 'top-right' });
                }
              }
            } else {
              toast.success(`Operación "${operation.name}" creada`, { position: 'top-right' });
            }
            loadOperations(); // Always reload operations
            loadDocuments(); // Always reload documents (needed if document moved)
            setShowCreateOperationModal(false); // Close CreateOperationModal
          }}
        />
      )}

      {/* Modal Mover a Operación */}
      {moveDoc && currentUserId && (
        <MoveToOperationModal
          documentId={moveDoc.document_entity_id ?? moveDoc.id}
          documentName={moveDoc.document_name}
          userId={currentUserId}
          onClose={() => setMoveDoc(null)}
          onSuccess={() => {
            loadOperations(); // Recargar conteos
            loadDocuments(); // Recargar documentos
          }}
          onCreateNew={() => {
            setIsCreatingOperationForMove(true);
            setShowCreateOperationModal(true);
          }}
        />
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
  // Read TSA from events[] (canonical)
  const tsa = getLatestTsaEvent(doc.events);
  const hasTsa = tsa.present;
  
  const hasPolygon = !!doc.has_polygon_anchor;
  const bitcoinStatus = doc.bitcoin_status;
  const bitcoinConfirmed = bitcoinStatus === "confirmed" || !!doc.has_bitcoin_anchor;
  const hasIntegrity = !!(doc.content_hash || doc.eco_hash);
  const timelineItems = [];

  if (doc.signed_authority === "internal") {
    timelineItems.push({
      label: "Firma interna registrada",
      description: "La firma fue registrada por la autoridad emisora.",
      status: "ok"
    });
  }

  if (doc.signed_authority === "external") {
    timelineItems.push({
      label: "Firma externa registrada",
      description: "La firma fue registrada por una autoridad externa.",
      status: "ok"
    });
  }

  if (hasTsa) {
    const formattedTime = formatTsaTimestamp(tsa);
    timelineItems.push({
      label: "Evidencia temporal presente",
      description: formattedTime ? `Timestamp: ${formattedTime}` : "Timestamp registrado",
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
      label: hasIntegrity ? "Integridad verificada" : "Sin evidencia registrada",
      description: hasIntegrity
        ? "La integridad criptográfica del documento está verificada."
        : "No hay evidencia probatoria registrada para este documento.",
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
