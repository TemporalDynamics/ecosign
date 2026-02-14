# PRE-CANARY CONTRACTS

Estado: `ACTIVE`
Alcance: flujos de firma, witness canónico, share OTP, consistencia UI/API.

## 1) EPI Witness Contract

### 1.1 Invariante canónico
- `document_entities.witness_current_storage_path` **solo** puede apuntar a un artefacto inmutable: `signed/...`.
- `document_entities.witness_current_hash` debe corresponder al hash del artefacto `signed/...` vigente.

### 1.2 Política de fallo (fail hard)
- Si falla la subida de `signed/{workflow_id}/{signer_id}/{hash}.pdf`:
1. NO actualizar `witness_current_*`.
2. NO emitir `workflow.completed`.
3. Responder error estructurado `EPI_IMMUTABLE_UPLOAD_FAILED` con `retryable=true`.

### 1.3 Idempotencia obligatoria
- La firma es única por `(workflow_id, signer_id)`.
- Si ya existe `signer.signed` para esa dupla:
1. Devolver `success=true` + `idempotent=true`.
2. NO regenerar witness.
3. NO duplicar eventos.

## 2) Workflow Terminality Contract (Modelo CLOSED)

### 2.1 Estados terminales
- `completed`, `cancelled`, `rejected`, `expired` son terminales.
- Un workflow terminal NO se reabre.

### 2.2 Reintentos / nuevas firmas
- “Agregar firmantes” o “reintentar” se modela como **nuevo** `workflow_id`.
- `document_entity` puede mantenerse (misma entidad), pero cada workflow tiene su propio cierre y evidencia.

## 3) Share OTP Contract (Entity-First)

### 3.1 Fuente de verdad
- Share OTP se resuelve desde `document_entities` (canónico), no desde `user_documents` como primario.
- Artefacto compartible por defecto: `witness_current_storage_path` (witness vigente).

### 3.2 Regla de alcance
- Share OTP comparte witness vigente (y ECO opcional si aplica).
- Share OTP NO comparte el original por defecto.

### 3.3 Resolver server-side único
- Input mínimo: `document_entity_id`.
- Output mínimo:
1. `witness_storage_path`
2. `witness_hash`
3. `encryption_context` (si aplica)
4. `public_status`

## 4) Error Contract (Backend -> Frontend)

### 4.1 Payload estándar
```json
{
  "success": false,
  "error_code": "STRING_MACHINE_STABLE",
  "message": "Mensaje humano",
  "workflow_status": "active|completed|cancelled|rejected|expired",
  "retryable": true
}
```

### 4.2 Reglas de consumo
- Frontend mapea por `error_code` (nunca por parseo de strings libres).
- `workflow_status` es obligatorio cuando aplica al signer flow.

### 4.3 Códigos mínimos obligatorios
- Firma:
1. `EPI_IMMUTABLE_UPLOAD_FAILED`
2. `SIGNER_ALREADY_SIGNED`
3. `FLOW_NOT_ACTIVE`
4. `SIGNER_NOT_AUTHORIZED`
- Share:
1. `SHARE_SOURCE_UNAVAILABLE_CANONICAL`
2. `SHARE_ENCRYPTION_CONTEXT_MISSING`
3. `SHARE_TOKEN_EXPIRED`
4. `SHARE_TOKEN_INVALID`
- OTP:
1. `OTP_INVALID`
2. `OTP_EXPIRED`
3. `OTP_TOO_MANY_ATTEMPTS`

## 5) Definition of Done (Pre-Canary)

### Fase 1 — EPI Invariante
- `witness_current_storage_path` siempre apunta a `signed/...`.
- No existe `workflow.completed` si falla immutable upload.

### Fase 2 — Mi Firma Consistencia
- Preview/Download/Share usan exactamente el mismo `witness_current_storage_path`.
- Mi Firma y flujo normal producen artefacto `signed/...` con la misma estructura.

### Fase 3 — Share Canónico
- Share resuelve desde `document_entities` como fuente primaria.
- Share funciona en protegido / workflow firmado / mi firma.

### Fase 4 — Network Limpio
- `DocumentsPage` no genera requests en loop en idle.
- Solo una subscription realtime activa por usuario.

### Fase 5 — Backend↔UI Estructurado
- Frontend no parsea strings libres.
- Respuestas de signer/share/otp usan `error_code` estructurado.

## 6) SQL Verification Checks

### Fase 1
```sql
-- witness_current debe apuntar a signed/
select id, witness_current_storage_path
from document_entities
where witness_current_storage_path is not null
  and witness_current_storage_path not like 'signed/%';
```
Esperado: `0 rows`.

```sql
-- workflow.completed sin witness inmutable
select we.workflow_id
from workflow_events we
join document_entities de on de.id = we.document_entity_id
where we.event_type = 'workflow.completed'
  and (de.witness_current_storage_path is null
       or de.witness_current_storage_path not like 'signed/%');
```
Esperado: `0 rows`.

### Fase 2
```sql
-- workflows 1/1 completos
select workflow_id, total_signers, signed_signers
from workflow_stats
where total_signers = 1
  and signed_signers = 1;
```
Esperado: revisar muestra y validar cada `document_entity` con path `signed/...`.

### Fase 3
```sql
-- shares sin entidad canónica (si se agrega columna document_entity_id en document_shares)
select id
from document_shares
where document_entity_id is null;
```
Esperado: `0 rows`.

## 7) Go/No-Go Canary

Go si y solo si:
1. No hay violaciones de invariante EPI (`0 rows` en checks críticos).
2. Mi Firma y flujo normal convergen al mismo modelo canónico.
3. Share OTP opera con resolver canónico entity-first.
4. No hay loop de red en idle.
5. Frontend consume exclusivamente `error_code`.

No-Go si cualquiera de los puntos anteriores falla.
