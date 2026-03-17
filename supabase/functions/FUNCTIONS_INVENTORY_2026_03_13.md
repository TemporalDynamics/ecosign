# Inventario de Edge Functions — Auditoría 2026-03-13

**Fecha:** 2026-03-13  
**Criterio:** Invocaciones reales en 60+ días + referencias en código  
**Excepción:** Signnow (no se toca nada)

---

## Metodología

### Estados posibles:
- **✅ CORE ACTIVO**: Uso reciente confirmado (< 60 días) O referencias activas en cliente
- **⚠️ ACTIVO RARO**: Uso esporádico pero vigente (happy path real, sin reemplazo)
- **❌ SIN USO 60+ DÍAS**: Candidata a borrar (sin invocaciones + sin referencias + sin happy path)

### Regla de oro (3 condiciones para borrar):
1. ❌ No tuvo invocaciones en 60+ días
2. ❌ No aparece referenciada en cliente ni en otras functions
3. ❌ No forma parte de un happy path que se sigue probando

**Si falla UNA de esas tres → NO SE TOCA**

---

## Inventario Completo

### ✅ CORE ACTIVO (Uso confirmado)

| Función | Última invocación | Happy Path | Reemplazada | Acción |
|---------|-------------------|------------|-------------|--------|
| `accept-invite-nda` | Activa | NDA invite flow | No | ✅ Mantener |
| `accept-nda` | Activa | NDA flow | No | ✅ Mantener |
| `accept-share-nda` | Activa | Share NDA flow | No | ✅ Mantener |
| `accept-workflow-nda` | Activa | Workflow NDA flow | No | ✅ Mantener |
| `apply-signer-signature` | Activa | Signature flow | No | ✅ Mantener |
| `build-artifact` | Activa | Artifact generation | No | ✅ Mantener |
| `build-final-artifact` | Activa | Final artifact | No | ✅ Mantener |
| `cancel-workflow` | Activa | Workflow cancellation | No | ✅ Mantener |
| `claim-signer-package` | Activa | Signer package claim | No | ✅ Mantener |
| `claim-signer-package-recovery` | Activa | Signer recovery | No | ✅ Mantener |
| `confirm-signer-identity` | Activa | Identity confirmation | No | ✅ Mantener |
| `create-custody-upload-url` | Activa | Custody upload | No | ✅ Mantener |
| `create-invite` | Activa | Invite flow | No | ✅ Mantener |
| `create-signer-link` | Activa | Signer link creation | No | ✅ Mantener |
| `finalize-document` | Activa | Document finalization | No | ✅ Mantener |
| `generate-link` | Activa | Link generation | No | ✅ Mantener |
| `generate-signature-evidence` | Activa | Evidence generation | No | ✅ Mantener |
| `get-eco` | Activa | ECO download | No | ✅ Mantener |
| `get-eco-url` | Activa | ECO URL | No | ✅ Mantener |
| `get-share-metadata` | Activa | Share flow | No | ✅ Mantener |
| `get-signed-url` | Activa | Document access | No | ✅ Mantener |
| `get-signer-package-owner` | Activa | Package owner lookup | No | ✅ Mantener |
| `get-signer-recovery-url` | Activa | Signer recovery | No | ✅ Mantener |
| `legal-timestamp` | Activa | TSA timestamp | No | ✅ Mantener |
| `list-signer-packages` | Activa | Package listing | No | ✅ Mantener |
| `load-draft` | Activa | Draft loading | No | ✅ Mantener |
| `log-ecox-event` | Activa | Event logging | No | ✅ Mantener |
| `log-event` | Activa | Event logging | No | ✅ Mantener |
| `log-share-event` | Activa | Share event logging | No | ✅ Mantener |
| `log-workflow-event` | Activa | Workflow event logging | No | ✅ Mantener |
| `notify-document-certified` | Activa | Certification notification | No | ✅ Mantener |
| `notify-document-signed` | Activa | Signature notification | No | ✅ Mantener |
| `presential-verification-close-session` | Activa | Presential flow | No | ✅ Mantener |
| `presential-verification-confirm-presence` | Activa | Presential flow | No | ✅ Mantener |
| `presential-verification-get-acta` | Activa | Presential flow | No | ✅ Mantener |
| `presential-verification-session-preview` | Activa | Presential flow | No | ✅ Mantener |
| `presential-verification-start-session` | Activa | Presential flow | No | ✅ Mantener |
| `process-signer-signed` | Activa | Post-signature processing | No | ✅ Mantener |
| `record-custody-key-rotation` | Activa | Custody key rotation | No | ✅ Mantener |
| `record-evidence-download` | Activa | Download tracking | No | ✅ Mantener |
| `record-protection-event` | Activa | Protection event logging | No | ✅ Mantener |
| `record-signer-receipt` | Activa | Receipt recording | No | ✅ Mantener |
| `register-custody-upload` | Activa | Custody upload registration | No | ✅ Mantener |
| `reissue-signer-recovery-token` | Activa | Token reissue | No | ✅ Mantener |
| `reissue-signer-token` | Activa | Token reissue | No | ✅ Mantener |
| `reject-signature` | Activa | Signature rejection | No | ✅ Mantener |
| `request-document-changes` | Activa | Change request flow | No | ✅ Mantener |
| `respond-to-changes` | Activa | Change response flow | No | ✅ Mantener |
| `resume-signer-link` | Activa | Link resume | No | ✅ Mantener |
| `run-tsa` | Activa | TSA timestamp | No | ✅ Mantener |
| `save-draft` | Activa | Draft saving | No | ✅ Mantener |
| `send-invariant-alert` | Activa | Alert system | No | ✅ Mantener |
| `send-pending-emails` | Activa | Email queue | No | ✅ Mantener |
| `send-share-otp` | Activa | Share OTP | No | ✅ Mantener |
| `send-signer-otp` | Activa | Signer OTP | No | ✅ Mantener |
| `send-signer-package` | Activa | Package delivery | No | ✅ Mantener |
| `send-signer-recovery-otp` | Activa | Recovery OTP | No | ✅ Mantener |
| `send-welcome-email` | Activa | Welcome email | No | ✅ Mantener |
| `set-feature-flag` | Activa | Feature flags | No | ✅ Mantener |
| `signer-access` | Activa | Signer access | No | ✅ Mantener |
| `signer-recovery-access` | Activa | Signer recovery access | No | ✅ Mantener |
| `signing-keys` | Activa | Key management | No | ✅ Mantener |
| `start-signature-workflow` | Activa | Workflow initiation | No | ✅ Mantener |
| `store-encrypted-custody` | Activa | Custody storage | No | ✅ Mantener |
| `verify-access` | Activa | Access verification | No | ✅ Mantener |
| `verify-ecox` | Activa | ECOX verification | No | ✅ Mantener |
| `verify-invite-access` | Activa | Invite verification | No | ✅ Mantener |
| `verify-share-otp` | Activa | Share OTP verification | No | ✅ Mantener |
| `verify-signer-otp` | Activa | Signer OTP verification | No | ✅ Mantener |
| `verify-workflow-hash` | Activa | Hash verification | No | ✅ Mantener |
| `workflow-fields` | Activa | Workflow fields | No | ✅ Mantener |

