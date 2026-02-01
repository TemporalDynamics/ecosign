import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "../lib/supabaseClient";
import { emitEcoVNext } from "../lib/documentEntityService";
import { getLatestTsaEvent, formatTsaTimestamp } from "../lib/events/tsa";
import { deriveProtectionLevel, getAnchorEvent } from "../lib/protectionLevel";
import { AlertCircle, CheckCircle, Copy, Download, Eye, FilePlus, FileText, Folder, FolderPlus, MoreVertical, Play, Search, Share2, Shield, X } from "lucide-react";
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
import { deriveFlowStatus, FLOW_STATUS } from "../lib/flowStatus";
import { ProtectedBadge } from "../components/ProtectedBadge";
import { addDocumentToOperation, countDocumentsInOperation, getOperations, getOperationWithDocuments, protectAndSendOperation, updateOperation } from "../lib/operationsService";
import { getDocumentEntity } from "../lib/documentEntityService";
import type { Operation } from "../types/operations";
import { disableGuestMode, isGuestMode } from "../utils/guestMode";
import { deleteDraftOperation, loadDraftFile, loadDraftOperations } from "../lib/draftOperationsService";
import { useLegalCenter } from "../contexts/LegalCenterContext";
import { decryptFile, ensureCryptoSession, getSessionUnwrapKey, unwrapDocumentKey } from "../lib/e2e";
import { decryptFile as decryptCustodyFile } from "../lib/encryptionService";
import { hashSigned, hashSource, hashWitness } from "../lib/canonicalHashing";
import { listDrafts, type DraftMeta } from "../utils/draftStorage";

type DocumentRecord = {
  id: string;
  document_entity_id?: string | null;
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
  overall_status?: string | null;
  signed_authority?: 'internal' | 'external' | null;
  events?: any[];
  signer_links?: any[];
  source_storage_path?: string | null;
  custody_mode?: 'hash_only' | 'encrypted_custody' | null;
};

type DocumentEntityRow = {
  id: string;
  source_name: string;
  source_hash: string;
  source_captured_at: string;
  witness_current_hash?: string | null;
  witness_current_storage_path?: string | null;
  source_storage_path?: string | null;
  signed_hash?: string | null;
  signed_authority?: 'internal' | 'external' | null;
  composite_hash?: string | null;
  custody_mode?: 'hash_only' | 'encrypted_custody' | null;
  created_at?: string | null;
  updated_at?: string | null;
  events?: any[];
};

