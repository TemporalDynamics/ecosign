# MASTER ROADMAP — EcoSign (Consolidado)

Fecha: 2026-01-11  
Propósito: unificar todos los frentes en un solo mapa de ruta y evitar dispersión.

---

## 1) Estado actual (resumen corto)

Completado:

- Sprint 1: Quick wins (Bézier smoothing + grid tokens)
- Sprint 2: Identity + TSA UI
- Sprint 3: Drafts server-side
- Sprint 4: Custody mode real
- Sprint 5: Signature → Witness binding (via overlay_spec en transform_log)
- Sprint 6: Workflow fields persistence


Pendiente:
- Sprint 7: Timeline narrativa (storytelling del verificador)
- Observabilidad completa de anchoring (Polygon/Bitcoin)

---

## 2) Fases de producto (orden estratégico)

### PRE‑BETA HARDENING (OBLIGATORIO)
Objetivo: reducir riesgos silenciosos antes de abrir beta.

Incluye:
- Validación de inputs en Edge Functions (emails, tamaños, payloads)
- Auditoría RLS por tabla crítica (document_entities, anchors, notifications, workflow_fields)
- Checks de ownership dentro de Edge Functions (service_role no basta)
- audit_logs mínimos (firma, anchor, descargas, NDA aceptada)
- Tests críticos en verde (TSA, hash chain, invariantes canónicas)

### FASE A — Estado visible y cierre de flujo (PRIORIDAD MÁXIMA)
Objetivo: cada acción produce una consecuencia visible y clara.

Incluye:
- Drafts con cierre de modal + toast + retorno a Documents
- Estados visibles: Draft / Configurado / Enviado / En firma / Firmado / Certificado
- Cierre mental: “qué pasó y qué sigue” siempre explícito

### FASE B — Narrativa y comprensión (Timeline)
Objetivo: que un usuario no técnico entienda la historia del documento.

Incluye:
- groupEventsByPhase()
- VerifierTimelineNarrative (lenguaje humano)
- Copy claro: creación → configuración → firma → certificación → anclaje

### FASE C — Prueba criptográfica observable
Objetivo: que el anchoring sea visible, auditable y confiable en UI.

Incluye:
- Eventos anchor.attempt / anchor.failed
- Status claros: pending / confirmed / failed
- Health check de workers y crons

---

## 3) Roadmap técnico (bloques críticos)

### 3.1 Anchoring (Polygon / Bitcoin)
- Fix cron auth con service_role_key válido
- Limpieza de legacy pendings
- Health panel mínimo (admin)
- UI honesta: “pendiente”, “confirmado”, “falló”

### 3.2 Stamping y Witness
- OverlaySpec como fuente canónica
- Stamping en PDF Witness antes de hash final
- Transform log con signature_applied

### 3.3 Workflow fields
- Persistencia en DB con RLS
- Recuperación al reabrir documento
- Integración con signers

### 3.4 Beta scope (feature flags)
- Desactivar encrypted_custody si no hay recuperación real
- Limitar multi‑firmante hasta estabilizar hash chain
- Ocultar módulos incompletos (OTP, identity avanzada, etc.)

### 3.5 QA mínimo antes de beta
- E2E: upload → witness → firma → verificación
- E2E NDA invitado externo
- RLS multi‑user (acceso cruzado bloqueado)
- Invariantes canónicas (sin signed_hash sin witness_hash)

---

## 4) Pre‑Pagos / Pre‑Stripe (Etapa obligatoria)

Objetivo: operar planes y consumo sin dinero real aún.

Incluye:
- Modelo de planes + plan snapshot (entitlement)
- Metering con reserva/consumo real
- UX: “esta acción consume 1 firma legal”
- Compra manual / enterprise (credit.granted)
- Auditoría de usage_events

No incluye aún:
- Stripe
- Webhooks
- Prorrateos / impuestos

---

## 5) Estrategia de “Infalibilidad”

Objetivo: si prometemos protección, siempre hay prueba externa.

Capas recomendadas:
- TSA A + TSA B (doble timestamp legal)
- Polygon (rápido)
- Bitcoin (profundo)
- Public append-only log (fallback sin crypto)
- Ethereum Mainnet (último recurso, costo alto, uso raro)

Mensaje UX:
- “Protección activa (multicapa). Algunas capas pueden tardar más.”

---

## 6) Prioridades inmediatas (próximas 2–4 semanas)

1. PRE‑BETA HARDENING (seguridad + logs + tests)
2. FASE A — estados visibles y cierre de flujo (UX)
3. FASE C — anchoring observable y health checks
4. FASE B — timeline narrativa
5. Pre‑Pagos — metering + snapshot de plan

---

## 7) Documentos de soporte (ya existentes)

- `DECISION_LOG_3.0.md`
- `docs/ops/POLYGON_ANCHORING_DIAGNOSIS.md`
- `BLOCKCHAIN_ANCHORING_FIX.md`
- `BITCOIN_QUICKCHECK.md`
- `POLYGON_FIX_STEPS.md`

---

## 8) KPI de beta (para inversores)

Producto:
- % documentos con estado claro
- % workflows completados sin intervención manual

Operación:
- tiempo promedio de anclaje Polygon
- tasa de fallos de anchoring

Negocio:
- tasa de activación (documento protegido / usuario)
- conversión a flujo de firma


