# Historia: Commits de decisiones (2026-01-08 → 2026-01-26)

Resumen: este documento concentra los commits relacionados con las decisiones / motor de decisiones introducidas entre 2026-01-08 y 2026-01-26, los archivos creados por esos commits y el contenido (en el momento de creación) de los ficheros clave.

---

## Metodología
- Se inspeccionó el historial git entre 2026-01-08 y 2026-01-26.
- Se priorizaron commits que introducen "decision engines", paquetes `packages/authority`, migraciones `docs/migration/*` y artefactos de shadow validation.
- Para cada commit relevante se listan: hash, fecha, autor, archivos añadidos (A) y un volcado del contenido de los archivos clave tal como fueron creados.

---

## Commits clave y archivos creados

### 1) 42796815c15f6b21... (2026-01-22) — packages/contracts-runtime/decisionEngine.ts
- Hash: 42796815c15f6b2129f27b754ebd9cc66251b5ad
- Fecha: 2026-01-22
- Autor: ecosign-bot
- Nota: motor canónico en packages/contracts-runtime que contiene decisiones puras (run_tsa, artifact, anchors).

Archivo creado: `packages/contracts-runtime/decisionEngine.ts`

Contenido (creado):

```
/* Decision Engine - Motor de Decisiones Canónicas */

import type { GenericEvent } from './types.ts';

export type JobType = 'run_tsa' | 'build_artifact' | 'submit_anchor_polygon' | 'submit_anchor_bitcoin';

export type DecisionResult = { jobs: JobType[]; reason: string; };

// Helpers: hasEvent, hasAnchorConfirmed, hasRequiredAnchors
// Lógica principal: decide entre run_tsa, build_artifact, submit anchors

export const shouldEnqueueRunTsa = (events: GenericEvent[]): boolean => {
  const hasRequest = hasEvent(events, 'document.protected.requested');
  const hasTsaConfirmed = hasEvent(events, 'tsa.confirmed');
  return hasRequest && !hasTsaConfirmed;
};

export const isReadyForArtifact = (events: GenericEvent[], protection: string[]): boolean => {
  const hasTsa = hasEvent(events, 'tsa.confirmed');
  const hasArtifact = hasEvent(events, 'artifact.finalized');
  const hasRequiredAnchorsCompleted = hasRequiredAnchors(events, protection);
  return hasTsa && !hasArtifact && hasRequiredAnchorsCompleted;
};
```

(Se incluyó la lógica para verificar anchors por red y causalidad temporal.)

---

### 2) 4894c43df1eda96d... (2026-01-22) — supabase/functions/_shared/decisionEngineCanonical.ts
- Hash: 4894c43df1eda96d85823e0131e706c0d1c865ed
- Fecha: 2026-01-22
- Autor: ecosign-bot
- Nota: versión minimal del motor canónico usada en edge (shadow checks) para comparar con el executor actual.

Archivo creado: `supabase/functions/_shared/decisionEngineCanonical.ts`

Contenido (creado):

```
/** Decision Engine Canónico - Lógica de Decisión Pura */

export type EventLike = { kind?: string };

export const shouldEnqueueRunTsa = (events: EventLike[]): boolean => {
  const hasRequest = events.some(e => e.kind === 'document.protected.requested');
  const hasTsaConfirmed = events.some(e => e.kind === 'tsa.confirmed');
  return hasRequest && !hasTsaConfirmed;
};

export const decideRunTsaCanonical = (events: EventLike[]): 'run_tsa' | 'noop' => {
  return shouldEnqueueRunTsa(events) ? 'run_tsa' : 'noop';
};
```

(Este fichero aparece en el flujo en modo *shadow*; el executor lo usa para comparar su decisión actual y loguear divergencias.)

---

### 3) 7032317b4638f3c... (2026-01-23) — paquete `packages/authority` y migraciones D10-D15
- Hash: 7032317b4638f3cdda7ad24f9d0f098f524eb44f
- Fecha: 2026-01-23
- Autor: ecosign-bot
- Nota: introducción de contratos D10–D15 y primeras decisiones canónicas (ApplySignerSignature, StartSignatureWorkflow, RequestDocumentChanges, etc.), tests y migraciones de shadow views.

Archivos creados (ejemplos):
- packages/authority/src/decisions/applySignerSignature.ts
- packages/authority/src/decisions/startSignatureWorkflow.ts
- varias migraciones `supabase/migrations/20260122*_*.sql`
- docs/migration/D10_REJECT_SIGNATURE.md … D15_RESPOND_TO_CHANGES.md
- docs/audits/batch1-shadow-verification.sql
- supabase/migrations/20260124100000_shadow_decision_generic_views.sql

Contenido (fragmentos clave creados):

`packages/authority/src/decisions/applySignerSignature.ts` (extracto):

