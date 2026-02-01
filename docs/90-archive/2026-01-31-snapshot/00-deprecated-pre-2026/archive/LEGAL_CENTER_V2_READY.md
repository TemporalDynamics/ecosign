# ✅ Legal Center V2 - Listo para Testing

**Fecha:** 2025-12-17  
**Rama:** `feature/legal-center-v2`  
**Estado:** Ready for manual testing

---

## 🎯 Qué se implementó

### 1. Constitución (fuente de verdad)
- ✅ `LEGAL_CENTER_CONSTITUTION.md` (22KB, 847 líneas)
- Define 4 acciones, copy inmutable, CTA dinámico, 9 escenarios de testing
- Política de PR obligatoria para cambios futuros

### 2. Botón "Certificar" en Home
- ✅ `client/src/pages/DashboardStartPage.jsx`
- 4ta acción agregada (Certificar documento)
- Grid cambiado a 4 columnas

### 3. LegalCenterModalV2
- ✅ `client/src/components/LegalCenterModalV2.jsx` (1900+ líneas)
- **Visual:** 100% idéntico al legacy (grid, colores, spacing, animaciones)
- **Lógica:** Refactorizada según Constitución

### 4. Switch controlado
- ✅ `client/src/components/LegalCenterRoot.jsx`
- Flag: `USE_LEGAL_CENTER_V2 = true` (default)
- Permite alternar entre V2 y legacy fácilmente

---

## 🔄 Cambios aplicados en V2

### Estados
- ✅ Añadido: `documentLoaded` (control de visibilidad de acciones)
- ✅ Mantenidos: todos los estados originales (no se eliminó nada)

### Funciones helper (nuevas)
- ✅ `getCTAText()` → Texto dinámico del CTA ("Proteger" / "Proteger y firmar" / etc.)
- ✅ `isCTAEnabled()` → Validación pura del estado

### Handlers modificados
- ✅ `handleFileSelect`: 
  - `setDocumentLoaded(true)`
  - Toast: "Documento listo. EcoSign no ve tu documento. La certificación está activada por defecto."
  - Auto-abrir modal firma si `initialAction === 'sign'` o `mySignature === true`
  
- ✅ `handleFinalizeClick`:
  - Validaciones con `isCTAEnabled()`
  - Toasts específicos según qué falta

### UI modificada
- ✅ Botones de acciones (NDA, Mi Firma, Flujo):
  - Solo visibles si `(documentLoaded || initialAction)`
  - Toast "Vas a poder firmar..." al activar Mi Firma
  - Toast "Agregá los correos..." al activar Flujo

- ✅ CTA (botón Finalizar):
  - Texto dinámico: `{getCTAText()}`
  - Disabled si: `!file || !isCTAEnabled()`
  - Estilos condicionales (gris si inactivo)

### Copy actualizado
- ✅ "Documento listo" (vs "Documento cargado correctamente")
- ✅ Toasts según Constitución (30+ mensajes inmutables)

---

## 🚫 Lo que NO se tocó (visual parity)

- ❌ Grid layout (3 columnas con colapso suave)
- ❌ Estilos, colores, spacing, tipografía
- ❌ Preview de documento (altura fija por modo)
- ❌ Modal de firma dentro del preview
- ❌ Panels NDA y Flujo (diseño y posición)
- ❌ Header, iconos, tooltip positions
- ❌ Animaciones y transiciones
- ❌ `handleCertify` completo (lógica de certificación)
- ❌ Sistema de pasos (1: Elegir, 2: Firmar, 3: Listo)
- ❌ Funciones de anotación (aunque no se usen)

---

## 📋 Testing manual (9 escenarios de la Constitución)

### Escenario 1: Header sin acción
```
1. Abrir Centro Legal desde header (sin acción preseleccionada)
2. ✓ Solo dropzone visible
3. ✓ Acciones (NDA, Mi Firma, Flujo) NO visibles
4. Subir documento
5. ✓ Toast: "Documento listo..."
6. ✓ Acciones aparecen
7. ✓ CTA: "Proteger documento" (activo, negro)
8. Click en CTA → Finaliza correctamente
```

### Escenario 2: Home → Certificar
```
1. Click en "Certificar documento" en Home
2. ✓ Modal se abre
3. Subir documento
4. ✓ Toast: "Documento listo..."
5. ✓ CTA: "Proteger documento" (activo)
6. ✓ Escudo visible con tooltip correcto
7. Click en CTA → Finaliza
8. ✓ Toast éxito: "Documento protegido correctamente."
```

