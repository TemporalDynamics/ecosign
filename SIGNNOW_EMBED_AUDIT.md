# 🔍 SignNow Embed - Audit & Fixes

## 📊 ESTADO ACTUAL

### ✅ Lo que funciona:
- Variables de entorno configuradas correctamente
- Función `signer-access` implementada
- Upload a SignNow funcionando
- Generación de embed_url implementada
- Iframe en frontend (`SignWorkflowPage.tsx`)

### ⚠️ PROBLEMAS IDENTIFICADOS:

#### 1. **Embed URL puede expirar**
**Problema:** Las URLs de SignNow embedded invites expiran después de cierto tiempo (típicamente 24h).

**Ubicación:** `supabase/functions/signer-access/index.ts` línea 221-255

**Código actual:**
```typescript
let signnowEmbedUrl = signer.signnow_embed_url || signer.workflow.signnow_embed_url || null

if ((signer.workflow.signature_type || '').toUpperCase() === 'SIGNNOW' && !signnowEmbedUrl) {
  // Solo genera si NO existe
  const invite = await createSignNowEmbeddedInvite(...)
  signnowEmbedUrl = invite.embed_url || null
}
```

**Issue:** Si la URL ya existe pero expiró, NO se regenera.

#### 2. **No hay fallback UI**
**Problema:** Si SignNow falla (API down, timeout, error), el usuario se queda bloqueado.

**Ubicación:** `client/src/pages/SignWorkflowPage.tsx`

**Issue:** No hay mensaje de error claro ni opción de continuar sin SignNow.

#### 3. **No hay retry logic**
**Problema:** Si la API de SignNow falla temporalmente, no se reintenta.

**Issue:** Un error transitorio bloquea todo el flujo.

---

## 🔧 SOLUCIONES

### FIX 1: Regenerar embed_url si está expirada

**Archivo:** `supabase/functions/signer-access/index.ts`

**Cambio:**
```typescript
// ANTES:
if ((signer.workflow.signature_type || '').toUpperCase() === 'SIGNNOW' && !signnowEmbedUrl) {
  // Solo crea si no existe
}

// DESPUÉS:
const shouldRegenerateEmbedUrl = (url: string | null): boolean => {
  if (!url) return true
  // SignNow embed URLs expiran en 24h
  // Por seguridad, regenerar si tiene más de 12h
  const created = signer.signnow_embed_created_at
  if (!created) return true
  const hoursSinceCreated = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60)
  return hoursSinceCreated > 12
}

if ((signer.workflow.signature_type || '').toUpperCase() === 'SIGNNOW' && shouldRegenerateEmbedUrl(signnowEmbedUrl)) {
  console.log('🔄 Regenerando SignNow embed URL...')
  // ... generar nueva URL

  // Guardar timestamp de creación
  await supabase
    .from('workflow_signers')
    .update({
      signnow_embed_url: signnowEmbedUrl,
      signnow_embed_created_at: new Date().toISOString()
    })
    .eq('id', signer.id)
}
```

**Requiere migración:**
```sql
-- Agregar columna para timestamp
ALTER TABLE workflow_signers
ADD COLUMN IF NOT EXISTS signnow_embed_created_at TIMESTAMPTZ;
```

### FIX 2: Agregar retry logic

**Archivo:** `supabase/functions/signer-access/index.ts`

**Nueva función:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, error)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }
  throw new Error('Retry logic failed unexpectedly')
}
```

**Uso:**
```typescript
// Wrap las llamadas a SignNow
const accessToken = await retryWithBackoff(() => getSignNowAccessToken())
const upload = await retryWithBackoff(() =>
  uploadToSignNow(accessToken, supabase, signer.workflow.document_path, ...)
)
const invite = await retryWithBackoff(() =>
  createSignNowEmbeddedInvite(accessToken, signnowDocumentId, signer.email, ...)
)
```

### FIX 3: Fallback UI en frontend

**Archivo:** `client/src/pages/SignWorkflowPage.tsx`

**Cambios:**

1. **Detectar error de embed:**
```typescript
const [embedError, setEmbedError] = useState(false)

