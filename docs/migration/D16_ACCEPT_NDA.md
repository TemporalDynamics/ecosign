# D16 - Aceptar NDA (link generico) (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 3 - NDA / consentimiento (bajo riesgo, alta trazabilidad)

---

## Que decide

**Decision:** "¿Se debe registrar la aceptacion de un NDA para un link?"

**Contexto:**
Cuando un receptor abre un link de NDA (flujo general), el sistema decide si
puede registrar la aceptacion en `nda_acceptances` y dejar evidencia probatoria.

```
API/Edge: accept-nda
         ↓
     [D16: Accept?] → nda_acceptances INSERT
                      access_events INSERT (view)
```

**Responsabilidad actual:** Edge Function `supabase/functions/accept-nda`.

---

## Inputs

### Datos requeridos (request):
- **token** (link token)
- **signer_name**
- **signer_email**

### Datos opcionales:
- **nda_version** (default "1.0")
- **browser_fingerprint**

### Contexto adicional (queries):
- **Link**: `links` (id, recipient_id, nda_text)
- **Recipient**: `recipients` (id, email, document_id)
- **Existing NDA**: `nda_acceptances` (recipient_id)

---

## Output

### Resultado (si decision es TRUE):

1) **Registrar aceptacion**
```sql
INSERT INTO nda_acceptances (
  recipient_id,
  eco_nda_hash,
  ip_address,
  user_agent,
  signature_data
) VALUES (...);
```

2) **Registrar acceso inicial**
```sql
INSERT INTO access_events (
  recipient_id,
  event_type, -- 'view'
  ip_address,
  user_agent,
  session_id
) VALUES (...);
```

---

## Invariantes

1) **Token valido**
- `token` debe resolver un link existente.
- `links.recipient_id` debe existir.

2) **Recipient valido**
- El recipient asociado debe existir.

3) **Idempotencia**
- Si ya existe `nda_acceptances` para `recipient_id`, no se inserta un nuevo registro.

4) **Hash probatorio**
- Se calcula `eco_nda_hash` con contenido NDA + metadata (ip, user_agent, timestamp).

---

## Que NO decide

- No valida OTP ni acceso a documento.
- No revoca ni expira links.
- No emite eventos canonicos en `document_entities.events`.
- No actualiza `links` ni `recipients`.

---

## Regla canonica (formal)

```typescript
export interface AcceptNdaInput {
  link: {
    id: string;
    recipient_id: string | null;
  } | null;
  recipient: {
    id: string;
  } | null;
  existingAcceptance: {
    id: string;
  } | null;
  payload: {
    token?: string;
    signer_name?: string;
    signer_email?: string;
  };
}

export const shouldAcceptNda = (input: AcceptNdaInput): boolean => {
  const p = input.payload || {};
  if (!p.token) return false;
  if (!p.signer_name || !p.signer_email) return false;

  if (!input.link) return false;
  if (!input.link.recipient_id) return false;
  if (!input.recipient) return false;

  if (input.existingAcceptance) return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path
```typescript
Input: token valido, recipient existe, sin nda_acceptances previas
Output: true
```

**Test 2:** Token invalido
```typescript
Input: token = 'x', link = null
Output: false
```

**Test 3:** Recipient inexistente
```typescript
Input: link ok, recipient = null
Output: false
```

**Test 4:** NDA ya aceptado
```typescript
Input: existingAcceptance != null
Output: false
```

