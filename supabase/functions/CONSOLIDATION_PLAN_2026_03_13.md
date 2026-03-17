# Plan de Consolidación de Edge Functions — 2026-03-13

**Fecha:** 2026-03-13  
**Objetivo:** Reducir cantidad de functions remotas sin mutilar features  
**Criterio:** Consolidar por dominio, no por parecido de nombre

---

## Principios de Consolidación

### ✅ Se puede fusionar si cumple las 5:
1. Mismo dominio
2. Mismo perfil de permisos
3. Mismo tipo de consumidor
4. Mismo nivel de criticidad
5. Mismo ciclo de despliegue

### ❌ No fusionar si:
- Tienen permisos distintos
- Una es pública y otra privada
- Una es happy path caliente y otra de backoffice raro
- Una falla podría romper a la otra

---

## Dominios de Consolidación

### 1. 🟢 SUPERVISION (Alta Prioridad - Listo para consolidar)

**Funciones actuales (3):**
- `supervision-dashboard`
- `supervision-invite-member`
- `supervision-member-action`

**Análisis:**
| Criterio | Estado |
|----------|--------|
| Mismo dominio | ✅ Sí (gestión de workspace members) |
| Mismos permisos | ✅ Sí (owner_supervisor, supervisor_admin) |
| Mismo consumidor | ✅ Sí (dashboard de supervisión) |
| Misma criticidad | ✅ Sí (backoffice, no hot path) |
| Mismo deploy | ✅ Sí |

**Propuesta:**
- **Nueva función:** `supervision`
- **Acciones internas:**
  - `get_dashboard` → dashboard data
  - `invite_member` → invitar miembro
  - `member_action` → activar/desactivar/remover miembro
- **Request pattern:**
  ```json
  { "action": "get_dashboard", "workspace_id": "..." }
  { "action": "invite_member", "workspace_id": "...", "email": "..." }
  { "action": "member_action", "workspace_id": "...", "member_id": "...", "action": "remove" }
  ```

**Código existente:** Ya comparten:
- `resolveAuthUser()`
- `resolveSupervisorMembership()`
- `getCorsHeaders()`
- Mismo patrón de respuesta JSON

**Riesgo:** Bajo. Las 3 funciones ya tienen estructura similar.

**Beneficio:** 3 functions → 1 function (ahorro: 2 slots)

---

### 2. 🟢 ADMIN-TRIALS (Alta Prioridad - Listo para consolidar)

**Funciones actuales (4):**
- `admin-expire-workspace-trials`
- `admin-grant-workspace-trial`
- `admin-invite-workspace-member`
- `admin-issue-trial-offer`

**Análisis:**
| Criterio | Estado |
|----------|--------|
| Mismo dominio | ✅ Sí (trials/workspace onboarding) |
| Mismos permisos | ✅ Sí (admin-only) |
| Mismo consumidor | ✅ Sí (admin panel) |
| Misma criticidad | ✅ Sí (backoffice, bajo tráfico) |
| Mismo deploy | ✅ Sí |

**Propuesta:**
- **Nueva función:** `admin-trials`
- **Acciones internas:**
  - `grant_trial` → conceder trial
  - `issue_offer` → emitir oferta
  - `invite_member` → invitar miembro al workspace
  - `expire_trials` → expirar trials vencidos
- **Request pattern:**
  ```json
  { "action": "grant_trial", "workspace_id": "...", "days": 30 }
  { "action": "issue_offer", "workspace_id": "...", "plan_id": "..." }
  { "action": "invite_member", "workspace_id": "...", "email": "..." }
  { "action": "expire_trials" }  // cron job
  ```

**Código existente:** Probablemente comparten:
- Auth admin
- Tablas: `workspace_plan`, `plans`, `workspace_members`, `trials`

**Riesgo:** Bajo. Son funciones de backoffice con bajo tráfico.

**Beneficio:** 4 functions → 1 function (ahorro: 3 slots)

---

### 3. 🟡 SYSTEM-HEALTH (Media Prioridad - Requiere diseño cuidadoso)

