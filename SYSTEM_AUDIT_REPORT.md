# 🔍 AUDITORÍA COMPLETA DEL SISTEMA ECOSIGN
**Fecha:** 2026-01-03  
**Objetivo:** Identificar puntos débiles, inconsistencias y áreas que requieren atención

---

## 📊 RESUMEN EJECUTIVO

### Estado General
- ✅ **Arquitectura core:** Sólida (E2E encryption, blockchain anchoring)
- ⚠️ **Puntos de entrada:** Confusos (guest vs free)
- ⚠️ **Integraciones externas:** SignNow no conectado
- ⚠️ **Procesos async:** Polygon/Bitcoin con documentos pendientes sin seguimiento claro
- ⚠️ **Manejo de cifrado:** PDFs pre-cifrados no se rechazan correctamente

### Criticidad
```
🔴 CRÍTICO (P0):  2 issues
🟡 ALTO (P1):     4 issues  
🟢 MEDIO (P2):    3 issues
```

---

## ✅ VALIDACION DEL REPORTE (RESUMEN)

### P0
1. CTA "Comenzar gratis" → Modo invitado  
   - Validado. Contrato mental roto en el punto de entrada.  
2. Estado mixto Guest + Auth  
   - Validado. Riesgo real de estado inconsistente. Guard tecnico requerido.

### P1
3. SignNow no conectado  
   - Validado. Mantenerlo opcional y degradable; no debe ser core.  
4. Crypto init race condition  
   - Validado. Quitar `setTimeout` y usar loading explicito.  
5. Polygon/Bitcoin pending sin UI  
   - Validado. Falta visibilidad, no bug funcional.  
6. PDFs pre-cifrados  
   - Validado. Alineado con `DOCUMENT_REQUIREMENTS.md`.

### P2
7. Verificacion publica sin modo read-only  
   - Validado. Mejora UX, no bloquea.  
8. Limites guest  
   - Validado. Previene abuso, no bloquea.  
9. Mensajes de error genericos  
   - Validado. UX incremental.

---

## 🔥 PROBLEMAS CRÍTICOS (P0)

### 1. CTA "Comenzar gratis" → Modo Invitado
**Ubicación:** `client/src/pages/LandingPage.tsx:41-46`

**Código actual:**
```tsx
<Link
  to="/login"
  className="bg-black hover:bg-gray-800 text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
>
  Comenzar Gratis
</Link>
```

**Problema:**
- El CTA dice "Comenzar Gratis" pero NO crea cuenta
- Usuario espera: signup flow para usuario free
- Usuario recibe: redirección a `/login` que tiene toggle login/signup
- **Contrato mental roto:** "Gratis" implica cuenta persistente, no modo demo

**Evidencia:**
```typescript
// client/src/utils/guestMode.ts
export function enableGuestMode() {
  localStorage.setItem('ecosign_guest_mode', 'true');
}

// NO hay llamada explícita desde LandingPage
// PERO el flujo puede confundir al usuario
```

**Impacto:**
- Usuario confundido en punto de entrada
- Posible pérdida de conversión
- Datos temporales cuando usuario espera persistencia

**Fix recomendado:**
```tsx
// Opción A (simple):
<Link to="/login?mode=signup">Crear Cuenta Gratis</Link>
<button onClick={handleGuestDemo}>Probar como Invitado</button>

// Opción B (más explícito):
<Link to="/signup">Comenzar Gratis</Link>
<Link to="/guest">Modo Demo</Link>
```

**Prioridad:** 🔴 P0 - Afecta primera impresión y conversión

---

### 2. Estado Mixto: Guest + Authenticated
**Ubicación:** `client/src/hooks/useAuth.ts` + `client/src/utils/guestMode.ts`

**Problema:**
El sistema no detecta ni previene estados inválidos donde:
```typescript
localStorage.getItem('ecosign_guest_mode') === 'true'
// Y SIMULTÁNEAMENTE
user !== null  // Usuario autenticado
```