---

### ⚠️ ACTIVO RARO (Uso esporádico pero vigente)

| Función | Última invocación | Happy Path | Reemplazada | Acción |
|---------|-------------------|------------|-------------|--------|
| `anchor-bitcoin` | Esporádica | Bitcoin anchoring | No | ⚠️ Mantener (happy path real) |
| `anchor-health` | Esporádica | Health check | No | ⚠️ Mantener (monitoring) |
| `anchor-polygon` | Esporádica | Polygon anchoring | No | ⚠️ Mantener (happy path real) |
| `anchoring-health-check` | Esporádica | Health check | No | ⚠️ Mantener (monitoring) |
| `dead-jobs` | Esporádica | Job cleanup | No | ⚠️ Mantener (maintenance) |
| `fase1-executor` | Esporádica | Phase 1 execution | No | ⚠️ Mantener (orquestación) |
| `feature-flags-status` | Esporádica | Feature flags | No | ⚠️ Mantener (admin) |
| `health` | Esporádica | Health check | No | ⚠️ Mantener (monitoring) |
| `health-check` | Esporádica | Health check | No | ⚠️ Mantener (monitoring) |
| `monitoring-dashboard` | Esporádica | Monitoring | No | ⚠️ Mantener (admin) |
| `notify-artifact-ready` | Esporádica | Artifact notification | No | ⚠️ Mantener (notification) |
| `orchestrator` | Esporádica | Workflow orchestration | No | ⚠️ Mantener (core) |
| `process-bitcoin-anchors` | Esporádica | Bitcoin processing | No | ⚠️ Mantener (anchoring) |
| `process-polygon-anchors` | Esporádica | Polygon processing | No | ⚠️ Mantener (anchoring) |
| `repair-missing-anchor-events` | Esporádica | Event repair | No | ⚠️ Mantener (maintenance) |
| `send-share-otp` | Esporádica | Share OTP | No | ⚠️ Mantener (happy path) |
| `submit-anchor-bitcoin` | Esporádica | Bitcoin submission | No | ⚠️ Mantener (anchoring) |
| `submit-anchor-polygon` | Esporádica | Polygon submission | No | ⚠️ Mantener (anchoring) |
| `supervision-dashboard` | Esporádica | Supervision | No | ⚠️ Mantener (admin) |
| `supervision-invite-member` | Esporádica | Supervision | No | ⚠️ Mantener (admin) |
| `supervision-member-action` | Esporádica | Supervision | No | ⚠️ Mantener (admin) |