**Funciones actuales (4):**
- `anchor-health` → anchors pending/confirmed/stalled
- `anchoring-health-check` → infra (RPC, calendars, database)
- `health` → executor_jobs monitoring
- `health-check` → crons de anchoring

**Análisis:**
| Criterio | Estado |
|----------|--------|
| Mismo dominio | ⚠️ Parcial (todas son health, pero subdominios distintos) |
| Mismos permisos | ⚠️ Parcial (algunas requieren service_role, otras no) |
| Mismo consumidor | ✅ Sí (admin dashboard, monitoring) |
| Misma criticidad | ✅ Sí (monitoring, no bloquean happy path) |
| Mismo deploy | ✅ Sí |

**Propuesta:**
- **Nueva función:** `system-health`
- **Acciones internas:**
  - `anchors` → pending, confirmed, stalled, workers_alive
  - `anchoring_infra` → RPC, calendars, database, mempool
  - `executor` → jobs queued, processing, stuck, dead
  - `cron` → cron status, recent_anchors
- **Request pattern:**
  ```json
  { "mode": "anchors" }
  { "mode": "anchoring_infra" }
  { "mode": "executor" }
  { "mode": "cron" }
  ```

**Código existente:** Todas comparten:
- CORS headers
- Patrón de health check
- Response structure similar

**Riesgo:** Medio. Requiere unificar permisos (service_role para todos los modos).

**Beneficio:** 4 functions → 1 function (ahorro: 3 slots)

**Nota:** Las 4 funciones NO son duplicadas. Cada una monitorea aspectos diferentes. Pero pueden vivir bajo un mismo router.

---

### 4. 🟡 NOTIFICATIONS (Media Prioridad - Requiere análisis de templates)

**Funciones actuales (3):**
- `notify-document-certified`
- `notify-document-signed`
- `notify-artifact-ready`

**Análisis:**
| Criterio | Estado |
|----------|--------|
| Mismo dominio | ✅ Sí (notificaciones) |
| Mismos permisos | ✅ Sí (service_role para enviar emails) |
| Mismo consumidor | ✅ Sí (event-triggered) |
| Misma criticidad | ✅ Sí (async, no bloquean) |
| Mismo deploy | ✅ Sí |

**Propuesta:**
- **Nueva función:** `notifications`
- **Acciones internas:**
  - `document_certified` → email de certificación
  - `document_signed` → email de firma recibida
  - `artifact_ready` → email de artifact disponible
- **Request pattern:**
  ```json
  { "type": "document_certified", "document_entity_id": "...", "owner_email": "..." }
  { "type": "document_signed", "document_entity_id": "...", "owner_email": "..." }
  { "type": "artifact_ready", "document_entity_id": "...", "owner_email": "..." }
  ```

**Código existente:** Probablemente comparten:
- Email templates
- `sendResendEmail()` o similar
- Patrón de carga de datos + envío

**Riesgo:** Medio. Hay que verificar que los templates no tengan lógica muy distinta.

**Beneficio:** 3 functions → 1 function (ahorro: 2 slots)

---

### 5. 🟡 EVIDENCE/ARTIFACT (Media Prioridad - Requiere análisis de código)

**Funciones actuales (4):**
- `get-eco`
- `get-eco-url`
- `verify-ecox`
- `verify-access`

**Análisis:**
| Criterio | Estado |
|----------|--------|
| Mismo dominio | ⚠️ Parcial (evidence access vs verification) |
| Mismos permisos | ⚠️ Parcial (algunas son públicas, otras requieren auth) |
| Mismo consumidor | ⚠️ Parcial (usuarios finales + verificadores) |
| Misma criticidad | ✅ Sí (lectura, no escritura) |
| Mismo deploy | ✅ Sí |

**Propuesta:**
- **Nueva función:** `evidence`
- **Acciones internas:**
  - `get_eco` → obtener archivo .eco
  - `get_eco_url` → obtener URL firmada
  - `verify_ecox` → verificar .ecox
  - `verify_access` → verificar acceso a evidencia