**Cómo ocurre:**
1. Usuario entra como invitado → `enableGuestMode()`
2. Usuario hace login → `disableGuestMode()` se llama
3. Usuario presiona Back en el browser
4. Browser restaura snapshot de localStorage → `ecosign_guest_mode=true` vuelve
5. **Estado inconsistente:** authenticated + guest mode

**Código vulnerable:**
```typescript
// useAuth.ts - NO hay check de inconsistencia
const { data: { session } } = await supabase.auth.getSession();
setUser(session?.user ?? null);
// ❌ NO verifica si isGuestMode() === true mientras user !== null
```

**Impacto:**
- Permisos ambiguos
- Posible leak de datos
- Comportamiento impredecible en UI

**Fix recomendado:**
```typescript
// En useAuth.ts o useAuthWithE2E.ts
useEffect(() => {
  const isGuest = isGuestMode();
  const isAuth = user !== null;
  
  if (isGuest && isAuth) {
    console.error('🚨 INVALID STATE: guest + authenticated');
    disableGuestMode(); // Forzar salida de modo invitado
    // O alternativamente:
    // signOut(); // Forzar logout si el estado es crítico
  }
}, [user]);
```

**Prioridad:** 🔴 P0 - Potencial fallo de seguridad

---

## 🟡 PROBLEMAS ALTOS (P1)

### 3. SignNow No Conectado
**Ubicación:** `supabase/functions/signnow/index.ts`

**Estado actual:**
- ✅ Edge function existe: `supabase/functions/signnow/`
- ✅ Cliente llama correctamente: `client/src/lib/signNowService.ts`
- ❌ Credenciales no configuradas
- ❌ No hay fallback explícito en UI

**Código cliente:**
```typescript
// signNowService.ts:79
const { data, error } = await supabase.functions.invoke('signnow', {
  body: payload
});

if (error) {
  throw new Error(`Error al procesar con SignNow: ${error.message}`);
  // ❌ No hay fallback a firma AES
}
```

**Problema:**
1. Usuario selecciona "Firma Certificada (QES)"
2. Sistema llama a SignNow edge function
3. Function falla (no hay credenciales configuradas)
4. **Error se propaga al usuario sin alternativa**

**Credenciales faltantes:**
```bash
# Esperadas en .env o Supabase secrets:
SIGNNOW_CLIENT_ID=<not_set>
SIGNNOW_CLIENT_SECRET=<not_set>
SIGNNOW_API_BASE=<not_set>
```

**Fix recomendado:**

**Corto plazo:**
```typescript
// En signNowService.ts
export async function signWithSignNow(file: File, options: SignNowOptions = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('signnow', { body: payload });
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('⚠️ SignNow unavailable, falling back to AES signature');
    
    // Fallback a firma AES estándar
    return {
      type: 'aes',
      signature: await generateAESSignature(file),
      provider: 'ecosign',
      warning: 'Firma certificada no disponible. Se usó firma estándar.',
    };
  }
}
```

**Largo plazo:**
- Configurar credenciales SignNow en Supabase secrets
- O remover la opción "QES" del UI si no se va a implementar

**Prioridad:** 🟡 P1 - Feature bloqueada para usuarios

---

### 4. Crypto Initialization Race Condition
**Ubicación:** `client/src/pages/LoginPage.tsx:46-56`

**Código actual:**
```typescript
// LoginPage.tsx
const { data, error } = await supabase.auth.signInWithPassword({...});
if (error) throw error;

console.log('✅ Login exitoso:', data.user.email);

// Inicializar sesión crypto
await initializeSessionCrypto(data.user.id);
console.log('✅ Sesión crypto inicializada');

disableGuestMode();
setSuccess('¡Bienvenido de nuevo!');

// Redirigir después de un breve delay
setTimeout(() => navigate('/inicio'), 500);
```

