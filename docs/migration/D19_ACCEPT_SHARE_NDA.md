# D19 - Aceptar NDA de share (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 3 - NDA / consentimiento (bajo riesgo, alta trazabilidad)

---

## Que decide

**Decision:** "¿Se debe registrar la aceptacion de NDA para un document_share?"

**Contexto:**
Cuando un receptor accede por link compartido, el sistema decide si puede
registrar la aceptacion de NDA y, si corresponde, emitir evento canonico.

```
API/Edge: accept-share-nda
         ↓
     [D19: Accept?] → document_shares UPDATE (nda_accepted_at, metadata)
                      document_entities.events APPEND (nda_accepted) [best-effort]
```

**Responsabilidad actual:** Edge Function `supabase/functions/accept-share-nda`.

---

## Inputs

### Datos requeridos (request):
- **share_id**
- **signer_email**

### Datos opcionales:
- **signer_name**
- **browser_fingerprint**

### Contexto adicional (queries):
- **Share**: `document_shares` (id, document_id, recipient_email, nda_text, nda_enabled, nda_accepted_at)
- **Document Entity**: `document_entities` (id) via `document_id`

---

## Output

### Resultado (si decision es TRUE):

1) **Actualizar share**
```sql
UPDATE document_shares
SET nda_accepted_at = NOW(),
    nda_acceptance_metadata = :metadata
WHERE id = :share_id;
```

2) **Registrar evento canonico** (best-effort)
```text
document_entities.events APPEND:
{
  kind: 'nda_accepted',
  at: timestamp,
  nda: { share_id, recipient_email, nda_hash, acceptance_method }
}
```

---

## Invariantes

1) **Share valido**
- `share_id` debe existir.

2) **Email coincide**
- `document_shares.recipient_email` debe coincidir con `signer_email` (case-insensitive).

3) **NDA requerido**
- Solo aplica si `document_shares.nda_enabled = true`.

4) **Idempotencia**
- Si `nda_accepted_at` ya existe, no se actualiza nuevamente.

5) **Hash probatorio**
- Se calcula `nda_hash` con NDA + metadata (ip, user_agent, timestamp).

---

## Que NO decide

- No valida OTP ni acceso final al documento.
- No revoca ni expira shares.
- No bloquea acceso si falla el append del evento canonico.

---

## Regla canonica (formal)

```typescript
export interface AcceptShareNdaInput {
  share: {
    id: string;
    recipient_email: string;
    nda_enabled: boolean;
    nda_accepted_at: string | null;
  } | null;
  payload: {
    share_id?: string;
    signer_email?: string;
  };
}

export const shouldAcceptShareNda = (input: AcceptShareNdaInput): boolean => {
  const p = input.payload || {};
  if (!p.share_id || !p.signer_email) return false;
  if (!input.share) return false;

  if (input.share.recipient_email.toLowerCase() !== p.signer_email.toLowerCase()) return false;
  if (!input.share.nda_enabled) return false;
  if (input.share.nda_accepted_at) return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path
```typescript
Input: share_id valido, email coincide, nda_enabled = true
Output: true
```

**Test 2:** NDA no requerido
```typescript
Input: nda_enabled = false
Output: false
```

**Test 3:** Email mismatch
```typescript
Input: signer_email distinto
Output: false
```

**Test 4:** NDA ya aceptado
```typescript
Input: nda_accepted_at != null
Output: false
```

