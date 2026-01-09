# UI / UX State & Debt Notes (EcoSign)

Last updated: 2026-01-09
Scope: UI work done in client + known technical debt + next UX steps.

---

## 1) Documents / Operations UI (alignment + hierarchy)

What was done
- Canonical grid enforced across header, section toggles, operation rows, document rows.
- Visual hierarchy fixed: section headers > operations > documents.
- Actions column aligned; header labels adjusted; CTA styling aligned with brand.

Where
- `client/src/pages/DocumentsPage.tsx`
- `client/src/components/DocumentRow.tsx`
- `client/src/components/OperationRow.tsx`
- `client/src/components/SectionToggle.tsx`
- `client/src/components/Header.tsx`

UX debt / limitations
- Grid sizes are currently hard-coded in classes; no shared token or config.
- Header label micro-alignment (Acciones) uses manual offset.

Next UX steps
- Centralize grid template in a single constant or CSS variable.
- Replace manual header offset with a proper column alignment helper.

---

## 2) Verifier (public + internal) + timeline toggle

What was done
- Public Verify page unified to match internal verifier UI.
- Timeline is a toggle inside verifier (collapsed by default).
- Timeline is offline-first: built from .eco; operations_events are optional enrichment.
- Advanced functions box removed from public + internal.

Where
- `client/src/pages/VerifyPage.tsx`
- `client/src/pages/DashboardVerifyPage.tsx`
- `client/src/components/VerificationComponent.tsx`
- `client/src/components/VerifierTimeline.tsx`
- `client/src/lib/verifier/*`

UX debt / limitations
- Timeline is basic (no animation / no narrative polish).
- operations_events is optional and currently shown only when available.

Next UX steps
- Upgrade timeline storytelling (visual grouping, human language).
- Add QR/deeplink entry to verifier.

---

## 3) Legal Center: drag & drop + preview signature overlay

What was done
- Drag & drop to canvas (single file, replace current).
- Visual-only signature overlay on preview (not witness, not persisted).
- Overlay can be dragged; hover shows delete (X).
- "Rehacer firma" entry point added when signature is present.

Where
- `client/src/components/LegalCenterModalV2.tsx`

UX debt / limitations
- Signature overlay is UI-only; no persistence or witness binding.
- Position is not saved to any model.

Next UX steps
- Persist signature position and use in canonical stamping.
- Use the same overlay model to drive witness/PDF stamping.

---

## 4) Drafts (local-only)

What was done
- "Guardar como borrador" saves file to local storage (IndexedDB).
- Drafts section in Documents lists local drafts.
- Drafts can be resumed (reopens Legal Center with file).

Where
- `client/src/utils/draftStorage.ts`
- `client/src/components/LegalCenterModalV2.tsx`
- `client/src/pages/DocumentsPage.tsx`

UX debt / limitations
- Drafts are local-only; not tied to user account or DB.
- No true draft state in document_entities.

Next UX steps
- Define canonical draft model in backend.
- Rehydrate full state (signature, NDA, workflow inputs).

---

## 5) Workflow field placement (visual fields on preview)

What was done
- Workflow placeholder fields (signature) are now draggable on preview.
- Added toolbar to insert text/date fields.
- Each field can be edited (text) and duplicated; whole group can be duplicated.

Where
- `client/src/components/LegalCenterModalV2.tsx`

UX debt / limitations
- Fields are local UI metadata only.
- No persistence, no export to workflow engine.
- No snap-to-grid or alignment controls.

Next UX steps
- Create schema for field persistence per document/workflow.
- Connect to workflow service or signer UI.
- Add alignment/snapping and group selection.

---

## 6) Signature canvas accuracy

What was done
- Fixed canvas coordinate scaling so crosshair aligns with stroke start.

Where
- `client/src/hooks/useSignatureCanvas.ts`
- `client/src/centro-legal/modules/signature/SignatureModal.tsx`

UX debt / limitations
- Canvas still uses basic draw; no smoothing or pressure.

Next UX steps
- Optional smoothing for better handwriting feel.

---

## 7) Operations events + verifier context

What was done
- Added `operations_events` table for append-only operational audit.
- Logs operation.created / renamed / archived / closed.
- Mirrors document_added / document_removed into operations_events.

Where
- `supabase/migrations/20260109130000_create_operations_events.sql`
- `client/src/lib/operationsService.ts`

UX debt / limitations
- operations_events is not required for verification; it is optional context.

Next UX steps
- Build a richer narrative view using events (when needed).

---

## Quick UX Map (current user flow)

1) Documents list
- Operations + Documents sections aligned.
- Drafts appear in Documents (local).

2) Legal Center
- Drag & drop file.
- Optional signature overlay (visual-only).
- Workflow fields can be placed visually (local only).
- Save draft (local only).

3) Verifier
- Upload .eco + PDF witness (public or internal).
- Timeline toggle (offline-first).

---

## Suggested next sprint (UX-focused)

1) Persist draft state to backend (file + signature + workflow inputs).
2) Bind preview signature overlay to witness stamping.
3) Persist workflow fields (positions + labels) and reflect in signer flow.
4) Upgrade timeline storytelling (human narrative + grouping).


## 8) Modal final “Guardar original” (Copia Fiel canónica)

What was done
- Se agregó un modal final que confirma que la protección se hizo sobre la Copia Fiel (representación canónica).
- Se ofrece de forma opcional resguardar el original cifrado con CTA doble.

Where
- `client/src/components/LegalCenterModalV2.tsx`

UX debt / limitations
- La elección “Guardar original” no está cableada a persistencia/encriptado real.

Next UX steps
- Conectar el toggle a almacenamiento cifrado del original (custody_mode = encrypted_custody + source_storage_path).
- Registrar evento canónico en document_entities (opcional) indicando resguardo del original.

