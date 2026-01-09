/**
 * @deprecated LEGACY - Local-only draft storage (IndexedDB + localStorage)
 *
 * Status: DEPRECATED (2026-01-10)
 * Reason: Drafts now persist server-side via operations.status='draft'
 * Replacement: Use `draftOperationsService.ts` instead
 *
 * This module remains for:
 * 1. Fallback cuando server falla
 * 2. Backwards compatibility con drafts viejos
 * 3. Dual-write durante Phase 1
 *
 * DO NOT use this for new features.
 * Prefer: saveDraftOperation(), loadDraftOperations() from draftOperationsService
 *
 * Migration path:
 * - Phase 1 (NOW): Dual-write (server + local)
 * - Phase 2 (Q2): Server-only, local como fallback
 * - Phase 3 (Q3): Deprecate completely, remove IndexedDB
 */

export type DraftMeta = {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  type: string;
};

const META_KEY = 'ecosign_drafts_meta';
const DB_NAME = 'ecosign_drafts';
const STORE_NAME = 'files';
const DB_VERSION = 1;

const readMeta = (): DraftMeta[] => {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeMeta = (drafts: DraftMeta[]) => {
  localStorage.setItem(META_KEY, JSON.stringify(drafts));
};

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const withStore = async (mode: IDBTransactionMode) => {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, mode);
  const store = tx.objectStore(STORE_NAME);
  return { db, tx, store };
};

export const listDrafts = (): DraftMeta[] => readMeta();

export const addDraft = async (file: File): Promise<DraftMeta> => {
  const draft: DraftMeta = {
    id: crypto.randomUUID(),
    name: file.name,
    createdAt: new Date().toISOString(),
    size: file.size,
    type: file.type,
  };

  const { tx, store } = await withStore('readwrite');
  store.put({ id: draft.id, file });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  const drafts = readMeta();
  drafts.unshift(draft);
  writeMeta(drafts);

  return draft;
};

export const getDraftFile = async (id: string): Promise<File | null> => {
  const { tx, store } = await withStore('readonly');
  const request = store.get(id);
  const file = await new Promise<File | null>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as { file?: File } | undefined)?.file ?? null);
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  return file;
};

export const removeDraft = async (id: string): Promise<void> => {
  const { tx, store } = await withStore('readwrite');
  store.delete(id);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  const drafts = readMeta().filter((draft) => draft.id !== id);
  writeMeta(drafts);
};