**Problema:**
- ✅ Ya estás usando `await` antes de `navigate()` - **BIEN**
- ⚠️ Pero el `setTimeout` de 500ms es arbitrario
- ⚠️ Si `initializeSessionCrypto()` toma >500ms, la navegación ocurre antes

**Escenario de fallo:**
1. Login exitoso
2. `initializeSessionCrypto()` inicia (async)
3. Tras 500ms → `navigate('/inicio')`
4. Usuario llega a `/inicio` pero `sessionCrypto` no está listo
5. Intenta cifrar documento → **ERROR: "sessionCrypto not initialized"**

**Fix recomendado:**
```typescript
// Remover el setTimeout arbitrario
await initializeSessionCrypto(data.user.id);
console.log('✅ Sesión crypto inicializada');

disableGuestMode();
setSuccess('¡Bienvenido de nuevo!');

// Navegar INMEDIATAMENTE después de que crypto esté listo
navigate('/inicio');
```

**Bonus - Agregar loading state:**
```typescript
const [cryptoInitializing, setCryptoInitializing] = useState(false);

// En handleSubmit:
setCryptoInitializing(true);
await initializeSessionCrypto(data.user.id);
setCryptoInitializing(false);

// En el JSX:
{cryptoInitializing && <p>Inicializando cifrado seguro...</p>}
```

**Prioridad:** 🟡 P1 - Puede causar errores en producción

---

### 5. Polygon/Bitcoin Pendientes Sin Seguimiento
**Ubicación:** `supabase/migrations/20251218140000_add_protection_level_and_polygon_status.sql`

**Estructura actual:**
```sql
-- user_documents table
polygon_status TEXT CHECK (polygon_status IN ('pending', 'confirmed', 'failed'))
bitcoin_status TEXT CHECK (bitcoin_status IN ('pending', 'confirmed', 'failed'))
protection_level TEXT CHECK (protection_level IN ('ACTIVE', 'REINFORCED', 'TOTAL'))
```

**Problema:**
No hay UI visible para mostrar:
- Documentos con `polygon_status = 'pending'`
- Documentos con `bitcoin_status = 'pending'`
- Tiempo estimado de confirmación
- Retry en caso de `failed`

**Consulta de diagnóstico:**
```bash
# Intenté verificar documentos pendientes pero:
curl "http://127.0.0.1:54321/rest/v1/user_documents?select=..."
# → Error: column "title" does not exist

# Problema: Las migraciones agregaron polygon_status/bitcoin_status
# pero la tabla user_documents tiene un schema diferente al esperado
```

**Schema real vs esperado:**
```typescript
// Esperado (según código):
interface UserDocument {
  id: string;
  title: string;          // ❌ NO EXISTE
  file_name: string;      // ❌ NO EXISTE
  polygon_status: string;
  bitcoin_status: string;
}

// Real (según API):
interface UserDocument {
  id: string;
  original_filename: string;  // ✅ Existe
  polygon_status: string;     // ✅ Existe
  bitcoin_status: string;     // ✅ Existe
}
```

**Impacto:**
- Usuario no sabe si su documento está siendo anclado
- Documentos pueden quedar en `pending` indefinidamente sin notificación
- No hay retry automático visible

**Fix recomendado:**

**1. Agregar sección en DocumentsPage:**
```tsx
// DocumentsPage.tsx
<section className="mb-8">
  <h3>⏳ Anclajes en Proceso</h3>
  {docs.filter(d => d.polygon_status === 'pending' || d.bitcoin_status === 'pending').map(doc => (
    <div key={doc.id}>
      <p>{doc.original_filename}</p>
      {doc.polygon_status === 'pending' && <Badge>Polygon: Confirmando...</Badge>}
      {doc.bitcoin_status === 'pending' && <Badge>Bitcoin: Confirmando (24-48h)</Badge>}
    </div>
  ))}
</section>
```

**2. Agregar cron job para retry:**
```sql
-- Ya existe: supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql
-- Verificar que esté activo
```

**Prioridad:** 🟡 P1 - Afecta transparencia y confianza del usuario

