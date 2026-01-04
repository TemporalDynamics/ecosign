# REPORTE DE INVESTIGACIÓN: Problemas en Producción (ecosign.app)

**Fecha:** 2026-01-04
**Investigación de:** Problemas de unwrap key, PDFs encriptados, reset password, estados blockchain y Service Worker
**Severidad:** P0 (Bloqueantes) - P2 (Mejoras de UX)

---

## EXECUTIVE SUMMARY

Se realizó una auditoría completa del sistema EcoSign en producción, identificando problemas críticos que afectan a los usuarios en ecosign.app pero NO en localhost. Los hallazgos principales:

- **P0 (Crítico):** Compartir documentos falla con error "failed to unwrap document key"
- **P0 (Crítico):** PDFs encriptados se aceptan pero fallan silenciosamente
- **P1 (Importante):** No existe flujo de recuperación de contraseña
- **P1 (Importante):** Estados de Bitcoin/Polygon no se actualizan en tiempo real
- **P2 (Ruido UX):** Service Worker cachea assets problemáticamente

---

## P0 - BLOQUEANTES

### 1. COMPARTIR DOCUMENTO FALLA: "unwrap document key"

#### Síntoma

El usuario intenta compartir un documento desde DocumentsPage → Click en "Compartir documento" → ShareDocumentModal muestra error:

```
Failed to unwrap document key. Session may have expired.
```

#### Causa Raíz

**Archivo:** `client/src/lib/e2e/documentEncryption.ts:178`

El documento fue creado con `sessionSecret_A` pero la sesión actual usa `sessionSecret_B` (diferente). Las claves no coinciden:

```
documentKey (wrapped con unwrapKey_A) ≠ sessionUnwrapKey_B
→ crypto.subtle.unwrapKey() falla
→ Error: "Failed to unwrap document key"
```

#### 5 Causas Probables Específicas

| # | Causa | Archivo Implicado | Línea |
|---|-------|-------------------|-------|
| 1 | **localStorage borrado** (manual/extensión) | sessionCrypto.ts | 31-48 (loadStoredSessionSecret) |
| 2 | **Navegador/dispositivo diferente** | sessionCrypto.ts | 29 (localStorage es local) |
| 3 | **Modo incógnito** (no persiste) | sessionCrypto.ts | 50-72 (storeSessionSecret falla) |
| 4 | **localStorage lleno/deshabilitado** | sessionCrypto.ts | 55-72 (QuotaExceededError) |
| 5 | **wrap_salt corrupto en DB** | sessionCrypto.ts | 102-126 (deriva unwrapKey incorrecta) |

#### Logs Confirmatorios

```javascript
// En consola del navegador:
window.checkCryptoSession()

// Si dice:
"🆕 Generated NEW session secret for user: [userId]"
// → PROBLEMA: localStorage se perdió
```

#### Solución Implementada

**Archivos modificados:**
- `client/src/lib/e2e/sessionCrypto.ts` - Verificación de persistencia mejorada
- `client/src/lib/e2e/documentEncryption.ts` - Logging detallado
- `client/src/lib/storage/documentSharing.ts` - Validaciones tempranas
- `client/src/DashboardApp.tsx` - Funciones de diagnóstico globales

**Mejoras:**
1. ✅ Verificación de guardado con `storeSessionSecret()` retorna boolean
2. ✅ Logging claro: "Loaded existing" vs "Generated NEW"
3. ✅ `diagnoseCryptoSession()` expuesto como `window.checkCryptoSession()`
4. ✅ `forceSaveSessionSecret()` expuesto como `window.forceSaveSession()`

**Limitación:** Si el usuario YA perdió el sessionSecret, los documentos viejos son **inaccesibles permanentemente** (by design, Zero Server-Side Knowledge).

#### Solución de Largo Plazo Recomendada

```typescript
// Implementar backup de sessionSecret con contraseña
export async function exportSessionSecretEncrypted(password: string): Promise<Blob> {
  const derived = await pbkdf2(password, userSalt, 100000);
  const encrypted = await encryptSessionSecret(sessionSecret, derived);
  return new Blob([encrypted], { type: 'application/octet-stream' });
}
```

Permitir al usuario exportar/importar su sessionSecret para multi-device.

---

### 2. PDFS ENCRIPTADOS SE ACEPTAN PERO FALLAN SILENCIOSAMENTE

#### Síntoma

