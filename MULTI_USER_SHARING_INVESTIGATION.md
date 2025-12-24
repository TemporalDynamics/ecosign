# Investigación Técnica — Compartir Cifrado Multi-Usuario

**Fecha:** 2025-12-23  
**Contexto:** Sistema E2E encryption actual implementado en iteración 2025-12-22  
**Objetivo:** Evaluar si podemos permitir compartir un mismo documento cifrado con múltiples usuarios sin duplicar archivos

---

## 🔍 Preguntas Clave

### 1️⃣ ¿La lógica actual de OTP permite re-wrappear la key del documento múltiples veces sin duplicar el archivo?

**Respuesta: SÍ, totalmente.**

#### Cómo funciona hoy:

```
Documento Original
  ↓
  [Encrypted Blob en Storage] ← UNA SOLA VEZ
  ↓
  [Document Key] (AES-256) ← LA MISMA PARA TODOS
  ↓
  Wrapped con diferentes keys:
    - Owner: wrapped_key (session unwrap key)
    - Share 1: wrapped_key (OTP-derived key 1)
    - Share 2: wrapped_key (OTP-derived key 2)
    - Share N: wrapped_key (OTP-derived key N)
```

**Evidencia en código actual:**

📄 `client/src/lib/storage/documentSharing.ts:105-109`
```typescript
// 5. Re-wrap document key with recipient key
console.log('🔒 Wrapping key for recipient...');
const { wrappedKey, wrapIv } = await wrapDocumentKey(
  documentKey,  // ← MISMA key del documento
  recipientKey  // ← DIFERENTE key derivada del OTP
);
```

**Conclusión técnica:**
- El archivo cifrado (`encrypted_path`) es **uno solo** en storage
- La `document_key` es la **misma** (matemáticamente)
- Lo que cambia es el **wrapping** (la capa de cifrado sobre la key)
- Cada share tiene su propio `wrapped_key` + `wrap_iv` + `recipient_salt`

**Esto ya está funcionando así hoy.**

---

### 2️⃣ ¿Podemos tener un shareId único con múltiples recipient_keys?

**Respuesta: NO en el diseño actual, pero SÍ es técnicamente posible.**

#### Estado actual:

📄 `supabase/migrations/20251222130002_e2e_document_shares.sql:35`
```sql
CONSTRAINT unique_pending_share UNIQUE (document_id, recipient_email, status)
```

**Esto significa:**
- Hoy: 1 share = 1 recipient_email = 1 OTP
- Si querés compartir con 3 personas → 3 shares (3 shareIds, 3 OTPs)

#### Esquema actual:

| Campo | Propósito |
|-------|-----------|
| `id` (shareId) | UUID único del share |
| `document_id` | Referencia al documento |
| `recipient_email` | Email del destinatario |
| `wrapped_key` | Document key cifrada con OTP |
| `wrap_iv` | IV para el wrapping |
| `recipient_salt` | Salt para derivar key del OTP |
| `otp_hash` | Hash SHA-256 del OTP |
| `status` | pending/accessed/expired |
| `expires_at` | Fecha de expiración |

**Problema:**
- Constraint `UNIQUE (document_id, recipient_email, status)`
- Un shareId solo puede tener UN recipient_email

---

#### Opción A: Modelo actual (1 share = 1 recipient)

**Ventajas:**
✅ Ya funciona  
✅ Simple de razonar  
✅ OTP único por persona  
✅ Revocación granular (revoco a Juan sin afectar a María)  
✅ Auditoría clara (quién accedió cuándo)

**Desventajas:**
❌ Si querés compartir con 10 personas → 10 shares  
❌ UI tiene que generar N OTPs (o enviar N emails)  
❌ Link es diferente para cada persona (`/shared/{shareId}`)

---

#### Opción B: Modelo multi-recipient (1 share = N recipients)

**Cambio de schema requerido:**

