# Análisis Exhaustivo del Flujo de Encriptación E2E

**Proyecto:** EcoSign
**Fecha:** 2025-12-24
**Arquitectura:** Zero Server-Side Knowledge (ZSK)

---

## 1. FLUJO DE SESIÓN CRYPTO

### 1.1 Inicialización de la Sesión

**Archivo Principal:** `/home/manu/dev/ecosign/client/src/lib/e2e/sessionCrypto.ts`

#### ¿CUÁNDO se inicializa?

La inicialización ocurre en **3 puntos de entrada**:

```
┌─────────────────────────────────────────────────────────────┐
│  PUNTO 1: Login/Signup (hook useAuthWithE2E)                │
├─────────────────────────────────────────────────────────────┤
│  Archivo: client/src/hooks/useAuthWithE2E.ts                │
│  Momento: Después de auth exitoso (SIGNED_IN event)         │
│  Líneas: 95-100                                              │
│                                                              │
│  useEffect(() => {                                           │
│    supabase.auth.onAuthStateChange(async (event, session) => │
│      if (event === 'SIGNED_IN' && !isSessionInitialized()) { │
│        await initE2ESession(user.id);                        │
│      }                                                       │
│    });                                                       │
│  }, []);                                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PUNTO 2: Guardar documento (documentStorage.ts)            │
├─────────────────────────────────────────────────────────────┤
│  Archivo: client/src/utils/documentStorage.ts               │
│  Momento: Antes de encriptar documento                      │
│  Líneas: 120-123                                             │
│                                                              │
│  if (!isSessionInitialized()) {                              │
│    await initializeSessionCrypto(user.id);                   │
│  }                                                           │
│  ⚠️ PROBLEMA: Reinitialización defensiva (puede regenerar)  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PUNTO 3: Compartir documento (ShareDocumentModal.tsx)      │
├─────────────────────────────────────────────────────────────┤
│  Archivo: client/src/components/ShareDocumentModal.tsx      │
│  Momento: useEffect al montar el componente                 │
│  Líneas: 74-102                                              │
│                                                              │
│  useEffect(() => {                                           │
│    if (!isSessionInitialized()) {                            │
│      await initializeSessionCrypto(user.id);                 │
│    }                                                         │
│  }, []);                                                     │
│  ⚠️ PROBLEMA: Reinitialización en CADA apertura del modal   │
└─────────────────────────────────────────────────────────────┘
```

#### ¿QUÉ hace la inicialización?

```javascript
// sessionCrypto.ts - líneas 36-78
async function initializeSessionCrypto(userId: string, forceReinit: boolean = false) {
  // ✅ PROTECCIÓN: No reinicializa si ya existe (a menos que forceReinit=true)
  if (_currentSession && _currentSession.userId === userId && !forceReinit) {
    return; // SKIP
  }

  // ⚠️ CRÍTICO: Genera un sessionSecret ALEATORIO cada vez
  const sessionSecret = randomBytes(32); // 256 bits RANDOM

  // Fetch del wrap_salt (público, almacenado en DB)
  const { data: profile } = await supabase
    .from('profiles')
    .select('wrap_salt')
    .eq('user_id', userId)
    .single();

  const salt = hexToBytes(profile.wrap_salt);

  // Derivar unwrapKey del sessionSecret + salt
  const unwrapKey = await deriveUnwrapKey(sessionSecret, salt);

  // Almacenar en memoria (singleton)
  _currentSession = {
    sessionSecret,    // 🔴 Random, volátil, NO persistente
    unwrapKey,        // 🔴 Derivado del sessionSecret
    userId,
    initializedAt: new Date(),
  };
}
```

#### ¿CÓMO se deriva el unwrapKey?

```
sessionSecret (256 bits random)
       ↓
   PBKDF2(sessionSecret, salt, 100000 iterations, SHA-256)
       ↓
   unwrapKey (AES-256-GCM)
```

**Algoritmo:**
- **Input:** `sessionSecret` (32 bytes aleatorios) + `wrap_salt` (16 bytes, de DB)
- **KDF:** PBKDF2 con 100,000 iteraciones (OWASP 2024)
- **Output:** `unwrapKey` (AES-256 key)
- **Propiedades:** NO extractable, usos: `['wrapKey', 'unwrapKey']`

**Código:**
```javascript
// sessionCrypto.ts - líneas 83-114
async function deriveUnwrapKey(sessionSecret: Uint8Array, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sessionSecret,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const unwrapKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // ⚠️ NO extractable
    ['wrapKey', 'unwrapKey']
  );

  return unwrapKey;
}
```

### 1.2 Limpieza de la Sesión

#### ¿CUÁNDO se limpia?

```
┌─────────────────────────────────────────────────────────────┐
│  EVENTO 1: Logout (hook useAuthWithE2E)                      │
├─────────────────────────────────────────────────────────────┤
│  Archivo: client/src/hooks/useAuthWithE2E.ts                │
│  Momento: Evento SIGNED_OUT                                  │
│  Líneas: 103-104                                             │
│                                                              │
│  case 'SIGNED_OUT':                                          │
│    clearE2ESession(); // → clearSessionCrypto()              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EVENTO 2: beforeunload (cierre de tab)                      │
├─────────────────────────────────────────────────────────────┤
│  Archivo: client/src/lib/e2e/sessionCrypto.ts               │
│  Momento: Window beforeunload event                          │
│  Líneas: 75-77                                               │
│                                                              │
│  window.addEventListener('beforeunload', () => {             │
│    clearSessionCrypto();                                     │
│  });                                                         │
└─────────────────────────────────────────────────────────────┘
```

