# D13 - Iniciar workflow de firmas (Contrato)

**Fecha de inicio:** 2026-01-24
**Fase:** 1 - Contrato (DEFINICION)
**Grupo:** 2 - Workflow (mutaciones fuertes, alto impacto)

---

## Que decide

**Decision:** "¿Se debe crear un nuevo workflow de firmas y sus entidades base?"

**Contexto:**
Cuando el owner inicia un flujo de firmas, el sistema debe decidir si la solicitud
es valida y, de serlo, crear el workflow, su version inicial y los signers.

```
API/Edge: start-signature-workflow
         ↓
     [D13: Start?] → signature_workflows INSERT
                     workflow_versions INSERT (v1)
                     workflow_signers INSERT (N)
```

**Responsabilidad actual:** Edge Function `supabase/functions/start-signature-workflow`.

---

## Inputs

### Datos requeridos (request):
- **actor_id**: usuario autenticado (owner)
- **documentUrl**: URL del documento
- **documentHash**: hash del documento
- **originalFilename**: nombre del archivo
- **signers[]**: lista de signers
- **forensicConfig**: { rfc3161, polygon, bitcoin }

### Datos opcionales:
- **documentEntityId**: referencia a entidad EcoSign
- **deliveryMode**: `email | link` (default: `email`)

---

## Output

### Resultado (si decision es TRUE):

1) **Crear workflow**
```sql
INSERT INTO signature_workflows (
  owner_id,
  original_filename,
  original_file_url,
  status,
  forensic_config,
  delivery_mode,
  document_entity_id?
) VALUES (..., 'active', ...);
```

2) **Crear version inicial**
```sql
INSERT INTO workflow_versions (
  workflow_id,
  version_number,
  document_url,
  document_hash,
  change_reason,
  status
) VALUES (..., 1, ..., 'initial', 'active');
```

3) **Crear signers (N)**
```sql
INSERT INTO workflow_signers (
  workflow_id,
  signing_order,
  email,
  name,
  require_login,
  require_nda,
  quick_access,
  status,
  access_token_hash,
  access_token_ciphertext,
  access_token_nonce,
  token_expires_at
) VALUES (...);
```

**Estado inicial esperado de signers:**
- `signing_order = 1` → `status = 'ready_to_sign'`
- `signing_order > 1` → `status = 'invited'`

---

## Invariantes

1) **Autenticacion obligatoria**
- `actor_id` debe existir y representar al owner.

2) **Payload minimo**
- `documentUrl`, `documentHash`, `originalFilename` no pueden ser vacios.
- `signers.length >= 1`.
- `forensicConfig` presente y con booleans.

3) **Delivery mode**
- Solo `email` o `link`.
- Es inmutable despues de crear el workflow.

4) **Tokens de acceso**
- Cada signer recibe token unico.
- Se guarda hash + ciphertext + nonce.
- `token_expires_at = now + 7 dias`.

5) **Quick access**
- Si `quick_access = true` entonces `require_login = false` y `require_nda = false`.

6) **Idempotencia**
- Esta decision NO es idempotente.
- Requests duplicados crean workflows independientes.
- La deduplicacion (si existe) es responsabilidad del cliente.

7) **Signing order valido**
- `signers[].signingOrder` debe ser unico.
- Debe empezar en 1.
- Debe ser secuencial sin gaps (1..N).

---

## Que NO decide

- No valida la legitimidad del documento (solo crea el workflow).
- No envia emails (solo puede encolar notificaciones legacy).
- No firma ni completa workflows.
- No valida identidad/OTP.
- No resuelve accesos de share links.

---

## Regla canonica (formal)

```typescript
export interface StartWorkflowInput {
  actor_id: string | null;
  payload: {
    documentUrl?: string;
    documentHash?: string;
    originalFilename?: string;
    documentEntityId?: string;
    signers?: Array<{
      email: string;
      name?: string;
      signingOrder: number;
      requireLogin?: boolean;
      requireNda?: boolean;
      quickAccess?: boolean;
    }>;
    forensicConfig?: {
      rfc3161: boolean;
      polygon: boolean;
      bitcoin: boolean;
    };
    deliveryMode?: 'email' | 'link';
  };
}

export const shouldStartSignatureWorkflow = (input: StartWorkflowInput): boolean => {
  if (!input.actor_id) return false;

  const p = input.payload || {};
  if (!p.documentUrl || !p.documentHash || !p.originalFilename) return false;
  if (!p.signers || p.signers.length === 0) return false;

  if (!p.forensicConfig) return false;
  const { rfc3161, polygon, bitcoin } = p.forensicConfig;
  if ([rfc3161, polygon, bitcoin].some(v => typeof v !== 'boolean')) return false;

  if (p.deliveryMode && !['email', 'link'].includes(p.deliveryMode)) return false;

  const orders = p.signers.map(s => s.signingOrder).sort((a, b) => a - b);
  if (orders[0] !== 1) return false;
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) return false;
  }

  return true;
};
```

---

## Casos de prueba

**Test 1:** Happy path
```typescript
Input: actor_id, payload completo, 2 signers, forensicConfig valido
Output: true
```

**Test 2:** Actor no autenticado
```typescript
Input: actor_id = null
Output: false
```

**Test 3:** Sin signers
```typescript
Input: signers = []
Output: false
```

**Test 4:** deliveryMode invalido
```typescript
Input: deliveryMode = 'sms'
Output: false
```

**Test 5:** Falta documentUrl
```typescript
Input: documentUrl = ''
Output: false
```

**Test 6:** forensicConfig faltante
```typescript
Input: forensicConfig = undefined
Output: false
```

**Test 7:** forensicConfig con tipos invalidos
```typescript
Input: forensicConfig = { rfc3161: 'yes', polygon: true, bitcoin: true }
Output: false
```

**Test 8:** payload minimo con deliveryMode link
```typescript
Input: deliveryMode = 'link'
Output: true
```

**Test 9:** signingOrder no secuencial
```typescript
Input: signers = [{ signingOrder: 1 }, { signingOrder: 3 }]
Output: false
```
