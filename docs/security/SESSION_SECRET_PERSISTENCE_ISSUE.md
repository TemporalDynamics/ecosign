# Session Secret Persistence Issue

## Problema

Los usuarios reportan error "Failed to unwrap document key. Session may have expired" al intentar compartir documentos, incluso inmediatamente después de iniciar sesión.

## Causa Raíz

El `sessionSecret` (clave maestra para el cifrado E2E del usuario) se generó como NUEVO en lugar de cargarse desde localStorage cuando debería haberse recuperado.

### Flujo Normal (Esperado)

```
1. Usuario crea documento
   → Se genera documentKey (única por documento)
   → documentKey se encripta (wrap) con unwrapKey derivada de sessionSecret_A
   → wrapped_key se guarda en DB

2. sessionSecret_A se guarda en localStorage

3. Usuario cierra sesión / navegador

4. Usuario vuelve a iniciar sesión
   → sessionSecret_A se carga desde localStorage
   → Se deriva unwrapKey_A (misma clave)
   → wrapped_key se puede desencriptar correctamente ✅
```

### Flujo Problemático (Actual)

```
1. Usuario crea documento
   → documentKey se encripta con unwrapKey derivada de sessionSecret_A
   → wrapped_key se guarda en DB

2. sessionSecret_A se guarda en localStorage (o falla silenciosamente)

3. Usuario cierra sesión / navegador / borra localStorage

4. Usuario vuelve a iniciar sesión
   → sessionSecret_A NO existe en localStorage
   → Se genera NUEVO sessionSecret_B
   → Se deriva unwrapKey_B (DIFERENTE clave)
   → wrapped_key NO se puede desencriptar ❌
   → Error: "Failed to unwrap document key"
```

## Por Qué Se Pierde el sessionSecret

Razones identificadas:

1. **localStorage borrado manualmente por el usuario**
   - Settings del navegador → Clear browsing data
   - Extensiones de privacidad (Privacy Badger, uBlock Origin, etc.)

2. **Modo incógnito / Private browsing**
   - localStorage no persiste entre sesiones

3. **Navegador/dispositivo diferente**
   - localStorage es por navegador, no sincroniza

4. **Fallo silencioso al guardar**
   - localStorage lleno (cuota excedida)
   - localStorage deshabilitado por políticas de empresa
   - Error de encoding/decoding no manejado

## Impacto

- **Documentos inaccesibles**: Los documentos creados con sessionSecret_A se vuelven permanentemente inaccesibles si sessionSecret_A se pierde
- **No se pueden compartir**: Fallan las operaciones de compartir porque requieren desencriptar documentKey
- **Pérdida de datos**: La evidencia criptográfica se vuelve inutilizable

## Solución Implementada

### 1. Verificación de Persistencia (CRÍTICO)

**Archivo**: `client/src/lib/e2e/sessionCrypto.ts`

```typescript
const storeSessionSecret = (userId: string, secret: Uint8Array): boolean => {
  try {
    const encoded = btoa(String.fromCharCode(...secret));
    const storageKey = getSessionStorageKey(userId);

    localStorage.setItem(storageKey, encoded);

    // CRITICAL: Verify the secret was actually saved
    const verification = localStorage.getItem(storageKey);
    if (verification !== encoded) {
      console.error('❌ CRITICAL: Session secret was NOT persisted correctly!');
      return false;
    }

    console.log('✅ Session secret persisted to localStorage:', storageKey);
    return true;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to persist session secret:', error);
    return false;
  }
};
```

**Cambio clave**:
- Ahora retorna `boolean` indicando éxito/fallo
- Verifica que el valor guardado se pueda leer correctamente
- Logs críticos si falla

### 2. Persistencia Siempre (No Condicional)

**Antes**:
```typescript
if (!storedSecret) {
  storeSessionSecret(userId, sessionSecret);
}
```

**Ahora**:
```typescript
// CRITICAL: Always try to persist the session secret
const persistSuccess = storeSessionSecret(userId, sessionSecret);

if (!persistSuccess) {
  console.error('⚠️ WARNING: Session initialized but could NOT be persisted!');
  console.error('   Documents created in this session will become INACCESSIBLE after logout.');
}
```

**Cambio clave**: Siempre intenta guardar, incluso si ya había uno guardado. Esto asegura sincronización.

### 3. Logging Mejorado