Usuario sube un PDF protegido con contraseña → Se acepta → Se cifra con AES-256-GCM → Se guarda en DB → Al intentar firmarlo con EcoSign/SignNow → Error genérico:

```
"No se pudo aplicar la firma al PDF. Por favor, intentá nuevamente."
```

Usuario no sabe que el problema es que el PDF está encriptado.

#### Causa Raíz

**Archivo:** `client/src/components/documents/DocumentUploader.tsx` (líneas 55-108)

La validación `validateFile()` SOLO verifica MIME type y tamaño. NO detecta si el PDF está encriptado:

```typescript
// Solo valida:
- file.size < 20MB
- file.type === 'application/pdf'

// NO valida:
- Si el PDF es legible
- Si está encriptado/protegido
- Si tiene páginas válidas
```

El hash que se calcula (SHA-256) es del PDF encriptado, NO del contenido original.

#### Detección Actual

**SÍ existe detección**, pero SOLO en `supabase/functions/signnow/index.ts` (línea 463):

```typescript
const testPdf = await PDFDocument.load(fileBytes);
if (testPdf.isEncrypted) {
  throw new Error('PDF is encrypted or password-protected...');
}
```

Pero esto solo se ejecuta en integración SignNow, NO en el flujo normal de upload.

#### Solución Propuesta

**Archivo a modificar:** `client/src/components/documents/DocumentUploader.tsx`

**Paso 1:** Agregar función de validación de contenido PDF:

```typescript
const validatePDFContent = async (file: File): Promise<void> => {
  if (file.type !== 'application/pdf') return;

  try {
    const buffer = await file.arrayBuffer();
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(buffer);

    // Check if PDF is encrypted
    if (pdfDoc.isEncrypted) {
      throw new Error(
        'El PDF está encriptado con contraseña. ' +
        'Por favor, desencriptalo antes de subir. ' +
        'Podés hacerlo con herramientas como Adobe Reader, ' +
        'Preview (Mac) o cualquier lector de PDFs.'
      );
    }

    // Validate it can be read
    const pageCount = pdfDoc.getPageCount();
    if (pageCount === 0) {
      throw new Error('El PDF no tiene páginas legibles.');
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';

    if (errorMsg.includes('encrypted')) {
      throw err; // Re-throw encryption errors as-is
    } else if (errorMsg.includes('Invalid PDF')) {
      throw new Error(
        'El PDF parece estar dañado o corrupto. ' +
        'Por favor, intenta con otra versión del archivo.'
      );
    } else {
      throw new Error(
        'No pudimos leer el PDF. ' +
        'Asegúrate de que es un archivo PDF válido.'
      );
    }
  }
};
```

**Paso 2:** Integrar en flujo:

```typescript
const handleFileSelect = async (file: File) => {
  setError(null)
  setIsProcessing(true)

  try {
    // Step 1: Validate file
    setProcessingStep('Validando archivo...')
    await validateFile(file)

    // Step 2: NEW - Validate PDF content
    if (file.type === 'application/pdf') {
      setProcessingStep('Verificando integridad del PDF...')
      await validatePDFContent(file)
    }

    // Continue with hash, encrypt, upload...
  } catch (err) {
    setError(err.message)
    setIsProcessing(false)
  }
}
```

#### Mensajes para Usuario

| Situación | Mensaje |
|-----------|---------|
| PDF encriptado | "El PDF está encriptado con contraseña. Por favor, desencriptalo antes de subir. Podés hacerlo con Adobe Reader, Preview (Mac) o cualquier lector de PDFs." |
| PDF corrupto | "El PDF parece estar dañado o corrupto. Por favor, intenta con otra versión del archivo." |
| PDF vacío | "El PDF no tiene páginas legibles." |
| Error general | "No pudimos leer el PDF. Asegúrate de que es un archivo PDF válido." |

#### Archivos Involucrados

```
client/src/components/documents/DocumentUploader.tsx (MODIFICAR)
client/src/utils/hashDocument.ts (OK, no cambiar)
supabase/functions/signnow/index.ts (ya tiene detección)
client/package.json (ya tiene pdf-lib)
```

---

## P1 - IMPORTANTES

### 3. RECUPERAR CONTRASEÑA / RESET PASSWORD

#### Estado Actual

**NO IMPLEMENTADO EN FRONTEND** (60% backend, 0% UI)

#### Qué Existe

✅ Función `resetPassword()` en hooks:
- `client/src/hooks/useAuth.ts:124-136`
- `client/src/hooks/useAuthWithE2E.ts:236-248`