#### ¿QUÉ hace la limpieza?

```javascript
// sessionCrypto.ts - líneas 151-160
function clearSessionCrypto() {
  if (_currentSession) {
    // Zero out memory (security)
    zeroMemory(_currentSession.sessionSecret);

    // Destruir referencia
    _currentSession = null;
  }
}
```

**⚠️ CONSECUENCIA CRÍTICA:**
Una vez que `clearSessionCrypto()` se ejecuta, **TODOS** los `documentKey` envueltos con ese `unwrapKey` se vuelven **inaccesibles** hasta la siguiente reinicialización (que genera un NUEVO sessionSecret).

---

## 2. FLUJO DE CREACIÓN DE DOCUMENTOS

### 2.1 Generación del documentKey

**Archivo:** `/home/manu/dev/ecosign/client/src/lib/e2e/documentEncryption.ts`

```javascript
// documentEncryption.ts - líneas 14-23
async function generateDocumentKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // ✅ extractable (necesario para wrapping)
    ['encrypt', 'decrypt']
  );
}
```

**Características:**
- **Algoritmo:** AES-256-GCM
- **Generación:** Completamente aleatoria (crypto.subtle.generateKey)
- **Extractabilidad:** `true` (requerido para poder wrappear la clave)
- **Único por documento**

### 2.2 Encriptación del Documento

```
Documento PDF (ArrayBuffer)
       ↓
   AES-256-GCM(PDF, documentKey, random IV)
       ↓
   [IV (12 bytes) || Ciphertext || Auth Tag]
       ↓
   Blob encriptado → Supabase Storage
```

**Código:**
```javascript
// documentEncryption.ts - líneas 32-58
async function encryptFile(file: File, documentKey: CryptoKey) {
  // 1. Read file
  const fileBuffer = await file.arrayBuffer();

  // 2. Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12);

  // 3. Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    documentKey,
    fileBuffer
  );

  // 4. Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedBuffer), iv.length);

  return new Blob([result]);
}
```

### 2.3 Wrapping del documentKey

```
documentKey (AES-256)
       ↓
   AES-GCM-Wrap(documentKey, unwrapKey, random wrapIv)
       ↓
   wrappedKey (base64) + wrapIv (hex)
       ↓
   Guardado en DB (user_documents)
```

**Código:**
```javascript
// documentEncryption.ts - líneas 104-128
async function wrapDocumentKey(documentKey, unwrapKey) {
  // Generate IV
  const wrapIv = randomBytes(12);

  // Wrap
  const wrappedKeyBuffer = await crypto.subtle.wrapKey(
    'raw',
    documentKey,
    unwrapKey,        // ⚠️ unwrapKey del sessionSecret
    { name: 'AES-GCM', iv: wrapIv }
  );

  return {
    wrappedKey: bytesToBase64(wrappedKeyBuffer),
    wrapIv: bytesToHex(wrapIv),
  };
}
```

### 2.4 Almacenamiento en DB

**Archivo:** `/home/manu/dev/ecosign/client/src/utils/documentStorage.ts`

```javascript
// documentStorage.ts - líneas 253-291
await supabase
  .from('user_documents')
  .insert({
    user_id: user.id,
    document_name: pdfFile.name,
    document_hash: documentHash,        // SHA-256 del PDF original

    // ✅ E2E Encryption fields
    encrypted: true,
    encrypted_path: encryptedPath,      // Storage path del blob cifrado
    wrapped_key: bytesToBase64(wrappedKey),  // 🔑 documentKey envuelto
    wrap_iv: bytesToHex(wrapIv),             // IV usado para el wrapping

    // Otros campos...
  });
```

**Datos almacenados:**
- **encrypted_path:** Ruta en Supabase Storage del PDF cifrado
- **wrapped_key:** `documentKey` envuelto con `sessionUnwrapKey` (base64)
- **wrap_iv:** IV usado para el wrapping (hex)
- **document_hash:** SHA-256 del PDF **original** (antes de cifrar)

**⚠️ PUNTO CRÍTICO:**
El `wrapped_key` SOLO puede descifrarse con el `unwrapKey` que se derivó del `sessionSecret` **original**. Si se reinicializa la sesión con un NUEVO `sessionSecret`, el `unwrapKey` cambia y el `wrapped_key` se vuelve inaccesible.

### 2.5 Diagrama de Flujo Completo

