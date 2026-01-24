# D14 - Solicitar cambios en documento (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 2 - Workflow (mutaciones fuertes, alto impacto)

---

## Que decide

**Decision:** "¿Se debe aceptar una solicitud de cambios del signer?"

**Contexto:**
Cuando un signer solicita modificaciones al documento, el sistema decide si
puede registrar la solicitud y bloquear el flujo para revision del owner.

```
API/Edge: request-document-changes
         ↓
     [D14: Request?] → workflow_signers UPDATE (change_request_*)
                       signature_workflows UPDATE (status='active')
                       workflow_events INSERT (document.change_requested)
```

**Responsabilidad actual:** Edge Function `supabase/functions/request-document-changes`.

---

## Inputs

### Datos requeridos (request):
- **accessToken** (raw)
- **annotations[]** (al menos 1)

### Datos opcionales:
- **generalNotes**

### Contexto adicional (queries):
- **Signer**: `workflow_signers` (status, signing_order, access_token_hash)
- **Workflow**: `signature_workflows` (owner_id, current_version)

---

## Output

### Resultado (si decision es TRUE):

1) **Actualizar signer**
```sql
UPDATE workflow_signers
SET status = 'accessed',
    change_request_data = { annotations, generalNotes, requestedAt },
    change_request_at = NOW(),
    change_request_status = 'pending',
    updated_at = NOW()
WHERE id = :signer_id;
```

2) **Mantener workflow activo (bloqueo logico)**
```sql
UPDATE signature_workflows
SET status = 'active',
    updated_at = NOW()
WHERE id = :workflow_id;
```
**Nota:** El bloqueo es logico: ningun signer puede firmar mientras exista
`change_request_status = 'pending'`.

3) **Registrar evento canonico**
```sql
INSERT INTO workflow_events (
  workflow_id,
  signer_id,
  event_type, -- 'document.change_requested'
  payload
)
```

---

## Invariantes

1) **Token valido**
- `accessToken` debe existir y mapear a signer activo.

2) **Turno correcto**
- `signer.status` debe ser `ready_to_sign`.

3) **Annotations obligatorias**
- `annotations.length >= 1`.

4) **Solicitud unica por estado**
- Solo se permite si `change_request_status` no esta ya `pending` (idempotencia).

5) **Workflow existente**
- Debe existir y estar en estado no terminal.

---

## Que NO decide

- No aprueba ni rechaza cambios (eso es D15).
- No genera una nueva version del documento.
- No reinicia el flujo de firmas.
- No valida identidad u OTP.
- No envia emails (solo encola notificaciones legacy).

---

## Regla canonica (formal)

```typescript
export interface RequestDocumentChangesInput {
  signer: {
    id: string;
    status: string;
    change_request_status?: string | null;
  } | null;
  workflow: {
    status: string;
  } | null;
  payload: {
    accessToken?: string;
    annotations?: Array<unknown>;
  };
}

export const shouldRequestDocumentChanges = (input: RequestDocumentChangesInput): boolean => {
  const p = input.payload || {};
  if (!p.accessToken) return false;
  if (!p.annotations || p.annotations.length === 0) return false;

  if (!input.signer) return false;
  if (!input.workflow) return false;

  if (input.signer.status !== 'ready_to_sign') return false;

  const terminalWorkflow = ['completed', 'cancelled', 'archived', 'expired'];
  if (terminalWorkflow.includes(input.workflow.status)) return false;

  if (input.signer.change_request_status === 'pending') return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path
```typescript
Input: accessToken valido, signer ready_to_sign, annotations >= 1
Output: true
```

**Test 2:** Token vacio
```typescript
Input: accessToken = ''
Output: false
```

**Test 3:** Sin annotations
```typescript
Input: annotations = []
Output: false
```

**Test 4:** Signer no en turno
```typescript
Input: signer.status = 'invited'
Output: false
```

**Test 5:** Workflow terminal
```typescript
Input: workflow.status = 'completed'
Output: false
```

**Test 6:** Solicitud ya pendiente
```typescript
Input: change_request_status = 'pending'
Output: false
```

**Test 7:** Signer inexistente
```typescript
Input: signer = null
Output: false
```

**Test 8:** Workflow inexistente
```typescript
Input: workflow = null
Output: false
```
