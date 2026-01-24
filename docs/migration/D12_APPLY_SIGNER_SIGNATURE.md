# D12 - Aplicar firma de signer (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 2 - Workflow (mutacion fuerte, alto impacto)

---

## Que decide

**Decision:** "¿Se debe aplicar la firma de un signer a un workflow?"

**Contexto:**
Cuando un signer confirma su firma, el sistema debe decidir si esa firma
puede aplicarse (por token/OTP/estado) y, si es valida, registrar el evento
canonico y actualizar estados.

```
API/Edge: apply-signer-signature
         ↓
     [D12: Apply?] → workflow_events INSERT (signer.signed)
                     workflow_signers UPDATE (status='signed')
                     signature_workflows UPDATE (status=partially_signed|completed)
```

**Responsabilidad actual:** Edge Function `supabase/functions/apply-signer-signature`.

---

## Inputs

### Datos requeridos (request):
- **signerId** o **accessToken** (uno de los dos)
- **workflowId** (si viene signerId)
- **signatureData** (payload libre)

### Contexto adicional (queries):
- **Signer**: `workflow_signers` (id, workflow_id, status, token_expires_at, token_revoked_at)
- **OTP**: `signer_otps.verified_at`
- **Workflow**: `signature_workflows.document_entity_id`
- **Batches**: `batches` por document_entity_id + signer

---

## Output

### Resultado (si decision es TRUE):

1) **Registrar evento canonico**
```sql
INSERT INTO workflow_events (
  workflow_id,
  signer_id,
  event_type, -- 'signer.signed'
  payload
) VALUES (...);
```

2) **Actualizar signer**
```sql
UPDATE workflow_signers
SET status = 'signed',
    signed_at = NOW(),
    signature_data = :signatureData
WHERE id = :signer_id;
```

3) **Actualizar workflow (estado agregado)**
```sql
UPDATE signature_workflows
SET status = CASE
  WHEN no quedan signers pendientes THEN 'completed'
  ELSE 'partially_signed'
END
WHERE id = :workflow_id;
```

4) **Aplicar firma a batches** (si existen)
```text
Por cada batch asignado al signer:
  captureAndApplySignature(...)
```

---

## Invariantes

1) **Autenticacion por token o signerId**
- Debe venir `signerId` o `accessToken`.
- Si viene `signerId`, debe venir `workflowId` y matchear con el signer.

2) **OTP verificado**
- `signer_otps.verified_at` debe existir.

3) **Token valido**
- `token_revoked_at` debe ser NULL.
- `token_expires_at` debe ser mayor a `now()`.

4) **Signer no terminal**
- `status NOT IN ('signed', 'cancelled', 'expired')`.

5) **Workflow existente**
- Debe existir el workflow para resolver `document_entity_id`.

6) **Batches**
- Si no hay batches asignados, la firma aun se aplica (compatibilidad legacy).

7) **Turno de firma**
- Solo puede firmar el signer cuyo `status = 'ready_to_sign'`.

---

## Que NO decide

- No inicia workflows (eso es D13).
- No notifica (eso es D6/D7/D8).
- No valida identidad fuera del OTP.
- No valida acceso por share link.
- No previene doble insercion del evento `signer.signed`.
- No cambia delivery_mode ni signers.

---

## Regla canonica (formal)

```typescript
export interface ApplySignerSignatureInput {
  signer: {
    id: string;
    workflow_id: string;
    status: string;
    token_expires_at: string | null;
    token_revoked_at: string | null;
    otp_verified: boolean;
  } | null;
  workflow: {
    id: string;
    document_entity_id: string | null;
  } | null;
  payload: {
    signerId?: string;
    accessToken?: string;
    workflowId?: string;
  };
}

export const shouldApplySignerSignature = (input: ApplySignerSignatureInput): boolean => {
  const p = input.payload || {};
  if (!p.signerId && !p.accessToken) return false;
  if (p.signerId && !p.workflowId) return false;

  if (!input.signer) return false;
  if (!input.workflow) return false;

  if (p.workflowId && input.signer.workflow_id !== p.workflowId) return false;

  const terminal = ['signed', 'cancelled', 'expired'];
  if (terminal.includes(input.signer.status)) return false;

  if (input.signer.status !== 'ready_to_sign') return false;

  if (!input.signer.otp_verified) return false;

  if (input.signer.token_revoked_at) return false;
  if (input.signer.token_expires_at && new Date(input.signer.token_expires_at) < new Date()) return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path con signerId
```typescript
Input: signerId + workflowId, signer activo, otp_verified = true
Output: true
```

**Test 2:** Happy path con accessToken
```typescript
Input: accessToken, signer activo, otp_verified = true
Output: true
```

**Test 3:** Falta signerId y accessToken
```typescript
Input: {}
Output: false
```

**Test 4:** workflowId no coincide con signer
```typescript
Input: signerId + workflowId distinto
Output: false
```

**Test 5:** Token revocado
```typescript
Input: token_revoked_at != null
Output: false
```

**Test 6:** Token expirado
```typescript
Input: token_expires_at en el pasado
Output: false
```

**Test 7:** OTP no verificado
```typescript
Input: otp_verified = false
Output: false
```

**Test 8:** Signer terminal
```typescript
Input: status = 'signed'
Output: false
```

**Nota:** Esta decision NO bloquea por `workflow.status`. Se prioriza compatibilidad legacy;
los estados terminales se controlan en D9/D10.