```
┌────────────────────────────────────────────────────────────────────┐
│  CREACIÓN DE DOCUMENTO                                             │
└────────────────────────────────────────────────────────────────────┘

User uploads PDF
     ↓
┌────────────────┐
│ documentStorage │ → Verifica sesión crypto inicializada
│ .saveUserDoc   │    ├─ isSessionInitialized() ?
└────────────────┘    ├─ NO  → initializeSessionCrypto(user.id)
     ↓                └─ SÍ  → Continuar
     │
     ├─ 1. Generar documentKey
     │      ↓
     │   generateDocumentKey()
     │      └─ AES-256-GCM, random, extractable
     │
     ├─ 2. Encriptar documento
     │      ↓
     │   encryptFile(pdfFile, documentKey)
     │      ├─ random IV (12 bytes)
     │      ├─ AES-256-GCM encrypt
     │      └─ [IV || Ciphertext] → Blob
     │
     ├─ 3. Wrappear documentKey
     │      ↓
     │   sessionUnwrapKey = getSessionUnwrapKey()
     │      ↓
     │   wrapDocumentKey(documentKey, sessionUnwrapKey)
     │      ├─ random wrapIv (12 bytes)
     │      ├─ AES-GCM-Wrap
     │      └─ wrappedKey (base64) + wrapIv (hex)
     │
     ├─ 4. Upload a Supabase Storage
     │      ↓
     │   supabase.storage.from('user-documents').upload(...)
     │      └─ encrypted_path
     │
     └─ 5. Guardar metadata en DB
            ↓
        supabase.from('user_documents').insert({
          encrypted: true,
          encrypted_path,
          wrapped_key,    ← 🔑 CRÍTICO
          wrap_iv,        ← 🔑 CRÍTICO
          document_hash
        })

┌────────────────────────────────────────────────────────────────────┐
│  RESULTADO                                                         │
├────────────────────────────────────────────────────────────────────┤
│  Supabase Storage: Blob cifrado (server NO puede leer)            │
│  Database:         wrapped_key (solo desencriptable con unwrapKey) │
│  Memoria (volátil): sessionSecret + unwrapKey                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. FLUJO DE COMPARTIR DOCUMENTOS

### 3.1 Arquitectura de Compartición con OTP

**Archivo Principal:** `/home/manu/dev/ecosign/client/src/lib/storage/documentSharing.ts`

**Concepto:**
Compartir un documento requiere **re-wrappear** el `documentKey` con una clave derivada de un OTP (One-Time Password), en lugar del `sessionUnwrapKey` del propietario.

### 3.2 Flujo Completo

```
┌────────────────────────────────────────────────────────────────────┐
│  COMPARTIR DOCUMENTO                                               │
└────────────────────────────────────────────────────────────────────┘

Owner clicks "Compartir"
     ↓
┌──────────────────────┐
│ ShareDocumentModal   │ → useEffect() al montar
│ componentDidMount    │    ├─ isSessionInitialized() ?
└──────────────────────┘    ├─ NO  → initializeSessionCrypto(user.id)  ⚠️ REINIT
     ↓                      └─ SÍ  → Continuar
     │
Owner configura:
  - Formatos (PDF/ECO)
  - Expiración (días)
  - NDA (opcional)
     ↓
Owner clicks "Generar enlace"
     ↓
┌──────────────────────┐
│ shareDocument()      │
└──────────────────────┘
     │
     ├─ 1. Verificar sesión
     │      ↓
     │   if (!isSessionInitialized()) throw Error  ⚠️ RACE CONDITION
     │
     ├─ 2. Fetch documento de DB
     │      ↓
     │   supabase.from('user_documents').select(...)
     │      └─ wrapped_key, wrap_iv (del owner)
     │
     ├─ 3. Unwrap documentKey con unwrapKey del owner
     │      ↓
     │   sessionUnwrapKey = getSessionUnwrapKey()  ⚠️ PUEDE FALLAR
     │      ↓
     │   documentKey = unwrapDocumentKey(
     │     wrapped_key,
     │     wrap_iv,
     │     sessionUnwrapKey
     │   )
     │   ⚠️ SI sessionUnwrapKey cambió → FALLA
     │
     ├─ 4. Generar OTP
     │      ↓
     │   otp = generateOTP()  // 8 chars random
     │   otpHash = hashOTP(otp)  // SHA-256
     │
     ├─ 5. Derivar recipientKey del OTP
     │      ↓
     │   recipientSalt = randomBytes(16)
     │   recipientKey = deriveKeyFromOTP(otp, recipientSalt)
     │      └─ PBKDF2(otp, recipientSalt, 100k iterations)
     │
     ├─ 6. Re-wrap documentKey con recipientKey
     │      ↓
     │   { wrappedKey, wrapIv } = wrapDocumentKey(
     │     documentKey,
     │     recipientKey  ← Nuevo unwrap key (derivado del OTP)
     │   )
     │
     ├─ 7. Guardar share en DB
     │      ↓
     │   supabase.from('document_shares').insert({
     │     document_id,
     │     recipient_email,
     │     wrapped_key,      ← Re-wrapped con recipientKey
     │     wrap_iv,
     │     recipient_salt,   ← Necesario para derivar recipientKey
     │     otp_hash,         ← SHA-256(otp) para validación
     │     status: 'pending',
     │     expires_at
     │   })
     │
     └─ 8. Devolver shareUrl + OTP
            ↓
        {
          shareId: uuid,
          otp: "A1B2C3D4",  ← ⚠️ NUNCA se envía al servidor en plaintext
          shareUrl: "https://app/shared/{shareId}",
          expiresAt
        }
```

### 3.3 Generación de OTP

**Archivo:** `/home/manu/dev/ecosign/client/src/lib/e2e/otpSystem.ts`

```javascript
// otpSystem.ts - líneas 16-27
function generateOTP(length = 8) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin 0,O,1,I
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);

  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += charset[values[i] % charset.length];
  }

  return otp; // Ej: "K3M7PQRS"
}
```

**Características:**
- **Longitud:** 8 caracteres
- **Charset:** Excluye caracteres ambiguos (0, O, 1, I)
- **Entropía:** ~40 bits (34^8 ≈ 1.7 × 10¹²)
- **Generación:** `crypto.getRandomValues()` (CSPRNG)

### 3.4 Derivación de recipientKey

```
OTP ("K3M7PQRS")
       ↓
   PBKDF2(OTP, recipientSalt, 100k iterations, SHA-256)
       ↓
   recipientKey (AES-256-GCM)
       ↓
   wrapKey para re-wrappear documentKey
