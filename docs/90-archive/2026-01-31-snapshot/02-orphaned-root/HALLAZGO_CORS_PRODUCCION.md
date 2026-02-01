# Hallazgo Crítico: CORS Roto en Producción

**Fecha:** 2026-01-24
**Severidad:** CRÍTICA - Bloqueante total en producción
**Estado:** Identificado, solución disponible

---

## Síntomas

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading
the remote resource at https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/...
(Reason: CORS header 'Access-Control-Allow-Origin' does not match 'https://ecosign.app')

{"code":401,"message":"Missing authorization header"}
```

---

## Causa Raíz

### 1. Variables de Entorno NO Configuradas

Las Edge Functions caen al default `http://localhost:5173`:

```typescript
// supabase/functions/start-signature-workflow/index.ts:13
const corsHeaders = {
  'Access-Control-Allow-Origin': (
    Deno.env.get('ALLOWED_ORIGIN') ||    // ← NO configurado
    Deno.env.get('SITE_URL') ||          // ← NO configurado
    Deno.env.get('FRONTEND_URL') ||      // ← NO configurado
    'http://localhost:5173'              // ← CAEÁ AQUÍ ❌
  )
}
```

**Resultado**: Cliente en `https://ecosign.app` recibe CORS con `http://localhost:5173` → BLOQUEADO

### 2. Inconsistencia de Implementación CORS

**Pattern A** (correcto - `create-custody-upload-url`):
```typescript
const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin'))
if (!isAllowed) {
  return new Response('Forbidden', { status: 403, headers: corsHeaders })
}
```

**Pattern B** (incorrecto - mayoría de funciones):
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '...' // hardcoded
}
// No valida origen dinámicamente
```

### 3. Cliente NO Envía Authorization Header

Frontend no está enviando:
```
Authorization: Bearer <token>
```

En requests a Edge Functions.

---

## Impacto

**Funciones afectadas:**
- ❌ `create-custody-upload-url` - CORS 403 (origen no permitido)
- ❌ `start-signature-workflow` - CORS mismatch
- ❌ `apply-signer-signature` - CORS mismatch (probablemente)
- ❌ `request-document-changes` - CORS mismatch (probablemente)
- ❌ `respond-to-changes` - CORS mismatch (probablemente)
- ❌ Y todas las demás que usan Pattern B

**Resultado:**
- **0% de funcionalidad en producción**
- Usuarios no pueden crear documentos
- Usuarios no pueden firmar
- Usuarios no pueden iniciar workflows

---

## Solución Inmediata (5 minutos)

### Paso 1: Configurar Variables de Entorno

En **Supabase Dashboard**:

```
Settings → Edge Functions → Environment Variables

ALLOWED_ORIGINS=https://ecosign.app,https://www.ecosign.app
```

O alternativamente:

```
SITE_URL=https://ecosign.app
```

### Paso 2: Redeploy Edge Functions (opcional)

Si las vars no se aplican automáticamente:

```bash
supabase functions deploy --project-ref uiyojopjbhooxrmamaiw
```

### Paso 3: Verificar Cliente Envía Authorization

En el código del frontend, verificar que TODOS los requests a Edge Functions incluyan:

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/...`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,  // ← CRÍTICO
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY
  },
  body: JSON.stringify({...})
})
```

---

## Solución a Largo Plazo (recomendada)

### Migrar Todas las Edge Functions a Pattern A

**Antes:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || ...),
  'Access-Control-Allow-Headers': '...',
  'Access-Control-Allow-Methods': '...'
}
```

**Después:**
```typescript
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin'))

  if (req.method === 'OPTIONS') {
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders)
  }

  // ... resto de la lógica
})
```

**Beneficios:**
- ✅ Validación dinámica de origen
- ✅ Soporte para múltiples orígenes (`,` separated)
- ✅ Fallback a `SITE_URL` y `FRONTEND_URL`
- ✅ Manejo correcto de `null` origin (local file://)
- ✅ Header `Vary: Origin` para caching correcto

---

## Checklist de Verificación

### Inmediato (hoy)

- [ ] Configurar `ALLOWED_ORIGINS` en Supabase Dashboard
- [ ] Verificar cliente envía `Authorization` header
- [ ] Verificar cliente envía `apikey` header
- [ ] Test manual: crear documento en producción
- [ ] Test manual: iniciar workflow de firma

### Corto Plazo (esta semana)

- [ ] Migrar `start-signature-workflow` a Pattern A
- [ ] Migrar `apply-signer-signature` a Pattern A
- [ ] Migrar `request-document-changes` a Pattern A
- [ ] Migrar `respond-to-changes` a Pattern A
- [ ] Migrar todas las demás funciones a Pattern A

### Medio Plazo (siguiente sprint)

- [ ] Crear test E2E de CORS
- [ ] Agregar linter que detecte Pattern B
- [ ] Documentar estándar CORS en CONTRIBUTING.md

---

## Funciones que YA Usan Pattern A (Correcto)

```bash
$ grep -r "getCorsHeaders" supabase/functions/*/index.ts
```

- ✅ `create-custody-upload-url`
- ⏳ (buscar más...)

---

## Script de Migración Automática

Para migrar una función de Pattern B → Pattern A:

```bash
# Usar script: scripts/migrate-cors-pattern.sh <function-name>
./scripts/migrate-cors-pattern.sh start-signature-workflow
```

(Script a crear)

---

## Variables de Entorno Requeridas

### Producción
```
ALLOWED_ORIGINS=https://ecosign.app,https://www.ecosign.app
# O:
SITE_URL=https://ecosign.app
```

### Staging
```
ALLOWED_ORIGINS=https://staging.ecosign.app
```

### Development
```
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
# O sin configurar (fallback automático)
```

---

## Logs de Producción

### Request Bloqueado
```
XHROPTIONS
https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/create-custody-upload-url
CORS Allow Origin Not Matching Origin

Cross-Origin Request Blocked: The Same Origin Policy disallows reading
the remote resource at https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/create-custody-upload-url.
(Reason: CORS header 'Access-Control-Allow-Origin' does not match 'null').
```

### Auth Faltante
```
{"code":401,"message":"Missing authorization header"}
{"message":"No API key found in request","hint":"No apikey request header or url param was found."}
```

---

## Referencias

- **Archivo CORS Helper**: `supabase/functions/_shared/cors.ts`
- **Función Correcta**: `supabase/functions/create-custody-upload-url/index.ts`
- **Funciones Incorrectas**: Mayoría en `supabase/functions/*/index.ts`
- **Dashboard Supabase**: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/settings/functions

---

## Contacto

- **Project Ref**: uiyojopjbhooxrmamaiw
- **URL**: https://uiyojopjbhooxrmamaiw.supabase.co
- **Frontend**: https://ecosign.app
