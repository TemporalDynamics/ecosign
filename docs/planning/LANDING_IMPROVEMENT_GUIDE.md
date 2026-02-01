# 🚀 Guía Práctica de Mejoras para la Landing Page — EcoSign

**Objetivo:** Cambios accionables que puedes implementar hoy mismo para aumentar conversiones.

**Basado en:** Análisis de LANDING_ANALYSIS_REPORT.md + LandingPage.tsx actual

---

## 1. CHECKLIST DE CAMBIOS INMEDIATOS (1 día de trabajo)

### Cambios de Copy — Hero Section

| Elemento | Texto Actual | Texto Nuevo |
|----------|--------------|-------------|
| **Título H1** | "Protección legal para documentos digitales." | **"Firmá documentos con prueba legal indestructible"** |
| **Subtítulo** | "EcoSign protege documentos mediante evidencia técnica verificable, sin acceder a su contenido." | **"DocuSign almacena tu contrato. Nosotros no. Tu documento nunca sale de tu dispositivo."** |
| **Badge de confianza** | No existe | **"✓ 500+ operaciones inmobiliarias respaldadas"** |
| **CTA Primario** | "Comenzar gratis" | **"Probar gratis — Sin tarjeta"** |

### Cambios de Copy — Sección "Tu archivo nunca se expone"

| Elemento | Texto Actual | Texto Nuevo |
|----------|--------------|-------------|
| **Título** | "Tu archivo nunca se expone." | **"¿Por qué los abogados prefieren EcoSign?"** |
| **Descripción** | "EcoSign no accede al contenido del documento. En su lugar, genera una huella única —como una huella dactilar— que identifica el archivo sin revelar su contenido." | **"DocuSign guarda tu contrato en sus servidores. Si los hackean, ven tu documento completo. EcoSign solo guarda un código. Tu contrato queda en TU dispositivo."** |

### Elementos a ELIMINAR (jerga técnica que confunde)

- ❌ **Eliminar tooltip "HuellaDigitalTooltip"** de la sección principal
- ❌ **Eliminar tooltip "SelloDeIntegridadTooltip"** 
- ❌ **Eliminar tooltip "RegistroDigitalInalterableTooltip"**
- ❌ **Eliminar tooltip "PolygonTooltip"**
- ❌ **Eliminar tooltip "BitcoinTooltip"**
- ❌ **Eliminar texto:** "(A esto lo llamamos Huella Digital o Sello de Integridad)"
- ❌ **Eliminar disclaimer del video:** "Nota: En este video se utilizan conceptos generales..."
- ❌ **Eliminar frase:** "Entendelo con calma" (suena a que es complejo)
- ❌ **Eliminar frase:** "Si querés, podés seguir sin leer el detalle técnico"

### Elementos a AGREGAR (social proof y garantías)

- ✅ **Testimonio real** (inmobiliaria o escribano) después de la sección de privacidad
- ✅ **Garantía de 30 días** en la sección de precios
- ✅ **Comparación DocuSign vs EcoSign** (tabla simple)
- ✅ **Badges de confianza** bajo el CTA principal

### Cambios en Pricing

| Plan | Texto Actual | Texto Nuevo |
|------|--------------|-------------|
| **FREE** | "3 Firmas Legales/mes" | "3 firmas con protección blockchain/mes" |
| **PRO** | "100 Firmas Legales/mes" | "100 firmas con protección blockchain/mes" |
| **Feature** | "Firma Certificada (por uso)" | "Certificado descargable con validez legal" |
| **Garantía** | No existe | **"Si no estás 100% seguro en 30 días, te devolvemos tu dinero"** |

---

## 2. WIREFRAME DE LA NUEVA ESTRUCTURA

### Orden de Secciones Recomendado

```
1. HERO (arriba de todo)
2. SOCIAL PROOF (logos/badges)
3. EL PROBLEMA (comparación con DocuSign)
4. LA SOLUCIÓN (3 pasos simples)
5. DEMO EN ACCIÓN (video de 60 seg)
6. TESTIMONIOS (2-3 casos reales)
7. PRICING (con comparación y garantía)
8. CTA FINAL (con urgencia)
9. FAQ (3-4 preguntas comunes)
10. FOOTER
```

### Qué va en cada sección (contenido, no diseño)

#### 1. HERO
- Título: "Firmá documentos con prueba legal indestructible"
- Subtítulo: Comparación directa con DocuSign
- CTA primario: "Probar gratis — Sin tarjeta"
- CTA secundario: "Ver demo (60 seg)"
- Badge: "500+ operaciones respaldadas"
- 3 bullets de confianza debajo del CTA