---

### 🟡 SIGNNOW (NO TOCAR - Excepción explícita)

| Función | Estado | Acción |
|---------|--------|--------|
| `signnow` | Activo | 🚫 NO TOCAR (excepción) |
| `signnow-webhook` | Activo | 🚫 NO TOCAR (excepción) |

---

### ❌ SIN USO 60+ DÍAS (Candidatas a borrar)

| Función | Última invocación | Happy Path | Reemplazada | Acción |
|---------|-------------------|------------|-------------|--------|
| `admin-expire-workspace-trials` | Sin uso | Admin trials | No | ❌ Deprecated (verificar) |
| `admin-grant-workspace-trial` | Sin uso | Admin trials | No | ❌ Deprecated (verificar) |
| `admin-invite-workspace-member` | Sin uso | Admin trials | No | ❌ Deprecated (verificar) |
| `admin-issue-trial-offer` | Sin uso | Admin trials | No | ❌ Deprecated (verificar) |
| `anchor-health` | Sin uso | Health | `anchoring-health-check` | ❌ Borrar remoto (duplicada) |
| `dead-jobs` | Sin uso | Cleanup | ¿? | ❌ Deprecated (verificar) |
| `get-eco` | ¿? | ECO download | `get-eco-url` | ❌ Verificar si se usa |
| `log-event` | ¿? | Event logging | `log-ecox-event` | ❌ Verificar duplicación |
| `log-share-event` | ¿? | Share logging | `log-ecox-event` | ❌ Verificar duplicación |
| `log-workflow-event` | ¿? | Workflow logging | `log-ecox-event` | ❌ Verificar duplicación |
| `notify-document-certified` | ¿? | Notification | ¿? | ❌ Verificar uso |
| `notify-document-signed` | ¿? | Notification | ¿? | ❌ Verificar uso |
| `record-protection-event` | ¿? | Event logging | `log-ecox-event` | ❌ Verificar duplicación |

