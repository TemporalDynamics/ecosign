# D17 - Aceptar NDA en workflow de firmas (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 3 - NDA / consentimiento (bajo riesgo, alta trazabilidad)

---

## Que decide

**Decision:** "¿Se debe registrar la aceptacion de NDA de un signer en un workflow?"

**Contexto:**
Cuando un signer acepta el NDA dentro de un flujo de firmas, el sistema decide
si puede marcar al signer como `nda_accepted`.

```
API/Edge: accept-workflow-nda
         ↓
     [D17: Accept?] → workflow_signers UPDATE (nda_accepted=true)
```

**Responsabilidad actual:** Edge Function `supabase/functions/accept-workflow-nda`.

---

## Inputs

### Datos requeridos (request):
- **signer_id**
- **signer_email**

### Contexto adicional (queries):
- **Signer**: `workflow_signers` (id, email, nda_accepted)

---

## Output

### Resultado (si decision es TRUE):

1) **Actualizar signer**
```sql
UPDATE workflow_signers
SET nda_accepted = true,
    nda_accepted_at = NOW()
WHERE id = :signer_id;
```

---

## Invariantes

1) **Signer valido**
- `signer_id` debe existir.

2) **Email coincide**
- `signer.email` debe coincidir con `signer_email` (case-insensitive).

3) **Idempotencia**
- Si `nda_accepted` ya es true, no se actualiza nuevamente.

---

## Que NO decide

- No valida OTP ni acceso a documento.
- No actualiza workflow ni eventos canonicos.
- No valida orden de firma ni estado del workflow.

---

## Regla canonica (formal)

```typescript
export interface AcceptWorkflowNdaInput {
  signer: {
    id: string;
    email: string;
    nda_accepted: boolean;
  } | null;
  payload: {
    signer_id?: string;
    signer_email?: string;
  };
}

export const shouldAcceptWorkflowNda = (input: AcceptWorkflowNdaInput): boolean => {
  const p = input.payload || {};
  if (!p.signer_id || !p.signer_email) return false;

  if (!input.signer) return false;

  if (input.signer.email.toLowerCase() !== p.signer_email.toLowerCase()) return false;

  if (input.signer.nda_accepted) return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path
```typescript
Input: signer_id valido, email coincide, nda_accepted = false
Output: true
```

**Test 2:** Email mismatch
```typescript
Input: signer_email != signer.email
Output: false
```

**Test 3:** Signer inexistente
```typescript
Input: signer = null
Output: false
```

**Test 4:** NDA ya aceptado
```typescript
Input: nda_accepted = true
Output: false
```

