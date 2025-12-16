# 🎯 FASE 3 - Centro Legal Signing UI / Documentos Funcional

## 📋 ROADMAP DE IMPLEMENTACIÓN

### ✅ F3.1 — CTAs inferiores
**Estado:** COMPLETO ✓ (ya funciona correctamente)
- NDA despliega/oculta panel izquierdo
- Flujo de Firmas despliega/oculta panel derecho
- El visor permanece como centro del grid

---

### 🔨 F3.2 — "Mi Firma": flujo definitivo (PRIORIDAD ALTA)

#### A) Abrir modal de firma inmediatamente
**Estado:** ✅ COMPLETO
- [x] Al hacer clic en "Mi Firma" → abrir modal inmediatamente
- [x] Marcar estado interno `hasSignature = true` al confirmar
- [x] No mostrar opciones de tipo de firma hasta que exista firma

#### B) Mostrar opciones de tipo DESPUÉS de firmar
**Estado:** ✅ COMPLETO
- [x] Solo mostrar "Firma Legal" / "Firma Certificada" si `hasSignature === true`
- [x] Bloquear finalizar si "Mi Firma" activa y no hay firma

#### C) Firma debe ser visible
**Estado:** ✅ COMPLETO
- [x] La firma aplicada debe verse en el preview (no solo toast)
- [x] Implementar overlay visual o indicador claro de firma aplicada (badge "Firmado")

#### D) **BUG CRÍTICO: Offset del cursor**
**Estado:** ✅ COMPLETO
- [x] Corregir desfase del puntero al dibujar con devicePixelRatio
- [x] El trazo debe empezar exactamente donde está el cursor

---

### 🔨 F3.2b — "Flujo de Firmas": campos mínimos (MVP)

**Estado:** ✅ COMPLETO (placeholders visuales)

#### Regla funcional mínima
- [x] 1 firmante = 1 campo de firma en el documento
- [x] N firmantes = N campos visibles
- [x] Campos representan "lugares donde se firma"

#### Colocación determinista (recomendación aceptada)
- [x] **Ubicación:** esquina inferior derecha (placeholders overlay)
- [x] **Stack vertical:** si hay múltiples firmantes
- [x] Evitar ambigüedad ("parece bug")

#### Fuera de alcance (explícito)
- ❌ NO implementar editor avanzado
- ❌ NO implementar drag & drop de campos
- ❌ NO implementar subcampos (Nombre/DNI)
- ❌ NO implementar tooltips/etiquetas editables

---

### 🔨 F3.3 — Visor del documento: limpieza + acciones

**Estado:** ✅ COMPLETO

#### 1) Ocultar herramientas editoriales
- [x] Ocultar resaltador, lápiz, texto de SignNow en esta UI
- [x] NO eliminar backend, solo no mostrar

#### 2) Solo 2 acciones visibles
- [x] Preview / Ver documento completo
- [x] Cambiar archivo
- [x] Preview mantiene claridad de contexto

#### 3) Alinear layout
- [x] Layout limpio y alineado
- [x] Header del visor optimizado

#### 4) Descargas coherentes
- [ ] Si puede descargar → botón habilitado
- [ ] Si NO puede descargar → botón deshabilitado + mensaje claro
  - "No guardaste este documento; no está disponible para descargar"

---

### 🔨 F3.4 — Toasts / Guía "Mentor Ciego" (Onboarding)

**Estado:** ✅ COMPLETO

#### Implementar guía opcional one-time
- [x] Persistencia por usuario (flags en localStorage)
- [x] Pregunta inicial: "¿Querés que te acompañemos?"
- [x] Botones: Sí / No / No volver a mostrar

#### Mensajes de la guía (orden de aparición)

**1) Primer uso (sin documentos)**
```
Título: "Bienvenido al Centro Legal"
Texto: "Para iniciar el proceso, subí el documento que querés firmar o certificar."
Pregunta: "¿Querés que te acompañemos durante el proceso?"
Botones: Sí / No / No volver a mostrar
Subtexto: "Pensá en ecosign como alguien que acompaña, pero que es ciego."
```

**2) Documento cargado (mensaje clave)**
```
"EcoSign no ve tu documento. Si elegís guardarlo, se sube cifrado."
```
**Nota:** Ajuste aceptado vs copy original "no vemos ni almacenamos"

**3) Mi Firma (primer uso)**
```
"La firma no es un trámite. Es un acto consciente de autoría."
```

**4) Firma aplicada**
```
"La firma quedó registrada. Ahora podés decidir el peso legal que querés asignarle."
```

**5) Tipo de firma**
```
Legal: "Adecuada para la mayoría de acuerdos claros y cotidianos…"
Certificada: "Indicada cuando un tercero la solicita…"
```

**6) Antes del CTA final**
```
"El siguiente paso genera la evidencia que protege este documento en el tiempo. 
Sin exponer su contenido. Sin depender de terceros."
```

#### Ubicación de toasts
- [x] Informativos/positivos → arriba derecha
- [x] Errores/negativos → abajo derecha (ya configurado en sistema)

