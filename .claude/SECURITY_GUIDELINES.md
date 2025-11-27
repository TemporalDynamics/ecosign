# 🔒 Guía de Seguridad para Desarrolladores de EcoSign

## ⚠️ ADVERTENCIA CRÍTICA

**EcoSign promete ZERO-KNOWLEDGE del contenido de los documentos.**

Cualquier filtración de contenido de documentos al servidor o logs **destruye la propuesta de valor completa** del producto y puede tener consecuencias legales graves.

---

## 🎯 Principio Fundamental: Zero Content Leakage

El servidor de EcoSign **NUNCA** debe ver el contenido de los documentos en texto plano.

### ❌ Está PROHIBIDO:
- Enviar documentos sin cifrar al servidor
- Almacenar contenido de documentos en logs
- Procesar documentos en el backend
- Capturar cuerpo de requests con contenido de documentos
- Usar APIs de conversión de terceros que requieran enviar el documento

### ✅ Está PERMITIDO:
- Almacenar hashes SHA-256 del contenido (proof of integrity)
- Almacenar metadatos (filename, size, date)
- Almacenar documentos **CIFRADOS** con clave del cliente
- Procesar documentos **EN EL NAVEGADOR** del usuario

---

## 📋 Checklist de Seguridad para Document Upload

### 1. ✅ Cálculo de Hash en Cliente

**CRÍTICO**: El hash SHA-256 del contenido DEBE calcularse en el navegador ANTES de cualquier transmisión.

```typescript
// ✅ CORRECTO
const contentHash = await calculateDocumentHash(file) // En el navegador
await uploadMetadata({ contentHash }) // Solo el hash al servidor

// ❌ INCORRECTO
await uploadFile(file) // Envía contenido sin cifrar
const response = await fetch('/api/calculate-hash', { body: file }) // Backend ve contenido
```

**Por qué**: El hash es la prueba de integridad. Si se calcula en el servidor, el servidor VE el contenido.

---

### 2. ✅ Cifrado del Lado del Cliente

**CRÍTICO**: SOLO archivos cifrados con AES-256-GCM pueden ser transmitidos.

```typescript
// ✅ CORRECTO - Flujo completo
const encryptionKey = await generateEncryptionKey() // En navegador
const encryptedBlob = await encryptFile(file, encryptionKey) // En navegador
await uploadEncryptedBlob(encryptedBlob) // Solo blob cifrado al servidor

// ❌ INCORRECTO - Expone contenido
await uploadFile(file) // Archivo en texto plano
await encryptOnServer(fileId) // Ya es tarde, servidor ya vio contenido
```

**Implementación**:
- Usar `crypto.subtle.generateKey()` para generar claves AES-256
- Usar `crypto.subtle.encrypt()` con algoritmo AES-GCM
- Prepend del IV (12 bytes) al ciphertext
- NUNCA enviar la clave de cifrado al servidor

**Almacenamiento de la clave**:
- Para MVP: Guardar en workflow metadata, cifrada con password del usuario
- Para producción: Usar IndexedDB o derivar de password con PBKDF2

---

### 3. ✅ Separación de Endpoints

**CRÍTICO**: Endpoints diferentes para metadatos y contenido cifrado.

```typescript
// ✅ CORRECTO - Endpoints separados

// 1. Endpoint de metadatos (NO acepta contenido)
POST /api/documents/metadata
Body: {
  title: string
  filename: string
  contentHash: string  // Solo el hash
  workflowId: string
}

// 2. Endpoint de subida cifrada (NO acepta metadatos sensibles)
POST /api/documents/upload-encrypted
Body: Blob (encrypted binary)
Headers: {
  'X-Document-ID': documentId  // Referencia al metadata
}

// ❌ INCORRECTO - Todo en un endpoint
POST /api/documents/create
Body: {
  title: string,
  file: File  // ¡Peligro! Contenido sin cifrar
}
```

**Por qué**: Separar endpoints reduce el riesgo de logging accidental del contenido.

---

### 4. ✅ Prevención de Logs

