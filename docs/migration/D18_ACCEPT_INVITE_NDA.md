# D18 - Aceptar NDA de invite (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 3 - NDA / consentimiento (bajo riesgo, alta trazabilidad)

---

## Que decide

**Decision:** "¿Se debe registrar la aceptacion de NDA asociada a un invite?"

**Contexto:**
Cuando un usuario recibe un invite a un documento, el sistema decide si puede
registrar la aceptacion del NDA usando el token del invite.

```
API/Edge: accept-invite-nda
         ↓
     [D18: Accept?] → invites UPDATE (nda_accepted_at, nda_ip_address, nda_user_agent)
```

**Responsabilidad actual:** Edge Function `supabase/functions/accept-invite-nda`.

---

## Inputs

### Datos requeridos (request):
- **token** (invite token)

### Contexto adicional (queries):
- **Invite**: `invites` (token, expires_at, revoked_at, nda_accepted_at)

---

## Output

### Resultado (si decision es TRUE):

1) **Actualizar invite**
```sql
UPDATE invites
SET nda_accepted_at = NOW(),
    nda_ip_address = :ip,
    nda_user_agent = :user_agent,
    accessed_at = NOW()
WHERE id = :invite_id;
```

---

## Invariantes

1) **Invite valido**
- `token` debe existir y resolver un invite.

2) **No expirado**
- `expires_at` debe ser mayor o igual a `now()`.

3) **No revocado**
- `revoked_at` debe ser NULL.

4) **Idempotencia**
- Si `nda_accepted_at` ya existe, no se actualiza nuevamente.

---

## Que NO decide

- No crea usuarios ni sesiones.
- No valida OTP.
- No genera links ni comparte documentos.

---

## Regla canonica (formal)

```typescript
export interface AcceptInviteNdaInput {
  invite: {
    id: string;
    expires_at: string | null;
    revoked_at: string | null;
    nda_accepted_at: string | null;
  } | null;
  payload: {
    token?: string;
  };
}

export const shouldAcceptInviteNda = (input: AcceptInviteNdaInput): boolean => {
  const p = input.payload || {};
  if (!p.token) return false;
  if (!input.invite) return false;

  if (input.invite.revoked_at) return false;
  if (input.invite.expires_at && new Date(input.invite.expires_at) < new Date()) return false;
  if (input.invite.nda_accepted_at) return false;

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path
```typescript
Input: token valido, invite vigente, no revocado
Output: true
```

**Test 2:** Invite expirado
```typescript
Input: expires_at en el pasado
Output: false
```

**Test 3:** Invite revocado
```typescript
Input: revoked_at != null
Output: false
```

**Test 4:** NDA ya aceptado
```typescript
Input: nda_accepted_at != null
Output: false
```