```sql
-- Nueva tabla: recipient_keys
CREATE TABLE document_share_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES document_shares(id) ON DELETE CASCADE,
  
  recipient_email TEXT NOT NULL,
  wrapped_key TEXT NOT NULL,    -- Document key wrapped con OTP de ESTE recipient
  wrap_iv TEXT NOT NULL,
  recipient_salt TEXT NOT NULL,
  otp_hash TEXT NOT NULL,       -- Hash del OTP específico de ESTE recipient
  
  accessed_at TIMESTAMPTZ,
  
  CONSTRAINT unique_recipient_per_share UNIQUE (share_id, recipient_email)
);

-- document_shares se simplifica:
-- Ya NO tiene recipient_email, wrapped_key, otp_hash
-- Solo tiene: document_id, expires_at, created_by, status
```

**Nueva lógica:**

1. Owner crea 1 share con emails: `[juan@x.com, maria@y.com, pedro@z.com]`
2. Backend genera:
   - 1 `shareId` (mismo link para todos)
   - 3 OTPs (uno por persona)
   - 3 `wrapped_keys` (document key re-wrapped 3 veces, cada una con un OTP distinto)
3. Cada persona recibe:
   - El mismo link: `/shared/{shareId}`
   - Su OTP único: `ABCD-1234-EFGH`
4. Al acceder:
   - Modal pide email + OTP
   - Backend busca: `share_id = X AND recipient_email = juan@x.com`
   - Verifica OTP hash
   - Devuelve el `wrapped_key` correspondiente a Juan

**Ventajas:**
✅ Un solo link para todos  
✅ Owner ve "1 share con 3 destinatarios"  
✅ Más limpio en UI (no hay 3 shares repetidos)

**Desventajas:**
❌ Más complejidad en backend  
❌ Revocación: ¿revocar el share completo o solo un recipient?  
❌ Status: ¿cómo manejar "parcialmente accedido"?  
❌ Breaking change: migración de shares existentes

---

### 3️⃣ ¿Qué implicaría permitir que un mismo link genere OTPs distintos por usuario?

**Respuesta: Es factible, pero requiere lógica condicional en la Edge Function.**

#### Flujo técnico:

```
Usuario A accede a /shared/{shareId}
  ↓
  Modal pide: email + OTP
  ↓
  Edge function busca:
    SELECT * FROM document_share_recipients
    WHERE share_id = {shareId}
      AND recipient_email = {email}
      AND otp_hash = SHA256({otp})
  ↓
  Si match:
    - Devuelve wrapped_key específico de Usuario A
    - Usuario A deriva su unwrap key de su OTP
    - Descifra y descarga
```

**Diferencia clave vs hoy:**
- Hoy: `shareId` → 1 OTP → 1 recipient
- Propuesta: `shareId` → N OTPs → N recipients

**Implicaciones de seguridad:**
- Cada OTP sigue siendo único y hasheado ✅
- Cada `wrapped_key` es distinta (diferente salt, diferente OTP) ✅
- Un usuario NO puede usar el OTP de otro (hash no coincide) ✅
- Si un OTP se filtra, solo compromete ESE recipient ✅

**Problema de UX:**
- Modal actual solo pide OTP (`OTPAccessModal.tsx`)
- Nueva propuesta necesita: **email + OTP**
- ¿Por qué? Porque el sistema necesita saber QUIÉN sos para buscar tu `wrapped_key` correcta
- Alternativa: OTP "self-contained" (incluye identifier en el código), pero eso aumenta longitud

---

### 4️⃣ ¿Esto rompe Zero-Knowledge en algún punto?

**Respuesta: NO, siempre y cuando se mantenga el diseño de key wrapping.**

#### Garantías Zero-Knowledge actuales:

| Qué guarda el servidor | ¿Es secreto? | ¿Puede descifrar? |
|-------------------------|--------------|-------------------|
| Encrypted blob | No (es ciphertext) | ❌ No sin document key |
| `wrapped_key` (owner) | No (es ciphertext) | ❌ No sin session secret |
| `wrapped_key` (share) | No (es ciphertext) | ❌ No sin OTP |
| `otp_hash` | No (es hash) | ❌ No puede reconstruir OTP |
| `recipient_salt` | No (es público) | ✅ Sí, pero es inútil sin OTP |
| `wrap_iv` | No (es público) | ✅ Sí, pero es inútil sin key |

