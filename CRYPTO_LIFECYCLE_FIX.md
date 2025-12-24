# ✅ Crypto Lifecycle Fix - Applied 2025-12-24

## 🎯 Problema resuelto

**Error raíz:** `Failed to get user wrap_salt` (406) - RLS bloqueaba INSERT/UPDATE en `profiles`

### Síntomas
- Modal Legal Center no cerraba después de certificar
- Usuario quedaba en estado "colgado"
- No se podía guardar documento cifrado
- `wrap_salt` existía en DB pero no se podía crear/actualizar para usuarios sin perfil

## 🔧 Solución aplicada (5 cambios quirúrgicos)

### 1. Nueva migración RLS (`20251224000000_fix_profiles_rls_upsert.sql`)
**Aplicada manualmente** en Supabase SQL Editor

```sql
-- Agregadas 3 políticas:
- Users can read own profile (SELECT)
- Users can insert own profile (INSERT)  
- Users can update own profile (UPDATE)
```

✅ **Verificado:** Query `SELECT policyname FROM pg_policies WHERE tablename = 'profiles'` muestra las 3 políticas

### 2. Eliminado memory leak en `sessionCrypto.ts`
- ❌ Removido `beforeunload` listener que se agregaba múltiples veces (líneas 75-77)
- ✅ Centralizado en `DashboardApp.tsx` con cleanup correcto

### 3. Mensaje de error humano en `sessionCrypto.ts`
```typescript
// Antes:
throw new Error('Failed to get user wrap salt');

// Ahora:
throw new Error('No se pudo inicializar el cifrado. Por favor, cierra sesión e inicia sesión nuevamente.');
```

### 4. Handler global `beforeunload` en `DashboardApp.tsx`
```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    clearSessionCrypto()
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
}, [])
```

### 5. Toast notification en `useAuthWithE2E.ts`
```typescript
toast.error(errorMessage, {
  duration: 6000,
  position: 'top-center',
});
```

## 🧪 Test manual requerido

### Flujo a probar:

#### 1. Certificar documento en Legal Center
```
✅ Login → debe inicializar crypto
✅ Subir documento → certificar
✅ Modal debe cerrarse automáticamente
✅ Documento guardado en "Mis Documentos"
```

#### 2. Compartir documento cifrado E2E
```
✅ Click en documento → "Compartir"
✅ Modal ShareDocumentModal debe abrir
✅ Generar enlace seguro
✅ Debe mostrar:
   - URL única: https://ecosign.app/shared/{shareId}
   - Código privado: 6 dígitos (ej: 482751)
✅ Copiar ambos
```

#### 3. Acceso con enlace + código
```
✅ Abrir enlace en ventana incógnito/otro browser
✅ Debe pedir código de 6 dígitos
✅ Ingresar código correcto → desbloquear
✅ Ver documento descifrado
✅ Código incorrecto → error claro
```

## 🔍 Logs esperados en Console

### Login exitoso:
```
🔐 Initializing E2E session for user: xxx
✅ Session crypto initialized for user: xxx
```

### Compartir documento:
```
🔐 Encrypting document with E2E
✅ Document encrypted and wrapped
✅ Share link generated: {shareId}
```

### Acceso a documento compartido:
```
🔓 Unwrapping document key with access code
✅ Document decrypted successfully
```

## ❌ Errores que NO deben aparecer

- ❌ `Failed to get user wrap_salt`
- ❌ `406 (policy violation)`
- ❌ `CRYPTO_ERRORS.SESSION_NOT_INITIALIZED`
- ❌ Modal colgado sin cerrar

## 📊 Archivos modificados

### Migración (manual)
- `supabase/migrations/20251224000000_fix_profiles_rls_upsert.sql` (aplicada)

### Client-side
- `client/src/lib/e2e/sessionCrypto.ts` (2 cambios)
- `client/src/hooks/useAuthWithE2E.ts` (2 cambios)
- `client/src/DashboardApp.tsx` (1 cambio)

### Testing
- `TEST_RLS_PROFILES.sql` (helper para debug)

## 🚫 Lo que NO se cambió (por diseño)

- ❌ Algoritmos de cifrado (mantienen estándar actual)
- ❌ Modelo E2E (Zero Server-Side Knowledge intacto)
- ❌ Step 2 del Legal Center (permanece eliminado)
- ❌ Persistencia de sessionSecret (sigue siendo volátil, session-only)

## 📋 Siguiente iteración (si falla el test manual)

### Si shareModal no abre:
1. Verificar `ShareDocumentModal.tsx` imports
2. Check que documento tenga `encryption_metadata`
3. Verificar RLS en `document_shares`

### Si código no desbloquea:
1. Verificar `access_code` se guarda en `document_shares`
2. Check derivación de `accessKey` en `sessionCrypto.ts`
3. Logs de unwrap en `SharedDocumentAccessPage`

### Si documento no descifra:
1. Verificar `wrapped_key` en `encrypted_documents`
2. Check que `unwrapKey` esté disponible
3. Test de AES-GCM decrypt

## 🎯 Criterio de éxito

**Fix es exitoso si:**
- ✅ Usuario puede certificar documento sin errores
- ✅ Modal cierra automáticamente
- ✅ Documento aparece en "Mis Documentos"
- ✅ Puede compartir con enlace + código
- ✅ Tercero puede acceder con código correcto
- ✅ No hay errores crypto en console

---

**Estado:** ✅ Migración aplicada, cambios de código implementados
**Pendiente:** 🧪 Test manual del flujo completo E2E
**Fecha:** 2025-12-24T11:24:26.232Z