```

**Código:**
```javascript
// otpSystem.ts - líneas 38-72
async function deriveKeyFromOTP(otp, salt) {
  const otpBytes = new TextEncoder().encode(otp);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    otpBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // NO extractable
    ['wrapKey', 'unwrapKey']
  );

  return derivedKey;
}
```

### 3.5 Diagrama de Re-Wrapping

```
┌─────────────────────────────────────────────────────────────────┐
│  RE-WRAPPING DEL documentKey                                    │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────┐
│ Owner's Session   │
│ unwrapKey         │  ← Derivado de sessionSecret (volátil)
└───────────────────┘
         │
         │ (1) Unwrap
         ↓
┌───────────────────┐
│ documentKey       │  ← AES-256 key (plaintext en memoria)
└───────────────────┘
         │
         │ (2) Re-wrap
         ↓
┌───────────────────┐
│ recipientKey      │  ← Derivado de OTP + recipientSalt
│ (from OTP)        │
└───────────────────┘
         │
         ↓
┌───────────────────────────────────────────────────────────────┐
│ New wrapped_key (guardado en document_shares)                 │
│ - SOLO desencriptable con el OTP correcto                     │
│ - Independiente del sessionSecret del owner                   │
└───────────────────────────────────────────────────────────────┘
```

### 3.6 Acceso por Recipient

**Archivo:** `documentSharing.ts` - función `accessSharedDocument()`

```
Recipient recibe:
  - shareUrl: "https://app/shared/{shareId}"
  - OTP: "K3M7PQRS" (por canal separado)
     ↓
Recipient navega a shareUrl e ingresa OTP
     ↓
┌──────────────────────────┐
│ accessSharedDocument()   │
└──────────────────────────┘
     │
     ├─ 1. Hash del OTP
     │      ↓
     │   otpHash = SHA256(otp)
     │
     ├─ 2. Fetch share de DB
     │      ↓
     │   supabase.from('document_shares').select(...)
     │     .eq('otp_hash', otpHash)
     │     .eq('status', 'pending')
     │     .gt('expires_at', now)
     │      └─ wrapped_key, wrap_iv, recipient_salt
     │
     ├─ 3. Derivar recipientKey
     │      ↓
     │   recipientKey = deriveKeyFromOTP(otp, recipient_salt)
     │
     ├─ 4. Unwrap documentKey
     │      ↓
     │   documentKey = unwrapDocumentKey(
     │     wrapped_key,
     │     wrap_iv,
     │     recipientKey
     │   )
     │
     ├─ 5. Download encrypted file
     │      ↓
     │   encryptedBlob = supabase.storage.download(encrypted_path)
     │
     ├─ 6. Decrypt
     │      ↓
     │   decryptedBlob = decryptFile(encryptedBlob, documentKey)
     │
     └─ 7. Mark as accessed
            ↓
        supabase.from('document_shares').update({
          status: 'accessed',
          accessed_at: now
        })
```

---

## 4. PROBLEMAS IDENTIFICADOS

### 🔴 PROBLEMA 1: Race Condition en Inicialización de Sesión

**Descripción:**
La sesión crypto se inicializa en **múltiples puntos** de forma **asíncrona** y sin coordinación, lo que puede causar:
- Reinicializaciones accidentales con NUEVOS `sessionSecret`
- Loss del `sessionSecret` anterior (invalidando todos los `wrapped_key` previos)
- Fallas de unwrap porque el `unwrapKey` cambió

**Ubicaciones del problema:**

1. **useAuthWithE2E.ts (líneas 95-100):**
   ```javascript
   case 'SIGNED_IN':
   case 'TOKEN_REFRESHED':
   case 'USER_UPDATED':
     if (currentUser && !isSessionInitialized()) {
       await initE2ESession(currentUser.id);
     }
   ```
   ✅ **Bien:** Verifica `!isSessionInitialized()` antes de inicializar.

2. **documentStorage.ts (líneas 120-123):**
   ```javascript
   if (!isSessionInitialized()) {
     console.log('📦 Initializing session crypto for document save...');
     await initializeSessionCrypto(user.id);
   }
   ```
   ⚠️ **Problema leve:** Reinicialización defensiva. Si por alguna razón la sesión no se inicializó en login, esto la crea, pero genera un NUEVO `sessionSecret`.

3. **ShareDocumentModal.tsx (líneas 74-102):**
   ```javascript
   useEffect(() => {
     const initSession = async () => {
       if (isSessionInitialized()) {
         setInitializingSession(false);
         return;
       }

       // Intentar inicializar
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
         await initializeSessionCrypto(user.id);
       }
     };

     initSession();
   }, []);
   ```
   🔴 **Problema GRAVE:** Este `useEffect()` se ejecuta **cada vez** que se abre el modal. Si por alguna razón `isSessionInitialized()` devuelve `false` (ej: después de un refresh de token, o si se limpieza accidentalmente), se reinicializa con un NUEVO `sessionSecret`, invalidando todos los `wrapped_key` previos.

**Escenario de falla:**

```
1. User hace login
   → initE2ESession() → sessionSecret_A → unwrapKey_A

2. User crea documento1
   → wrapped_key_1 = wrap(documentKey_1, unwrapKey_A)

3. User refresca la página (o token refresh event)
   → onAuthStateChange('TOKEN_REFRESHED')
   → initE2ESession() NO se ejecuta (sessionCrypto.ts tiene protección)
   → ✅ sessionSecret_A se mantiene

4. User abre ShareDocumentModal
   → useEffect() ejecuta
   → isSessionInitialized() devuelve true
   → ✅ NO reinicializa

5. PERO si algo limpia la sesión (ej: beforeunload accidental)
   → clearSessionCrypto() → _currentSession = null

6. User abre ShareDocumentModal
   → isSessionInitialized() devuelve FALSE
   → initializeSessionCrypto(user.id) → sessionSecret_B (NUEVO)
   → unwrapKey_B (DIFERENTE)