**Propiedades criptográficas:**

1. **Document Key nunca sale del cliente en plaintext** ✅
   - Se genera en browser
   - Se usa para cifrar archivo
   - Se wrappea antes de enviar a servidor

2. **OTP nunca se almacena en plaintext** ✅
   - Solo se guarda `SHA-256(OTP)`
   - No es reversible

3. **Servidor no puede derivar unwrap keys** ✅
   - Necesita OTP (solo el recipient lo tiene)
   - O session secret (solo el owner lo tiene en memoria)

4. **Re-wrapping no debilita el cifrado** ✅
   - Cada `wrapped_key` es independiente
   - Usar la misma document key con diferentes wrap keys es seguro
   - Es el mismo principio que PGP (misma key de contenido, múltiples key wraps)

**Conclusión:**
Multi-recipient NO rompe Zero-Knowledge, siempre que:
- OTP siga siendo único por recipient
- `wrapped_key` se genere con salt único por recipient
- Document key nunca se exponga sin wrap

---

### 5️⃣ ¿Qué partes del backend habría que tocar (DB + Edge Functions)?

#### 📊 **Base de datos**

##### Cambios necesarios:

**Opción A (modelo actual, sin cambios):**
- ✅ **No requiere cambios**
- Simplemente crear N shares (1 por recipient)
- Constraint actual ya lo permite

**Opción B (modelo multi-recipient):**

1. **Nueva tabla:**
```sql
-- migrations/20251223000000_multi_recipient_shares.sql
CREATE TABLE document_share_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES document_shares(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  wrapped_key TEXT NOT NULL,
  wrap_iv TEXT NOT NULL,
  recipient_salt TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_recipient_per_share UNIQUE (share_id, recipient_email)
);

CREATE INDEX idx_share_recipients_share ON document_share_recipients(share_id);
CREATE INDEX idx_share_recipients_otp ON document_share_recipients(otp_hash) WHERE accessed_at IS NULL;
```

2. **Modificar `document_shares`:**
```sql
-- Quitar columnas que ahora van a la tabla recipients
ALTER TABLE document_shares
  DROP COLUMN recipient_email,
  DROP COLUMN wrapped_key,
  DROP COLUMN wrap_iv,
  DROP COLUMN recipient_salt,
  DROP COLUMN otp_hash;

-- Agregar contador de destinatarios
ALTER TABLE document_shares
  ADD COLUMN recipient_count INT DEFAULT 0,
  ADD COLUMN accessed_count INT DEFAULT 0;
```

3. **RLS Policies:**
```sql
-- Owners pueden ver recipients de sus shares
CREATE POLICY "Users can view recipients of their shares"
ON document_share_recipients
FOR SELECT
USING (
  share_id IN (
    SELECT id FROM document_shares 
    WHERE created_by = auth.uid()
  )
);

-- Service role full access (para verificación OTP)
CREATE POLICY "Service role full access"
ON document_share_recipients
FOR ALL
USING (auth.role() = 'service_role');
```

---

#### ⚙️ **Edge Functions**

##### Funciones a crear/modificar:

**1. `generate-share` (nueva o modificar existente)**