- **Request pattern:**
  ```json
  { "action": "get_eco", "document_entity_id": "..." }
  { "action": "get_eco_url", "document_entity_id": "..." }
  { "action": "verify_ecox", "ecox_data": "..." }
  { "action": "verify_access", "share_id": "..." }
  ```

**Riesgo:** Alto. Hay que verificar bien los permisos de cada una.

**Beneficio:** 4 functions → 1 function (ahorro: 3 slots)

**Recomendación:** Dejar para Fase 2. Primero consolidar las de menor riesgo.

---

### 6. 🟡 LOGGING (Baja Prioridad - No tocar si funciona bien)

**Funciones actuales (5):**
- `log-ecox-event`
- `log-event`
- `log-share-event`
- `log-workflow-event`
- `record-protection-event`

**Análisis:**
| Criterio | Estado |
|----------|--------|
| Mismo dominio | ⚠️ Parcial (todas son logging, pero tablas distintas) |
| Mismos permisos | ⚠️ Parcial (algunas requieren auth, otras no) |
| Mismo consumidor | ✅ Sí (frontend + backend) |
| Misma criticidad | ✅ Sí (async, no bloquean) |
| Mismo deploy | ✅ Sí |

**Propuesta:**
- **Nueva función:** `event-logger`
- **Acciones internas:**
  - `log_ecox` → eventos ECOX (geolocalización, forensic)
  - `log_legacy` → eventos legacy de documentos
  - `log_share` → eventos de sharing
  - `log_workflow` → eventos de workflow
  - `record_protection` → evento de protección inicial
- **Request pattern:**
  ```json
  { "type": "log_ecox", "workflow_id": "...", "event_type": "..." }
  { "type": "log_legacy", "document_entity_id": "...", "event_type": "..." }
  { "type": "log_share", "share_id": "...", "event_kind": "..." }
  { "type": "log_workflow", "workflow_id": "...", "event_type": "..." }
  { "type": "record_protection", "document_entity_id": "...", "details": {...} }
  ```

**Riesgo:** Alto. Tocar logging puede generar regresiones silenciosas.

**Beneficio:** 5 functions → 1 function (ahorro: 4 slots)

**Recomendación:** NO tocar en Fase 1. Dejar para Fase 3, cuando el resto esté estable.

---

## Funciones NO CONSOLIDABLES (Hot Path)

### 🔴 CORE DE FIRMA (No tocar)

**Funciones (11):**
- `apply-signer-signature`
- `start-signature-workflow`
- `confirm-signer-identity`
- `verify-signer-otp`
- `send-signer-otp`
- `reject-signature`
- `signer-access`
- `create-signer-link`
- `accept-workflow-nda`
- `accept-nda`
- `generate-signature-evidence`

**Razón:** Son el hot path de firma. Una regresión acá pega directo al valor del producto.

**Acción:** No consolidar. Dejar separadas por seguridad.

---

### 🔴 ANCHORING (No tocar)

**Funciones (6):**
- `anchor-polygon`
- `anchor-bitcoin`
- `run-tsa`
- `legal-timestamp`
- `process-polygon-anchors`
- `process-bitcoin-anchors`

**Razón:** Son críticas y con dependencias externas (RPC, calendars, TSA). Mejor separadas.

**Acción:** No consolidar. Dejar separadas por seguridad.

---

### 🔴 CUSTODY (No tocar)

**Funciones (4):**
- `create-custody-upload-url`
- `register-custody-upload`
- `store-encrypted-custody`
- `record-custody-key-rotation`

**Razón:** Manejo de cifrado y llaves. Requiere aislamiento.

**Acción:** No consolidar. Dejar separadas por seguridad.

---

## Plan de Implementación

### Fase 1: Consolidación Segura (Semana 1)

**Dominios:**
1. ✅ `supervision` (3 → 1)
2. ✅ `admin-trials` (4 → 1)

**Total Fase 1:** 7 functions → 2 functions (**ahorro: 5 slots**)

**Riesgo:** Bajo. Son backoffice, bajo tráfico.

---