**CRÍTICO**: Configurar logging para NUNCA capturar cuerpo de requests de documentos.

```typescript
// ✅ CORRECTO - Edge Function con logging seguro
Deno.serve(async (req) => {
  // NO loguear req.body si es binario
  const contentType = req.headers.get('content-type')

  if (contentType?.includes('octet-stream')) {
    console.log('📦 Encrypted upload received') // Solo metadata
    // NO hacer console.log(req.body)
  }

  // ... procesamiento
})

// ❌ INCORRECTO
console.log('Request:', req) // Captura TODO, incluyendo body
```

**Configuración de Supabase Logging**:
```sql
-- En Supabase, asegurar que logs de Edge Functions no capturen body
-- Esto se configura en el Dashboard de Supabase:
-- Settings > Edge Functions > Logging > Exclude request/response bodies
```

---

### 5. ✅ Prevención de Cache

**CRÍTICO**: URLs de upload NO deben cachearse.

```nginx
# ✅ CORRECTO - Configuración de CDN/Proxy
location /api/documents/upload-encrypted {
  proxy_pass http://backend;
  proxy_cache off;
  proxy_no_cache 1;
  proxy_cache_bypass 1;
}

# ❌ INCORRECTO
location /api/documents/* {
  proxy_pass http://backend;
  proxy_cache on;  # ¡Peligro! Cachea todo
}
```

---

## 🔐 Flujo Seguro Completo

### Subida de Documento

```
┌─────────────┐
│  1. Usuario │  Selecciona documento.pdf
│  selecciona │
│  documento  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  2. NAVEGADOR           │
│  - Calcula SHA-256      │  contentHash = sha256(file)
│  - Genera clave AES     │  key = generateKey()
│  - Cifra con AES-GCM    │  encrypted = encrypt(file, key)
└──────┬──────────────────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌─────────────────┐              ┌──────────────────┐
│ 3a. POST        │              │ 3b. POST         │
│ /api/metadata   │              │ /upload-encrypted│
│                 │              │                  │
│ {               │              │ Blob(encrypted)  │
│   contentHash,  │              │                  │
│   filename      │              └──────────────────┘
│ }               │                      │
└─────────────────┘                      │
       │                                 │
       └─────────────┬───────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │ 4. SERVIDOR    │
            │ - Guarda hash  │  ✅ Solo ve hash + blob cifrado
            │ - Guarda blob  │  ❌ NUNCA ve contenido
            │   cifrado      │
            └────────────────┘
```

### Descarga de Documento

```
┌─────────────┐
│ 1. Usuario  │  Solicita documento
│ solicita    │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ 2. SERVIDOR      │
│ - Busca blob     │  ✅ Solo devuelve blob cifrado
│ - Genera signed  │  ❌ NO descifra
│   URL            │
└──────┬───────────┘
       │
       ▼
┌─────────────────────────┐
│ 3. NAVEGADOR            │
│ - Descarga blob cifrado │
│ - Descifra con clave    │  decrypted = decrypt(blob, key)
│   del usuario           │
│ - Muestra/descarga      │
└─────────────────────────┘
```

---

## 🚨 Vectores de Ataque Comunes

### Vector 1: Logging Accidental

**Problema**: Edge Functions logueando todo el request.

```typescript
// ❌ VULNERABLE
console.log('Request received:', JSON.stringify(req))

// ✅ SEGURO
console.log('Request received from:', req.headers.get('x-forwarded-for'))
```

### Vector 2: Error Handling

**Problema**: Mensajes de error exponiendo contenido.

```typescript
// ❌ VULNERABLE
catch (error) {
  console.error('Failed to process:', file.toString())
  throw new Error(`Processing failed for: ${fileContent}`)
}

// ✅ SEGURO
catch (error) {
  console.error('Failed to process file:', filename) // Solo nombre
  throw new Error('Processing failed')
}
```

### Vector 3: Debugging Temporal

**Problema**: Código de debug que se olvida eliminar.