### Escenario 3: Home → Firmar
```
1. Click en "Firmar documento" en Home
2. ✓ Modal se abre
3. Subir documento
4. ✓ Toast: "Documento listo..."
5. ✓ Toast: "Vas a poder firmar..."
6. ✓ Modal de firma se abre automáticamente
7. Dibujar firma
8. Click en "Aplicar firma"
9. ✓ Toast: "Firma aplicada correctamente"
10. ✓ Toast interactivo aparece (bottom-center): "Elegí el peso legal"
11. Click en "Firma legal"
12. ✓ Toast: "Firma legal seleccionada"
13. ✓ CTA: "Proteger y firmar" (activo)
14. Click en CTA → Finaliza
15. ✓ Toast: "Documento firmado y protegido correctamente"
```

### Escenario 4: Home → Flujo
```
1. Click en "Crear Flujo de Firmas" en Home
2. ✓ Modal se abre
3. ✓ Panel Flujo ya descolapsado (visible a la derecha)
4. ✓ Toast: "Agregá los correos..."
5. Subir documento
6. ✓ Toast: "Documento listo..."
7. ✓ CTA: "Proteger y enviar mails" (INACTIVO/gris)
8. Intentar click en CTA → Toast error: "Agregá al menos un correo"
9. Agregar mail válido en campo
10. ✓ Toast: "Destinatario agregado correctamente"
11. ✓ CTA se vuelve ACTIVO (negro)
12. Click en CTA → Finaliza
13. ✓ Toast: "Documento protegido y enviado correctamente"
```

### Escenario 5: Home → NDA
```
1. Click en "Enviar NDA" en Home
2. ✓ Modal se abre
3. ✓ Panel NDA ya descolapsado (visible a la izquierda)
4. ✓ Texto NDA editable
5. Subir documento
6. ✓ Toast: "Documento listo..."
7. ✓ CTA: "Proteger documento" (activo)
8. Click en CTA → Finaliza
```

### Escenario 6: Firmar + Flujo (combinado)
```
1. Header → Abrir Centro Legal (sin acción)
2. Subir documento
3. ✓ Acciones aparecen
4. Click en "Mi Firma"
5. ✓ Toast: "Vas a poder firmar..."
6. ✓ Modal firma se abre
7. Aplicar firma
8. ✓ Toast: "Firma aplicada correctamente"
9. ✓ Toast interactivo: elegir tipo
10. Elegir "Firma legal"
11. ⚠️ CTA: "Proteger y firmar" pero sigue INACTIVO (correcto)
12. Click en "Flujo de Firmas"
13. ✓ CTA cambia a: "Proteger, firmar y enviar mails" (INACTIVO)
14. ✓ Toast: "Agregá los correos..."
15. Agregar mail
16. ✓ Toast: "Destinatario agregado"
17. ✓ CTA se ACTIVA
18. Click en CTA → Finaliza
19. ✓ Toast: "Documento firmado, protegido y enviado correctamente"
```

### Escenario 7: Desactivar certificación
```
1. Subir documento
2. Click en escudo (desactivar)
3. ✓ Toast: "La certificación fue desactivada. El documento tendrá menor protección."
4. ✓ CTA sigue funcionando (no bloquea)
```

### Escenario 8: Errores de validación
```
1. Activar "Mi Firma"
2. Subir documento
3. ✓ Modal se abre
4. NO dibujar firma
5. Click en "Aplicar firma"
6. ✓ Toast error: "Completá tu firma para continuar"
7. Dibujar firma
8. Aplicar firma
9. NO elegir tipo (cerrar toast sin elegir)
10. Click en CTA
11. ✓ Toast error: "Elegí el tipo de firma para continuar"
```

### Escenario 9: Navegación sin bloqueos
```
1. Subir documento
2. Abrir modal de firma
3. Cerrar modal sin aplicar (X o Volver)
4. ✓ Modal se cierra
5. ✓ No hay estado corrupto
6. ✓ Poder volver a abrir
```

---

## 🔧 Cómo probar V2

### Opción 1: V2 está activo por default
```bash
# Ya está en true
USE_LEGAL_CENTER_V2 = true
```
Simplemente usar la app normalmente.