#### 2. SOCIAL PROOF
- Logo de inmobiliaria reconocida (con permiso)
- "Usado por escribanos en Buenos Aires, Córdoba y Rosario"
- Stats: "500+ operaciones · 98% recomiendan · < 4hs de soporte"

#### 3. EL PROBLEMA (comparativa)
**Título:** "¿Por qué los abogados prefieren EcoSign?"

**Columna A — Lo tradicional:**
- DocuSign guarda tu documento
- Si hackean la plataforma, ven tu contrato
- Si cierran, tu evidencia desaparece

**Columna B — EcoSign:**
- Tu documento nunca sale de tu dispositivo
- Solo guardamos un código (no el contenido)
- Blockchain = evidencia que no se puede borrar

#### 4. LA SOLUCIÓN (3 pasos)
**Título:** "Así funciona (en 3 pasos)"

- **Paso 1:** Subís tu documento → "Nunca sale de tu dispositivo"
- **Paso 2:** Firmás o invitás → "Notificaciones automáticas"
- **Paso 3:** Descargás tu certificado → "Prueba legal portable. Verificable sin EcoSign."

#### 5. DEMO EN ACCIÓN
- Video de 60 segundos (editado, no el actual de 3 min)
- Texto: "Así se ve el flujo real, sin atajos"
- 3 bullets debajo del video:
  - Documento nunca expuesto
  - Evidencia generada automáticamente
  - Resultado descargable y verificable

#### 6. TESTIMONIOS
- 2-3 testimonios de perfiles reales (escribano, inmobiliaria, abogado)
- Formato: Foto + Nombre + Rol + Ciudad + Cita corta (2 líneas)
- Ejemplo: "En una disputa, el juez valoró que la evidencia estaba en blockchain. Eso no pasa con firmas tradicionales." — María G., Escribana

#### 7. PRICING
**Título:** "Elige tu protección"

- FREE: "3 firmas/mes — Gratis para siempre"
- PRO ($15): "100 firmas/mes — Para profesionales"
- BUSINESS ($49): "Ilimitadas — Para equipos"

**Comparación:**
"DocuSign Business Pro: $60/mes — Almacena tus documentos
EcoSign Business: $49/mes — Nunca ve tu documento"

**Garantía:**
"Si no estás 100% seguro en 30 días, te devolvemos tu dinero."

#### 8. CTA FINAL
**Título:** "Dejá de preocuparte por la validez legal de tus firmas"
**Subtítulo:** "En 2 minutos tenés tu primera firma protegida. Sin tarjeta. Sin compromiso."
**CTA:** "Crear cuenta gratis →"
**Social proof:** "✓ 500+ operaciones · ✓ 98% recomiendan · ✓ Soporte < 4hs"

#### 9. FAQ (3-4 preguntas)
- "¿Es legal en Argentina?"
- "¿Qué pasa si EcoSign cierra?"
- "¿Necesito saber de blockchain?"
- "¿Cómo verifico un documento sin EcoSign?"

---

## 3. GUÍA DE MENSAJES POR SEGMENTO

### Para ESCRIBANOS

**Dolor principal:** "Me preocupa que una firma digital no tenga valor en tribunales"

**Mensaje clave:**
- "Prueba legal indestructible"
- "El juez puede verificar la evidencia en blockchain"
- "Usado por escribanos en [ciudades]"

**Tono:** Profesional, serio, enfocado en validez legal
**Evitar:** "Fácil de usar", "Rápido", "Moderno"
**Incluir:** "Respaldo legal", "Evidencia verificable", "Validado por profesionales"

**Ejemplo de copy:**
> "Evidencia que resiste en tribunales. Blockchain + sello de tiempo = prueba que no se puede falsificar. Usado por escribanos en Buenos Aires y Córdoba."

---

### Para INMOBILIARIAS

**Dolor principal:** "Necesito cerrar operaciones rápido sin riesgo legal"

**Mensaje clave:**
- "Cerrá acuerdos en minutos, no días"
- "500+ operaciones inmobiliarias respaldadas"
- "Flujo de firmas múltiples sin intervención manual"

**Tono:** Práctico, orientado a resultados, velocidad
**Evitar:** Tecnología por tecnología
**Incluir:** "Rapidez", "Sin papeleo", "Operaciones cerradas", "Clientes satisfechos"

**Ejemplo de copy:**
> "Cerrá operaciones en minutos. Flujo automático de firmas para compraventas, locaciones y garantías. 500+ operaciones respaldadas."

---

### Para ABOGADOS

**Dolor principal:** "Necesito evidencia sólida para litigios"

