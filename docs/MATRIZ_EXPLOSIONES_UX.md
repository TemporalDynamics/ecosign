# 🔥 Matriz de Explosiones UX - EcoSign

**Fecha**: 2026-01-06
**Framework**: 4 anti-estados que definen "explosión del sistema"

---

## Definición Canónica: ¿Qué significa que "el sistema explote"?

Para EcoSign, el sistema **NO explota cuando hay un error técnico**.
Explota cuando ocurre cualquiera de estos **4 anti-estados**:

### ❌ A. Mensaje inesperado
El usuario ve algo que no esperaba en ese punto del flujo.

### ❌ B. Mensaje incomprensible
El mensaje existe, pero:
- está en inglés
- es técnico
- no explica qué pasó ni qué hacer

### ❌ C. Mensaje tardío
El sistema avisa tarde, cuando el usuario:
- ya invirtió tiempo
- ya tomó decisiones
- ya cree que está "terminando"

### ❌ D. Callejón sin salida
El usuario llega a un estado donde:
- no puede continuar
- no entiende cómo salir
- siente que "hizo algo mal"

---

## 🧠 Regla Maestra (evita 90% de explosiones)

> **El sistema nunca debe decir algo importante por primera vez en el último paso.**

Todo aviso crítico debe ocurrir:
- **antes**
- con **lenguaje humano**
- con **salida clara**

---

# 📍 MAPA DE EXPLOSIONES POR FLUJO

---

## 1️⃣ CENTRO LEGAL (Documento Simple)

**Flujo**: Upload → Activar Protección → Descargar

### PASO 1: Upload de Documento

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | PDF con firmas previas → mensaje sobre invalidar | Usuario sube PDF firmado sin saber que se borra la firma | **ANTES** del upload: "Si tu PDF ya tiene firmas, se van a eliminar al certificar" |
| **A. Inesperado** | Documento muy grande rechazado | Sube 50MB sin saber límite | **AL SUBIR**: Progress bar + "Límite: 25MB" visible |
| **B. Incomprensible** | "Invalid PDF structure" | PDF corrupto | **EN ESPAÑOL**: "Este PDF está dañado. Probá abrirlo en Adobe Reader y volvé a guardarlo." |
| **B. Incomprensible** | "Encryption detected" | PDF encriptado | ✅ YA ARREGLADO: "Este archivo tiene protección previa..." |
| **C. Tardío** | PDF corrupto detectado en firma | Usuario configura todo, al firmar explota | **EN UPLOAD**: Validar estructura antes de continuar |
| **C. Tardío** | Permisos de PDF detectados al descargar | Usuario certifica, al descargar falla | **EN UPLOAD**: "Este PDF tiene restricciones de edición" |
| **D. Sin salida** | Archivo rechazado sin sugerencia | Upload falla, no sabe qué hacer | **SIEMPRE**: "Intentá [acción] o contactá soporte" |

**Validaciones necesarias EN UPLOAD (no después)**:
- ✅ Tipo de archivo válido
- ✅ Tamaño dentro del límite
- ✅ PDF no encriptado (YA IMPLEMENTADO)
- ⏳ PDF no corrupto (estructura válida)
- ⏳ PDF sin permisos restrictivos
- ⏳ PDF sin firmas previas (advertir antes de procesar)

---

### PASO 2: Activar Protección

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | Usuario cree que activar = ya protegido | Toggle ON → cree que terminó | **NUNCA** decir "Protegido" → decir "Protección **activada**" (estado intermedio) |
| **A. Inesperado** | Usuario desactiva sin entender consecuencias | Toggle OFF sin saber qué pierde | ✅ YA IMPLEMENTADO: Modal "¿Estás seguro?" |
| **C. Tardío** | Sistema falla TSA al final | Configura todo, al certificar TSA falla | **AL ACTIVAR**: "Conectando con servicio de timestamping..." (validar antes) |
| **D. Sin salida** | TSA down, no puede continuar | FreeTSA caído, no hay plan B | **SIEMPRE**: "Problema temporal con timestamping. Reintentá en 5 min o contactá soporte" |

**Estados clarificados**:
- ✅ "Protección activada" (no "protegido")
- ✅ "Procesando timestamping..." (feedback explícito)
- ⏳ "Timestamping completado ✓" (confirmar acción)

---

