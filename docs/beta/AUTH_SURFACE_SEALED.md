# Auth Surface Sealed (Milestone)

Fecha de cierre: 2026-02-27

## Objetivo

Formalizar la superficie de autenticación y autorización del sistema, definiendo
contratos explícitos para cada categoría de endpoint y previniendo regresión
mediante guards automáticos.

## Categorías de Autenticación

El sistema opera con 5 categorías de autenticación, cada una con contrato explícito:

### 1. Usuario Logueado (auth.getUser)

**Descripción**: Endpoints que requieren usuario autenticado via JWT de Supabase.

**Patrón**: `supabase.auth.getUser()` desde `Authorization: Bearer <token>`

**Endpoints**:
- `accept-nda` — Aceptación de NDA por recipient
- `accept-share-nda` — Aceptación de NDA por share
- `cancel-workflow` — Cancelar workflow (owner)
- `create-custody-upload-url` — Generar URL de custodia
- `create-invite` — Crear invite (owner del documento)
- `create-signer-link` — Crear link de firma (owner)
- `generate-link` — Generar link de share (owner)
- `get-signed-url` — Obtener URL firmado de storage
- `load-draft` — Cargar draft (owner)
- `log-event` — Loguear evento (owner)
- `log-share-event` — Loguear evento de share
- `presential-verification-start-session` — Iniciar sesión presencial
- `presential-verification-confirm-presence` — Confirmar presencia
- `presential-verification-close-session` — Cerrar sesión presencial
- `record-protection-event` — Registrar evento de protección
- `register-custody-upload` — Registrar upload de custodia
- `respond-to-changes` — Responder a cambios (owner)
- `reissue-signer-token` — Reemitir token de firmante
- `resume-signer-link` — Resumir link de firma
- `save-draft` — Guardar draft (owner)
- `start-signature-workflow` — Iniciar workflow de firma (owner)
- `store-encrypted-custody` — Almacenar custodia encriptada
- `verify-access` — Verificar acceso a link
- `verify-invite-access` — Verificar acceso a invite
- `workflow-fields` — Obtener campos de workflow

**Invariante**: Todos deben validar `Authorization` header y obtener `user` válido.

---

### 2. Firmante Externo (validateSignerAccessToken)

**Descripción**: Endpoints para firmantes externos con token de acceso específico.

**Patrón**: `validateSignerAccessToken()` desde `workflow_signers` table.

**Endpoints**:
- `accept-workflow-nda` — Aceptar NDA de workflow
- `apply-signer-signature` — Aplicar firma del firmante
- `confirm-signer-identity` — Confirmar identidad del firmante
- `log-workflow-event` — Loguear evento de workflow
- `reject-signature` — Rechazar firma
- `send-signer-otp` — Enviar OTP al firmante
- `verify-signer-otp` — Verificar OTP del firmante

**Invariante**: Todos deben validar `signerId` + `accessToken` contra `workflow_signers`.

---

### 3. Cron Interno (requireCronSecret)

**Descripción**: Jobs programados via CRON con secret interno.

**Patrón**: `requireCronSecret()` desde `x-cron-secret` header.

**Endpoints**:
- `notify-artifact-ready` — Notificar artifact ready (cron)
- `notify-document-signed` — Notificar documento firmado (cron)
- `process-bitcoin-anchors` — Procesar anclas Bitcoin (cron)
- `process-polygon-anchors` — Procesar anclas Polygon (cron)
- `send-pending-emails` — Enviar emails pendientes (cron)

**Invariante**: Todos deben validar `x-cron-secret` o `x-internal-secret` header.

---

### 4. Webhook Externo (signature validation)

**Descripción**: Webhooks de servicios externos con validación de firma.

**Patrón**: Validación de firma específica del proveedor.

**Endpoints**:
- `signnow-webhook` — Webhook de SignNow

**Invariante**: Debe validar firma del webhook de SignNow.

---

### 5. Público sin Auth

**Descripción**: Endpoints accesibles sin autenticación.