7. User intenta compartir documento1
   → unwrapDocumentKey(wrapped_key_1, unwrapKey_B)
   → ❌ FALLA: wrapped_key_1 fue creado con unwrapKey_A
```

**Frecuencia estimada:** BAJA, pero POSIBLE en:
- Múltiples tabs abiertas (cada tab tiene su propia sesión)
- Refresh de página (si se ejecuta antes de que useAuthWithE2E inicialice)
- Token refresh + apertura rápida del modal

---

### 🔴 PROBLEMA 2: sessionSecret No Persistente

**Descripción:**
El `sessionSecret` se genera **aleatorio** cada vez que se inicializa la sesión y **NO** se persiste en ningún lado:
- NO en localStorage
- NO en sessionStorage
- NO en cookies
- **Solo en memoria** (variable global `_currentSession`)

**Consecuencias:**

1. **Cierre de tab:**
   - `beforeunload` → `clearSessionCrypto()` → sessionSecret perdido
   - Al volver a abrir: NUEVO sessionSecret
   - Documentos previos inaccesibles

2. **Refresh de página:**
   - Si el useEffect de ShareDocumentModal se ejecuta ANTES que useAuthWithE2E
   - Genera NUEVO sessionSecret
   - Documentos previos inaccesibles

3. **Multiple tabs:**
   - Cada tab tiene su PROPIO sessionSecret
   - Documentos creados en tab A NO son accesibles desde tab B
   - Solución: Solo una tab puede tener la sesión activa

**Código problemático:**

```javascript
// sessionCrypto.ts - línea 45
const sessionSecret = randomBytes(32); // ⚠️ RANDOM cada vez
```

**Por diseño:**
Esto es **intencional** en una arquitectura de Zero Server-Side Knowledge, pero crea problemas de UX si no se maneja correctamente.

**Flujo actual:**

```
Login → sessionSecret_A (memoria)
  ↓
Crear doc1 → wrapped_key_1 (DB, envuelto con unwrapKey_A)
  ↓
Refresh página → sessionSecret_B (memoria, NUEVO)
  ↓
Intentar acceder doc1 → FALLA (unwrapKey_B ≠ unwrapKey_A)
```

---

### 🔴 PROBLEMA 3: Protección de Re-inicialización Inconsistente

**Ubicación:** `sessionCrypto.ts` - líneas 38-42

```javascript
if (_currentSession && _currentSession.userId === userId && !forceReinit) {
  console.log('⚠️ Session crypto already initialized for this user, skipping reinitialization');
  return;
}
```

**Análisis:**

✅ **Bien:** Protege contra re-inicialización accidental.

⚠️ **Problema:** Si `forceReinit=true` se pasa (o si `userId` cambia), se **destruye** el sessionSecret anterior:

```javascript
// NO hay cleanup del sessionSecret anterior
const sessionSecret = randomBytes(32); // NUEVO
```

**Consecuencia:**
Todos los `wrapped_key` creados con el sessionSecret anterior se vuelven inaccesibles.

**Solución ideal:**
- NUNCA forzar re-inicialización a menos que sea explícito (ej: "Reset E2E Session")
- Advertir al usuario que perderá acceso a documentos previos

---

### 🔴 PROBLEMA 4: Falta de Persistencia del sessionSecret

**Propuesta actual:**
El `sessionSecret` es volátil (solo en memoria).

**Problema:**
Cada refresh/cierre de tab invalida todos los documentos creados en esa sesión.

**Opciones de solución:**

#### Opción A: Persistir sessionSecret en localStorage (RIESGO ALTO)
```javascript
// ⚠️ NO RECOMENDADO - sessionSecret en plaintext
localStorage.setItem('sessionSecret', bytesToHex(sessionSecret));
```

**Problemas:**
- ❌ sessionSecret en plaintext (XSS puede robarlo)
- ❌ Persiste entre sesiones (viola "logout = forget keys")
- ❌ Accesible por malware

#### Opción B: Persistir sessionSecret encriptado con password-derived key
```javascript
// Usuario ingresa password al login
const passwordDerivedKey = deriveKeyFromPassword(password, userSalt);
const encryptedSessionSecret = encrypt(sessionSecret, passwordDerivedKey);
localStorage.setItem('encryptedSessionSecret', encryptedSessionSecret);
```

**Ventajas:**
- ✅ sessionSecret NO en plaintext
- ✅ Solo accesible si se conoce el password
- ✅ Logout puede borrar localStorage

**Desventajas:**
- ⚠️ Requiere que el usuario ingrese password en CADA sesión (no soporta "Remember me")
- ⚠️ Complejidad adicional

#### Opción C: NO persistir (estado actual)
```javascript
// sessionSecret volátil (solo en memoria)
// Cada sesión genera NUEVO sessionSecret
```

**Ventajas:**
- ✅ Máxima seguridad (sessionSecret nunca sale de memoria)
- ✅ Logout = olvido inmediato

**Desventajas:**
- ❌ UX pobre (cada refresh pierde acceso)
- ❌ Requiere re-crear documentos en cada sesión

**Recomendación:**
Implementar **Opción B** (sessionSecret encriptado con password-derived key) SOLO si el usuario usa password (no OAuth/magic link).

---

### 🔴 PROBLEMA 5: Unwrap Puede Fallar Durante Compartir

**Ubicación:** `documentSharing.ts` - líneas 86-93

```javascript
const sessionUnwrapKey = getSessionUnwrapKey(); // ⚠️ PUEDE LANZAR ERROR
const documentKey = await unwrapDocumentKey(
  doc.wrapped_key,
  doc.wrap_iv,
  sessionUnwrapKey
);
```

**Flujo de falla:**

```
1. User crea documento1 con sessionSecret_A
   → wrapped_key_1 = wrap(documentKey_1, unwrapKey_A)