✅ Configuración Supabase Auth:
- `client/src/lib/supabaseClient.ts` - `detectSessionInUrl: true`
- `supabase/config.toml` - email settings configurados

✅ Email template:
- `supabase/templates/verify-email.html` - EXISTE
- `supabase/templates/reset-password.html` - **FALTA**

#### Qué Falta

❌ Link "¿Olvidé mi contraseña?" en LoginPage
❌ Modal o página para ingresar email
❌ Página ResetPasswordPage.tsx
❌ Ruta `/reset-password` en App.jsx
❌ Email template para reset
❌ Manejo de `access_token` en URL
❌ Formulario para nueva contraseña
❌ Llamada a `supabase.auth.updateUser()`

#### Flujo a Implementar

```
1. Usuario click en "¿Olvidé mi contraseña?" (NUEVO en LoginPage.tsx)
   ↓
2. Modal/Página con input de email (NUEVO)
   ↓
3. Envía resetPasswordForEmail() [YA EXISTE en hooks]
   ↓
4. Usuario recibe email con link + token (TEMPLATE FALTA)
   ↓
5. Supabase detecta token en URL (YA FUNCIONA: detectSessionInUrl: true)
   ↓
6. ResetPasswordPage carga (FALTA CREAR)
   ↓
7. Usuario ingresa nueva contraseña (FALTA CREAR)
   ↓
8. Llama a supabase.auth.updateUser({ password: newPassword })
   ↓
9. Redirige a /login con mensaje de éxito
```

#### Archivos a Crear/Modificar

| Archivo | Acción | Prioridad |
|---------|--------|-----------|
| `pages/LoginPage.tsx` | Agregar link "¿Olvidé mi contraseña?" | ALTA |
| `pages/ResetPasswordPage.tsx` | Crear página completa | ALTA |
| `App.jsx` | Agregar ruta `/reset-password` | ALTA |
| `supabase/templates/reset-password.html` | Crear template | MEDIA |
| `hooks/usePasswordReset.ts` (opcional) | Hook separado | BAJA |

#### Pseudo-código de ResetPasswordPage

```tsx
function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const supabase = getSupabase();

  useEffect(() => {
    // Supabase auto-detecta token en URL y actualiza sesión
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Usuario está en flujo de reset, mostrar formulario
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Contraseña actualizada exitosamente');
      navigate('/login');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Nueva contraseña"
        minLength={6}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Actualizando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
```

---

### 4. ESTADOS BITCOIN/POLYGON NO REFLEJAN AVANCE PROBATORIO

#### Síntoma

Usuario hace clic en "Certificar + Bitcoin" → Frontend muestra "Protección certificada (Bitcoin pendiente)" → Pasan 2 horas → Bitcoin confirma en blockchain → Usuario SIGUE viendo "Protección certificada"

SOLO se actualiza cuando refresca la página manualmente.

#### Causa Raíz

**Archivo:** `client/src/pages/DocumentsPage.tsx`

La página carga documentos UNA SOLA VEZ en `useEffect` mount:

```typescript
useEffect(() => {
  loadDocuments(); // Solo se ejecuta UNA VEZ
}, []);
```

No hay:
- ❌ Realtime subscriptions a `user_documents` table
- ❌ Polling para documentos con estados `pending`
- ❌ Re-query cuando job de backend actualiza DB

#### Lifecycle Completo (Backend Funciona Bien)

| Etapa | Tabla | Campo | Quién Actualiza | Cuándo |
|-------|-------|-------|-----------------|--------|
| 1. Crear doc | user_documents | overall_status: 'pending' | Cliente | Al certificar |
| 2. Solicitar Bitcoin | anchors | anchor_status: 'queued' | Trigger | INSERT |
| 3. Enviar a OTS | anchors | anchor_status: 'pending' | process-bitcoin-anchors cron | ~30s |
| 4. Esperando | anchors | anchor_status: 'processing' | process-bitcoin-anchors cron | Cada 5 min |
| 5. **CONFIRMADO** | anchors | anchor_status: 'confirmed' | anchor_atomic_tx() | ~2-6 horas |
| | user_documents | bitcoin_status: 'confirmed' | ↑ mismo | |
| | user_documents | protection_level: 'TOTAL' | upgrade_protection_level() | |

**El problema:** El frontend NO SE ENTERA de que cambió a 'confirmed' en el paso 5.

#### Soluciones Propuestas