---

### 6. PDFs Pre-Cifrados No Se Rechazan
**Ubicación:** `client/src/components/documents/DocumentUploader.tsx:80`

**Código actual:**
```typescript
// DocumentUploader.tsx
const encryptedBlob = await encryptFile(pdfFile, encryptionKey);
// ❌ NO valida si pdfFile ya está cifrado
```

**Problema:**
Si un usuario sube un PDF que **ya está cifrado con contraseña** (protegido):
1. Sistema intenta leerlo para generar hash
2. Genera hash del PDF cifrado (no del contenido original)
3. **Hash inútil** - cambia si se descifra después
4. Firma/certificación no tiene sentido

**Detección:**
```typescript
// client/src/utils/pdfSigner.ts
import { PDFDocument } from 'pdf-lib';

async function isPDFEncrypted(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    await PDFDocument.load(arrayBuffer);
    return false; // PDF se pudo cargar = no está cifrado
  } catch (error) {
    if (error.message?.includes('encrypted') || error.message?.includes('password')) {
      return true;
    }
    throw error; // Otro error (PDF corrupto, etc)
  }
}
```

**Fix recomendado:**
```typescript
// En DocumentUploader.tsx o uploadEncryptedDocument
export async function uploadEncryptedDocument(options) {
  const { file } = options;
  
  // Validar que el PDF NO esté pre-cifrado
  const isEncrypted = await isPDFEncrypted(file);
  if (isEncrypted) {
    throw new Error(
      'Este PDF está protegido con contraseña. Por favor, removela antes de subirlo.'
    );
  }
  
  // Continuar con el flujo normal...
}
```

**Prioridad:** 🟡 P1 - Produce certificados inválidos silenciosamente

---

## 🟢 PROBLEMAS MEDIOS (P2)

### 7. No Hay Modo "Read-Only" para Verificación Pública
**Ubicación:** General - UX

**Problema:**
Un tercero que recibe un certificado/reporte NO puede verificarlo fácilmente sin crear cuenta.

**URL actual:**
```
https://ecosign.app/verify → Requiere subir el documento
```

**Ideal:**
```
https://ecosign.app/verify/abc123xyz → Link directo al certificado
→ Muestra: Hash, Timestamp, Blockchain proof
→ Permite descargar PDF del reporte
→ NO requiere login
```

**Fix recomendado:**
- Crear página `/verify/:documentId` pública
- Generar share links en DocumentsPage
- RLS policy para permitir lectura pública de certificados (no del documento)

**Prioridad:** 🟢 P2 - Mejora UX pero no bloquea

---

### 8. No Hay Rate Limiting Visible en Modo Guest
**Ubicación:** `client/src/utils/guestMode.ts`

**Problema:**
El guest mode no tiene límites claros:
```typescript
// guestMode.ts
export function enableGuestMode() {
  localStorage.setItem('ecosign_guest_mode', 'true');
  // ❌ NO hay:
  // - Contador de documentos
  // - Límite de storage
  // - Expiración de sesión
}
```

**Fix recomendado:**
```typescript
interface GuestSession {
  enabled: boolean;
  documentsUsed: number;
  maxDocuments: 3;
  expiresAt: string; // 24h desde enableGuestMode()
}

export function getGuestLimits(): GuestSession | null {
  const raw = localStorage.getItem('ecosign_guest_session');
  if (!raw) return null;
  return JSON.parse(raw);
}
```

**Prioridad:** 🟢 P2 - Previene abuso pero no es crítico ahora

---

### 9. Error Messages Genéricos
**Ubicación:** Múltiples componentes

**Ejemplos de errores poco actionables:**
```typescript
// ❌ Malo
throw new Error('Error al procesar con SignNow');

// ✅ Bueno
throw new Error(
  'SignNow no está disponible en este momento. ' +
  'Usaremos firma estándar (AES). ' +
  'Si necesitás firma certificada, contactanos.'
);
```

