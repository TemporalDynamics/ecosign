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
**Estado:** ⏳ PENDIENTE
- [ ] Al hacer clic en "Mi Firma" → abrir modal inmediatamente
- [ ] Marcar estado interno `hasSignature = true` al confirmar
- [ ] No mostrar opciones de tipo de firma hasta que exista firma

#### B) Mostrar opciones de tipo DESPUÉS de firmar
**Estado:** ⏳ PENDIENTE
- [ ] Solo mostrar "Firma Legal" / "Firma Certificada" si `hasSignature === true`
- [ ] Bloquear finalizar si "Mi Firma" activa y no hay firma

#### C) Firma debe ser visible
**Estado:** ⏳ PENDIENTE  
- [ ] La firma aplicada debe verse en el preview (no solo toast)
- [ ] Implementar overlay visual o indicador claro de firma aplicada

#### D) **BUG CRÍTICO: Offset del cursor**
**Estado:** 🐛 CRÍTICO
- [ ] Corregir desfase del puntero al dibujar
- [ ] El trazo debe empezar exactamente donde está el cursor

---

### 🔨 F3.2b — "Flujo de Firmas": campos mínimos (MVP)

**Estado:** ⏳ PENDIENTE

#### Regla funcional mínima
- [ ] 1 firmante = 1 campo de firma en el documento
- [ ] N firmantes = N campos visibles
- [ ] Campos representan "lugares donde se firma"

#### Colocación determinista (recomendación aceptada)
- [ ] **Ubicación:** última página, esquina inferior derecha
- [ ] **Stack vertical:** si hay múltiples firmantes
- [ ] Evitar ambigüedad ("parece bug")

#### Fuera de alcance (explícito)
- ❌ NO implementar editor avanzado
- ❌ NO implementar drag & drop de campos
- ❌ NO implementar subcampos (Nombre/DNI)
- ❌ NO implementar tooltips/etiquetas editables

---

### 🔨 F3.3 — Visor del documento: limpieza + acciones

**Estado:** ⏳ PENDIENTE

#### 1) Ocultar herramientas editoriales
- [ ] Ocultar resaltador, lápiz, texto de SignNow en esta UI
- [ ] NO eliminar backend, solo no mostrar

#### 2) Solo 2 acciones visibles
- [ ] Preview / Ver documento completo
- [ ] Cambiar archivo
- [ ] Preview debe mantener botón "Volver al Centro Legal"

#### 3) Alinear layout
- [ ] Evitar que "cambiar archivo" quede desalineado
- [ ] Reducir altura del header del visor si aplica

#### 4) Descargas coherentes
- [ ] Si puede descargar → botón habilitado
- [ ] Si NO puede descargar → botón deshabilitado + mensaje claro
  - "No guardaste este documento; no está disponible para descargar"

---

### 🔨 F3.4 — Toasts / Guía "Mentor Ciego" (Onboarding)

**Estado:** ⏳ PENDIENTE

#### Implementar guía opcional one-time
- [ ] Persistencia por usuario (flags en localStorage o DB)
- [ ] Pregunta inicial: "¿Querés que te acompañemos?"
- [ ] Botones: Sí / No / No volver a mostrar

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
- [ ] Informativos/positivos → arriba derecha
- [ ] Errores/negativos → abajo derecha

#### Flags de persistencia
- [ ] `legal_center_guide.welcome_seen`
- [ ] `legal_center_guide.document_loaded_seen`
- [ ] `legal_center_guide.my_signature_seen`
- [ ] `legal_center_guide.signature_applied_seen`
- [ ] `legal_center_guide.signature_type_seen`
- [ ] `legal_center_guide.before_cta_seen`
- [ ] `legal_center_guide.disabled` (si elige "No volver a mostrar")

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

**Última actualización:** 2025-12-16 10:00 UTC