### PASO 3: Descargar (CTA Final)

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **B. Incomprensible** | Error genérico "Failed to certify" | Backend falla | **EN ESPAÑOL**: "No se pudo certificar por [razón específica]. Tu trabajo está a salvo." |
| **C. Tardío** | Anclaje blockchain falla silenciosamente | Polygon timeout, usuario no se entera | **FEEDBACK EXPLÍCITO**: "Anclaje Polygon en curso (puede tardar 30 seg)" |
| **D. Sin salida** | CTA falla, usuario no sabe si guardó algo | Click "Certificar" → error → ¿se perdió? | **SIEMPRE**: "Tu documento está guardado. El problema fue [X]. Podés reintentar." |
| **D. Sin salida** | Descarga falla, no hay retry | Click "Descargar" → falla → sin botón | **SIEMPRE**: Botón "Reintentar descarga" visible |

**Feedback obligatorio en CTA**:
- ⏳ Loading explícito (no solo spinner)
- ⏳ "Generando certificado..." → "Timestamping..." → "Anclando..." (pasos visibles)
- ⏳ Si falla: Qué falló + Estado actual + Próximos pasos
- ⏳ Nunca fallar silenciosamente

---

## 2️⃣ FIRMA SIMPLE (1 firmante)

**Flujo**: Upload → Configurar → Firmar → Certificar

### PASO 1: Upload

Ver "Centro Legal - Upload" (mismo comportamiento).

---

### PASO 2: Configurar Firma

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | Usuario sube imagen que se ve mal en PDF | Sube firma en móvil, se ve pixelada en desktop | **AL SUBIR**: "Vista previa de cómo se verá en el PDF" |
| **B. Incomprensible** | "Signature validation failed" | Firma no pasa validación | **EN ESPAÑOL**: "La firma debe tener al menos 3 trazos. Probá de nuevo." |
| **C. Tardío** | Firma no se guarda, se pierde al recargar | Dibuja firma, recarga → perdida | **AL DIBUJAR**: Auto-save + "Firma guardada ✓" |
| **D. Sin salida** | No puede limpiar firma dibujada | Dibuja mal, no encuentra "Limpiar" | **SIEMPRE**: Botón "Limpiar" visible y obvio |

**Feedback necesario**:
- ⏳ "Firma guardada ✓" al aplicar
- ⏳ Vista previa de firma en PDF antes de aplicar
- ⏳ Validación de calidad (tamaño, contraste)

---

### PASO 3: Firmar

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | Usuario cree que firmó pero no se generó evento | Click "Firmar" → silencio | ✅ YA IMPLEMENTADO: Toast "Firma aplicada correctamente" |
| **C. Tardío** | Firma visual pero no se guarda backend | Firma visible en UI, reload → desaparece | **AL FIRMAR**: "Guardando firma en blockchain..." (paso explícito) |
| **D. Sin salida** | Firma aplicada en lugar incorrecto del PDF | Firma queda fuera de página | **ANTES**: "Ubicá tu firma en el documento" (drag & drop con bounds) |

---

### PASO 4: Certificar

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **B. Incomprensible** | "Witness hash mismatch" | Error técnico | **EN ESPAÑOL**: "Hubo un problema de integridad. Reintentá o contactá soporte." |
| **C. Tardío** | Anclaje tarda mucho, usuario no sabe si funciona | 2 min sin feedback | **FEEDBACK**: Progress con tiempo estimado "Anclando en Polygon (30-60 seg)" |
| **D. Sin salida** | Error sin recovery path | Falla → solo mensaje genérico | **SIEMPRE**: "Tu firma está guardada. Problema: [X]. Podés: [opciones]" |

---

## 3️⃣ FIRMA MULTI-PARTE (N firmantes)

**Flujo**: Upload → Invitar → Esperar → Certificar

### PASO 1: Upload

Ver "Centro Legal - Upload" (mismo comportamiento).

---

### PASO 2: Invitar Firmantes

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | Orden de firma no queda claro | Agrega 3 emails, no sabe que firman en orden | **ANTES**: "Los firmantes recibirán el documento en el orden que los agregues" |
| **B. Incomprensible** | "Invalid signer configuration" | Error técnico | **EN ESPAÑOL**: "Revisá que todos los emails sean válidos" |
| **C. Tardío** | Email inválido detectado al enviar | Agrega 5 firmantes, al enviar 1 falla | **AL AGREGAR**: Validación en tiempo real del email |
| **D. Sin salida** | Invitación enviada pero no llega | Envió invites, nadie recibe | **FEEDBACK**: "Invitaciones enviadas a [lista]. Si no llegan en 5 min, revisá spam." |

**Validaciones en tiempo real**:
- ⏳ Email válido (formato + dominio existe)
- ⏳ No duplicados
- ⏳ Confirmación visual de orden

---

### PASO 3: Esperar Firmas

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | Usuario no sabe cuántos firmaron | Dashboard sin estado claro | **SIEMPRE**: "2/5 firmantes completaron" (estado visible) |
| **C. Tardío** | Firmante reporta que no puede firmar | Error del firmante, owner se entera tarde | **NOTIFICACIÓN**: "Juan Pérez tuvo un problema al firmar. Revisá estado." |
| **D. Sin salida** | Workflow atascado, no sabe cómo cancelar | 1 firmante no responde, no puede avanzar | **SIEMPRE**: Opción "Cancelar workflow" o "Recordar firmante" |