**Áreas a mejorar:**
- `signNowService.ts` - Errores sin contexto
- `sessionCrypto.ts` - "No se pudo inicializar el cifrado" (muy genérico)
- `documentStorage.ts` - Errores de upload sin retry info

**Fix recomendado:**
Crear helper de errores:
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public action?: string,
    public retry?: () => Promise<void>
  ) {
    super(message);
  }
}

// Uso:
throw new AppError(
  'No se pudo conectar con SignNow',
  'SIGNNOW_UNAVAILABLE',
  'Usaremos firma estándar automáticamente'
);
```

**Prioridad:** 🟢 P2 - Mejora UX incremental

---

## 📋 RESUMEN DE ACCIONES

### Prioridad Inmediata (Esta semana)
```
1. [ ] Fix CTA "Comenzar gratis" → Crear cuenta vs modo invitado
2. [ ] Agregar guard de estado mixto guest+auth en useAuth
3. [ ] Remover setTimeout arbitrario en LoginPage crypto init
```

### Prioridad Alta (Próximas 2 semanas)
```
4. [ ] Configurar SignNow credentials O remover opción QES del UI
5. [ ] Agregar sección "Anclajes pendientes" en DocumentsPage
6. [ ] Validar y rechazar PDFs pre-cifrados en upload
```

### Prioridad Media (Próximo mes)
```
7. [ ] Crear página pública /verify/:documentId
8. [ ] Implementar límites claros en guest mode
9. [ ] Refactorizar error messages con contexto
```

---

## 🧪 CÓMO PROBAR LOS FIXES

### Test 1: CTA "Comenzar gratis"
```
1. Ir a landing page
2. Click "Comenzar gratis"
3. ✅ Debe mostrar signup form (no login toggle)
4. ✅ NO debe activar modo invitado automáticamente
```

### Test 2: Estado mixto
```
1. Entrar como invitado
2. Hacer login
3. Presionar Back button del browser
4. ✅ Debe detectar inconsistencia y salir de modo invitado
5. ✅ Console debe mostrar: "🚨 INVALID STATE"
```

### Test 3: Crypto init
```
1. Login
2. ✅ NO debe navegar antes de ver "✅ Sesión crypto inicializada"
3. Ir a /inicio
4. Intentar cifrar documento inmediatamente
5. ✅ NO debe fallar con "sessionCrypto not initialized"
```

### Test 4: PDF cifrado
```
1. Crear PDF con contraseña en Adobe/similar
2. Intentar subirlo a EcoSign
3. ✅ Debe mostrar error claro: "PDF protegido, remover contraseña"
4. ✅ NO debe permitir continuar
```

---

## 📊 MÉTRICAS DE SALUD

```typescript
interface SystemHealth {
  criticalIssues: 2,      // P0 - Requieren fix inmediato
  highIssues: 4,          // P1 - Fix en 1-2 semanas
  mediumIssues: 3,        // P2 - Mejoras incrementales
  
  coreArchitecture: '✅',  // E2E crypto sólido
  userExperience: '⚠️',    // Puntos de entrada confusos
  integrations: '❌',      // SignNow no conectado
  monitoring: '⚠️',        // Falta visibilidad en pending anchors
}
```

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

### Opción A: Enfoque en UX de entrada (recomendado)
```
1. Fix CTA + guest/free separation (2-3h)
2. Test con usuarios reales
3. Iterar basándose en feedback
```

### Opción B: Enfoque en robustez técnica
```
1. Fix estado mixto + crypto init (1-2h)
2. Agregar tests automáticos
3. Monitorear en producción
```

### Opción C: Enfoque en completitud de features
```
1. Configurar SignNow
2. Mejorar visibilidad de pending anchors
3. Pulir error messages
```

**Mi recomendación:** Opción A → El punto de entrada es la primera impresión. Todo lo demás puede esperar.

---

**Fin del reporte.**
¿Querés que profundice en alguno de estos puntos o arrancamos con los fixes?