type DraftRow = DraftMeta & {
  operationId?: string;
  draftFileRef?: string;
  source?: "server" | "local";
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
  // ✅ CANONICAL DERIVATION: Read ONLY from events[] (no legacy fallbacks)
  const events = doc.events || [];

  // TSA: canonical from events[]
  const tsa = getLatestTsaEvent(events);
  const hasTsa = tsa.present;

  // Polygon: canonical from events[] ONLY
  const polygonAnchor = getAnchorEvent(events, 'polygon');
  const hasPolygon = polygonAnchor !== null;

  // Bitcoin: canonical from events[] ONLY
  const bitcoinAnchor = getAnchorEvent(events, 'bitcoin');
  const hasBitcoin = bitcoinAnchor !== null;

  const ecoAvailable = !!(
    doc.eco_storage_path ||
    doc.eco_file_data ||
    doc.eco_hash ||
    doc.content_hash
  );

  // Derive level using canonical algorithm (matches PROTECTION_LEVEL_RULES.md v2)
  // - NONE: No TSA
  // - BASE: Has hash but no TSA
  // - ACTIVE: Has TSA
  // - REINFORCED: Has TSA + first anchor (Polygon OR Bitcoin)
  // - TOTAL: Has TSA + both anchors (Polygon AND Bitcoin)
  let level: ProbativeLevel = (doc.content_hash || doc.eco_hash) ? "base" : "none";

  if (hasTsa) {
    level = "active";
  }

  // REINFORCED: TSA + first anchor (either one)
  if (hasTsa && (hasPolygon || hasBitcoin)) {
    level = "reinforced";
  }

  // TOTAL: TSA + both anchors
  if (hasTsa && hasPolygon && hasBitcoin) {
    level = "total";
  }

  const ecoxPlanAllowed = ["business", "enterprise"].includes((planTier || "").toLowerCase());
  const ecoxAvailable = ecoxPlanAllowed && !!doc.ecox_storage_path;

  return {
    level,
    config: PROBATIVE_STATES[level],
    ecoAvailable,
    ecoxAvailable,
    bitcoinConfirmed: hasBitcoin,
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

const getPdfStoragePath = (doc: DocumentRecord | null) => {
  // Only return pdf_storage_path (plaintext PDF in user-documents bucket)
  // DO NOT fall back to source_storage_path (encrypted custody path in different bucket)
  // If pdf_storage_path is null, handlePdfDownload will use encrypted_path instead
  return doc?.pdf_storage_path || null;
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
  const tsaInfo = getLatestTsaEvent(entity.events as any[]);
  return {
    id: entity.id,
    document_entity_id: entity.id,
    document_name: entity.source_name,
    document_hash: documentHash,
    content_hash: entity.source_hash,
    created_at: entity.created_at || entity.source_captured_at,
    pdf_storage_path: entity.witness_current_storage_path ?? null,
    source_storage_path: entity.source_storage_path ?? null,
    status: null,
    signed_authority: entity.signed_authority ?? null,
    custody_mode: entity.custody_mode ?? null,
    has_legal_timestamp: tsaInfo.present,
    has_polygon_anchor: false,
    has_bitcoin_anchor: false,
    events: Array.isArray(entity.events) ? entity.events : [],
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
  const [processingHintStartByEntityId, setProcessingHintStartByEntityId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [planTier, setPlanTier] = useState<PlanTier>(null); // free | pro | business | enterprise
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [pendingOpenEntityId, setPendingOpenEntityId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewOperation, setPreviewOperation] = useState<Operation | null>(null);
  const [previewOperationDocs, setPreviewOperationDocs] = useState<DocumentRecord[]>([]);
  const [previewOperationLoading, setPreviewOperationLoading] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<DraftRow | null>(null);
  const [previewDraftUrl, setPreviewDraftUrl] = useState<string | null>(null);
  const [previewDraftText, setPreviewDraftText] = useState<string | null>(null);
  const [previewDraftLoading, setPreviewDraftLoading] = useState(false);
  const [previewDraftError, setPreviewDraftError] = useState<string | null>(null);
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
  const [operationsOpenSignal, setOperationsOpenSignal] = useState(0);
  const [expandedOperationId, setExpandedOperationId] = useState<string | null>(null);
  const [moveDoc, setMoveDoc] = useState<DocumentRecord | null>(null);
  const [isCreatingOperationForMove, setIsCreatingOperationForMove] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [operationDraftName, setOperationDraftName] = useState("");
  const [operationDraftDescription, setOperationDraftDescription] = useState("");
  const [savingOperation, setSavingOperation] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [activeSelection, setActiveSelection] = useState<"operations" | "documents" | null>(null);
  const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [directoryMenuOpen, setDirectoryMenuOpen] = useState({
    operations: false,
    documents: false,
    drafts: false
  });
  const [operationFilter, setOperationFilter] = useState<"active" | "completed" | "archived" | "all">("active");
  const [openDraftMenuId, setOpenDraftMenuId] = useState<string | null>(null);
  const operationsSectionRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const isSearchActive = normalizedSearch.length > 0;
  const hasDocuments = documents.length > 0;

  const getSectionPrefsKey = (userId: string | null) =>
    `ecosign:documents:sections:${userId ?? "guest"}`;
  const getDefaultSectionPrefs = () => ({
    documents: false,
    drafts: false,
    operations: false
  });
  const readSectionPrefs = (userId: string | null) => {
    try {
      const key = getSectionPrefsKey(userId);
      const raw = sessionStorage.getItem(key);
      if (!raw) return getDefaultSectionPrefs();
      const parsed = JSON.parse(raw);
      return { ...getDefaultSectionPrefs(), ...parsed };
    } catch (error) {
      console.warn("No se pudieron leer preferencias de secciones:", error);
      return getDefaultSectionPrefs();
    }
  };

  const [sectionPrefs, setSectionPrefs] = useState(() => readSectionPrefs(null));

  const persistSectionPrefs = (nextPrefs: typeof sectionPrefs) => {
    try {
      const key = getSectionPrefsKey(currentUserId);
      sessionStorage.setItem(key, JSON.stringify(nextPrefs));
    } catch (error) {
      console.warn("No se pudieron guardar preferencias de secciones:", error);
    }
  };

  const updateSectionPref = (section: keyof typeof sectionPrefs, isOpen: boolean) => {
    setSectionPrefs((prev) => {
      const next = { ...prev, [section]: isOpen };
      persistSectionPrefs(next);
      return next;
    });
  };

  const handleLogout = () => {
    try {
      const key = getSectionPrefsKey(currentUserId);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn("No se pudieron limpiar preferencias de secciones:", error);
    }
    navigate("/");
  };

  const handleCreateDocument = () => {
    if (isGuestMode()) {
      navigate("/login");
      return;
    }
    openLegalCenter("certify");
  };

  const handleCreateOperation = () => {
    if (isGuestMode()) {
      toast("Modo invitado: operaciones disponibles solo con cuenta.", { position: "top-right" });
      return;
    }
    setShowCreateOperationModal(true);
  };

  const toggleDirectorySelection = (section: "operations" | "documents") => {
    setActiveSelection((prev) => {
      const next = prev === section ? null : section;
      if (next !== "operations") {
        setSelectedOperationIds(new Set());
      }
      if (next !== "documents") {
        setSelectedDocumentIds(new Set());
      }
      return next;
    });
  };

  const toggleOperationSelection = (operationId: string, checked: boolean) => {
    setSelectedOperationIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(operationId);
      } else {
        next.delete(operationId);
      }
      return next;
    });
  };

  const toggleDocumentSelection = (docId: string, checked: boolean) => {
    setSelectedDocumentIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(docId);
      } else {
        next.delete(docId);
      }
      return next;
    });
  };

  const handleContinueLatestDraft = () => {
    if (drafts.length === 0) {
      toast("No hay borradores para continuar.", { position: "top-right" });
      return;
    }
    handleResumeDraft(drafts[0]);
  };

  const handleEditOperation = (operation: Operation) => {
    setEditingOperation(operation);
  };

  const handleSaveOperation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingOperation) return;
    const trimmedName = operationDraftName.trim();
    if (!trimmedName) {
      toast.error("El nombre es obligatorio", { position: "top-right" });
      return;
    }
    try {
      setSavingOperation(true);
      await updateOperation(
        editingOperation.id,
        {
          name: trimmedName,
          description: operationDraftDescription.trim() || undefined
        },
        currentUserId || undefined
      );
      toast.success("Operación actualizada", { position: "top-right" });
      setEditingOperation(null);
      loadOperations();
    } catch (error) {
      console.error("Error updating operation:", error);
      toast.error("No se pudo actualizar la operación", { position: "top-right" });
    } finally {
      setSavingOperation(false);
    }
  };

  const loadDocuments = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const supabase = getSupabase();
      if (!opts?.silent) {
        setLoading(true);
      }
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

      const entityQuery = supabase
        .from("document_entities")
        .select(
          `
          id,
          source_name,
          source_hash,
          source_captured_at,
          source_storage_path,
          witness_current_hash,
          witness_current_storage_path,
          signed_hash,
          signed_authority,
          composite_hash,
          custody_mode,
          created_at,
          updated_at,
          events
        `
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      const { data: entityData, error } = await entityQuery;

      if (error) {
        console.error("Error loading document_entities:", error);
        throw error;
      }

      const mapped = (entityData as DocumentEntityRow[] | null)?.map(mapDocumentEntityToRecord) || [];
      setDocuments(mapped);
      return;
    } catch (error) {
      console.error("Error in loadDocuments:", error);
      setDocuments([]);
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, []);

  // UX: capture moment protection was requested, to (a) hide "Procesando" briefly and (b) start fast polling.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ document_entity_id?: string }>).detail;
      const entityId = String(detail?.document_entity_id ?? '');
      if (!entityId) return;
      setProcessingHintStartByEntityId((prev) => ({ ...prev, [entityId]: Date.now() }));
    };
    window.addEventListener('ecosign:protection-requested', handler as EventListener);
    return () => window.removeEventListener('ecosign:protection-requested', handler as EventListener);
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      // Intentar cargar desde server primero
      const serverDrafts = await loadDraftOperations();

      // Convertir DraftOperation[] a DraftMeta[] para compatibilidad con UI
      const draftsMeta: DraftRow[] = serverDrafts.flatMap(op =>
        op.documents.map(doc => ({
          id: doc.draft_file_ref.startsWith('local:')
            ? doc.draft_file_ref.replace('local:', '')
            : doc.draft_file_ref,
          name: doc.filename,
          createdAt: op.created_at,
          size: doc.size,
          type: doc.metadata?.type || 'application/pdf',
          operationId: op.operation_id,
          draftFileRef: doc.draft_file_ref,
          source: doc.draft_file_ref.startsWith('local:') ? 'local' : 'server'
        }))
      );

      setDrafts(draftsMeta);
    } catch (err) {
      console.error('Error loading server drafts:', err);

      // Fallback a local
      setDrafts(listDrafts().map((draft) => ({
        ...draft,
        operationId: `local-${draft.id}`,
        draftFileRef: `local:${draft.id}`,
        source: 'local'
      })));
    }
  }, []);

  // Realtime: update document list when document_entities.events changes
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`document-entities-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "document_entities",
          filter: `owner_id=eq.${currentUserId}`,
        },
        (payload: { new?: DocumentEntityRow }) => {
          const updated = payload.new;
          if (!updated?.id) return;

          const mapped = mapDocumentEntityToRecord(updated);
          setDocuments((prev) => {
            const idx = prev.findIndex(
              (doc) => doc.document_entity_id === updated.id || doc.id === updated.id
            );
            if (idx === -1) return [mapped, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], ...mapped, events: mapped.events };
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Fallback: Realtime can fail (browser/WSS). While there are docs in "processing", poll quickly.
  useEffect(() => {
    if (!currentUserId) return;

    const isProcessing = (doc: DocumentRecord) => {
      const events = doc?.events ?? [];
      if (!Array.isArray(events)) return false;
      const hasRequest = events.some((e: any) => e?.kind === 'document.protected.requested');
      const hasTsa = events.some((e: any) => e?.kind === 'tsa.confirmed');
      const hasErr = events.some((e: any) => e?.kind === 'tsa.failed' || e?.kind === 'protection.failed' || e?.kind === 'anchor.failed');
      return hasRequest && !hasTsa && !hasErr;
    };

    const processingDocs = documents.filter(isProcessing);
    if (processingDocs.length === 0) return;

    const pollInFlight = { current: false };
    const computePollIntervalMs = () => {
      const now = Date.now();
      const freshestHint = Object.values(processingHintStartByEntityId).reduce((acc, t) => Math.max(acc, t), 0);
      const isFresh = freshestHint > 0 && now - freshestHint < 30_000;
      return isFresh ? 1_500 : 8_000;
    };

    let cancelled = false;
    let timeoutId: number | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        await loadDocuments({ silent: true });
      } finally {
        pollInFlight.current = false;
      }
      if (cancelled) return;
      timeoutId = window.setTimeout(tick, computePollIntervalMs());
    };

    timeoutId = window.setTimeout(tick, computePollIntervalMs());

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [currentUserId, documents, loadDocuments, processingHintStartByEntityId]);

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

  // Deep-link from other flows (e.g. duplicate name warning)
  useEffect(() => {
    try {
      const id = sessionStorage.getItem('ecosign_open_document_entity_id');
      if (id) {
        sessionStorage.removeItem('ecosign_open_document_entity_id');
        setPendingOpenEntityId(id);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!pendingOpenEntityId) return;

    const open = async () => {
      try {
        const found = documents.find((d) => d.document_entity_id === pendingOpenEntityId || d.id === pendingOpenEntityId);
        if (found) {
          setPreviewDoc(found);
          setPendingOpenEntityId(null);
          return;
        }

        const docEntity = await getDocumentEntity(pendingOpenEntityId);
        const mapped = mapDocumentEntityToRecord(docEntity as any);
        setPreviewDoc(mapped);
      } catch (err) {
        console.error('Error opening document from deep link:', err);
        toast.error('No se pudo abrir el documento', { position: 'top-right' });
      } finally {
        setPendingOpenEntityId(null);
      }
    };

    open();
  }, [pendingOpenEntityId, documents]);

  useEffect(() => {
    if (!editingOperation) return;
    setOperationDraftName(editingOperation.name || "");
    setOperationDraftDescription(editingOperation.description || "");
  }, [editingOperation]);

  useEffect(() => {
    setSectionPrefs(readSectionPrefs(currentUserId));
  }, [currentUserId]);

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

  useEffect(() => {
    if (!openDraftMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.('[data-draft-menu]')) {
        setOpenDraftMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openDraftMenuId]);

  useEffect(() => {
    setSelectedOperationIds(new Set());
    if (activeSelection === "operations") {
      setActiveSelection(null);
    }
  }, [operationFilter]);

  useEffect(() => {
    if (!directoryMenuOpen.operations && !directoryMenuOpen.documents && !directoryMenuOpen.drafts) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.('[data-directory-menu]')) {
        setDirectoryMenuOpen({ operations: false, documents: false, drafts: false });
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [directoryMenuOpen]);

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
      getPdfStoragePath(verifyDoc) &&
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

  // Polling disabled - was causing full page re-renders (white flash)
  // useEffect(() => {
  //   if (isGuestMode()) return;
  //   const pollIntervalMs = 30000;
  //   let cancelled = false;
  //   let inFlight = false;
  //
  //   const poll = async () => {
  //     if (cancelled || inFlight) return;
  //     if (document.visibilityState !== "visible") return;
  //     inFlight = true;
  //     try {
  //       await loadDocuments();
  //     } finally {
  //       inFlight = false;
  //     }
  //   };
  //
  //   const intervalId = window.setInterval(poll, pollIntervalMs);
  //   return () => {
  //     cancelled = true;
  //     window.clearInterval(intervalId);
  //   };
  // }, [loadDocuments]);

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
      // Detect bucket based on path pattern
      // custody: {user_id}/{doc_id}/encrypted_witness/... or encrypted_source
      // user-documents: everything else
      const isCustodyPath = storagePath.includes('/encrypted_witness/') || storagePath.includes('/encrypted_source');
      const bucket = isCustodyPath ? "custody" : "user-documents";
      console.log('[downloadFromPath] Using bucket:', bucket, 'for path:', storagePath);
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
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
      console.log('[downloadFromPath] Downloaded blob:', {
        size: blob.size,
        type: blob.type,
        contentType: response.headers.get('content-type'),
      });

      // Verificar si el blob tiene contenido válido
      if (blob.size === 0) {
        console.error('[downloadFromPath] Downloaded blob is empty!');
        window.alert("El archivo descargado está vacío.");
        return;
      }

      // Verificar primeros bytes para detectar tipo de archivo
      const firstBytes = await blob.slice(0, 10).arrayBuffer();
      const header = new Uint8Array(firstBytes);
      const headerHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log('[downloadFromPath] File header (first 10 bytes):', headerHex);

      // PDF starts with %PDF (25 50 44 46)
      const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
      console.log('[downloadFromPath] Is valid PDF:', isPdf);

      const fallbackName = storagePath.split("/").pop() || "archivo.eco";
      triggerDownload(blob, fileName || fallbackName);
    } catch (err) {
      console.error("Error descargando:", err);
      window.alert("No pudimos completar la descarga. Revisá tu conexión e intentá de nuevo.");
    }
  };

  const fetchPreviewBlobFromPath = async (storagePath: string) => {
    if (isGuestMode()) {
      throw new Error("Iniciá sesión para previsualizar documentos.");
    }
    const supabase = getSupabase();
    // Detect bucket based on path pattern
    const isCustodyPath = storagePath.includes('/encrypted_witness/') || storagePath.includes('/encrypted_source');
    const bucket = isCustodyPath ? "custody" : "user-documents";
    console.log('[fetchPreviewBlobFromPath] Using bucket:', bucket, 'for path:', storagePath);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) {
      throw new Error("No pudimos preparar la previsualización.");
    }
    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      throw new Error("No pudimos cargar la previsualización.");
    }
    return response.blob();
  };

  const fetchEncryptedPdfBlob = async (doc: DocumentRecord) => {
    console.log('[fetchEncryptedPdfBlob] Starting download for document:', {
      id: doc.id,
      name: doc.document_name,
      encrypted_path: doc.encrypted_path,
      wrapped_key: doc.wrapped_key ? `[${doc.wrapped_key.length} chars]` : null,
      wrap_iv: doc.wrap_iv ? `[${doc.wrap_iv.length} chars]` : null,
      pdf_storage_path: doc.pdf_storage_path,
      source_storage_path: doc.source_storage_path,
    });

    if (!doc.encrypted_path || !doc.wrapped_key || !doc.wrap_iv) {
      console.error('[fetchEncryptedPdfBlob] Missing encryption fields:', {
        hasEncryptedPath: !!doc.encrypted_path,
        hasWrappedKey: !!doc.wrapped_key,
        hasWrapIv: !!doc.wrap_iv,
      });
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

    console.log('[fetchEncryptedPdfBlob] Creating signed URL for path:', doc.encrypted_path);
    const { data, error } = await supabase.storage
      .from("user-documents")
      .createSignedUrl(doc.encrypted_path, 3600);

    if (error || !data?.signedUrl) {
      console.error('[fetchEncryptedPdfBlob] Failed to create signed URL:', error);
      throw new Error("No pudimos preparar la descarga del PDF.");
    }

    console.log('[fetchEncryptedPdfBlob] Fetching encrypted blob from signed URL');
    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      console.error('[fetchEncryptedPdfBlob] Fetch failed:', response.status, response.statusText);
      throw new Error("No se pudo descargar el PDF cifrado.");
    }

    const encryptedBlob = await response.blob();
    console.log('[fetchEncryptedPdfBlob] Downloaded encrypted blob:', {
      size: encryptedBlob.size,
      type: encryptedBlob.type,
    });

    if (encryptedBlob.size === 0) {
      console.error('[fetchEncryptedPdfBlob] ⚠️ Downloaded blob is EMPTY!');
      throw new Error("El archivo cifrado está vacío en el servidor.");
    }

    const sessionUnwrapKey = getSessionUnwrapKey();
    console.log('[fetchEncryptedPdfBlob] Unwrapping document key...');
    const documentKey = await unwrapDocumentKey(doc.wrapped_key, doc.wrap_iv, sessionUnwrapKey);
    console.log('[fetchEncryptedPdfBlob] Document key unwrapped, decrypting...');

    const decryptedBlob = await decryptFile(encryptedBlob, documentKey);
    console.log('[fetchEncryptedPdfBlob] ✅ Decryption complete:', {
      decryptedSize: decryptedBlob.size,
      decryptedType: decryptedBlob.type,
    });

    if (decryptedBlob.size === 0) {
      console.error('[fetchEncryptedPdfBlob] ⚠️ Decrypted blob is EMPTY!');
      throw new Error("El archivo descifrado está vacío.");
    }

    return decryptedBlob;
  };

  useEffect(() => {
    if (!previewDoc) {
      setPreviewUrl(null);
      setPreviewText(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    const fileName = previewDoc.document_name || "";
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const isText = ["txt", "md", "csv"].includes(extension);
    const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(extension);
    const isPreviewable = isText || isImage || extension === "pdf";

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewText(null);

    const loadPreview = async () => {
      try {
        if (!isPreviewable) {
          throw new Error("Este formato no tiene previsualización disponible.");
        }
        let blob: Blob | null = null;
        const storagePath = getPdfStoragePath(previewDoc);
        if (storagePath) {
          blob = await fetchPreviewBlobFromPath(storagePath);
        } else if (previewDoc.encrypted_path) {
          blob = await fetchEncryptedPdfBlob(previewDoc);
        }

        if (!blob) {
          throw new Error("No encontramos el archivo para previsualizar.");
        }

        if (!active) return;

        if (isText) {
          const text = await blob.text();
          if (!active) return;
          setPreviewText(text);
        } else {
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "No pudimos cargar la previsualización.";
        setPreviewError(message);
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewDoc]);

  useEffect(() => {
    if (!previewDraft) {
      setPreviewDraftUrl(null);
      setPreviewDraftText(null);
      setPreviewDraftError(null);
      setPreviewDraftLoading(false);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    const fileName = previewDraft.name || "";
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const isText = ["txt", "md", "csv"].includes(extension);
    const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(extension);
    const isPreviewable = isText || isImage || extension === "pdf";

    setPreviewDraftLoading(true);
    setPreviewDraftError(null);
    setPreviewDraftUrl(null);
    setPreviewDraftText(null);

    const loadPreview = async () => {
      try {
        if (!isPreviewable) {
          throw new Error("Este formato no tiene previsualización disponible.");
        }

        const file = await loadDraftFile(previewDraft.draftFileRef ?? `local:${previewDraft.id}`);
        if (!file) {
          throw new Error("Vista previa no disponible para este borrador.");
        }

        if (!active) return;

        if (isText) {
          const text = await file.text();
          if (!active) return;
          setPreviewDraftText(text);
        } else {
          objectUrl = URL.createObjectURL(file);
          setPreviewDraftUrl(objectUrl);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "No pudimos cargar la vista previa.";
        setPreviewDraftError(message);
      } finally {
        if (active) setPreviewDraftLoading(false);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewDraft]);

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
    console.log('[handlePdfDownload] Starting download:', {
      id: doc.id,
      name: doc.document_name,
      pdf_storage_path: doc.pdf_storage_path,
      encrypted_path: doc.encrypted_path,
      hasWrappedKey: !!doc.wrapped_key,
      hasWrapIv: !!doc.wrap_iv,
    });

    const storagePath = getPdfStoragePath(doc);
    console.log('[handlePdfDownload] getPdfStoragePath returned:', storagePath);

    if (storagePath) {
      console.log('[handlePdfDownload] Using plain storage path:', storagePath);
      downloadFromPath(storagePath, doc.document_name);
      return;
    }
    if (doc.encrypted_path) {
      console.log('[handlePdfDownload] Using encrypted path:', doc.encrypted_path);
      fetchEncryptedPdfBlob(doc)
        .then((blob) => {
          console.log('[handlePdfDownload] Got blob, size:', blob.size);
          triggerDownload(blob, doc.document_name);
        })
        .catch((err) => {
          console.error("Error descargando PDF cifrado:", err);
          window.alert(err instanceof Error ? err.message : "No pudimos descargar el PDF.");
        });
      return;
    }
    console.warn('[handlePdfDownload] No storage path available for document');
    window.alert("Este documento no tiene copia guardada.");
  };

  const handleOriginalDownload = async (doc: DocumentRecord | null) => {
    if (!doc) return;

    // Verificar que el documento tenga el original guardado
    if (doc.custody_mode !== 'encrypted_custody' || !doc.source_storage_path) {
      window.alert("Este documento no tiene el archivo original guardado.");
      return;
    }

    try {
      const supabase = getSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        window.alert("Necesitás iniciar sesión para descargar el original.");
        return;
      }

      console.log('[handleOriginalDownload] Downloading from custody:', doc.source_storage_path);

      // Descargar archivo cifrado desde custody bucket
      const { data, error } = await supabase.storage
        .from('custody')
        .createSignedUrl(doc.source_storage_path, 3600);

      if (error || !data?.signedUrl) {
        console.error('[handleOriginalDownload] Error creating signed URL:', error);
        window.alert("No pudimos preparar la descarga del original.");
        return;
      }

      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        window.alert("No se pudo descargar el archivo original.");
        return;
      }

      const encryptedBlob = await response.blob();
      console.log('[handleOriginalDownload] Downloaded encrypted blob:', encryptedBlob.size, 'bytes');

      // Descifrar usando la clave derivada del userId
      const encryptedData = await encryptedBlob.arrayBuffer();

      // Determinar MIME type basado en la extensión del nombre original
      const extension = doc.document_name.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const originalMime = mimeTypes[extension] || 'application/octet-stream';

      const decryptedFile = await decryptCustodyFile(
        encryptedData,
        user.id,
        originalMime,
        doc.document_name
      );

      console.log('[handleOriginalDownload] Decrypted file:', decryptedFile.size, 'bytes');
      triggerDownload(decryptedFile, doc.document_name);

    } catch (err) {
      console.error("Error descargando original cifrado:", err);
      window.alert(err instanceof Error ? err.message : "No pudimos descargar el original.");
    }
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

  const handleResumeDraft = (draft: DraftRow) => {
    localStorage.setItem('ecosign_draft_to_open', draft.id);
    openLegalCenter('certify');
  };

  const handleOpenOperationDetail = async (operation: Operation) => {
    setPreviewOperation(operation);
    setPreviewOperationDocs([]);
    setPreviewOperationLoading(true);
    try {
      const { documents } = await getOperationWithDocuments(operation.id);
      const mapped = (documents || []).map((doc: any) =>
        mapDocumentEntityToRecord(doc.document_entities ?? doc)
      );
      setPreviewOperationDocs(mapped);
    } catch (err) {
      console.error("Error loading operation detail:", err);
      toast.error("No se pudo cargar la operación", { position: "top-right" });
    } finally {
      setPreviewOperationLoading(false);
    }
  };

  const handleDeleteDraft = async (draft: DraftRow) => {
    try {
      if (draft.operationId) {
        await deleteDraftOperation(draft.operationId);
      } else {
        await deleteDraftOperation(`local-${draft.id}`);
      }
      loadDrafts();
      setPreviewDraft(null);
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
    if (!getPdfStoragePath(doc) && !doc.encrypted_path) return;
    try {
      const supabase = getSupabase();
      setVerifying(true);
      setVerifyResult(null);
      let blob: Blob;
      const storagePath = getPdfStoragePath(doc);
      if (storagePath) {
        // Detect bucket based on path pattern
        const isCustodyPath = storagePath.includes('/encrypted_witness/') || storagePath.includes('/encrypted_source');
        const bucket = isCustodyPath ? "custody" : "user-documents";
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 600);
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

    // Check protection level from events[] (canonical)
    const events = doc.events || [];
    const hasTsa = getLatestTsaEvent(events).present;
    const hasPolygon = getAnchorEvent(events, 'polygon') !== null;
    const hasBitcoin = getAnchorEvent(events, 'bitcoin') !== null;
    const isTotal = hasTsa && hasPolygon && hasBitcoin;

    return {
      matches,
      matchesDocument,
      matchesContent,
      hash: normalizedHash,
      source,
      extended: isTotal ? "Protección total confirmada." : null
    };
  };

  const filteredDocuments = useMemo(() => {
    const filtered = normalizedSearch
      ? documents.filter((doc) =>
          (doc.document_name || "").toLowerCase().includes(normalizedSearch)
        )
      : documents;

    return [...filtered].sort((a, b) => {
      const aTime = Date.parse(a.created_at || "") || 0;
      const bTime = Date.parse(b.created_at || "") || 0;
      return bTime - aTime;
    });
  }, [documents, normalizedSearch]);

  const filteredOperations = useMemo(() => {
    if (!normalizedSearch) return operations;
    return operations.filter((operation) => {
      const nameMatch = (operation.name || "").toLowerCase().includes(normalizedSearch);
      const descMatch = (operation.description || "").toLowerCase().includes(normalizedSearch);
      return nameMatch || descMatch;
    });
  }, [normalizedSearch, operations]);

  const filteredDrafts = useMemo(() => {
    if (!normalizedSearch) return drafts;
    return drafts.filter((draft) =>
      (draft.name || "").toLowerCase().includes(normalizedSearch)
    );
  }, [drafts, normalizedSearch]);

  const visibleOperations = useMemo(() => {
    if (operationFilter === "all") return operations;
    if (operationFilter === "archived") {
      return operations.filter((operation) => operation.status === "archived");
    }
    if (operationFilter === "completed") {
      return operations.filter((operation) => operation.status === "closed");
    }
    return operations.filter((operation) =>
      operation.status === "active" || operation.status === "draft"
    );
  }, [operationFilter, operations]);

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
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch("");
                  }
                }}
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
          ) : isSearchActive ? (
            <section className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Resultados</h2>
                {filteredOperations.length === 0 && filteredDocuments.length === 0 && filteredDrafts.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay resultados para “{search.trim()}”.</p>
                ) : (
                  <div className="grid gap-3">
                    {filteredOperations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Operaciones</p>
                        <div className="space-y-2">
                          {filteredOperations.map((operation) => (
                            <button
                              key={operation.id}
                              type="button"
                              onClick={() => {
                                setExpandedOperationId(operation.id);
                                setOperationsOpenSignal((signal) => signal + 1);
                                setSearch("");
                                operationsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:border-black transition"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Folder className="w-4 h-4 text-gray-700" />
                                  <span className="text-sm font-semibold text-gray-900">{operation.name}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                                  <Folder className="w-3 h-3" />
                                  Operación
                                </span>
                              </div>
                              {operation.description && (
                                <p className="text-xs text-gray-500 mt-1">{operation.description}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredDocuments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Documentos</p>
                        <div className="space-y-2">
                          {filteredDocuments.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setPreviewDoc(doc);
                                setSearch("");
                              }}
                              className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:border-black transition"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-700" />
                                  <span className="text-sm font-semibold text-gray-900">{doc.document_name}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                                  <FileText className="w-3 h-3" />
                                  Documento
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Creado: {formatDate(doc.created_at)}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredDrafts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Borradores</p>
                        <div className="space-y-2">
                          {filteredDrafts.map((draft) => (
                            <button
                              key={draft.id}
                              type="button"
                              onClick={() => {
                                handleResumeDraft(draft);
                                setSearch("");
                              }}
                              className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:border-black transition"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-700" />
                                  <span className="text-sm font-semibold text-gray-900">{draft.name}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                                  <FileClock className="w-3 h-3" />
                                  Borrador
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Creado: {formatDate(draft.createdAt)}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
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
                <div>Estado</div>
                <div className="justify-self-end">Acciones</div>
              </div>

              {/* Sección de Operaciones */}
              <div ref={operationsSectionRef}>
                <SectionToggle
                  key={`operations-${currentUserId ?? "guest"}`}
                  title="Operaciones"
                  count={visibleOperations.length}
                  icon={<Folder className="w-5 h-5 text-gray-600" />}
                  defaultOpen={sectionPrefs.operations}
                  onToggle={(isOpen) => updateSectionPref("operations", isOpen)}
                  openSignal={operationsOpenSignal}
                  action={
                    <div className="flex items-center gap-2" data-directory-actions="operations">
                      <button
                        type="button"
                        onClick={handleCreateOperation}
                        className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                        title="Nueva operación"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDirectorySelection("operations")}
                        className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                        title="Compartir operaciones"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <div className="relative" data-directory-menu>
                        <button
                          type="button"
                          onClick={() => setDirectoryMenuOpen((prev) => ({
                            operations: !prev.operations,
                            documents: false,
                            drafts: false
                          }))}
                          className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                          title="Opciones"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {directoryMenuOpen.operations && (
                          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                            {activeSelection === "operations" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSelection(null);
                                  setSelectedOperationIds(new Set());
                                  setDirectoryMenuOpen((prev) => ({ ...prev, operations: false }));
                                }}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                              >
                                Salir de selección
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOperationFilter("active");
                                setDirectoryMenuOpen((prev) => ({ ...prev, operations: false }));
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                            >
                              Ver iniciadas
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOperationFilter("completed");
                                setDirectoryMenuOpen((prev) => ({ ...prev, operations: false }));
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                            >
                              Ver completadas
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOperationFilter("archived");
                                setDirectoryMenuOpen((prev) => ({ ...prev, operations: false }));
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                            >
                              Ver archivadas
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOperationFilter("all");
                                setDirectoryMenuOpen((prev) => ({ ...prev, operations: false }));
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                            >
                              Ver todas
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  }
                >
                  {visibleOperations.length === 0 ? (
                    <div className="text-sm text-gray-500 px-6 py-3">
                      No hay operaciones en esta vista.
                    </div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      {activeSelection === "operations" && (
                        <div
                          className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 cursor-pointer"
                          onClick={(event) => {
                            const target = event.target as HTMLElement;
                            if (target.closest("[data-select-actions]")) return;
                            if (target.closest('input[type="checkbox"]')) return;
                            if (visibleOperations.length === 0) return;
                            const nextChecked = selectedOperationIds.size !== visibleOperations.length;
                            if (nextChecked) {
                              setSelectedOperationIds(new Set(visibleOperations.map((operation) => operation.id)));
                            } else {
                              setSelectedOperationIds(new Set());
                            }
                          }}
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                              checked={visibleOperations.length > 0 && selectedOperationIds.size === visibleOperations.length}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedOperationIds(new Set(visibleOperations.map((operation) => operation.id)));
                                } else {
                                  setSelectedOperationIds(new Set());
                                }
                              }}
                              aria-label="Seleccionar todas las operaciones"
                            />
                            <span>{selectedOperationIds.size} seleccionadas</span>
                          </label>
                          <div className="flex items-center gap-2" data-select-actions>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedOperationIds.size === 0) {
                                  toast("Seleccioná operaciones para compartir", { position: "top-right" });
                                  return;
                                }
                                toast("Compartir operaciones próximamente", { position: "top-right" });
                              }}
                              className="px-3 py-1 rounded bg-black text-white text-xs font-semibold hover:bg-gray-800"
                            >
                              Compartir
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSelection(null);
                                setSelectedOperationIds(new Set());
                              }}
                              className="px-3 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:border-gray-500"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      {visibleOperations.map((operation) => (
                        <OperationRow
                          key={operation.id}
                          operation={operation}
                          documentCount={operationDocCounts[operation.id] || 0}
                          tableLayout={true}
                          autoOpen={operation.id === expandedOperationId}
                          openSignal={operationsOpenSignal}
                          selectable={activeSelection === "operations"}
                          selected={selectedOperationIds.has(operation.id)}
                          onSelect={(checked) => toggleOperationSelection(operation.id, checked)}
                          onClick={() => {
                            handleOpenOperationDetail(operation);
                          }}
                          onEdit={() => {
                            handleEditOperation(operation);
                          }}
                          onChangeStatus={async (newStatus) => {
                            try {
                              await updateOperation(operation.id, { status: newStatus }, currentUserId || undefined);
                              toast.success(
                                newStatus === 'closed' ? 'Operación completada' : 'Operación archivada',
                                { position: 'top-right' }
                              );
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
                          onInPerson={() => toast(`Firma presencial para "${operation.name}" próximamente`, { position: "top-right" })}
                        />
                      ))}
                    </div>
                  )}
                </SectionToggle>
              </div>

              {/* Sección de Documentos */}
              <SectionToggle
                key={`documents-${currentUserId ?? "guest"}`}
                title="Documentos"
                count={filteredDocuments.length}
                icon={<Shield className="w-5 h-5 text-gray-600" />}
                defaultOpen={sectionPrefs.documents}
                onToggle={(isOpen) => updateSectionPref("documents", isOpen)}
                action={
                  <div className="flex items-center gap-2" data-directory-actions="documents">
                    <button
                      type="button"
                      onClick={handleCreateDocument}
                      className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                      title="Nuevo documento"
                    >
                      <FilePlus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDirectorySelection("documents")}
                      className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                      title="Compartir documentos"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <div className="relative" data-directory-menu>
                      <button
                        type="button"
                        onClick={() => setDirectoryMenuOpen((prev) => ({
                          operations: false,
                          documents: !prev.documents,
                          drafts: false
                        }))}
                        className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                        title="Opciones"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {directoryMenuOpen.documents && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                          {activeSelection === "documents" && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSelection(null);
                                setSelectedDocumentIds(new Set());
                                setDirectoryMenuOpen((prev) => ({ ...prev, documents: false }));
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                            >
                              Salir de selección
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setDirectoryMenuOpen((prev) => ({ ...prev, documents: false }));
                              toast("Opciones de documentos próximamente", { position: "top-right" });
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                          >
                            Opciones de documentos
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                }
              >
                {activeSelection === "documents" && (
                  <div
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 mb-2 cursor-pointer"
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("[data-select-actions]")) return;
                      if (target.closest('input[type="checkbox"]')) return;
                      if (filteredDocuments.length === 0) return;
                      const nextChecked = selectedDocumentIds.size !== filteredDocuments.length;
                      if (nextChecked) {
                        setSelectedDocumentIds(new Set(filteredDocuments.map((doc) => doc.id)));
                      } else {
                        setSelectedDocumentIds(new Set());
                      }
                    }}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                        checked={filteredDocuments.length > 0 && selectedDocumentIds.size === filteredDocuments.length}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedDocumentIds(new Set(filteredDocuments.map((doc) => doc.id)));
                          } else {
                            setSelectedDocumentIds(new Set());
                          }
                        }}
                        aria-label="Seleccionar todos los documentos"
                      />
                      <span>{selectedDocumentIds.size} seleccionados</span>
                    </label>
                    <div className="flex items-center gap-2" data-select-actions>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedDocumentIds.size === 0) {
                            toast("Seleccioná documentos para crear un batch", { position: "top-right" });
                            return;
                          }
                          toast("Batch desde documentos próximamente", { position: "top-right" });
                        }}
                        className="px-3 py-1 rounded bg-black text-white text-xs font-semibold hover:bg-gray-800"
                      >
                        Crear batch
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSelection(null);
                          setSelectedDocumentIds(new Set());
                        }}
                        className="px-3 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:border-gray-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                <div className="md:hidden space-y-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={activeSelection === "documents" ? "cursor-pointer" : ""}
                    onClick={(event) => {
                      if (activeSelection !== "documents") return;
                      const target = event.target as HTMLElement;
                      if (target.closest("[data-row-actions]")) return;
                      if (target.closest('input[type="checkbox"]')) return;
                      toggleDocumentSelection(doc.id, !selectedDocumentIds.has(doc.id));
                    }}
                  >
                    <DocumentRow
                      document={doc}
                      context="documents"
                      processingHintStartedAtMs={processingHintStartByEntityId[String(doc.document_entity_id ?? doc.id)]}
                      onOpen={(d) => setPreviewDoc(d)}
                      onShare={(d) => handleShareDoc(d)}
                      onDownloadEco={(d) => handleEcoDownload(d)}
                      onDownloadPdf={(d) => handlePdfDownload(d)}
                      onDownloadOriginal={(d) => handleOriginalDownload(d)}
                      onVerify={(d) => handleVerifyDoc(d)}
                      onMove={(d) => setMoveDoc({ ...d, document_entity_id: d.document_entity_id ?? d.id })}
                      onInPerson={(d) => toast(`Firma presencial para "${d.document_name}" próximamente`, { position: "top-right" })}
                      selectable={activeSelection === "documents"}
                      selected={selectedDocumentIds.has(doc.id)}
                      onSelect={(checked) => toggleDocumentSelection(doc.id, checked)}
                    />
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-white border border-gray-200 rounded-lg">
                <div className="p-4 space-y-2">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`grid ${GRID_TOKENS.documents.columns} ${GRID_TOKENS.documents.gapX} items-center px-6 py-1.5 hover:bg-gray-50 rounded ${activeSelection === "documents" ? "cursor-pointer" : ""}`}
                      onClick={(event) => {
                        if (activeSelection !== "documents") return;
                        const target = event.target as HTMLElement;
                        if (target.closest("[data-row-actions]")) return;
                        if (target.closest('input[type="checkbox"]')) return;
                        toggleDocumentSelection(doc.id, !selectedDocumentIds.has(doc.id));
                      }}
                    >
                      <DocumentRow
                        document={doc}
                        asRow
                        context="documents"
                        processingHintStartedAtMs={processingHintStartByEntityId[String(doc.document_entity_id ?? doc.id)]}
                        onOpen={(d) => setPreviewDoc(d)}
                        onShare={(d) => handleShareDoc(d)}
                        onDownloadEco={(d) => handleEcoDownload(d)}
                        onDownloadPdf={(d) => handlePdfDownload(d)}
                        onDownloadOriginal={(d) => handleOriginalDownload(d)}
                        onVerify={(d) => handleVerifyDoc(d)}
                        onMove={(d) => setMoveDoc({ ...d, document_entity_id: d.document_entity_id ?? d.id })}
                        onInPerson={(d) => toast(`Firma presencial para "${d.document_name}" próximamente`, { position: "top-right" })}
                        selectable={activeSelection === "documents"}
                        selected={selectedDocumentIds.has(doc.id)}
                        onSelect={(checked) => toggleDocumentSelection(doc.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              </SectionToggle>

              {/* Sección de Borradores */}
              <SectionToggle
                key={`drafts-${currentUserId ?? "guest"}`}
                title="Borradores"
                count={drafts.length}
                icon={<FileText className="w-5 h-5 text-gray-600" />}
                defaultOpen={sectionPrefs.drafts}
                onToggle={(isOpen) => updateSectionPref("drafts", isOpen)}
                action={
                  <div className="flex items-center gap-2" data-directory-actions="drafts">
                    <button
                      type="button"
                      onClick={handleCreateDocument}
                      className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                      title="Nuevo borrador"
                    >
                      <FilePlus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleContinueLatestDraft}
                      className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                      title="Continuar borrador"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <div className="relative" data-directory-menu>
                      <button
                        type="button"
                        onClick={() => setDirectoryMenuOpen((prev) => ({
                          operations: false,
                          documents: false,
                          drafts: !prev.drafts
                        }))}
                        className="p-2 rounded hover:bg-gray-100 text-black hover:text-gray-600"
                        title="Opciones"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {directoryMenuOpen.drafts && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDirectoryMenuOpen((prev) => ({ ...prev, drafts: false }));
                              toast("Opciones de borradores próximamente", { position: "top-right" });
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                          >
                            Opciones de borradores
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                }
              >
                {drafts.length === 0 ? (
                  <div className="text-sm text-gray-500 px-6 py-3">
                    No tenés borradores todavía.
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className={`grid ${GRID_TOKENS.documents.columns} ${GRID_TOKENS.documents.gapX} items-center px-6 py-2 bg-white border border-gray-200 rounded-lg`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate" title={draft.name}>
                              {draft.name}
                            </div>
                            <div className="text-xs text-amber-700">Borrador</div>
                          </div>
                        </div>
                        <div />
                        <div className="text-sm text-gray-500">{formatDate(draft.createdAt)}</div>
                        <div className="flex items-center justify-end gap-2" data-draft-menu>
                          <button
                            onClick={() => setPreviewDraft(draft)}
                            className="text-black hover:text-gray-600"
                            title="Ver detalle"
                            type="button"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleResumeDraft(draft)}
                            className="text-black hover:text-gray-600"
                            title="Continuar"
                            type="button"
                          >
                            <Play className="h-5 w-5" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setOpenDraftMenuId(openDraftMenuId === draft.id ? null : draft.id)}
                              className="text-gray-500 hover:text-gray-700"
                              title="Más acciones"
                              type="button"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                            {openDraftMenuId === draft.id && (
                              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                                <button
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                  onClick={() => handleDeleteDraft(draft)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionToggle>
            </>
          )}
        </main>
      </div>
      <FooterInternal />

      {/* Modal Preview */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{previewDoc.document_name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Creado: {formatDate(previewDoc.created_at)}
                  {previewDoc.last_event_at && (
                    <> · Última actualización: {formatDate(previewDoc.last_event_at)}</>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Previsualización cifrada, procesada solo en tu dispositivo.
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 min-h-[320px]">
                {previewLoading && (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Cargando previsualización...
                  </div>
                )}
                {!previewLoading && previewError && (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 px-6 text-center">
                    {previewError}
                  </div>
                )}
                {!previewLoading && !previewError && previewText && (
                  <pre className="p-4 text-xs text-gray-700 whitespace-pre-wrap">{previewText}</pre>
                )}
                {!previewLoading && !previewError && previewUrl && (
                  <>
                    {previewDoc.document_name.toLowerCase().endsWith(".pdf") ? (
                      <object data={previewUrl} type="application/pdf" className="w-full h-[60vh]">
                        <div className="p-4 text-sm text-gray-600">No pudimos mostrar el PDF.</div>
                      </object>
                    ) : (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-4" />
                    )}
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <PreviewBadges doc={previewDoc} planTier={planTier} />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                  <div className="font-semibold text-gray-800">Estado probatorio</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {deriveProbativeState(previewDoc, planTier).config.tooltip}
                  </div>
                </div>

                {/* Evidencias del documento */}
                <div className="grid gap-2">
                  {/* ECO - Evidencia criptográfica (protagonista) */}
                  <button
                    type="button"
                    onClick={() => handleEcoDownload(previewDoc)}
                    className="px-3 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800"
                  >
                    Descargar ECO
                    <span className="ml-2 text-xs opacity-70">evidencia verificable</span>
                  </button>

                  {/* Copia fiel (witness) */}
                  <button
                    type="button"
                    onClick={() => handlePdfDownload(previewDoc)}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                    title="Representación fiel y verificable del documento"
                  >
                    Descargar copia fiel
                  </button>

                  {/* Original - Siempre visible, deshabilitado si no está disponible */}
                  <button
                    type="button"
                    onClick={() => handleOriginalDownload(previewDoc)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
                      previewDoc.custody_mode === 'encrypted_custody' && previewDoc.source_storage_path
                        ? 'border-gray-300 text-gray-700 hover:border-black hover:text-black'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!(previewDoc.custody_mode === 'encrypted_custody' && previewDoc.source_storage_path)}
                    title={previewDoc.custody_mode === 'encrypted_custody' && previewDoc.source_storage_path
                      ? 'Archivo original subido por el usuario'
                      : 'Original no disponible - no se guardó copia cifrada'}
                  >
                    Descargar original
                  </button>

                  <div className="border-t border-gray-200 my-1" />

                  <button
                    type="button"
                    onClick={() => handleVerifyDoc(previewDoc)}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                  >
                    Verificar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareDoc(previewDoc)}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                  >
                    Compartir
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveDoc({ ...previewDoc, document_entity_id: previewDoc.document_entity_id ?? previewDoc.id })}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                  >
                    Agregar a operación
                  </button>
                </div>

                <div className="pt-2">
                  <ProbativeTimeline doc={previewDoc} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Operación */}
      {previewOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{previewOperation.name}</h3>
                {previewOperation.description && (
                  <p className="text-sm text-gray-600 mt-1">{previewOperation.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Creada: {formatDate(previewOperation.created_at)}
                </p>
              </div>
              <button
                onClick={() => setPreviewOperation(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700">
                {previewOperation.status === "active"
                  ? "Iniciada"
                  : previewOperation.status === "closed"
                    ? "Completada"
                    : previewOperation.status === "archived"
                      ? "Archivada"
                      : "Borrador"}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="text-sm font-semibold text-gray-900 mb-3">Documentos</div>
                {previewOperationLoading ? (
                  <div className="text-sm text-gray-500">Cargando documentos…</div>
                ) : previewOperationDocs.length === 0 ? (
                  <div className="text-sm text-gray-500">No hay documentos en esta operación.</div>
                ) : (
                  <div className="space-y-2">
                    {previewOperationDocs.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        document={doc}
                        context="operation"
                        onOpen={(d) => {
                          setPreviewOperation(null);
                          setPreviewDoc(d);
                        }}
                        onInPerson={(d) => toast(`Firma presencial para "${d.document_name}" próximamente`, { position: "top-right" })}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                  <div className="font-semibold text-gray-800">Estado global</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {(() => {
                      const total = previewOperationDocs.length;
                      const completed = previewOperationDocs.filter((doc) => {
                        const key = deriveFlowStatus(doc).key;
                        return key === "signed" || key === "protected";
                      }).length;
                      const pending = total - completed;
                      if (total === 0) return "Sin documentos cargados.";
                      if (pending === 0) return "Todos los documentos están completos.";
                      return `Faltan completar ${pending} documento${pending === 1 ? "" : "s"}.`;
                    })()}
                  </div>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => toast("Compartir operación próximamente", { position: "top-right" })}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                  >
                    Compartir operación
                  </button>
                  {previewOperation.status === "active" && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateOperation(previewOperation.id, { status: "closed" }, currentUserId || undefined);
                          toast.success("Operación completada", { position: "top-right" });
                          setPreviewOperation((prev) => prev ? { ...prev, status: "closed" } : prev);
                          loadOperations();
                        } catch (error) {
                          console.error("Error updating operation:", error);
                          toast.error("No se pudo completar la operación", { position: "top-right" });
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800"
                    >
                      Marcar como completada
                    </button>
                  )}
                  {previewOperation.status !== "archived" && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateOperation(previewOperation.id, { status: "archived" }, currentUserId || undefined);
                          toast.success("Operación archivada", { position: "top-right" });
                          setPreviewOperation((prev) => prev ? { ...prev, status: "archived" } : prev);
                          loadOperations();
                        } catch (error) {
                          console.error("Error archiving operation:", error);
                          toast.error("No se pudo archivar la operación", { position: "top-right" });
                        }
                      }}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                    >
                      Archivar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toast("Firma presencial próximamente", { position: "top-right" })}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                  >
                    Firma presencial
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                  <div className="font-semibold text-gray-800">Timeline</div>
                  <div className="text-xs text-gray-600 mt-2">
                    Operación creada · {formatDate(previewOperation.created_at)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Estado actual: {previewOperation.status === "active"
                      ? "Iniciada"
                      : previewOperation.status === "closed"
                        ? "Completada"
                        : previewOperation.status === "archived"
                          ? "Archivada"
                          : "Borrador"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Borrador */}
      {previewDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{previewDraft.name}</h3>
                <p className="text-sm text-amber-700 mt-1">Incompleto</p>
                <p className="text-xs text-gray-500 mt-1">
                  Última modificación: {formatDate(previewDraft.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setPreviewDraft(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 min-h-[240px]">
                {previewDraftLoading && (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Cargando vista previa...
                  </div>
                )}
                {!previewDraftLoading && previewDraftError && (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 px-6 text-center">
                    {previewDraftError}
                  </div>
                )}
                {!previewDraftLoading && !previewDraftError && previewDraftText && (
                  <pre className="p-4 text-xs text-gray-700 whitespace-pre-wrap">{previewDraftText}</pre>
                )}
                {!previewDraftLoading && !previewDraftError && previewDraftUrl && (
                  <>
                    {previewDraft.name.toLowerCase().endsWith(".pdf") ? (
                      <object data={previewDraftUrl} type="application/pdf" className="w-full h-[50vh]">
                        <div className="p-4 text-sm text-gray-600">No pudimos mostrar el PDF.</div>
                      </object>
                    ) : (
                      <img src={previewDraftUrl} alt="Preview" className="w-full h-full object-contain p-4" />
                    )}
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Este borrador no es probatorio.
                </div>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => handleResumeDraft(previewDraft)}
                    className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800"
                  >
                    Continuar en Centro Legal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDraft(previewDraft)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-black hover:text-black"
                  >
                    Eliminar borrador
                  </button>
                </div>
              </div>
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
                setExpandedOperationId(operation.id);
                setOperationsOpenSignal((signal) => signal + 1);
                operationsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          onSuccess={(operationId) => {
            loadOperations(); // Recargar conteos
            loadDocuments(); // Recargar documentos
            setExpandedOperationId(operationId);
            setOperationsOpenSignal((signal) => signal + 1);
            operationsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onCreateNew={() => {
            setIsCreatingOperationForMove(true);
            setShowCreateOperationModal(true);
          }}
        />
      )}

      {/* Modal Renombrar Operación */}
      {editingOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Editar operación</h3>
                <p className="text-xs text-gray-600">Actualizá el nombre o la descripción</p>
              </div>
              <button
                onClick={() => setEditingOperation(null)}
                className="text-gray-400 hover:text-gray-600 transition"
                disabled={savingOperation}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOperation} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-operation-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  id="edit-operation-name"
                  type="text"
                  value={operationDraftName}
                  onChange={(e) => setOperationDraftName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  disabled={savingOperation}
                  maxLength={200}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="edit-operation-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  id="edit-operation-description"
                  value={operationDraftDescription}
                  onChange={(e) => setOperationDraftDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
                  disabled={savingOperation}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingOperation(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  disabled={savingOperation}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={savingOperation || !operationDraftName.trim()}
                >
                  {savingOperation ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewBadges({ doc, planTier }: { doc: DocumentRecord; planTier: PlanTier }) {
  const { config } = deriveProbativeState(doc, planTier);
  const flowStatus = deriveFlowStatus(doc);
  const flowConfig = FLOW_STATUS[flowStatus.key];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${flowConfig.bg} ${flowConfig.color}`}
        title="Estado del flujo"
      >
        {flowConfig.label}
        {flowStatus.detail ? ` — ${flowStatus.detail}` : ""}
      </span>
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
  // ✅ CANONICAL: Read ALL protection data from events[] (no legacy fields)
  const events = doc.events || [];

  // TSA: canonical from events[]
  const tsa = getLatestTsaEvent(events);
  const hasTsa = tsa.present;

  // Polygon: canonical from events[] ONLY
  const polygonAnchor = getAnchorEvent(events, 'polygon');
  const hasPolygon = polygonAnchor !== null;

  // Bitcoin: canonical from events[] ONLY
  const bitcoinAnchor = getAnchorEvent(events, 'bitcoin');
  const hasBitcoin = bitcoinAnchor !== null;

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
    const polygonTime = polygonAnchor?.anchor?.confirmed_at;
    timelineItems.push({
      label: "Registro Polygon confirmado",
      description: polygonTime
        ? `Confirmado: ${formatDate(polygonTime)}`
        : "Huella publicada en blockchain Polygon.",
      status: "ok"
    });
  }

  if (hasBitcoin) {
    const bitcoinTime = bitcoinAnchor?.anchor?.confirmed_at;
    timelineItems.push({
      label: "Registro Bitcoin confirmado",
      description: bitcoinTime
        ? `Confirmado: ${formatDate(bitcoinTime)}`
        : "Huella anclada en Bitcoin.",
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