```typescript
// supabase/functions/generate-share/index.ts

interface GenerateShareRequest {
  documentId: string;
  recipientEmails: string[]; // ← Array en vez de string único
  expiresInDays?: number;
  message?: string;
}

async function handler(req: Request) {
  const { documentId, recipientEmails, expiresInDays = 7 } = await req.json();
  
  // 1. Verificar ownership del documento
  const doc = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  // 2. Crear el share (sin recipients aún)
  const shareId = crypto.randomUUID();
  await supabase.from('document_shares').insert({
    id: shareId,
    document_id: documentId,
    expires_at: new Date(Date.now() + expiresInDays * 86400000),
    created_by: userId,
    recipient_count: recipientEmails.length,
  });
  
  // 3. Para cada recipient:
  const otps: Record<string, string> = {};
  
  for (const email of recipientEmails) {
    // Generar OTP único
    const otp = generateOTP();
    otps[email] = otp;
    
    // Derivar key del OTP
    const recipientSalt = crypto.getRandomValues(new Uint8Array(16));
    const recipientKey = await deriveKeyFromOTP(otp, recipientSalt);
    
    // Re-wrap document key
    const { wrappedKey, wrapIv } = await wrapDocumentKey(documentKey, recipientKey);
    
    // Guardar recipient
    await supabase.from('document_share_recipients').insert({
      share_id: shareId,
      recipient_email: email,
      wrapped_key: wrappedKey,
      wrap_iv: wrapIv,
      recipient_salt: bytesToHex(recipientSalt),
      otp_hash: await hashOTP(otp),
    });
    
    // Enviar email con OTP
    await sendOTPEmail(email, otp, shareId, doc.filename);
  }
  
  return {
    shareId,
    shareUrl: `${appUrl}/shared/${shareId}`,
    otps, // ← Para mostrar en UI (owner puede copiar)
  };
}
```

**2. `verify-share-access` (nueva)**

```typescript
// supabase/functions/verify-share-access/index.ts

interface VerifyAccessRequest {
  shareId: string;
  recipientEmail: string;
  otp: string;
}

async function handler(req: Request) {
  const { shareId, recipientEmail, otp } = await req.json();
  
  // 1. Buscar recipient
  const otpHash = await hashOTP(otp);
  
  const recipient = await supabase
    .from('document_share_recipients')
    .select('*, document_shares!inner(*, documents!inner(*))')
    .eq('share_id', shareId)
    .eq('recipient_email', recipientEmail)
    .eq('otp_hash', otpHash)
    .is('accessed_at', null)
    .single();
  
  if (!recipient) {
    return { error: 'Invalid OTP or email' };
  }
  
  // 2. Verificar expiración del share
  if (new Date(recipient.document_shares.expires_at) < new Date()) {
    return { error: 'Share expired' };
  }
  
  // 3. Marcar como accedido
  await supabase
    .from('document_share_recipients')
    .update({ accessed_at: new Date() })
    .eq('id', recipient.id);
  
  // 4. Incrementar contador
  await supabase.rpc('increment_share_accessed_count', { share_id: shareId });
  
  // 5. Devolver wrapped key y metadata
  return {
    wrappedKey: recipient.wrapped_key,
    wrapIv: recipient.wrap_iv,
    recipientSalt: recipient.recipient_salt,
    encryptedPath: recipient.document_shares.documents.encrypted_path,
    filename: recipient.document_shares.documents.filename,
  };
}
```

**3. `send-share-otp` (ya existe, modificar para batch)**

```typescript
// supabase/functions/send-share-otp/index.ts

interface SendOTPRequest {
  recipients: Array<{
    email: string;
    otp: string;
  }>;
  shareUrl: string;
  documentName: string;
  senderName: string;
  message?: string;
}

async function handler(req: Request) {
  const { recipients, shareUrl, documentName, senderName, message } = await req.json();
  
  // Batch send emails
  const promises = recipients.map(({ email, otp }) =>
    sendEmail({
      to: email,
      subject: `${senderName} te compartió un documento`,
      html: renderOTPEmailTemplate({
        recipientEmail: email,
        otp,
        shareUrl,
        documentName,
        senderName,
        message,
      }),
    })
  );
  
  await Promise.all(promises);
  
  return { success: true };
}
```

---

#### 🎨 **Client (React)**

##### Componentes a modificar:

**1. `ShareWithOTPModal.tsx`**