```typescript
// ❌ VULNERABLE - Nunca hacer esto
if (process.env.DEBUG) {
  console.log('File content:', fileBuffer)
}

// ✅ SEGURO
if (process.env.DEBUG) {
  console.log('File size:', fileBuffer.byteLength)
  console.log('File hash:', contentHash)
}
```

### Vector 4: Conversión de Formato

**Problema**: Usar API externa para convertir formatos.

```typescript
// ❌ VULNERABLE
const pdf = await fetch('https://convertapi.com/convert', {
  method: 'POST',
  body: docxFile  // ¡Terceros ven el contenido!
})

// ✅ SEGURO
import { convertToPDF } from 'client-side-converter'
const pdf = await convertToPDF(docxFile) // En el navegador
```

---

## 📝 Checklist de Code Review

Antes de hacer merge, verificar:

- [ ] ✅ Hash calculado en cliente, no en servidor
- [ ] ✅ Archivo cifrado en cliente antes de enviar
- [ ] ✅ Endpoint de metadatos NO acepta contenido de archivo
- [ ] ✅ Endpoint de upload NO loguea request body
- [ ] ✅ Logs de servidor NO capturan contenido
- [ ] ✅ Error messages NO incluyen contenido sensible
- [ ] ✅ No hay código de debug que exponga contenido
- [ ] ✅ Cache deshabilitado para endpoints de upload
- [ ] ✅ Conversión de formatos (si aplica) es client-side
- [ ] ✅ Tests NO usan documentos reales con contenido sensible

---

## 🛠️ Testing de Seguridad

### Test 1: Verificar que servidor no ve contenido

```typescript
test('Server never sees unencrypted content', async () => {
  const file = new File(['secret content'], 'test.pdf')

  // Mock fetch para capturar todas las requests
  const requestBodies: any[] = []
  global.fetch = jest.fn((url, options) => {
    requestBodies.push(options?.body)
    return Promise.resolve(new Response())
  })

  // Upload del archivo
  await uploadDocument(file)

  // Verificar que ningún body contiene el contenido
  for (const body of requestBodies) {
    if (body instanceof Blob) {
      const text = await body.text()
      expect(text).not.toContain('secret content')
    }
  }
})
```

### Test 2: Verificar que hash es correcto

```typescript
test('Content hash matches original file', async () => {
  const file = new File(['test content'], 'test.pdf')

  const result = await uploadDocument(file)

  // Recalcular hash del archivo original
  const expectedHash = await calculateDocumentHash(file)

  expect(result.contentHash).toBe(expectedHash)
})
```

---

## 🎓 Recursos y Referencias

### Implementaciones

- `client/src/utils/encryption.ts` - Cifrado del lado del cliente
- `client/src/utils/hashDocument.ts` - Cálculo de hash
- `client/src/components/documents/DocumentUploader.tsx` - Componente seguro

### Librerías Recomendadas

**Para cifrado (client-side)**:
- ✅ Web Crypto API (nativo del navegador)
- ✅ crypto-js (fallback para navegadores antiguos)

**Para conversión de formatos (client-side)**:
- ✅ pdf-lib - Manipulación de PDFs
- ✅ jsPDF - Generación de PDFs
- ❌ Poppler/ImageMagick - Requieren servidor

### Estándares de Seguridad

- OWASP - Data Protection Cheat Sheet
- NIST - Guide to Protecting Confidentiality of PII
- GDPR - Article 25 (Data Protection by Design)

---

## ⚖️ Implicaciones Legales

Si el servidor VE el contenido de documentos:

1. **Falsedad de Marketing**: Promesa de "zero-knowledge" es falsa
2. **GDPR/CCPA**: EcoSign se convierte en "procesador de datos"
3. **Liability**: Responsabilidad por breaches de documentos sensibles
4. **Trust**: Pérdida total de confianza del usuario

**Por eso este guideline es CRÍTICO y debe seguirse al 100%.**

---

**Última actualización**: 2025-11-27
**Autor**: Claude + EcoSign Security Team
**Versión**: 1.0