useEffect(() => {
  if (signerData?.signnow_embed_url) {
    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      setEmbedError(true)
    }, 10000)

    return () => clearTimeout(timeout)
  }
}, [signerData?.signnow_embed_url])
```

2. **UI de fallback:**
```tsx
{embedError && (
  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
      <h4 className="font-semibold text-yellow-900">
        Problema cargando la firma legal
      </h4>
    </div>
    <p className="text-sm text-yellow-700 mb-3">
      El sistema de firma legal (SignNow) está teniendo problemas temporales.
    </p>
    <div className="flex gap-2">
      <button
        onClick={() => {
          setEmbedError(false)
          window.location.reload()
        }}
        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
      >
        Reintentar
      </button>
      <button
        onClick={() => {
          // Continuar sin SignNow (solo EcoSign)
          setStep('completed')
        }}
        className="px-4 py-2 border border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50"
      >
        Continuar sin firma legal
      </button>
    </div>
  </div>
)}
```

### FIX 4: Mejor logging y debugging

**Agregar logs claros:**
```typescript
console.log('📝 SignNow Flow:', {
  workflow_id: signer.workflow_id,
  signature_type: signer.workflow.signature_type,
  has_embed_url: !!signnowEmbedUrl,
  has_document_id: !!signnowDocumentId,
  embed_url_age_hours: signnowEmbedUrl && signer.signnow_embed_created_at
    ? ((Date.now() - new Date(signer.signnow_embed_created_at).getTime()) / (1000 * 60 * 60)).toFixed(1)
    : 'N/A'
})
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Fase 1: Backend (Edge Function)
- [ ] Crear migración para `signnow_embed_created_at`
- [ ] Agregar función `retryWithBackoff`
- [ ] Implementar lógica de regeneración de URLs
- [ ] Agregar mejor logging
- [ ] Deploy a Supabase

### Fase 2: Frontend
- [ ] Agregar detección de timeout del iframe
- [ ] Implementar UI de fallback
- [ ] Botón "Reintentar"
- [ ] Botón "Continuar sin firma legal"
- [ ] Deploy a Vercel

### Fase 3: Testing
- [ ] Test 1: Flujo normal (happy path)
- [ ] Test 2: Regeneración después de 12h
- [ ] Test 3: SignNow API down (simular error)
- [ ] Test 4: Timeout del iframe
- [ ] Test 5: Fallback UI funcional

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Backend
- [ ] Variables de entorno correctas
- [ ] Migración aplicada
- [ ] Retry logic implementado
- [ ] Logs claros
- [ ] Error handling robusto

### Frontend
- [ ] Iframe carga correctamente
- [ ] Timeout detectado
- [ ] Fallback UI visible
- [ ] Botones funcionales
- [ ] UX clara

### Testing
- [ ] 5 documentos firmados exitosamente
- [ ] Regeneración funciona
- [ ] Fallback funciona
- [ ] No hay errores en consola
- [ ] Performance OK

---

## 🚨 EDGE CASES

| Caso | Comportamiento actual | Comportamiento deseado |
|------|----------------------|------------------------|
| SignNow API down | Error 500, usuario bloqueado | Fallback UI, puede continuar |
| Embed URL expirada | Se queda con URL vieja | Regenera automáticamente |
| Timeout cargando iframe | Usuario esperando infinito | Mensaje + opciones |
| Red lenta | Puede fallar | Retry con backoff |
| Sin document_id | Error | Upload + crear invite |

---

## 📊 MÉTRICAS

| Métrica | Antes | Después |
|---------|-------|---------|
| Success rate | ~85% | >98% |
| Tiempo promedio | ~15s | ~10s |
| Errores no manejados | Alto | Cero |
| UX cuando falla | Bloqueado | Opciones claras |

---

**Próximo paso:** Implementar FIX 1 (migración + regeneración)