### Opción 2: Volver a legacy temporalmente
```javascript
// En client/src/components/LegalCenterRoot.jsx
const USE_LEGAL_CENTER_V2 = false; // Cambiar a false
```

### Opción 3: Testing paralelo
```bash
# Terminal 1: V2
npm run dev

# Terminal 2: Legacy (cambiar flag primero)
npm run dev --port 5174
```

---

## 📊 Métricas de implementación

- **Archivos creados:** 3
  - `LEGAL_CENTER_CONSTITUTION.md` (847 líneas)
  - `LegalCenterModalV2.jsx` (1900+ líneas)
  - `LEGAL_CENTER_V2_PLAN.md` (plan técnico)

- **Archivos modificados:** 2
  - `DashboardStartPage.jsx` (+1 botón)
  - `LegalCenterRoot.jsx` (+10 líneas, switch)

- **Commits en rama:**
  - `feat: Legal Center Constitution + Certify action`
  - `feat: Align certification state flow in UI (Fase 5 polish)`
  - `feat: Create LegalCenterModalV2 with Constitution logic`
  - `feat: Add V2 switch in LegalCenterRoot`

- **Código legacy preservado:** 100%
  - Legacy sigue intacto y funcional
  - V2 coexiste sin romper nada

---

## ⚠️ Antes de mergear a main

### Validaciones requeridas:
- [ ] Todos los 9 escenarios de testing pasan
- [ ] Copy exacto según Constitución
- [ ] CTA dinámico funciona correctamente
- [ ] Validaciones bloquean cuando corresponde
- [ ] Toasts aparecen en posición/duración correcta
- [ ] Modal de firma se abre automáticamente cuando debe
- [ ] Panel Flujo/NDA se abre automáticamente cuando debe
- [ ] No hay regresiones en flujo viejo (si se alterna con flag)
- [ ] Edge functions reciben estados correctos (verificar en producción)

### Documentación pendiente:
- [ ] Video/screenshots de flujos principales
- [ ] Diff completo: LegalCenterModal vs LegalCenterModalV2
- [ ] Documento "Código Obsoleto Identificado" (análisis de lo que no se usa)

---

## 🚀 Próximos pasos

### Fase 1: Testing interno (ahora)
1. Testing manual de 9 escenarios
2. Verificar toasts y copy
3. Validar CTA dinámico en todos los casos
4. Confirmar que no hay regresiones

### Fase 2: Deploy a staging
1. Mergear `feature/legal-center-v2` → `main`
2. Deploy a ambiente de staging
3. Testing con usuarios internos
4. Validar certificación completa (TSA + Polygon + Bitcoin)

### Fase 3: Cutover (cuando V2 esté validado)
1. Eliminar `LegalCenterModal.jsx` (legacy)
2. Renombrar `LegalCenterModalV2.jsx` → `LegalCenterModal.jsx`
3. Remover flag `USE_LEGAL_CENTER_V2`
4. Actualizar imports
5. Commit: "refactor: Replace legacy Legal Center with V2"

### Fase 4: Limpieza post-cutover
1. Analizar código obsoleto identificado en diff
2. Remover flags, estados, handlers que ya no se usan
3. Consolidar funciones helper en utils si se reutilizan
4. Actualizar tests (cuando existan)

---

## 📝 Notas importantes

### Contrato con backend (inmutable)
- `forensicEnabled: boolean`
- `forensicConfig: { useLegalTimestamp, usePolygonAnchor, useBitcoinAnchor }`
- `signatureType: 'legal' | 'certified' | null`
- `emailInputs: Array<{ email, name, requireLogin, requireNda }>`
- `ndaText: string`

**Estos estados NO cambiaron.** Edge functions reciben los mismos contratos.

### Copy inmutable
Todos los toasts y mensajes están definidos en la Constitución.  
**No cambiar sin actualizar la Constitución primero.**

### Política de PR
Toda PR futura que toque Centro Legal debe:
1. Citar qué regla de la Constitución respeta
2. Si propone cambiar una regla, justificar por qué
3. Demostrar que no rompe contratos con backend
4. Incluir testing manual de escenarios afectados

---

**Este documento certifica que LegalCenterModalV2 está listo para testing manual.**

**Ref:** `LEGAL_CENTER_CONSTITUTION.md` v2.0
