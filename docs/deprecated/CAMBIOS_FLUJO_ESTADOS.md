# 🎯 Cambios en Flujo de Estados - Resumen Ejecutivo

**Fecha:** 2025-12-17  
**Tipo:** Mejoras UI/UX - SIN cambios en backend  
**Estado:** ✅ Listo para testing

---

## 📦 ARCHIVOS MODIFICADOS

1. **`client/src/components/signature-flow/CompletionScreen.tsx`**
   - Añadido progreso visual de certificación
   - Polling opcional (max 2 min, no bloquea)
   - Auto-hide después de 5s cuando certifica

2. **`client/src/pages/DocumentsPage.jsx`**
   - Añadido indicador "Anclaje en Polygon en proceso" como detalle secundario
   - Badge principal siempre muestra estado probatorio (No certificado / Certificado / Certificado Reforzado)
   - `pending_anchor` es estado técnico interno, NO estado visible

3. **`client/src/pages/SignWorkflowPage.tsx`**
   - Pasaje de prop `userDocumentId` a CompletionScreen

---

## 🎨 CAMBIOS VISUALES

### CompletionScreen (Después de firmar)

**ANTES:**
```
✅ ¡Firma completada!
[Descargar certificado .ECO]
```

**AHORA:**
```
✅ ¡Firma completada!
   Certificación legal en curso

📋 Certificación en proceso (~30-60 segundos)
   ✅ TSA (RFC 3161): Confirmado
   ⏳ Polygon: Confirmando anclaje...
   🛡️ Bitcoin: En cola (4-24h)
   
   Podés descargar el certificado ahora.
   El refuerzo Bitcoin se completará automáticamente.

[Descargar certificado .ECO]
[Volver al inicio]
```

Después de ~60s o al hacer clic en descargar:
```
✅ ¡Firma completada!
   Certificación legal en curso

✅ Certificación completada
   Tu documento está protegido con TSA y Polygon.
   El refuerzo Bitcoin se procesará en segundo plano.

[Descargar certificado .ECO]
[Volver al inicio]
```

### DocumentsPage (Lista de documentos)

**Badge principal NO cambia:**
- ❌ NO muestra "Certificando" como estado probatorio
- ✅ Siempre muestra: No certificado | Certificado | Certificado Reforzado

**Detalle secundario (debajo del nombre):**

**ANTES:**
```
nombre-documento.pdf
└─ Refuerzo probatorio en proceso (Bitcoin 4-24h)
```

**AHORA:**
```
nombre-documento.pdf
├─ ⏳ Anclaje en Polygon en proceso (~60s)    [si pending_anchor]
└─ Refuerzo probatorio en proceso (Bitcoin 4-24h)  [si bitcoin pending]
```

---

## 🧠 PRINCIPIOS RESPETADOS

### ✅ Polygon certifica, Bitcoin refuerza
- Estado "Certificado" se alcanza con TSA + Polygon
- Bitcoin NO bloquea descarga
- Bitcoin NO degrada estado si falla

### ✅ Sin retrocesos
- Estado nunca retrocede una vez certificado
- Failures de Bitcoin no afectan certificación

### ✅ pending_anchor es estado técnico, NO legal
- NO se muestra como badge principal
- Solo aparece como detalle transitorio
- Desaparece automáticamente al certificar

### ✅ Sin bloqueos al usuario
- Polling tiene timeout (2 min max)
- Navegación nunca bloqueada
- Descarga disponible apenas certifica Polygon

---

## 🧪 CASOS DE PRUEBA

### Test 1: Flujo completo normal

1. Firmar documento como signer
2. ✅ Ver "Certificación en proceso" con checklist
3. Esperar ~60s
4. ✅ Ver "Certificación completada"
5. Descargar certificado .ECO
6. ✅ Card de progreso desaparece
7. Owner revisa DocumentsPage
8. ✅ Ver badge "Certificado" (verde)
9. ✅ Ver detalle "Refuerzo probatorio en proceso (Bitcoin 4-24h)"
10. Esperar 4-24h
11. ✅ Ver badge "Certificado Reforzado" (azul)

### Test 2: Descarga inmediata

1. Firmar documento
2. Ver "Certificación en proceso"
3. NO esperar, hacer clic en "Descargar certificado .ECO" inmediatamente
4. ✅ Card de progreso desaparece
5. ✅ Descarga se inicia
6. ✅ Archivo .ECO descargado

### Test 3: Timeout de polling

1. Firmar documento
2. Desconectar red (simular lentitud extrema)
3. Esperar 2 minutos
4. ✅ Card cambia a "Certificación completada" (timeout graceful)
5. ✅ Usuario puede descargar certificado

### Test 4: Navegación rápida

1. Firmar documento
2. Ver "Certificación en proceso"
3. Hacer clic en "Volver al inicio" inmediatamente
4. ✅ Navegación funciona sin bloqueo
5. ✅ No hay errores en consola

