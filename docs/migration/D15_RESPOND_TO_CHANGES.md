# D15 - Responder solicitud de cambios (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 2 - Workflow (mutacion fuerte, alto impacto)

---

## Que decide

**Decision:** "¿Puede el owner aceptar o rechazar una solicitud de cambios?"

**Contexto:**
Cuando un signer solicita cambios (D14), el owner debe decidir si acepta o
rechaza. Esta decision genera nuevas versiones o reactiva el flujo original.

```
API/Edge: respond-to-changes
         ↓
     [D15: Respond?] → (accept) create_workflow_version + reinicio
                     → (reject) reactivar signer para firma
```

**Responsabilidad actual:** Edge Function `supabase/functions/respond-to-changes`.

---

## Inputs

### Datos requeridos (request):
- **workflowId**
- **signerId** (quien solicito cambios)
- **action**: `accept | reject`

### Datos opcionales:
- **newDocumentUrl** (si action = accept)
- **newDocumentHash** (si action = accept)
- **modificationNotes**

### Contexto adicional (queries):
- **Workflow**: `signature_workflows` (owner_id, status, current_version)
- **Signer**: `workflow_signers` (change_request_status, status, email, signing_order)

---

## Output

### Resultado (si decision es TRUE, action = reject):
1) **Actualizar signer solicitante**
```sql
UPDATE workflow_signers
SET change_request_status = 'rejected',
    status = 'ready_to_sign'
WHERE id = :signer_id;
```

2) **Registrar eventos**
- `document.change_resolved` (decision = rejected)
- `signer.ready_to_sign`

3) **Workflow activo**
```sql
UPDATE signature_workflows SET status = 'active' WHERE id = :workflow_id;
```

### Resultado (si decision es TRUE, action = accept):
1) **Crear nueva version**
```sql
SELECT create_workflow_version(...);
```

2) **Evento de version creada**
- `workflow.version_created`

3) **Actualizar signer solicitante**
```sql
UPDATE workflow_signers
SET change_request_status = 'accepted',
    status = 'invited'
WHERE id = :signer_id;
```

4) **Registrar eventos**
- `document.change_resolved` (decision = accepted)
- `signer.invited`

5) **Reiniciar flujo**
- `advance_workflow` RPC
- primer signer vuelve a `ready_to_sign` + evento `signer.ready_to_sign`

---

## Invariantes

1) **Actor autorizado**
- Solo `workflow.owner_id` puede responder.

2) **Workflow activo**
- `workflow.status = 'active'`.

3) **Signer con solicitud pendiente**
- `signer.change_request_status = 'pending'`.

4) **Action valida**
- Solo `accept` o `reject`.

5) **Si action = accept**
- `newDocumentUrl` y `newDocumentHash` obligatorios.

6) **Consistencia**
- El signer debe pertenecer al workflow indicado.

---

## Que NO decide

- No crea la solicitud (eso es D14).
- No valida firmantes previos (solo reinicia flujo).
- No verifica OTP.
- No gestiona notificaciones (solo encola legacy).

---

## Regla canonica (formal)

```typescript
export interface RespondToChangesInput {
  actor_id: string | null;
  payload: {
    workflowId?: string;
    signerId?: string;
    action?: 'accept' | 'reject';
    newDocumentUrl?: string;
    newDocumentHash?: string;
  };
  workflow: {
    id: string;
    owner_id: string;
    status: string;
  } | null;
  signer: {
    id: string;
    workflow_id: string;
    change_request_status: string | null;
  } | null;
}

export const shouldRespondToChanges = (input: RespondToChangesInput): boolean => {
  if (!input.actor_id) return false;

  const p = input.payload || {};
  if (!p.workflowId || !p.signerId || !p.action) return false;
  if (!['accept', 'reject'].includes(p.action)) return false;

  if (!input.workflow || !input.signer) return false;

  if (input.workflow.owner_id !== input.actor_id) return false;
  if (input.workflow.status !== 'active') return false;
  if (input.signer.change_request_status !== 'pending') return false;
  if (input.signer.workflow_id !== input.workflow.id) return false;

  if (p.action === 'accept' && (!p.newDocumentUrl || !p.newDocumentHash)) return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path reject
```typescript
Input: actor = owner, signer pending, workflow active, action = reject
Output: true
```

**Test 2:** Happy path accept
```typescript
Input: actor = owner, signer pending, workflow active, action = accept + newDocument*
Output: true
```

**Test 3:** Actor no owner
```typescript
Input: actor != owner
Output: false
```

**Test 4:** Workflow no active
```typescript
Input: workflow.status = 'completed'
Output: false
```

**Test 5:** Signer sin request
```typescript
Input: change_request_status != 'pending'
Output: false
```

**Test 6:** action invalida
```typescript
Input: action = 'approve'
Output: false
```

**Test 7:** accept sin newDocumentUrl/Hash
```typescript
Input: action = 'accept', newDocumentUrl missing
Output: false
```
