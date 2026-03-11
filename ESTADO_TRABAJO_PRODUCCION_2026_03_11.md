# 📋 ESTADO DE TRABAJO - Revisión para Producción

**Fecha:** 2026-03-11  
**Estado:** PENDIENTE DE VALIDACIÓN EN PRODUCCIÓN  
**Entorno:** Canary (solo 1 usuario activo)

---

## ✅ TRABAJOS COMPLETADOS

### 1. Fix: Error 401 en Sesión Probatoria Reforzada

**Archivo modificado:** `client/src/pages/DocumentsPage.tsx`

**Cambio realizado (líneas 497-502):**
```typescript
// Verificar que el usuario tenga sesión activa antes de invocar la función
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (!session || sessionError) {
  toast.error("Tu sesión expiró. Por favor iniciá sesión nuevamente.", { position: "top-right" });
  return;
}
```

**Problema resuelto:**
- Usuario intentaba iniciar sesión probatoria sin sesión activa
- `supabase.functions.invoke()` no enviaba token Authorization
- Edge Function retornaba 401 "Missing authorization header"

**Por qué funciona:**
- `getSession()` verifica que el usuario tenga sesión válida con Supabase Auth
- Si hay sesión, `supabase.functions.invoke()` incluye automáticamente el token
- Edge Function con `verify_jwt = true` acepta el JWT y permite acceso

**Validación requerida en producción:**
1. Iniciar sesión en ecosign.app
2. Ir a Documents Page
3. Click en "Sesión probatoria reforzada" en una operación
4. **Esperado:** Funciona sin error 401
5. **Si falla:** Verificar consola del navegador para ver error exacto

---

### 2. Tests: Custody Upload Flow

**Archivos creados:**
- `tests/integration/custody_upload_flow.test.ts` (416 líneas)
- `tests/integration/CUSTODY_UPLOAD_TESTS.md` (236 líneas)

**Tests implementados (5 suites):**
1. ✅ Encrypt/Decrypt file client-side
2. ✅ Create signed upload URL
3. ✅ Full upload cycle (encrypt → upload → register → verify)
4. ✅ Download and decrypt
5. ✅ Security RLS (unauthorized access blocked)

**Coverage:**
- 3 Edge Functions testeadas
- 2 Client Services testeadas
- Storage bucket + RLS
- Database table + constraints

**Estado:** IMPLEMENTADO (no ejecutado en producción)

**Nota:** Estos tests son para desarrollo local. No afectan producción.

---

## 🟡 PENDIENTES (NO BLOQUEANTES)

### EPI Level 2 - Postergado

**Decisión:** Implementar después de cerrar todos los puntos de pulido

**Qué falta:**
- `parsePDFStructure()` — Análisis estructural de PDFs
- `contentHash(H_c)` — Hash del cuerpo inmutable
- `stateHash(H_s)` — Hash de cada actualización
- Verificador `INTACT_BUT_INTERMEDIATE`

**Timeline:** 2-3 semanas (cuando se apruebe)

---

### Cleanup: build-final-artifact - Postergado

**Decisión:** Verificar dependencias antes de eliminar

**Estado:** `build-final-artifact` sigue activo pero es redundante con `build-artifact`

**Timeline:** 1 hora (cuando se apruebe)

---

## 📊 RESUMEN DE CAMBIOS PARA PRODUCCIÓN

### Cambios que requieren validación:

| Archivo | Cambio | Impacto | Validación Requerida |
|---------|--------|---------|---------------------|
| `client/src/pages/DocumentsPage.tsx` | +6 líneas (validación de sesión) | BAJO - Solo afecta botón "Sesión probatoria" | ✅ Probar sesión probatoria con usuario logueado |

### Cambios que NO afectan producción:

| Archivo | Cambio | Impacto |
|---------|--------|---------|
| `tests/integration/custody_upload_flow.test.ts` | Tests nuevos | NULO - Solo corre en local |
| `tests/integration/CUSTODY_UPLOAD_TESTS.md` | Documentación | NULO - Solo docs |

---

## 🔍 CHECKLIST DE VALIDACIÓN EN PRODUCCIÓN

### Sesión Probatoria Reforzada

```
[ ] 1. Loguearse en ecosign.app
[ ] 2. Ir a Documents Page
[ ] 3. Tener al menos 1 operación creada
[ ] 4. Click en botón "Sesión probatoria reforzada"
[ ] 5. Esperar respuesta de la Edge Function
[ ] 6. Verificar que NO aparezca error 401
[ ] 7. Verificar que aparezca toast de éxito con session ID
[ ] 8. Verificar que se muestre modal de sesión iniciada
```

**Si falla el paso 5:**
- Abrir DevTools → Network tab
- Buscar request a `presential-verification-start-session`
- Verificar status code (debería ser 200, no 401)
- Copiar error exacto y reportar

**Si falla el paso 7:**
- Verificar consola del navegador
- Verificar que `FASE=1` esté seteado en production
- Verificar que funciones presential estén deployed

---

## 🎯 CRITERIOS DE APROBACIÓN

### Para Sesión Probatoria (Fix #1):

**APROBADO si:**
- ✅ Usuario logueado puede iniciar sesión probatoria sin error 401
- ✅ Toast de éxito muestra session ID
- ✅ Modal de sesión iniciada se muestra correctamente

**RECHAZADO si:**
- ❌ Error 401 persiste
- ❌ Error diferente aparece
- ❌ Funcionalidad se rompió

### Para Custody Upload Tests (Fix #2):

**APROBADO si:**
- ✅ Tests no rompen producción (son solo archivos nuevos en `tests/`)
- ✅ Documentación es clara

**NO REQUIERE validación funcional en producción**

---

## 📝 NOTAS ADICIONALES

### Sobre el Fix de Sesión Probatoria

**Por qué es seguro:**
- Solo agrega validación de sesión (defensivo)
- No cambia lógica existente
- Si `getSession()` falla, muestra toast amigable
- No afecta otros flujos

**Riesgo:** MÍNIMO - Solo afecta botón "Sesión probatoria"

### Sobre Custody Upload Tests

**Por qué es seguro:**
- Son archivos nuevos en carpeta `tests/`
- No modifican código de producción
- Solo corren con `npm test`
- No afectan deploy ni runtime

**Riesgo:** NULO

---

## 🚀 PRÓXIMOS PASOS (DESPUÉS DE APROBACIÓN)

### Si se aprueba Sesión Probatoria:

1. Marcar fix como COMPLETADO
2. Cerrar issue de error 401
3. Continuar con siguiente punto del plan de pulido

### Si se aprueba Custody Tests:

1. Marcar tests como COMPLETADOS
2. Ejecutar tests en local periódicamente
3. Continuar con siguiente punto del plan de pulido

### Si se RECHAZA algo:

1. Reportar error exacto encontrado
2. Revertir cambio si es necesario
3. Investigar causa raíz
4. Proponer fix alternativo

---

## 📞 CONTACTO PARA APROBACIÓN

**Validar en producción:**
1. Probar sesión probatoria reforzada
2. Reportar resultado (APROBADO / RECHAZADO)
3. Si RECHAZADO: incluir error exacto + pasos para reproducir

**Una vez aprobado:**
- Se marcan como COMPLETADOS en PLAN_PULIDO_FINAL_2026_03_11.md
- Se continúa con siguientes puntos (EPI Level 2, cleanup, etc.)

---

**Fecha de creación:** 2026-03-11  
**Última actualización:** 2026-03-11  
**Estado:** PENDIENTE DE VALIDACIÓN