```
export interface ApplySignerSignatureInput { signer: { id: string; workflow_id: string; status: string; otp_verified: boolean; /* ... */ } | null; workflow: { id: string; document_entity_id: string | null } | null; payload: { signerId?: string; accessToken?: string; workflowId?: string; };
}

export function shouldApplySignerSignature(input: ApplySignerSignatureInput): boolean {
  const p = input.payload || {};
  if (!p.signerId && !p.accessToken) return false;
  if (!input.signer) return false;
  if (!input.workflow) return false;
  const terminal = ['signed', 'cancelled', 'expired'];
  if (terminal.includes(input.signer.status)) return false;
  if (input.signer.status !== 'ready_to_sign') return false;
  if (!input.signer.otp_verified) return false;
  return true;
}
```

`packages/authority/src/decisions/startSignatureWorkflow.ts` (extracto):

```
export function shouldStartSignatureWorkflow(input: StartWorkflowInput): boolean {
  if (!input.actor_id) return false;
  const p = input.payload || {};
  if (!p.documentUrl || !p.documentHash || !p.originalFilename) return false;
  if (!p.signers || p.signers.length === 0) return false;
  if (!p.forensicConfig) return false;
  const { rfc3161, polygon, bitcoin } = p.forensicConfig;
  if ([rfc3161, polygon, bitcoin].some(v => typeof v !== 'boolean')) return false;
  // verify signingOrder monotonicity
  return true;
}
```

(Además se añadieron tests y SQL de instrumentación shadow para D12–D15.)

---

### 4) 8cf3524cadcea311... (2026-01-24) — D16–D22, anchors processing
- Hash: 8cf3524cadcea311da7d6ff5bea1d5e5f98a6478
- Fecha: 2026-01-24
- Autor: ecosign-bot
- Nota: se añadieron decisiones D16–D22, procesos para anchors de Polygon/Bitcoin, scripts de shadow runs y múltiples docs/audits.

Archivos creados (ejemplos):
- packages/authority/src/decisions/processPolygonAnchors.ts
- packages/authority/src/decisions/processBitcoinAnchors.ts
- docs/migration/D16_ACCEPT_NDA.md … D22_PROCESS_BITCOIN_ANCHORS.md
- docs/audits/* (batch reports)

Contenido (fragmentos clave creados):

`packages/authority/src/decisions/processPolygonAnchors.ts` (creado):

```
export function shouldConfirmPolygonAnchor(input: ProcessPolygonAnchorInput): boolean {
  if (input.anchor.anchor_type !== 'polygon') return false;
  if (!input.anchor.polygon_tx_hash) return false;
  if (!input.receipt) return false;
  if (input.receipt.status !== 1) return false;
  const attempts = (input.anchor.polygon_attempts ?? 0) + 1;
  if (attempts > input.maxAttempts) return false;
  return true;
}
```

`packages/authority/src/decisions/processBitcoinAnchors.ts` (creado):

```
export function shouldSubmitBitcoinAnchor(input: ProcessBitcoinAnchorInput): boolean {
  return input.anchor.anchor_status === 'queued';
}

export function shouldConfirmBitcoinAnchor(input: ProcessBitcoinAnchorInput): boolean {
  if (input.userDoc?.bitcoin_status === 'cancelled') return false;
  if (!input.verification.confirmed) return false;
  const attempts = (input.anchor.bitcoin_attempts ?? 0) + 1;
  if (attempts > input.maxAttempts) return false;
  return true;
}
```

(Se añadieron también scripts para simular runs y reportes de auditoría en `docs/audits/`.)

---

## Observaciones y trazado (cómo llegamos hasta aquí)
- Línea temporal corta: el 2026-01-22 se introdujo el motor canónico (packages/contracts-runtime) y la integración con el executor en modo *shadow* (supabase/functions/_shared/decisionEngineCanonical.ts y modificaciones en fase1-executor).
- El 2026-01-23 se creó el paquete `packages/authority` con decisiones D10–D15 y tests; añadido material de migración y vistas shadow. Esto es el trabajo de formalizar contratos (applySignerSignature, startSignatureWorkflow, etc.).
- El 2026-01-24 se amplió a D16–D22 (anchors y NDA workflows) y se añadieron scripts de verificación/shadow runs. A partir de este punto el repo tiene:
  - motor canónico en `packages/contracts-runtime`
  - implementaciones de decisiones en `packages/authority`
  - instrumentación shadow en `supabase/functions` y `supabase/migrations`

## Recomendación inmediata (cómo avanzar)
1. Ejecutar localmente los scripts en `scripts/simulate-*` y `docs/audits/*` para reproducir divergencias detectadas.
2. Revisar `supabase/functions/fase1-executor/index.ts` y su uso de `decisionEngineCanonical` (ya instrumentado en shadow) y priorizar cerrar divergencias encontradas por los tests/simulators.
3. Si quiere, genero un informe completo (todos los archivos creados entre 2026-01-08 y 2026-01-26) o exporto la lista de archivos nuevos por commit en CSV para revisión offline.

---

Si quiere que incluya más archivos (por ejemplo todas las migraciones D10–D22 completas o el `DECISION_LOG_3.0.md` completo en la versión de una fecha concreta), indíquelo y lo añado al documento.
