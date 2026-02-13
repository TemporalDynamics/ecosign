# Pre-Canary Matrix (Fase 1 Freeze)

Objetivo: validar coherencia semántica antes de Canary.

## Reglas de aceptación global
- Un workflow tiene un solo estado público dominante (`get_workflow_public_status`).
- `signer.rejected` y `workflow_signers.status='rejected'` deben coincidir.
- No puede existir más de un `workflow.completed` por workflow.
- Si `workflow.status != active`, no se permite acceso/firma de signers.

## Escenario 1: Firma simple 1/1
1. Crear workflow con 1 firmante.
2. Firmar el documento.

Esperado:
- `workflow_signers.status='signed'`.
- `signature_workflows.status='completed'`.
- Un solo `workflow.completed`.
- UI: `Firmado` (gris).

## Escenario 2: Firma secuencial 2/2
1. Crear workflow con 2 firmantes secuenciales.
2. Firmante 1 firma.
3. Firmante 2 firma.

Esperado:
- Tras firmante 1: `Firmando 1/2` (verde).
- Tras firmante 2: `signature_workflows.status='completed'`.
- No queda `active` colgado.
- `completed_at` seteado.

## Escenario 3: Rechazo pre-identity
1. Abrir link de firma.
2. Rechazar en `pre_identity`.

Esperado:
- Evento `signer.rejected`.
- `workflow_signers.status='rejected'`.
- UI: `Rechazado` (gris).
- No se puede continuar firma.

## Escenario 4: Rechazo post-OTP / post-view
1. Completar identidad y OTP.
2. Rechazar en `post_identity` o `post_view`.

Esperado:
- Mismos invariantes del escenario 3.
- `rejection_phase` correcto.

## Escenario 5: Owner cancela con 1/2 firmado
1. Firmante 1 firma.
2. Owner cancela workflow.

Esperado:
- `signature_workflows.status='cancelled'`.
- Firmante 2 no puede acceder/firmar (403).
- Evidencia previa del firmante 1 se mantiene.
- UI: `Cancelado` (gris).

## Escenario 6: Intento de firmar tras cancelación
1. Intentar `apply-signer-signature` con token válido de firmante pendiente.

Esperado:
- HTTP 403.
- Mensaje de flujo no activo.
- Sin cambios de estado/eventos de firma.

## Escenario 7: Reissue token tras rejected
1. Rechazar signer.
2. Owner intenta `reissue-signer-token`.

Esperado:
- Bloqueo por estado terminal.
- Sin token nuevo.

## Escenario 8: Share OTP documento completado
1. Abrir modal compartir en documento completado.
2. Generar share OTP.
3. Abrir link y verificar OTP.

Esperado:
- Share OTP solo PDF (sin opción ECO en modal).
- `share.created` y `otp.verified` registrados (best-effort).

## Queries rápidas de verificación
```sql
-- A) Unicidad workflow.completed
select workflow_id, count(*) as total
from workflow_events
where event_type = 'workflow.completed'
group by workflow_id
having count(*) > 1;
```

```sql
-- B) Drift rechazo evento vs estado
select we.workflow_id, we.signer_id, ws.status, we.created_at
from workflow_events we
join workflow_signers ws on ws.id = we.signer_id
where we.event_type = 'signer.rejected'
  and ws.status <> 'rejected';
```

```sql
-- C) Workflows en completed sin completed_at
select id, status, completed_at, updated_at
from signature_workflows
where status = 'completed'
  and completed_at is null;
```

```sql
-- D) Signers listos para firmar en workflows no activos (debe ser vacío)
select ws.id, ws.workflow_id, ws.status, sw.status as workflow_status
from workflow_signers ws
join signature_workflows sw on sw.id = ws.workflow_id
where ws.status = 'ready_to_sign'
  and sw.status <> 'active';
```