**Endpoints**:
- `anchor-health` — Health check de anchoring
- `anchoring-health-check` — Health check general
- `auto-tsa` — TSA automático (trigger externo)
- `build-artifact` — Construir artifact (trigger interno)
- `build-final-artifact` — Construir artifact final
- `dead-jobs` — Listar jobs muertos (interno)
- `feature-flags-status` — Estado de feature flags
- `generate-signature-evidence` — Generar evidencia de firma
- `get-eco-url` — Obtener URL de ECO
- `get-share-metadata` — Obtener metadata de share
- `health` — Health check básico
- `health-check` — Health check general
- `legal-timestamp` — Timestamp legal (TSA)
- `log-ecox-event` — Loguear evento ECOX
- `monitoring-dashboard` — Dashboard de monitoreo
- `new-document-canonical-trigger` — Trigger de nuevo documento
- `orchestrator` — Orquestador interno
- `record-signer-receipt` — Registrar receipt de firmante
- `repair-missing-anchor-events` — Reparar eventos de anchor
- `run-tsa` — Ejecutar TSA
- `set-feature-flag` — Setear feature flag (interno)
- `signer-access` — Acceso de firmante (SignNow externo)
- `signnow` — Integración SignNow
- `stamp-pdf` — Sellado de PDF
- `store-signer-signature` — Almacenar firma de firmante
- `submit-anchor-bitcoin` — Submit anchor Bitcoin (interno)
- `submit-anchor-polygon` — Submit anchor Polygon (interno)
- `test-email` — Test de email (dev)
- `test-insert-notification` — Test de notificación (dev)
- `verify-ecox` — Verificar ECOX
- `verify-share-otp` — Verificar OTP de share
- `verify-workflow-hash` — Verificar hash de workflow
- `wake-authority` — Wake authority (trigger)

**Invariante**: Pueden operar sin auth, pero algunos tienen validación interna.

---

## Configuración verify_jwt

### Estado actual

En `supabase/config.toml`:
- La mayoría de las functions tienen `verify_jwt = true`
- Algunas exceptions específicas tienen `verify_jwt = false`

### Regla contractual

1. **Functions de Usuario Logueado**: `verify_jwt = true` (obligatorio)
2. **Functions de Firmante Externo**: `verify_jwt = false` (usan validación custom)
3. **Functions Cron**: `verify_jwt = false` (usan cron_secret)
4. **Webhooks Externos**: `verify_jwt = false` (validan firma del proveedor)
5. **Públicas sin Auth**: `verify_jwt = false` (no requieren validación)

### Justificación de excepciones

Las functions con `verify_jwt = false` deben tener:
- Validación explícita alternativa documentada
- Guard que verifique la validación alternativa
- Justificación en este documento

---

## Invariantes de Cierre

1. **Toda function pública tiene validación explícita**
   - Usuario logueado: `auth.getUser()`
   - Firmante externo: `validateSignerAccessToken()`
   - Cron interno: `requireCronSecret()`
   - Webhook externo: validación de firma
   - Público: documentado como tal

2. **No hay validación "opcional" o "comentada"**
   - Toda validación está activa y verificada
   - No hay código muerto de auth

3. **verify_jwt está documentado por función**
   - Cada función tiene justificación para su config
   - El release ritual verifica consistencia

4. **Guards automáticos previenen regresión**
   - Test verifica presencia de validación
   - Test verifica consistencia de verify_jwt
   - Release ritual exige guards en verde

---

## Evidencia de Cierre

1. **Documento contractual**: `docs/beta/AUTH_SURFACE_SEALED.md`
2. **Guard automático**: `tests/authority/auth_surface_sealed_guard.test.ts`
3. **Matriz de auth**: Sección "Categorías de Autenticación" arriba
4. **Config verify_jwt**: `supabase/config.toml` consistente con matriz

---

## Criterio de Aceptación

El milestone se considera sellado si:

1. ✅ El guard del milestone está en verde
2. ✅ El guard está integrado en `prebeta_fire_drill.sh`
3. ✅ Toda función pública tiene validación documentada
4. ✅ `verify_jwt` config es consistente con la matriz de auth
5. ✅ No hay validaciones "opcionales" o "comentadas"

---

## Fuera de Alcance

1. SLA comercial de autenticación (tiempos de respuesta)
2. UX de flujos de login/recuperación
3. Optimización de caching de tokens
4. Integración con proveedores OAuth externos

---

## Histórico de Cambios

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-02-27 | v1.0 | Cierre inicial de Auth Surface |