**Archivo**: `client/src/lib/e2e/sessionCrypto.ts`

```typescript
if (storedSecret) {
  console.log('✅ Loaded existing session secret from localStorage for user:', userId);
} else {
  console.log('🆕 Generated NEW session secret for user:', userId, '(previous documents may become inaccessible)');
}
```

**Cambio clave**: Ahora es OBVIO cuando se genera un nuevo secret vs cuando se carga uno existente.

### 4. Función de Diagnóstico

**Nueva función**: `diagnoseCryptoSession()`

Expuesta globalmente como `window.checkCryptoSession()` para debugging.

```javascript
checkCryptoSession()
```

Muestra:
- ✅ Estado de la sesión (inicializada o no)
- ✅ User ID actual
- ✅ Si localStorage funciona
- ✅ Si el sessionSecret está guardado
- ✅ Longitud y validez del secret guardado

### 5. Función de Guardado Forzado

**Nueva función**: `forceSaveSessionSecret()`

Expuesta globalmente como `window.forceSaveSession()`.

```javascript
forceSaveSession()
```

Permite al usuario forzar el guardado del sessionSecret actual si sospecha que no se guardó.

## Prevención Futura

### Para Usuarios

1. **No borrar localStorage** del navegador (o hacer backup antes)
2. **Usar el mismo navegador** para EcoSign consistentemente
3. **Evitar modo incógnito** para cuentas permanentes
4. **Ejecutar `checkCryptoSession()`** periódicamente para verificar
5. **Ejecutar `forceSaveSession()`** después de crear documentos importantes

### Para Desarrolladores

1. **Implementar backup del sessionSecret** (exportar/importar)
2. **Migración de documentos** a nuevo sessionSecret (re-wrap documentKeys)
3. **Detección de documentos inaccesibles** en la UI
4. **Warning modal** si sessionSecret no se puede persistir
5. **Multi-device sync** (sincronizar sessionSecret entre dispositivos del mismo usuario)

## Recuperación de Documentos Perdidos

Si un usuario pierde el sessionSecret:

### Opción 1: Recuperar sessionSecret Original

Si el usuario todavía tiene acceso al navegador/dispositivo original:
1. Ir a ese navegador
2. Ejecutar `checkCryptoSession()`
3. Si dice "Loaded existing session secret", exportar el sessionSecret
4. Importarlo en el nuevo navegador

### Opción 2: Acceso a PDFs Originales

Si los documentos tienen `pdf_storage_path` (PDF sin encriptar):
1. Descargar el PDF original
2. Eliminar el documento de la DB
3. Volver a subir el documento
4. Se creará con el nuevo sessionSecret

**Limitación**: Esto NO preserva la evidencia criptográfica original (timestamps, hashes, etc.)

### Opción 3: Documentos Perdidos Permanentemente

Si no hay sessionSecret original NI PDF original:
- Los documentos están **permanentemente inaccesibles**
- Esto es **por diseño** (Zero Server-Side Knowledge)
- El servidor NUNCA tuvo acceso a la clave de descifrado

## Testing

Para verificar que la solución funciona:

```bash
# 1. Login como usuario
# 2. En consola del navegador:
checkCryptoSession()
# Debería mostrar: "✅ Session secret in localStorage: true"

# 3. Crear un documento

# 4. Verificar que se guardó:
checkCryptoSession()
# Debería seguir mostrando: "✅ Session secret in localStorage: true"

# 5. Cerrar sesión
# 6. Login nuevamente
# Logs deberían mostrar: "✅ Loaded existing session secret from localStorage"

# 7. Intentar compartir el documento → debería funcionar ✅
```

## Métricas de Éxito

- ✅ `sessionSecret` se persiste correctamente en 100% de los casos (o falla con error visible)
- ✅ Usuarios no reportan error "Session may have expired" después de login reciente
- ✅ Documentos se pueden compartir sin problemas
- ✅ Logs claros indican cuándo se carga vs cuándo se genera nuevo secret

## Referencias

- Issue original: Usuario reportó "failed to unwrap document key. session may have expired"
- Archivos modificados:
  - `client/src/lib/e2e/sessionCrypto.ts`
  - `client/src/lib/e2e/documentEncryption.ts`
  - `client/src/lib/storage/documentSharing.ts`
  - `client/src/lib/e2e/index.ts`
  - `client/src/DashboardApp.tsx`
- Fecha: 2026-01-04