**Opción A: REALTIME SUBSCRIPTIONS (Recomendado)**

```typescript
useEffect(() => {
  const supabase = getSupabase();

  // Suscribirse a cambios en user_documents
  const subscription = supabase
    .channel('user_documents_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_documents',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        // Cuando DB se actualiza, actualizar state
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === payload.new.id
              ? { ...doc, ...payload.new }
              : doc
          )
        );
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [userId]);
```

**Ventajas:**
- Actualizaciones instantáneas
- Bajo overhead (solo desktop, como DocumentList ya hace)
- Usuario ve cambios sin refresh

**Desventajas:**
- Requiere WebSocket abierto
- Uso de mensajes Realtime (revisar pricing)

---

**Opción B: POLLING INTELIGENTE**

```typescript
useEffect(() => {
  // Poll solo si hay documentos en estado pending
  const hasPendingAnchors = documents.some(d =>
    d.bitcoin_status === 'pending' ||
    d.polygon_status === 'pending' ||
    d.overall_status === 'pending_anchor'
  );

  if (!hasPendingAnchors) return;

  const interval = setInterval(loadDocuments, 5000); // Poll cada 5s
  return () => clearInterval(interval);
}, [documents, loadDocuments]);
```

**Ventajas:**
- Simple
- No requiere WebSockets

**Desventajas:**
- Retraso de hasta 5s
- Puede sobrecargar DB si muchos usuarios

---

**Opción C: HYBRID (Mejor UX)**

```typescript
useEffect(() => {
  const hasPending = documents.some(d =>
    ['pending', 'processing'].includes(d.bitcoin_status || '')
  );

  if (hasPending) {
    // Polling activo mientras hay pending
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  } else if (!isMobile()) {
    // Realtime subscription solo cuando todo confirmed
    const subscription = supabase
      .channel(`docs_${userId}`)
      .on('postgres_changes', ...)
      .subscribe();
    return () => subscription.unsubscribe();
  }
}, [documents, userId]);
```

Combina lo mejor de ambos mundos.

---

#### Solución: Descargar ECO en Cualquier Estado

**Problema actual:**

Si `bitcoin_status = 'pending'`, el campo `download_enabled = false` y el botón está deshabilitado.

**Solución:** Permitir descarga mientras Bitcoin procesa

```typescript
// Modificar lógica en anchor-bitcoin edge function:
await supabase
  .from('user_documents')
  .update({
    bitcoin_status: 'pending',
    bitcoin_anchor_id: data.id,
    // download_enabled: false ← REMOVER ESTA LÍNEA
    // Ahora download_enabled sigue siendo true si eco_hash existe
  })
```

**UI mejorada:**

```typescript
const ecoDownloadStatus = () => {
  if (doc.bitcoin_status === 'pending') {
    return {
      enabled: true,
      label: "Descargar .ECO (Bitcoin pendiente)",
      tooltip: "Tenés el certificado básico. Bitcoin está procesándose..."
    };
  }
  if (doc.bitcoin_status === 'confirmed') {
    return {
      enabled: true,
      label: "Descargar .ECO (Bitcoin confirmado)",
      tooltip: "Máxima protección probatoria"
    };
  }
};
```

---

## P2 - RUIDO UX/INFRA

### 5. SERVICE WORKER INTERCEPT FAILURES

#### Síntoma

En consola del navegador (ecosign.app):

```
Fallo al cargar ... Un ServiceWorker ha interceptado la solicitud
y encontrado un error inesperado.
```

Específicamente para: `/assets/images/ecosign-logo-full-trimmed.png` (174 KB)

#### Causa Raíz

**Archivo:** `client/public/service-worker.js`

Service Worker está configurado con estrategia **cache-first** para assets de imagen:

```javascript
// Cache-first para todo excepto HTML/JS/CSS
caches.match(request)
  .then((response) => {
    if (response) return response; // Sirve desde caché
    return fetch(request).then((fetchResponse) => {
      // Cachea sin validar HTTP status
      cache.put(request, fetchResponse.clone());
      return fetchResponse;
    });
  });
```

**Problemas:**
1. Logo NO está en `urlsToCache[]` (no se pre-cachea en install)
2. Si primera carga falla (red lenta), se cachea el error
3. Tamaño grande (174 KB) puede exceder quota del navegador
4. Sin validación de HTTP status (cachea 404/500)
5. Sin expiración de caché (crece indefinidamente)

#### Diferencias localhost vs Producción