```typescript
// Cambiar de:
const [recipientEmail, setRecipientEmail] = useState('');

// A:
const [recipientEmails, setRecipientEmails] = useState<string[]>(['']);

// UI: Input con "+Agregar destinatario"
// Validación: emails únicos, max 10 recipients
```

**2. `OTPAccessModal.tsx`**

```typescript
// Agregar campo email (si usamos modelo B)
const [recipientEmail, setRecipientEmail] = useState('');
const [otp, setOtp] = useState('');

// Backend necesita ambos para buscar la wrapped_key correcta
```

**3. `client/src/lib/storage/documentSharing.ts`**

```typescript
// Modificar shareDocument() para aceptar array de emails
export async function shareDocument(
  options: ShareDocumentOptions
): Promise<ShareDocumentResult> {
  const { documentId, recipientEmails, expiresInDays = 7 } = options;
  
  // Call edge function con array
  const result = await supabase.functions.invoke('generate-share', {
    body: { documentId, recipientEmails, expiresInDays }
  });
  
  return result;
}
```

---

## 📝 Resumen Ejecutivo

### ¿Es técnicamente posible? **SÍ**

| Pregunta | Respuesta | Complejidad |
|----------|-----------|-------------|
| Re-wrappear key sin duplicar archivo | ✅ Ya funciona así | Ninguna |
| 1 shareId con múltiples recipients | ✅ Posible con cambios | Media |
| Link único con OTPs distintos | ✅ Factible | Baja |
| Rompe Zero-Knowledge | ❌ No, es seguro | N/A |
| Cambios en backend | ✅ DB + Edge Funcs | Media-Alta |

---

### Opciones de implementación

#### **Opción A: Sin cambios (N shares)**
- **Complejidad:** 0 (ya funciona)
- **UX:** Compartir con 3 personas → 3 shares, 3 links distintos
- **Pros:** No tocar nada, 100% seguro
- **Contras:** UI se llena de shares repetidos

#### **Opción B: Multi-recipient (1 share, N recipients)**
- **Complejidad:** Media-Alta
- **UX:** Compartir con 3 personas → 1 share, 1 link, 3 OTPs
- **Pros:** UI más limpia, lógica más intuitiva
- **Contras:** Breaking changes, migración, más código

---

### Recomendación técnica

**Short-term (próximas 2 semanas):**
→ Quedarse con **Opción A** (N shares)  
→ Mejorar UI para agrupar visualmente shares del mismo documento  
→ Permitir "batch create" (UI crea N shares automáticamente)

**Mid-term (próximo mes):**
→ Implementar **Opción B** si el volumen de shares crece  
→ Migración gradual (shares viejos siguen funcionando)  
→ A/B test para ver si usuarios prefieren link único

**Criterio de decisión:**
- Si users típicamente comparten con 1-2 personas → Opción A es suficiente
- Si users típicamente comparten con 5-10 personas → Opción B tiene sentido

---

## 🔐 Garantías de seguridad (ambas opciones)

✅ **Document key nunca se expone sin wrap**  
✅ **OTP único y hasheado por recipient**  
✅ **Servidor no puede descifrar sin OTP**  
✅ **Re-wrapping no debilita cifrado**  
✅ **Revocación granular (por recipient)**  
✅ **Auditoría clara (quién accedió, cuándo)**

---

## 📚 Referencias de código existente

- Schema actual: `supabase/migrations/20251222130002_e2e_document_shares.sql`
- Lógica de sharing: `client/src/lib/storage/documentSharing.ts`
- OTP system: `client/src/lib/e2e/otpSystem.ts`
- Key wrapping: `client/src/lib/e2e/documentEncryption.ts`
- Decision log: `decision_log2.0.md` (Iteración 2025-12-22)

---

**Nota final:**  
La arquitectura actual ya permite compartir la misma document key múltiples veces sin duplicar archivos. La pregunta no es "¿se puede?", sino "¿cómo queremos organizar la UX: N shares vs 1 share con N recipients?". Ambas son técnicamente sólidas y Zero-Knowledge compliant.