**Estados claros**:
- ⏳ "Esperando firma de Juan Pérez (siguiente)"
- ⏳ "María López ya firmó ✓"
- ⏳ "Workflow pausado - 2/5 completo"

---

### PASO 4: Certificar

Ver "Firma Simple - Certificar" (mismo comportamiento).

---

## 4️⃣ DOCUMENTOS NO PDF / PDF WITNESS

### Upload de archivo no-PDF

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | Sube Word/Excel, más tarde se pide PDF | Sube DOCX, al firmar pide convertir | **AL SUBIR**: "Este archivo será convertido a PDF para certificar" |
| **C. Tardío** | Proveedor exige PDF, usuario no sabía | Workflow configurado con DOCX, proveedor rechaza | **ANTES**: "Para workflow con firma certificada, necesitás PDF" |
| **D. Sin salida** | Conversión a PDF falla | DOCX con formato complejo → falla | **SIEMPRE**: "No pudimos convertir. Subí un PDF o probá simplificar el formato" |

**Regla**: Avisar en el momento de la decisión, no al final.

---

## 5️⃣ IDENTIDAD

### KYC / Login / Verificación

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | Usuario cree que identidad fuerte es obligatoria | Ve login, cree que sin cuenta no vale | **ANTES**: "Podés firmar sin cuenta, pero para contratos legales recomendamos login" |
| **A. Inesperado** | Usuario piensa que sin login no vale | Firma sin cuenta, duda validez | **FEEDBACK**: "Tu firma es válida. Login agrega verificación de identidad adicional." |
| **C. Tardío** | KYC exigido al final del flujo | Configura todo, al certificar pide KYC | **ANTES**: "Este tipo de firma requiere verificación de identidad" (mostrar antes) |
| **D. Sin salida** | KYC falla, no puede completar firma | Proceso KYC incompleto, atascado | **SIEMPRE**: "Problema con verificación: [X]. Podés: [opciones alternativas]" |

**Regla**: Identidad nunca sorprende. Siempre se explica antes de exigirla.

---

## 6️⃣ CTA FINAL (⚠️ EL MÁS PELIGROSO)

### El Momento Crítico

**Este es EL punto donde el 80% de explosiones ocurren.**

| Anti-Estado | Explosión Potencial | Cuándo Ocurre | Mensaje Preventivo Ideal |
|-------------|---------------------|---------------|--------------------------|
| **A. Inesperado** | CTA falla sin explicación | Click "Certificar" → nada pasa | **SIEMPRE**: Loading explícito + pasos visibles |
| **B. Incomprensible** | Error genérico "Something went wrong" | Backend error 500 | **EN ESPAÑOL**: Explicar qué falló + qué hacer |
| **C. Tardío** | Backend timeout sin feedback | 30 seg sin respuesta | **PROGRESO**: "Procesando... puede tardar hasta 60 seg" |
| **D. Sin salida** | Error → usuario no sabe si algo quedó guardado | Falla → miedo de perder trabajo | **CRÍTICO**: "Tu documento está a salvo. El problema fue [X]." |
| **D. Sin salida** | No hay botón retry | Error → solo cerrar modal | **SIEMPRE**: "Reintentar" o "Volver" visible |

### 🔒 Regla de Oro CTA

> **Nunca fallar silenciosamente en el CTA.**

**Checklist CTA a prueba de explosiones**:

- [ ] Loading state explícito (no solo spinner)
- [ ] Pasos visibles: "Timestamping..." → "Anclando..." → "Generando certificado..."
- [ ] Si falla: Explicación en español + Estado actual + Opciones
- [ ] Siempre decir si el trabajo está guardado o no
- [ ] Botón retry visible si aplica
- [ ] Timeout máximo con feedback (60 seg → mensaje)
- [ ] Error técnico → traducir a lenguaje humano

---

## 📊 MATRIZ RESUMIDA (Vista Rápida)