### Fase 2: Consolidación Media (Semana 2)

**Dominios:**
1. 🟡 `system-health` (4 → 1)
2. 🟡 `notifications` (3 → 1)

**Total Fase 2:** 7 functions → 2 functions (**ahorro: 5 slots**)

**Riesgo:** Medio. Requiere testing cuidadoso.

---

### Fase 3: Consolidación Avanzada (Semana 3-4)

**Dominios:**
1. 🟡 `evidence` (4 → 1)
2. 🟡 `event-logger` (5 → 1) - opcional, solo si hay confianza

**Total Fase 3:** 9 functions → 2 functions (**ahorro: 7 slots**)

**Riesgo:** Alto. Requiere testing exhaustivo.

---

## Resumen de Ahorros

| Fase | Antes | Después | Ahorro | Acumulado |
|------|-------|---------|--------|-----------|
| **Fase 1** | 7 | 2 | 5 | 5 |
| **Fase 2** | 7 | 2 | 5 | 10 |
| **Fase 3** | 9 | 2 | 7 | 17 |

**Total potencial:** 99 functions → 82 functions (**ahorro: 17 slots**)

**Funciones no consolidables:** ~65 (hot path, anchoring, custody, etc.)

---

## Convención de Requests

Para todas las funciones consolidadas, usar este patrón:

```typescript
// Request
{
  "action": "nombre_accion",
  "workspace_id": "...",
  // ... otros campos específicos
}

// Response
{
  "ok": true,
  "data": { ... },
  "error": null
}
```

**Handlers internos:**
```
supervision/
  ├── handlers/
  │   ├── getDashboard.ts
  │   ├── inviteMember.ts
  │   └── memberAction.ts
  ├── index.ts (router principal)
  └── types.ts

admin-trials/
  ├── handlers/
  │   ├── grantTrial.ts
  │   ├── issueOffer.ts
  │   ├── inviteMember.ts
  │   └── expireTrials.ts
  ├── index.ts (router principal)
  └── types.ts
```

---

## Criterio de Éxito

### ✅ Fase 1 completada si:
- `supervision` funciona con las 3 acciones
- `admin-trials` funciona con las 4 acciones
- No hay regresiones en dashboard de supervisión
- No hay regresiones en admin de trials

### ✅ Fase 2 completada si:
- `system-health` devuelve los 4 modos
- `notifications` envía los 3 tipos de emails
- No hay regresiones en monitoring
- No hay regresiones en notificaciones

### ✅ Fase 3 completada si:
- `evidence` sirve los 4 tipos de requests
- `event-logger` registra los 5 tipos de eventos
- No hay regresiones en evidencia
- No hay regresiones en logging

---

## Rollback Plan

Para cada fase:

1. **Deploy de nueva función** (sin borrar las viejas)
2. **Actualizar cliente** para que llame a la nueva
3. **Monitorear** por 48-72 horas
4. **Si todo bien:** borrar funciones viejas remotas
5. **Si hay problema:** revertir cliente a funciones viejas, investigar

**Regla de oro:** Nunca borrar funciones viejas hasta que la nueva esté estable por 48-72 horas.

---

## Próximos Pasos

### Inmediato (Fase 1):
1. [ ] Crear `supervision` con 3 handlers internos
2. [ ] Crear `admin-trials` con 4 handlers internos
3. [ ] Actualizar cliente para llamar a nuevas funciones
4. [ ] Deploy y monitoreo (48-72 horas)
5. [ ] Borrar funciones viejas remotas

### Semana 2 (Fase 2):
1. [ ] Crear `system-health` con 4 modos
2. [ ] Crear `notifications` con 3 tipos
3. [ ] Deploy y monitoreo
4. [ ] Borrar funciones viejas remotas

### Semana 3-4 (Fase 3):
1. [ ] Evaluar si vale la pena `evidence` y `event-logger`
2. [ ] Si sí, crear con testing exhaustivo
3. [ ] Deploy y monitoreo
4. [ ] Borrar funciones viejas remotas

---

**FIN DEL PLAN**