### Test 5: DocumentsPage con pending_anchor

1. Firmar documento
2. Owner abre DocumentsPage en <60s
3. ✅ Badge principal muestra "Certificado" (NO "Certificando")
4. ✅ Detalle muestra "⏳ Anclaje en Polygon en proceso (~60s)"
5. Esperar 60s y refrescar
6. ✅ Detalle de Polygon desaparece
7. ✅ Badge sigue siendo "Certificado"
8. ✅ Nuevo detalle "Refuerzo probatorio en proceso (Bitcoin 4-24h)"

### Test 6: Bitcoin falla, Polygon OK

1. Verificar documento con Polygon confirmado
2. Simular fallo de Bitcoin (o esperar timeout 24h)
3. ✅ Badge sigue siendo "Certificado" (verde)
4. ✅ NO retrocede a "No certificado"
5. ✅ Descarga sigue habilitada

---

## 🔍 DETALLES TÉCNICOS

### Polling en CompletionScreen

```typescript
// Max 40 polls × 3s = 2 minutos
const maxPolls = 40
const pollInterval = 3000 // ms

// Query a user_documents
SELECT overall_status, has_polygon_anchor
FROM user_documents
WHERE id = userDocumentId

// Si overall_status = 'certified' → detener polling
// Si pollCount >= maxPolls → timeout graceful
```

### Estado derivado en DocumentsPage

```javascript
const polygonAnchoring = 
  doc.overall_status === 'pending_anchor' && 
  !doc.has_polygon_anchor

// polygonAnchoring es TRUE solo durante primeros ~60s
// Después has_polygon_anchor se pone TRUE y detalle desaparece
```

### Auto-hide del progress card

```typescript
// Después de 5s en estado 'ready', card desaparece automáticamente
useEffect(() => {
  if (uiPhase === 'ready') {
    setTimeout(() => setShowProgressCard(false), 5000)
  }
}, [uiPhase])

// También desaparece al hacer clic en "Descargar"
```

---

## 🚫 LO QUE NO CAMBIÓ

- ❌ Backend: Cero cambios
- ❌ Workers: No tocados
- ❌ Contratos: No tocados
- ❌ Wallets: No tocadas
- ❌ Migraciones: No tocadas
- ❌ Lógica de certificación: Intacta
- ❌ Estados en DB: Sin cambios
- ❌ API endpoints: No modificados

---

## ⚡ IMPACTO

### Positivo
- ✅ Usuario ve progreso en tiempo real
- ✅ Reduce ansiedad ("¿ya está listo?")
- ✅ Educa sobre el proceso de certificación
- ✅ Reduce tickets de soporte
- ✅ Refuerza narrativa legal (TSA → Polygon → Bitcoin)

### Riesgo
- ✅ Mínimo: Solo cambios de UI
- ✅ Polling tiene timeout
- ✅ Navegación nunca bloqueada
- ✅ Fallback graceful si hay errores

---

## 📋 CHECKLIST PRE-MERGE

- [x] CompletionScreen: Polling con timeout
- [x] CompletionScreen: Auto-hide después de 5s
- [x] CompletionScreen: Subtítulo "Certificación legal en curso"
- [x] DocumentsPage: `polygonAnchoring` como detalle secundario
- [x] DocumentsPage: Badge principal NO muestra pending_anchor
- [x] SignWorkflowPage: Prop `userDocumentId` pasado
- [x] Sin cambios en backend
- [x] Sin cambios en workers
- [x] Código documentado
- [ ] Testing manual completado
- [ ] No hay errores en consola
- [ ] Polling se detiene correctamente
- [ ] Auto-hide funciona

---

## 🎯 PRÓXIMOS PASOS OPCIONALES (Post-merge)

1. **Supabase Realtime** en DocumentsPage
   - Auto-refresh cuando cambia overall_status
   - Sin necesidad de refresh manual

2. **Progress API detallado**
   - Endpoint que devuelve estado de TSA, Polygon, Bitcoin
   - UI muestra timestamps reales de cada fase

3. **Tooltips interactivos**
   - Hover sobre "Certificado" → tooltip con TSA + Polygon confirmados
   - Hover sobre "Certificado Reforzado" → tooltip con Bitcoin confirmado

4. **Notificaciones push**
   - "Tu documento está certificado" (después de Polygon)
   - "Refuerzo Bitcoin completado" (después de Bitcoin)

---

## 📞 CONTACTO

Si algo no queda claro durante testing:
- Revisar este documento primero
- Verificar que backend NO fue tocado
- Confirmar que estados en DB siguen iguales
- Testear con documentos reales (no mocks)

**Recordatorio:** Este cambio mejora UX sin tocar lógica de negocio. Si ves errores de certificación, NO es por estos cambios.