#### Flags de persistencia
- [x] `welcome_seen`
- [x] `document_loaded_seen`
- [x] `my_signature_seen`
- [x] `signature_applied_seen`
- [ ] `signature_type_seen` (opcional - no crítico para MVP)
- [ ] `before_cta_seen` (opcional - no crítico para MVP)
- [x] `disabled` (si elige "No volver a mostrar")

---

## 🚫 FUERA DE ALCANCE (No tocar en Fase 3)

- ❌ Blockchain / Polygon / Bitcoin / TSA (ya funciona)
- ❌ Blindaje (toggles de protección) (ya funciona)
- ❌ Rework del flujo NDA o envío (ya funciona)
- ❌ Editor de campos avanzado (patrones, duplicar sets, subcampos)

---

## ✅ CRITERIOS DE ACEPTACIÓN (QA)

### UX
- [ ] Usuario nuevo entiende dónde firmar en <3 segundos
- [ ] Seleccionar "Mi Firma" abre modal inmediatamente
- [ ] No se puede finalizar si "Mi Firma" activa y no hay firma
- [ ] La firma se ve aplicada (no solo toast)

### Visor
- [ ] Toolbar no confunde (solo preview + cambiar archivo)
- [ ] Preview grande vuelve al Centro Legal sin perder contexto
- [ ] Descargas/acciones coherentes: si algo no existe, se explica

### Guía
- [ ] Toast guía: opcional, one-time, desactivable para siempre

---

## 📦 ENTREGA

**Formato:** PR único `phase3-signing-ui`

**Debe incluir:**
- [ ] Checklist QA arriba ✓
- [ ] Screenshots (antes/después)
- [ ] No cambiar backend salvo estrictamente necesario para "firma visible"

---

## 🎯 ESTADO ACTUAL

**Rama:** `phase3-signing-ui`
**Base:** `main`
**Iniciado:** 2025-12-16
**Último commit:** 047dc87

### ✅ Completado:
- F3.2D: Canvas cursor offset fix (devicePixelRatio)
- F3.2A-C: Flujo "Mi Firma" completo
- F3.2b: Placeholders visuales para campos de firma (MVP)
- F3.3: Limpieza del toolbar
- F3.4: Sistema de guía "Mentor Ciego"

### ⏳ Pendiente:
- Análisis de integración SignNow (al final, no bloqueante para MVP)

---

## 🧭 ORDEN DE IMPLEMENTACIÓN SUGERIDO

1. **F3.2D** - Bug crítico cursor (prioridad máxima)
2. **F3.2A-C** - Flujo "Mi Firma" completo
3. **F3.2b** - Campos de firma para workflow
4. **F3.3** - Limpieza del visor
5. **F3.4** - Sistema de guía (último, requiere todo funcionando)

---

## 🤝 DECISIONES PENDIENTES

Si encuentro alguna situación ambigua o conflicto de decisiones:
- **FRENAR** y preguntar
- No asumir caminos sin confirmar
- Documentar la duda claramente

---

---

## 📊 ANÁLISIS POST-MVP: Integración SignNow para Campos Reales

**Estado:** PENDIENTE (no bloqueante para MVP privado)

### Contexto
Actualmente los campos de firma en "Flujo de Firmas" son placeholders visuales (overlays en el preview). Para producción, necesitamos que SignNow procese campos reales.

### Preguntas a resolver:

#### Frontend
1. ¿SignNow tiene un SDK/API para colocar campos de firma desde el cliente?
2. ¿Necesitamos usar un iframe embebido de SignNow para el editor de campos?
3. ¿Podemos mantener nuestro UI custom y solo enviar coordenadas a SignNow?
4. ¿Cómo manejar el preview: mostrar nuestra UI o la de SignNow?

#### Backend
1. ¿La API de SignNow requiere crear el documento primero antes de colocar campos?
2. ¿Necesitamos endpoint nuevo para "preparar documento con campos"?
3. ¿Los campos deben tener IDs específicos que matcheen con los emails?
4. ¿Cómo se mapean los firmantes a los campos? (orden, asignación)

#### Opciones de implementación

**Opción A: SignNow Embedded Editor**
- Pros: Completo, SignNow maneja todo
- Cons: Perdemos control de UI, experiencia diferente

**Opción B: Coordenadas programáticas**
- Pros: Mantenemos UI, control total
- Cons: Más complejo, necesitamos calcular posiciones exactas

**Opción C: Híbrido**
- Pros: UI custom + validación de SignNow
- Cons: Requiere sincronización entre sistemas

### Tareas pendientes:
- [ ] Revisar documentación SignNow API para campos
- [ ] Probar SDK de SignNow en sandbox
- [ ] Definir flujo óptimo: ¿campos antes o después de subir PDF?
- [ ] Crear POC con SignNow embedded vs programático
- [ ] Estimar esfuerzo de cada opción
- [ ] Decidir approach final

### Notas importantes:
- Los placeholders actuales son suficientes para MVP privado
- La lógica de workflow (emails, orden) ya funciona
- Solo necesitamos mejorar la colocación de campos para producción
- No cambiar backend actual hasta tener claridad del approach

---

**Última actualización:** 2025-12-16 12:00 UTC