2. (Algo causa reinicialización)
   → sessionSecret_B → unwrapKey_B

3. User intenta compartir documento1
   → unwrapDocumentKey(wrapped_key_1, unwrapKey_B)
   → ❌ FALLA: "Failed to unwrap document key"
```

**Error actual:**

```javascript
// documentEncryption.ts - líneas 170-172
} catch (error) {
  console.error('Unwrap error:', error);
  throw new Error(CRYPTO_ERRORS.UNWRAP_FAILED);
}
```

**Mensaje al usuario:**
"Failed to unwrap document key. Session may have expired."

**Problemas:**
- ❌ Usuario NO entiende qué hacer
- ❌ NO hay forma de recuperar el documento (sessionSecret_A perdido)
- ❌ Documento queda inaccesible permanentemente

---

### 🔴 PROBLEMA 6: beforeunload Limpia Sesión Prematuramente

**Ubicación:** `sessionCrypto.ts` - líneas 75-77

```javascript
window.addEventListener('beforeunload', () => {
  clearSessionCrypto();
});
```

**Problema:**
`beforeunload` se dispara en MUCHOS casos, no solo al cerrar la tab:

- Refresh de página (F5)
- Navegación interna (si no usa React Router correctamente)
- Abrir developer tools en algunos navegadores
- Pérdida de foco en mobile

**Consecuencia:**
Limpieza prematura del `sessionSecret` → falla al volver a cargar la página.

**Solución:**
NO limpiar en `beforeunload`. Confiar en que `clearSessionCrypto()` se ejecuta en:
- Logout explícito
- Auth state change (SIGNED_OUT)

---

## 5. RESUMEN DE FLUJOS

### 5.1 Flujo de sessionSecret (ASCII)

```
┌──────────────────────────────────────────────────────────────────┐
│  CICLO DE VIDA DEL sessionSecret                                 │
└──────────────────────────────────────────────────────────────────┘

Login/Signup
     │
     ├─ useAuthWithE2E.onAuthStateChange('SIGNED_IN')
     │      ↓
     │  initE2ESession(userId)
     │      ↓
     │  ensureUserWrapSalt(userId) → wrap_salt (DB, público)
     │      ↓
     │  sessionSecret = randomBytes(32)  ← 🔴 RANDOM, VOLÁTIL
     │      ↓
     │  unwrapKey = PBKDF2(sessionSecret, wrap_salt)
     │      ↓
     │  _currentSession = { sessionSecret, unwrapKey, userId }
     │      ↓
     │  ✅ Sesión inicializada
     │
     ├─ (opcional) Crear documento
     │      ↓
     │  documentKey = generateDocumentKey()
     │      ↓
     │  wrappedKey = wrap(documentKey, unwrapKey)
     │      ↓
     │  DB.insert({ wrapped_key, wrap_iv })
     │
     ├─ (opcional) Compartir documento
     │      ↓
     │  documentKey = unwrap(wrappedKey, unwrapKey)  ← ⚠️ Requiere MISMO unwrapKey
     │      ↓
     │  OTP = generateOTP()
     │      ↓
     │  recipientKey = deriveKeyFromOTP(OTP, recipientSalt)
     │      ↓
     │  newWrappedKey = wrap(documentKey, recipientKey)
     │      ↓
     │  DB.insert({ wrapped_key: newWrappedKey, otp_hash })
     │
     ├─ Logout / Tab close
     │      ↓
     │  clearSessionCrypto()
     │      ↓
     │  zeroMemory(sessionSecret)
     │      ↓
     │  _currentSession = null
     │      ↓
     │  ❌ Todos los wrapped_key inaccesibles
     │
     └─ Re-login
            ↓
        NUEVO sessionSecret → NUEVO unwrapKey
            ↓
        Documentos previos INACCESIBLES (a menos que se persista sessionSecret)
```

### 5.2 Flujo de Keys (jerarquía)

```
┌─────────────────────────────────────────────────────────────────┐
│  JERARQUÍA DE CLAVES                                            │
└─────────────────────────────────────────────────────────────────┘

                  User Password (nunca almacenado)
                         │
                         │ (NO usado actualmente para E2E)
                         │
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  wrap_salt (DB, público)                                       │
│  - 16 bytes random                                             │
│  - Generado en signup                                          │
│  - NUNCA cambia                                                │
└────────────────────────────────────────────────────────────────┘
                         │
                         │ + sessionSecret (volátil)
                         ↓
                    PBKDF2 (100k iterations)
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  unwrapKey (memoria, NO extractable)                           │
│  - AES-256-GCM                                                 │
│  - Derivado de sessionSecret + wrap_salt                       │
│  - Usos: wrapKey, unwrapKey                                    │
└────────────────────────────────────────────────────────────────┘
                         │
                         │ Wrap/Unwrap
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  documentKey (memoria, extractable)                            │
│  - AES-256-GCM                                                 │
│  - Random por documento                                        │
│  - Usos: encrypt, decrypt                                      │
│  - Almacenado en DB como: wrapped_key (base64)                 │
└────────────────────────────────────────────────────────────────┘
                         │
                         │ Encrypt/Decrypt
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  Document PDF (Supabase Storage)                               │
│  - Encriptado con documentKey                                  │
│  - Formato: [IV (12 bytes) || Ciphertext || Auth Tag]         │
└────────────────────────────────────────────────────────────────┘