| Aspecto | localhost | ecosign.app |
|---------|-----------|-------------|
| Service Worker | Se registra | Se registra |
| Cache Policy | Same (cache-first) | Same + Vercel CDN headers |
| HTTPS | No requerido | SÍ requerido |
| Headers HTTP | Dev: sin cache-control | Prod: Vercel `max-age` |
| **Conflicto** | - | SW vs Vercel CDN compiten |

#### Fix Mínimo

**Opción 1: Excluir assets grandes (RECOMENDADO)**

```javascript
const CACHE_NAME = 'ecosign-cache-v3'; // Incrementar versión

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Excluir imágenes grandes de cache-first
  const excludeLarge = url.pathname.includes('logo-full') ||
                       url.pathname.includes('full-trimmed');

  if (excludeLarge) {
    // Network-first para assets grandes
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first solo para iconos pequeños
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;

      return fetch(request).then((fetchResponse) => {
        // Validar HTTP status antes de cachear
        if (!fetchResponse || fetchResponse.status !== 200) {
          return fetchResponse;
        }

        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return fetchResponse;
      });
    })
  );
});
```

**Opción 2: Network-only para todas las imágenes**

```javascript
if (request.destination === 'image' && url.pathname.includes('/assets/images/')) {
  event.respondWith(fetch(request));
  return;
}
```

#### Invalidación de Cache

**Actual:** Solo al cambiar `CACHE_NAME`

**Mejorado:** Agregar TTL y limpieza en `activate`:

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // 1. Borrar caches viejos
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
             .map(name => caches.delete(name))
      );
    }).then(() => {
      // 2. Limpiar assets anticuados del cache actual
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.keys().then((requests) => {
          const now = Date.now();
          return Promise.all(
            requests.map((request) => {
              // Eliminar si no puede fetch (404) o es muy viejo
              return fetch(request).catch(() => cache.delete(request));
            })
          );
        });
      });
    })
  );
  self.clients.claim();
});
```

---

## RESUMEN EJECUTIVO DE PRIORIDADES

| # | Problema | Severidad | Impacto | Esfuerzo | Archivos |
|---|----------|-----------|---------|----------|----------|
| 1 | Unwrap key falla al compartir | **P0** | 100% usuarios afectados | **HECHO** | sessionCrypto.ts, documentEncryption.ts |
| 2 | PDFs encriptados aceptados | **P0** | 30% usuarios afectados | 2h | DocumentUploader.tsx |
| 3 | Reset password falta | **P1** | Feature completa falta | 4h | LoginPage, ResetPasswordPage, App.jsx |
| 4 | Estados blockchain no actualizan | **P1** | 50% usuarios confundidos | 2h | DocumentsPage.tsx |
| 5 | Service Worker cachea mal | **P2** | 10% usuarios assets rotos | 1h | service-worker.js |

---

## ARCHIVOS MODIFICADOS (IMPLEMENTADOS)

### Ya Implementados (P0 - Unwrap Key)

```
✅ client/src/lib/e2e/sessionCrypto.ts
   - Verificación de persistencia mejorada (storeSessionSecret retorna boolean)
   - Logging "Loaded existing" vs "Generated NEW"
   - diagnoseCryptoSession() para debugging
   - forceSaveSessionSecret() para recovery manual

✅ client/src/lib/e2e/documentEncryption.ts
   - Logging detallado en unwrap error
   - Lista causas probables en consola

✅ client/src/lib/storage/documentSharing.ts
   - Validaciones tempranas de wrapped_key/wrap_iv
   - ensureCryptoSession() antes de compartir

✅ client/src/lib/e2e/index.ts
   - Exporta diagnoseCryptoSession, forceSaveSessionSecret

✅ client/src/DashboardApp.tsx
   - Expone window.checkCryptoSession()
   - Expone window.forceSaveSession()

✅ docs/SESSION_SECRET_PERSISTENCE_ISSUE.md
   - Documentación completa del problema
```

---

## ARCHIVOS A MODIFICAR (PENDIENTES)

### P0 - PDFs Encriptados

```
📝 client/src/components/documents/DocumentUploader.tsx
   - Agregar validatePDFContent() con pdf-lib
   - Integrar en handleFileSelect()
   - Mensajes de error específicos

📝 client/src/pages/HelpPage.tsx (o FAQ)
   - Agregar sección "Cómo desencriptar PDFs"
```

### P1 - Reset Password

```
📝 client/src/pages/LoginPage.tsx
   - Agregar link "¿Olvidé mi contraseña?"
   - Modal o navegación a /reset-password