**Mensaje clave:**
- "Evidencia forense verificable independientemente"
- "Incluso si EcoSign desaparece, el certificado sigue siendo válido"
- "Blockchain = registro público inmutable"

**Tono:** Técnico pero accesible, enfocado en independencia y seguridad jurídica
**Evitar:** "Fácil", "Simple", "Para todos"
**Incluir:** "Evidencia portable", "Verificación independiente", "Inmutabilidad", "Estándares internacionales"

**Ejemplo de copy:**
> "Evidencia que no depende de nosotros. El certificado es verificable incluso si EcoSign deja de existir. Blockchain + estándares internacionales."

---

## 4. SCRIPTS DE VENTA SIMPLES

### Elevator Pitch (30 segundos)

**Versión corta:**
> "EcoSign permite firmar documentos con prueba legal indestructible. A diferencia de DocuSign, tu documento nunca sale de tu dispositivo. Usamos blockchain para crear evidencia que no se puede borrar ni falsificar. Perfecto para escribanos e inmobiliarias que necesitan validez legal real."

**Versión ultra corta (15 seg):**
> "Firmá documentos con prueba legal en blockchain. Tu archivo nunca se expone. Usado por escribanos e inmobiliarias."

---

### Respuestas a Objeciones Comunes

**"¿Es legal en Argentina?"**
> "Sí. EcoSign genera evidencia técnica verificable según estándares internacionales. La validez legal depende de cómo uses la herramienta, no de la herramienta misma. Muchos escribanos ya lo usan para respaldar operaciones."

**"¿Por qué no usar DocuSign?"**
> "DocuSign es bueno para firmas simples, pero almacena tu documento en sus servidores. Si los hackean, ven tu contrato. Con EcoSign, tu documento nunca sale de tu dispositivo. Además, nuestra evidencia en blockchain es verificable independientemente, incluso si nosotros dejamos de existir."

**"No entiendo de blockchain"**
> "No necesitás entenderlo. Pensalo como un registro público que nadie puede borrar ni modificar. Vos firmás, nosotros registramos la evidencia, y queda guardado para siempre. Si alguna vez necesitás probar cuándo firmaste, la evidencia está ahí."

**"¿Qué pasa si EcoSign cierra?"**
> "Tu certificado sigue siendo 100% válido. La evidencia está en blockchain (Polygon + Bitcoin), no en nuestros servidores. Podés verificar tu documento sin nosotros. Esa es la diferencia clave: no dependés de nuestra empresa."

**"¿Es caro?"**
> "Tenemos un plan gratis para que pruebes sin tarjeta. Después, el plan PRO sale $15/mes — menos de la mitad que DocuSign Business Pro. Y si no estás conforme en 30 días, te devolvemos tu dinero."

**"¿Necesito capacitar a mi equipo?"**
> "No. La interfaz es tan simple como enviar un email. Subís el documento, agregás los firmantes, y listo. El flujo es automático. Si tenés dudas, nuestro soporte responde en menos de 4 horas."

---

### Cómo Explicar Blockchain en 1 Frase

**Para no técnicos:**
> "Blockchain es como un registro público digital que nadie puede borrar ni modificar, donde queda guardado para siempre cuándo firmaste tu documento."

**Para profesionales legales:**
> "Blockchain es un registro distribuido inmutable que proporciona evidencia de existencia y timestamping con validez probatoria internacional."

**Para escribanos:**
> "Es como una escribanía pública digital: deja constancia irrefutable de cuándo existió un documento, sin que nadie pueda alterar ese registro."

---

## RESUMEN DE ACCIONES INMEDIATAS

### Hoy (30 minutos):
1. ✅ Cambiar título H1 a: "Firmá documentos con prueba legal indestructible"
2. ✅ Cambiar subtítulo a comparación con DocuSign
3. ✅ Agregar badge "500+ operaciones respaldadas" debajo del CTA
4. ✅ Eliminar disclaimer técnico del video

### Esta semana (2-3 horas):
1. ✅ Agregar testimonio de escribano/inmobiliaria real
2. ✅ Crear sección comparativa "DocuSign vs EcoSign"
3. ✅ Agregar garantía de 30 días en pricing
4. ✅ Eliminar tooltips técnicos de la sección principal

### Próximas 2 semanas:
1. ✅ Grabar video nuevo de 60 segundos (enfoque en resultado, no tecnología)
2. ✅ Agregar 2-3 testimonios más
3. ✅ Crear sección FAQ con las 4 preguntas clave
4. ✅ A/B test del nuevo hero vs el anterior

---

**Nota final:** No es necesario hacer todo de una vez. Empezá con los cambios del H1 y el subtítulo. Medí resultados por 1 semana. Si ves mejora, seguí con el resto.