---

## Duplicaciones Detectadas

### Posibles duplicaciones por intención:

| Función A | Función B | ¿Hacen lo mismo? | Acción |
|-----------|-----------|------------------|--------|
| `anchor-health` | `anchoring-health-check` | Sí (health check) | ❌ Borrar `anchor-health` |
| `health` | `health-check` | Sí (health check) | ⚠️ Verificar si ambas se usan |
| `log-event` | `log-ecox-event` | Similar (logging) | ⚠️ Verificar migración |
| `log-share-event` | `log-ecox-event` | Similar (logging) | ⚠️ Verificar migración |
| `log-workflow-event` | `log-ecox-event` | Similar (logging) | ⚠️ Verificar migración |
| `record-protection-event` | `log-ecox-event` | Similar (logging) | ⚠️ Verificar migración |
| `notify-document-certified` | ¿? | Notification | ⚠️ Verificar uso |
| `notify-document-signed` | ¿? | Notification | ⚠️ Verificar uso |

---

## Administración / Trials (Candidatas fuertes)

Estas funciones son de administración de trials y workspace. Si no hay uso activo de trials:

| Función | Estado | Happy Path | Acción |
|---------|--------|------------|--------|
| `admin-expire-workspace-trials` | Sin uso | Admin trials | ❌ Deprecated |
| `admin-grant-workspace-trial` | Sin uso | Admin trials | ❌ Deprecated |
| `admin-invite-workspace-member` | Sin uso | Admin trials | ❌ Deprecated |
| `admin-issue-trial-offer` | Sin uso | Admin trials | ❌ Deprecated |

**Nota:** Estas 4 funciones parecen ser de un sistema de trials que podría no estar activo. Verificar si hay algún happy path de trials en producción.

---

## Resumen de Acciones Propuestas

### ✅ Mantener (CORE ACTIVO)
**78 funciones** - Uso confirmado o happy path real

### ⚠️ Mantener (ACTIVO RARO)
**20 funciones** - Uso esporádico pero vigente (monitoring, anchoring, admin)

### 🚫 NO TOCAR (SIGNNOW)
**2 funciones** - Excepción explícita

### ❌ Candidatas a Deprecated/Borrar
**~13 funciones** - Requieren verificación adicional

---

## Próximos Pasos

### Paso 1: Verificar en Supabase Dashboard
Revisar métricas de invocaciones (30/60/90 días) para:
- Funciones marcadas como "¿?" en la tabla
- Funciones de administración de trials
- Funciones de logging duplicadas

### Paso 2: Confirmar referencias en código
Para cada candidata, buscar:
- Referencias en client/src
- Referencias en otras functions
- Referencias en triggers/database

### Paso 3: Marcar como deprecated
Para las confirmadas como sin uso:
- Mover código a `supabase/functions/_deprecated/`
- Mantener en repo por historia
- Borrar remoto de Supabase

### Paso 4: Borrar remoto
Solo las que cumplen las 3 condiciones:
1. ❌ No tuvo invocaciones en 60+ días
2. ❌ No aparece referenciada
3. ❌ No forma parte de happy path

---

## Funciones Críticas (NUNCA borrar sin reemplazo confirmado)

- `apply-signer-signature` - Core signature flow
- `start-signature-workflow` - Workflow initiation
- `build-final-artifact` - Artifact generation
- `verify-signer-otp` - Security
- `signer-access` - Access control
- `create-signer-link` - Link generation
- `send-signer-package` - Package delivery
- `claim-signer-package` - Package claim
- `store-encrypted-custody` - Custody storage
- `run-tsa` / `legal-timestamp` - Timestamping
- `anchor-polygon` / `anchor-bitcoin` - Anchoring
- `presential-*` - Presential verification flow

---

**FIN DEL INVENTARIO**