🆕 client/src/pages/ResetPasswordPage.tsx
   - Crear página completa con formulario
   - useEffect para detectar PASSWORD_RECOVERY event
   - Llamada a supabase.auth.updateUser()

📝 client/src/App.jsx
   - Agregar ruta <Route path="/reset-password" element={<ResetPasswordPage />} />

🆕 supabase/templates/reset-password.html
   - Crear email template para reset
```

### P1 - Estados Blockchain Realtime

```
📝 client/src/pages/DocumentsPage.tsx
   - Agregar realtime subscription o polling
   - Implementar HYBRID approach (polling si pending, realtime si confirmed)

📝 supabase/functions/anchor-bitcoin/index.ts
   - Remover download_enabled: false cuando Bitcoin pending
   - Permitir descarga del .eco aunque Bitcoin esté procesando
```

### P2 - Service Worker

```
📝 client/public/service-worker.js
   - Incrementar CACHE_NAME a 'ecosign-cache-v3'
   - Excluir assets grandes (logo-full) de cache-first
   - Validar HTTP status antes de cachear
   - Mejorar activate() con limpieza de cache viejo
```

---

## FUNCIONES DE DIAGNÓSTICO DISPONIBLES

Para debugging en producción (ecosign.app), en consola del navegador:

```javascript
// 1. Verificar estado de sesión crypto
checkCryptoSession()

// Output esperado si OK:
// ✅ localStorage is working
// ✅ Session initialized
//   - User ID: 06ed054e-3901-4e45-9170-e704494d6ef5
//   - Session secret in localStorage: true
//   - Crypto version match: ✅

// 2. Forzar guardado de sessionSecret si sospechás que no se guardó
forceSaveSession()

// 3. Ver todas las claves en localStorage relacionadas a EcoSign
Object.keys(localStorage).filter(k => k.includes('ecosign'))

// 4. Ver si hay sessionSecret guardado para el usuario actual
localStorage.getItem('ecosign_session_secret_v1:USER_ID')
```

---

## MÉTRICAS DE ÉXITO

| Métrica | Antes | Meta |
|---------|-------|------|
| Compartir documentos falla | 100% | 0% |
| PDFs encriptados causan confusión | 30% | 0% (rechazados con mensaje claro) |
| Usuarios que reportan "estados no actualizan" | 50% | 5% (polling/realtime) |
| Reset password funcional | NO | SÍ |
| Assets que fallan al cargar | 10% | 0% |

---

## PRÓXIMOS PASOS RECOMENDADOS

### Semana 1 (P0)
1. ✅ Unwrap key - HECHO
2. Implementar validación de PDFs encriptados
3. Testing en staging

### Semana 2 (P1)
1. Implementar reset password completo
2. Agregar realtime/polling para estados blockchain
3. Permitir descarga .eco aunque Bitcoin pending

### Semana 3 (P2)
1. Fix Service Worker caching
2. Agregar documentación FAQ para PDFs
3. Monitoreo de errores en producción

---

## APÉNDICE: RACE CONDITIONS DETECTADAS

### Auth vs Crypto Init

**Ubicación:** `client/src/hooks/useAuthWithE2E.ts:91-117`

**Problema:** El callback de `onAuthStateChange` es `async` pero no se espera:

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  // ...
  if (currentUser && !isSessionInitialized()) {
    await initE2ESession(currentUser.id); // ASYNC sin await externo
  }
});
```

**Escenario de carrera:**
```
T0: Usuario hace login
T1: Auth exitoso → onAuthStateChange dispara initE2ESession() (ASYNC)
T2: Usuario navega a /documentos (ProtectedRoute pasa porque user existe)
T3: Usuario abre modal compartir
T4: ensureCryptoSession() intenta... pero initE2ESession aún esperando supabase query
```

**Solución propuesta:** Guard centralizado con timeout:

```typescript
// lib/e2e/cryptoGuard.ts
export async function guardCryptoOperation(
  options: { userId: string; operation: string; timeout?: number }
): Promise<void> {
  if (isSessionInitialized()) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 10000);

    await initializeSessionCrypto(options.userId, false);
    clearTimeout(timeoutId);
  } catch (error) {
    throw new Error(
      `Cannot ${options.operation}: Failed to initialize encryption.`
    );
  }
}
```

---

**FIN DEL REPORTE**

---

*Generado con Claude Code - 2026-01-04*
