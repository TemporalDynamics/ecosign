# Verificación de Headers en Frontend

**Fecha:** 2026-01-24
**Objetivo:** Confirmar que el cliente envía headers correctos a Edge Functions

---

## Estado Actual

El cliente usa Supabase JS SDK correctamente:

```typescript
// client/src/lib/supabaseClient.ts
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

**Llamadas a Edge Functions:**

```typescript
// client/src/lib/signatureWorkflowService.ts:80
const { data, error } = await supabase.functions.invoke('start-signature-workflow', {
  body: {
    documentUrl,
    documentHash,
    originalFilename,
    documentEntityId,
    signers,
    forensicConfig
  }
});
```

---

## ¿Qué headers envía Supabase JS SDK automáticamente?

Cuando usas `supabase.functions.invoke()`, el SDK **DEBERÍA** enviar automáticamente:

```
Authorization: Bearer <session.access_token>   // Si hay sesión activa
apikey: <supabaseAnonKey>                       // Siempre
Content-Type: application/json                  // Siempre
```

**Fuente:** [Supabase JS SDK Documentation](https://supabase.com/docs/reference/javascript/functions-invoke)

---

## Problema Detectado en Producción

```
{"code":401,"message":"Missing authorization header"}
```

Esto significa que **uno de estos headers falta**:
1. `Authorization: Bearer <token>` ← Más probable
2. `apikey: <key>`

---

## Verificación Paso a Paso

### 1. Verificar que hay sesión activa

En `signatureWorkflowService.ts`, ya verificamos:

```typescript
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !session) {
  throw new Error('No hay sesión activa');  // ← Esto debería saltar si no hay sesión
}
```

✅ **OK**: El código ya verifica sesión

### 2. Verificar que el SDK envía los headers

**Problema potencial:** El SDK puede NO enviar `Authorization` si:
- La sesión expiró entre `getSession()` y `functions.invoke()`
- El token está corrupto
- Hay un bug en el SDK

**Solución:** Enviar headers explícitamente:

```typescript
// ANTES (confía en SDK):
const { data, error } = await supabase.functions.invoke('start-signature-workflow', {
  body: {...}
});

// DESPUÉS (explícito):
const { data, error } = await supabase.functions.invoke('start-signature-workflow', {
  body: {...},
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    apikey: supabaseAnonKey
  }
});
```

---

## Archivos a Modificar

### 1. `client/src/lib/signatureWorkflowService.ts`

**ANTES:**
```typescript
const { data, error } = await supabase.functions.invoke('start-signature-workflow', {
  body: {
    documentUrl,
    documentHash,
    originalFilename,
    documentEntityId,
    signers,
    forensicConfig
  }
});
```

**DESPUÉS:**
```typescript
const { data, error } = await supabase.functions.invoke('start-signature-workflow', {
  body: {
    documentUrl,
    documentHash,
    originalFilename,
    documentEntityId,
    signers,
    forensicConfig
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    apikey: supabaseAnonKey
  }
});
```

### 2. Buscar TODOS los `.functions.invoke()` y agregarlos

```bash
# Encontrar todos los archivos
grep -r "functions.invoke" client/src --include="*.ts" --include="*.tsx"

# Archivos encontrados:
client/src/components/signature-flow/DocumentViewer.tsx
client/src/components/WorkflowVerifier.tsx
client/src/components/LinkGenerator.tsx
client/src/components/LegalCenterModalV2.tsx
client/src/hooks/useEcoxLogger.ts
client/src/lib/opentimestamps.ts
client/src/lib/signNowService.ts
client/src/lib/storage/documentSharing.ts
client/src/lib/signatureWorkflowService.ts     ← CRÍTICO
client/src/lib/tsaService.ts
```

---

## Patrón a Seguir

**Helper function para headers:**

```typescript
// client/src/lib/supabaseClient.ts

export const getFunctionHeaders = async (): Promise<Record<string, string>> => {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': env.VITE_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
};
```

**Uso:**

```typescript
import { getSupabase, getFunctionHeaders } from './supabaseClient';

export async function startSignatureWorkflow(params: StartWorkflowParams) {
  const supabase = getSupabase();
  const headers = await getFunctionHeaders();  // ← Helper

  const { data, error } = await supabase.functions.invoke('start-signature-workflow', {
    body: { ... },
    headers  // ← Explícito
  });
}
```

---

## Checklist de Verificación

### Inmediato
- [ ] Agregar `getFunctionHeaders()` helper en `supabaseClient.ts`
- [ ] Modificar `signatureWorkflowService.ts` para usar headers explícitos
- [ ] Modificar llamadas críticas:
  - [ ] `create-custody-upload-url`
  - [ ] `apply-signer-signature`
  - [ ] `accept-*-nda`

### Testing
- [ ] Login en producción
- [ ] Crear documento
- [ ] Iniciar workflow de firma
- [ ] Verificar en DevTools que headers se envían:
  ```
  Authorization: Bearer <token>
  apikey: <key>
  Content-Type: application/json
  ```

### Post-fix
- [ ] Si funciona: Migrar TODOS los `.functions.invoke()` a usar helper
- [ ] Documentar patrón en `CONTRIBUTING.md`

---

## Debugging en Navegador

Para verificar qué headers se envían:

1. Abrir DevTools (F12)
2. Tab "Network"
3. Filtrar por "start-signature-workflow"
4. Click en request
5. Ver "Request Headers"

**Debe mostrar:**
```
:authority: uiyojopjbhooxrmamaiw.supabase.co
:method: POST
:path: /functions/v1/start-signature-workflow
authorization: Bearer eyJhbGci...  ← DEBE ESTAR
apikey: eyJhbGci...                ← DEBE ESTAR
content-type: application/json
origin: https://ecosign.app
```

**Si falta `authorization`:**
- Sesión expiró
- SDK no lo envió
- → Usar headers explícitos

---

## Alternativa: Debug Mode

Agregar logging temporal:

```typescript
export async function startSignatureWorkflow(params: StartWorkflowParams) {
  const supabase = getSupabase();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  console.log('🔍 DEBUG session:', {
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    tokenLength: session?.access_token?.length,
    expiresAt: session?.expires_at
  });

  // ... resto del código
}
```

---

## Resultado Esperado

Después de aplicar el fix:

**ANTES:**
```
Cross-Origin Request Blocked: CORS header 'Access-Control-Allow-Origin' does not match
{"code":401,"message":"Missing authorization header"}
```

**DESPUÉS:**
```
Status: 200 OK
Response: { success: true, workflow: {...} }
```

---

## Referencias

- **Supabase Docs:** https://supabase.com/docs/reference/javascript/functions-invoke
- **CORS Fix:** docs/HALLAZGO_CORS_PRODUCCION.md
- **Funciones migradas:** 3c73f80 (commit)