FLUJO DE COMPARTIR (re-wrapping):

┌────────────────────────────────────────────────────────────────┐
│  OTP (8 chars, cliente)                                        │
│  - Random, charset sin ambiguos                                │
│  - NUNCA enviado al servidor en plaintext                      │
└────────────────────────────────────────────────────────────────┘
                         │
                         │ + recipientSalt (16 bytes random)
                         ↓
                    PBKDF2 (100k iterations)
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  recipientKey (memoria, NO extractable)                        │
│  - AES-256-GCM                                                 │
│  - Derivado de OTP + recipientSalt                             │
│  - Usos: wrapKey, unwrapKey                                    │
└────────────────────────────────────────────────────────────────┘
                         │
                         │ Re-wrap documentKey
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  new wrapped_key (DB, tabla document_shares)                   │
│  - SOLO desencriptable con OTP correcto                        │
│  - Independiente del sessionSecret del owner                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. SOLUCIONES PROPUESTAS (NO IMPLEMENTADAS)

### Solución 1: Persistencia Segura del sessionSecret

**Objetivo:** Evitar pérdida de acceso a documentos tras refresh/tab close.

**Implementación:**

```javascript
// 1. En login, derivar encryptionKey del password
async function signIn(email, password) {
  // Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Derivar encryption key del password (KDF)
  const userSalt = await getUserSalt(data.user.id);
  const encryptionKey = await deriveKeyFromPassword(password, userSalt);

  // Generar sessionSecret
  const sessionSecret = randomBytes(32);

  // Encriptar sessionSecret
  const encryptedSessionSecret = await encryptAES(sessionSecret, encryptionKey);

  // Persistir en localStorage
  localStorage.setItem('e2e_session', JSON.stringify({
    userId: data.user.id,
    encryptedSessionSecret,
    iv,
  }));

  // Continuar con inicialización normal
  await initializeSessionCrypto(data.user.id, sessionSecret);
}

// 2. En page load, recuperar sessionSecret
async function recoverSession() {
  const stored = JSON.parse(localStorage.getItem('e2e_session'));
  if (!stored) return null;

  // Solicitar password al usuario (o usar cached en memoria)
  const password = await promptPassword();

  const userSalt = await getUserSalt(stored.userId);
  const encryptionKey = await deriveKeyFromPassword(password, userSalt);

  // Desencriptar sessionSecret
  const sessionSecret = await decryptAES(stored.encryptedSessionSecret, encryptionKey);

  // Re-inicializar sesión con el MISMO sessionSecret
  await initializeSessionCrypto(stored.userId, sessionSecret, { fromRecovery: true });
}
```

**Ventajas:**
- ✅ sessionSecret persiste entre refreshes
- ✅ Encriptado (no accesible por XSS sin password)
- ✅ Logout puede limpiar localStorage

**Desventajas:**
- ⚠️ Requiere solicitar password en cada sesión (UX)
- ⚠️ NO funciona con OAuth/magic link (no hay password)
- ⚠️ Complejidad adicional

---

### Solución 2: Singleton Global de initializeSessionCrypto

**Objetivo:** Evitar re-inicializaciones múltiples simultáneas.

**Implementación:**

```javascript
// sessionCrypto.ts

let _initPromise: Promise<void> | null = null;

export async function initializeSessionCrypto(
  userId: string,
  forceReinit: boolean = false
): Promise<void> {
  // Si ya hay una inicialización en curso, esperar
  if (_initPromise) {
    console.log('⏳ Waiting for existing initialization...');
    return _initPromise;
  }

  // Si ya inicializado, skip
  if (_currentSession && _currentSession.userId === userId && !forceReinit) {
    return;
  }

  // Iniciar nueva inicialización
  _initPromise = (async () => {
    try {
      // ... código actual de inicialización ...
    } finally {
      _initPromise = null;
    }
  })();

  return _initPromise;
}
```

**Ventajas:**
- ✅ Evita race conditions
- ✅ Múltiples llamadas simultáneas esperan al mismo Promise

---

### Solución 3: Eliminar beforeunload Listener

**Objetivo:** Evitar limpieza prematura del sessionSecret.

**Implementación:**

```javascript
// sessionCrypto.ts - ELIMINAR líneas 75-77

// ❌ NO hacer esto:
// window.addEventListener('beforeunload', () => {
//   clearSessionCrypto();
// });

// ✅ Confiar en:
// - useAuthWithE2E.signOut() (limpia explícitamente)
// - onAuthStateChange('SIGNED_OUT') (limpia en logout)
```

**Ventajas:**
- ✅ sessionSecret persiste en refreshes
- ✅ Evita falsos positivos

**Desventajas:**
- ⚠️ sessionSecret NO se limpia al cerrar tab (queda en memoria del browser)
- ⚠️ Posible leak si usuario cierra browser sin hacer logout

---

### Solución 4: Validación de sessionSecret al Unwrap

**Objetivo:** Detectar cuándo el unwrapKey cambió y notificar al usuario.

**Implementación:**

```javascript
// documentSharing.ts - shareDocument()

try {
  const sessionUnwrapKey = getSessionUnwrapKey();
  const documentKey = await unwrapDocumentKey(
    doc.wrapped_key,
    doc.wrap_iv,
    sessionUnwrapKey
  );
} catch (error) {
  if (error.message.includes('UNWRAP_FAILED')) {
    // Sesión crypto cambió, ofrecer recuperación
    const shouldReinitialize = confirm(
      'La sesión de cifrado cambió. ¿Reiniciar sesión para acceder a este documento?'
    );

    if (shouldReinitialize) {
      // Prompt password → recover sessionSecret → retry
      await recoverSessionWithPassword();
      return shareDocument(options); // Retry
    }
  }

  throw error;
}
```