| Flujo | Paso Crítico | Explosión más común | Fix preventivo |
|-------|--------------|---------------------|----------------|
| Centro Legal | Upload | PDF encriptado (B) | ✅ Detectar antes + mensaje claro |
| Centro Legal | Protección | Usuario cree "ya está protegido" (A) | ✅ "Activada" no "Protegida" |
| Centro Legal | Descargar | Error genérico (B+D) | ⏳ Español + estado + retry |
| Firma Simple | Configurar | Firma no se guarda (C) | ⏳ "Firma guardada ✓" |
| Firma Simple | Firmar | Sin feedback (A) | ✅ Toast confirmación |
| Firma Simple | Certificar | Timeout sin feedback (C+D) | ⏳ Progress + tiempo estimado |
| Multi-parte | Invitar | Orden de firma no claro (A) | ⏳ "Firmarán en este orden" |
| Multi-parte | Esperar | No sabe estado (A) | ⏳ "2/5 completado" |
| No-PDF | Upload | Conversión falla tarde (C+D) | ⏳ Avisar antes qué pasará |
| Identidad | KYC | Exigido al final (C) | ⏳ Avisar antes del flujo |
| **CTA Final** | **Certificar** | **Falla sin explicar qué pasó (B+D)** | **⚠️ CRÍTICO: Fix preventivo obligatorio** |

**Leyenda**:
- ✅ Ya implementado
- ⏳ Pendiente implementación

---

## 🛠️ CÓMO USAR ESTA MATRIZ

### Para Development

Cuando vayas a implementar un flujo nuevo:

1. **Buscá el flujo** en la matriz
2. **Leé las 4 explosiones** posibles (A, B, C, D)
3. **Implementá los mensajes preventivos** antes de escribir el happy path
4. **Validá con la regla maestra**: ¿Algún mensaje importante aparece por primera vez al final?

### Para QA

Cuando vayas a testear:

1. **No hagas happy path** primero
2. **Hacé el ataque de explosiones**:
   - Intentá subir archivos raros
   - Desconectá internet en medio del flujo
   - Poné emails inválidos
   - Cerrá el modal y volvé
3. **Verificá que NUNCA veas**:
   - Mensaje en inglés
   - Error técnico sin contexto
   - "Something went wrong"
   - Callejón sin salida

### Para Product

Cuando diseñes un flujo nuevo:

1. **Mapeá las explosiones** antes del diseño
2. **Preguntate**: ¿Qué espera el usuario en cada paso?
3. **Diseñá los estados intermedios** (no solo inicio/fin)
4. **Asegurate** que todo mensaje crítico aparezca antes del CTA final

---

## 🎯 PRIORIZACIÓN (Qué Atacar Primero)

### P0 - Crítico (implementar YA)

1. **CTA Final - Error sin contexto** (B+D)
   - Todo error debe explicar qué pasó + estado actual + próximos pasos
2. **Upload - Validación tardía** (C)
   - PDF corrupto/encriptado/con permisos detectado EN UPLOAD
3. **Firma - Sin confirmación** (A)
   - ✅ Ya implementado (toast), validar que funcione siempre

### P1 - Alta prioridad

4. **Multi-parte - Estado no claro** (A)
   - "2/5 firmantes completaron" siempre visible
5. **Protección - Mensaje confuso** (A)
   - ✅ Ya implementado ("Activada" no "Protegida")
6. **CTA Final - Timeout sin feedback** (C)
   - Progress con tiempo estimado obligatorio

### P2 - Media prioridad

7. **Upload - Mensaje técnico** (B)
   - Traducir todos los errores a español
8. **Identidad - Exigida al final** (C)
   - Avisar antes si KYC es requerido
9. **No-PDF - Conversión falla** (C+D)
   - Avisar antes qué se va a convertir

---

## 📝 PLANTILLA PARA NUEVAS FEATURES

Cuando implementes algo nuevo, usá esta plantilla:

```markdown
### Feature: [Nombre]

**Flujo**: [Paso 1] → [Paso 2] → [Paso 3]

#### Explosión A (Inesperado)
- Qué espera: ___
- Qué puede pasar: ___
- Fix preventivo: ___

#### Explosión B (Incomprensible)
- Mensaje técnico posible: ___
- Traducción humana: ___

#### Explosión C (Tardío)
- Validación que debe ser antes: ___
- Dónde moverla: ___

#### Explosión D (Sin salida)
- Callejón sin salida posible: ___
- Recovery path: ___

#### Checklist
- [ ] Todo mensaje en español
- [ ] Sin errores técnicos sin contexto
- [ ] Validaciones antes del CTA
- [ ] Recovery path siempre visible
```

---

## 🔄 MANTENIMIENTO DE LA MATRIZ

**Actualizar cuando**:
- Se implemente un fix (cambiar ⏳ → ✅)
- Se descubra una nueva explosión (agregar fila)
- Se agregue un flujo nuevo (agregar sección)

**NO actualizar cuando**:
- Se refactorice código (la matriz es independiente de implementación)
- Se cambie UI sin cambiar flujo
- Se optimice performance

---

**Última actualización**: 2026-01-06
**Próxima revisión**: Post-implementación de fixes P0
**Responsable**: Product + Dev + QA