**Ventajas:**
- ✅ Usuario entiende el problema
- ✅ Ofrece path de recuperación

---

### Solución 5: Almacenar sessionSecret Hasheado en DB

**Objetivo:** Validar que el sessionSecret actual es el correcto para un documento.

**Implementación:**

```javascript
// Al crear documento, almacenar hash del sessionSecret
const sessionSecretHash = await sha256(sessionSecret);

await supabase.from('user_documents').insert({
  // ... otros campos ...
  session_hash: sessionSecretHash, // SHA-256(sessionSecret)
});

// Al intentar unwrap, validar
const { data: doc } = await supabase.from('user_documents').select(...).single();

const currentSessionSecretHash = await sha256(_currentSession.sessionSecret);

if (currentSessionSecretHash !== doc.session_hash) {
  throw new Error('Session mismatch: Cannot unwrap document with current session');
}
```

**Ventajas:**
- ✅ Detección temprana de session mismatch
- ✅ Evita unwrap attempts inútiles

**Desventajas:**
- ⚠️ Requiere columna adicional en DB
- ⚠️ NO resuelve el problema (solo lo detecta)

---

### Solución 6: Centralizar Inicialización en App.tsx

**Objetivo:** Inicializar sesión UNA SOLA VEZ al cargar la app.

**Implementación:**

```javascript
// App.tsx
function App() {
  useAuthWithE2E(); // ÚNICO lugar donde se inicializa

  return (
    <Router>
      <Routes>
        {/* ... */}
      </Routes>
    </Router>
  );
}

// ShareDocumentModal.tsx - ELIMINAR useEffect de inicialización
// ❌ NO hacer esto:
// useEffect(() => {
//   if (!isSessionInitialized()) {
//     await initializeSessionCrypto(user.id);
//   }
// }, []);

// ✅ Asumir que la sesión YA está inicializada
const handleShare = () => {
  if (!isSessionInitialized()) {
    throw new Error('Session not initialized. Please refresh the page.');
  }

  // ... continuar con share ...
};
```

**Ventajas:**
- ✅ Inicialización centralizada (un solo punto de entrada)
- ✅ Evita re-inicializaciones accidentales

---

## 7. RECOMENDACIONES FINALES

### 7.1 Prioridad Alta

1. **Eliminar `beforeunload` listener** (Solución 3)
   - Causa limpiezas prematuras
   - Falsos positivos en refreshes

2. **Implementar singleton de inicialización** (Solución 2)
   - Evita race conditions
   - Seguro y fácil de implementar

3. **Centralizar inicialización en App.tsx** (Solución 6)
   - Un solo punto de entrada
   - Eliminar inicializaciones defensivas en ShareDocumentModal y documentStorage

### 7.2 Prioridad Media

4. **Validación de sessionSecret al unwrap** (Solución 4)
   - Mejor UX en caso de falla
   - Usuario entiende qué pasó

5. **Logging y monitoreo**
   - Agregar logs detallados de inicializaciones
   - Detectar re-inicializaciones no deseadas

### 7.3 Prioridad Baja (Requiere Diseño)

6. **Persistencia segura del sessionSecret** (Solución 1)
   - Evaluar UX de solicitar password en cada sesión
   - Considerar solo para usuarios con password (no OAuth)

7. **Hash de validación en DB** (Solución 5)
   - Útil para debugging
   - NO resuelve el problema, solo lo detecta

---

## 8. CONCLUSIONES

### Estado Actual

El sistema de encriptación E2E está **correctamente implementado** desde el punto de vista criptográfico:

✅ **Fortalezas:**
- Zero Server-Side Knowledge real
- Algoritmos robustos (AES-256-GCM, PBKDF2)
- Protección contra reinicialización (parcial)
- Separación correcta de responsabilidades (documentKey, unwrapKey, OTP)

❌ **Debilidades:**
- sessionSecret volátil (no persiste entre refreshes)
- Múltiples puntos de inicialización (riesgo de race conditions)
- `beforeunload` listener problemático
- UX pobre en caso de session mismatch

### Riesgo de Pérdida de Datos

**Escenario actual:**
- Usuario crea documento → Refresh página → Documento INACCESIBLE
- Probabilidad: **BAJA** (protecciones parciales funcionan en la mayoría de casos)
- Impacto: **ALTO** (pérdida permanente de acceso)

**Mitigación recomendada:**
1. Eliminar `beforeunload` listener (Prioridad ALTA)
2. Implementar singleton de inicialización (Prioridad ALTA)
3. Centralizar en App.tsx (Prioridad ALTA)

### Arquitectura Recomendada

```
┌─────────────────────────────────────────────────────────────────┐
│  FLUJO IDEAL                                                    │
└─────────────────────────────────────────────────────────────────┘

Login
  ↓
App.tsx → useAuthWithE2E → initE2ESession (UNA VEZ)
  ↓
sessionSecret (memoria, NO persiste)
  ↓
Todas las operaciones asumen sesión inicializada
  ↓
Logout → clearSessionCrypto (explícito)
```

### Trade-offs

**Seguridad vs UX:**
- **Máxima seguridad:** sessionSecret volátil (estado actual) → UX pobre
- **Balance:** sessionSecret encriptado en localStorage → Requiere password
- **Máxima UX:** sessionSecret en localStorage plaintext → **INSEGURO**

**Recomendación:** Mantener estado actual (volátil) + mejorar inicialización (Soluciones 2, 3, 6).

---

**Fin del análisis.**
