# Reporte de Análisis de Copy - Conflictos Legales Detectados

**Fecha de análisis:** 26 de diciembre de 2025  
**Archivos analizados:** Prioridad Alta + Prioridad Media  
**Estado:** Requiere revisión y actualización inmediata

---

## 🚨 PRIORIDAD ALTA - Páginas Públicas (Exposición Legal Crítica)

### 1. BusinessPage.tsx - ⚠️ ALTO RIESGO

**Ubicación:** `client/src/pages/BusinessPage.tsx`

#### Conflictos Detectados:

**Línea 75:** 
```tsx
Firma Legal para Empresas
```
❌ **Problema:** Título usa "Firma Legal" como nombre de producto principal  
✅ **Recomendación:** "Protección Legal para Empresas" o "Firma Técnica para Empresas"

**Línea 78:**
```tsx
Firma, Certificación y Control Corporativo sin Límites ni Exposición.
```
❌ **Problema:** "Certificación" como promesa principal  
✅ **Recomendación:** "Firma, Protección y Control Corporativo sin Límites ni Exposición"

**Línea 81:**
```tsx
Firma Legal te permite certificar el 95% de tus documentos internos...
```
❌ **Problema:** "certificar" como verbo de acción principal  
✅ **Recomendación:** "...te permite proteger el 95% de tus documentos internos..." o "...genera evidencia técnica para el 95%..."

**Línea 121:**
```tsx
Firma Legal: Control, Privacidad y Eficiencia Inigualable
```
❌ **Problema:** Nombre de sección implica producto "Firma Legal"  
✅ **Recomendación:** "Protección Legal: Control, Privacidad y Eficiencia Inigualable"

**Línea 135:**
```tsx
Privacidad Total (Zero Knowledge)
```
❌ **Problema:** "Zero Knowledge" sin explicación  
✅ **Recomendación:** "Privacidad Total (No accede al contenido)"

**Línea 147:**
```tsx
Certificación Instantánea
```
❌ **Problema:** "Certificación" sin contexto defensivo  
✅ **Recomendación:** "Protección Instantánea" o "Evidencia Instantánea"

**Línea 148:**
```tsx
...validados y sellados con Huella Digital y Sello de Tiempo Legal en segundos
```
❌ **Problema:** "Sello de Tiempo Legal" (término peligroso)  
✅ **Recomendación:** "...sellados con Huella Digital y sello de tiempo criptográfico verificable"

**Línea 245:**
```tsx
Firma Legal es ideal para la inmensa mayoría de documentos...
```
❌ **Problema:** Naming del producto  
✅ **Recomendación:** "La firma técnica de integridad es ideal para..."

**Línea 254:**
```tsx
Firma Legal te ofrece ambas opciones en el mismo flujo de trabajo
```
❌ **Problema:** Nombre de producto  
✅ **Recomendación:** "EcoSign te ofrece ambas opciones..."

---

### 2. LawyersPage.tsx - ⚠️ ALTO RIESGO

**Ubicación:** `client/src/pages/LawyersPage.tsx`

#### Conflictos Detectados:

**Línea 74:**
```tsx
Firma Legal para Abogados y Estudios Jurídicos
```
❌ **Problema:** Título implica producto "Firma Legal"  
✅ **Recomendación:** "Protección Legal para Abogados" o "Firma Técnica para Abogados"

**Línea 77:**
```tsx
La Evidencia Irrefutable. La Firma Electrónica diseñada para Litigio.
```
❌ **Problema:** "Evidencia Irrefutable" es una promesa peligrosa  
✅ **Recomendación:** "Evidencia Técnica Verificable. Firma Electrónica diseñada para Profesionales Legales."

**Línea 80:**
```tsx
Firma Legal te da la soberanía total sobre la prueba...
```
❌ **Problema:** "soberanía total sobre la prueba" - demasiado categórico  
✅ **Recomendación:** "...te da control sobre la evidencia técnica con un proceso verificable que resiste la impugnación"

**Línea 125:**
```tsx
Firma Legal: Tu Blindaje Forense y Procesal
```
❌ **Problema:** Naming + "Blindaje Forense y Procesal" promete demasiado  
✅ **Recomendación:** "Protección Legal: Evidencia Técnica Verificable"

**Línea 144:**
```tsx
Evidencia Inmutable (.ECO)
```
❌ **Problema:** ".ECO" no identificado como "contenedor de protección"  
✅ **Recomendación:** "Contenedor de Protección Legal (.ECO)"

**Línea 214:**
```tsx
Privacidad Zero Knowledge
```
❌ **Problema:** "Zero Knowledge" sin explicación  
✅ **Recomendación:** "No accede al contenido del documento"

**Línea 250:**
```tsx
Firma Legal: Para la mayoría de tus documentos privados y la máxima confidencialidad.
```
❌ **Problema:** Naming producto  
✅ **Recomendación:** "Firma técnica: Para la mayoría de tus documentos privados..."

**Línea 254:**
```tsx
Firma Certificada (pago por uso): Para procesos que exigen la certificación de un Proveedor Acreditado...
```
⚠️ **Aceptable pero mejorable:** "certificación de un Proveedor" - podría ser más claro  
✅ **Recomendación:** "...que exigen firma legal regulada mediante proveedores externos acreditados..."

---

### 3. RealtorsPage.tsx - ⚠️ ALTO RIESGO

**Ubicación:** `client/src/pages/RealtorsPage.tsx`

#### Conflictos Detectados:

**Línea 73:**
```tsx
Firma Legal para Profesionales de Bienes Raíces
```
❌ **Problema:** Naming producto  
✅ **Recomendación:** "Protección Legal para Profesionales de Bienes Raíces"

**Línea 79:**
```tsx
Firma Legal es tu aliado para el 90% de los acuerdos previos a la firma notarial.
```
❌ **Problema:** Naming + porcentaje específico sin disclaimer  
✅ **Recomendación:** "La firma técnica es tu aliado para la mayoría de los acuerdos previos..." + agregar "La validez legal depende del contexto"

**Línea 124:**
```tsx
Firma Legal: Más que una firma, un acelerador de negocios
```
❌ **Problema:** Naming  
✅ **Recomendación:** "Protección Legal: Más que una firma, un acelerador de negocios"

**Línea 216:**
```tsx
¿Cuándo usar Firma Legal? (Volumen Diario)
```
❌ **Problema:** Naming  
✅ **Recomendación:** "¿Cuándo usar firma técnica? (Volumen Diario)"

**Línea 238:**
```tsx
¿Cuándo usar Firma Certificada? (Máximo Riesgo)
```
⚠️ **Mejorable:**  
✅ **Recomendación:** "¿Cuándo usar firma legal regulada? (Máximo Riesgo Legal)"

**Línea 250:**
```tsx
La plataforma te permite usar Firma Certificada en el mismo flujo...
```
❌ **Problema:** "La plataforma" - demasiado genérico  
✅ **Recomendación:** "EcoSign te permite usar firma legal regulada..."

---

### 4. ComparisonPage.tsx - 🔴 RIESGO CRÍTICO

**Ubicación:** `client/src/pages/ComparisonPage.tsx`

#### Conflictos Detectados (Muchos):

**Línea 73:**
```tsx
Firma Legal y Firma Certificada
```
❌ **Problema:** Naming de ambos productos sin aclaración  
✅ **Recomendación:** "Firma Técnica y Firma Legal Regulada"

**Línea 76:**
```tsx
Dos niveles de protección. Una misma tecnología de verdad inmutable.
```
⚠️ **Problema:** "verdad inmutable" es un término muy fuerte  
✅ **Recomendación:** "Dos niveles de protección. Una misma tecnología de evidencia verificable."

**Línea 91:**
```tsx
Firma Legal (El "Caballo de Batalla")
```
❌ **Problema:** Naming  
✅ **Recomendación:** "Firma Técnica de Integridad (El "Caballo de Batalla")"

**Línea 114:**
```tsx
la Firma Legal captura un rastro de auditoría forense completo...
```
❌ **Problema:** "forense" puede implicar validez legal automática  
✅ **Recomendación:** "...captura un rastro de auditoría técnico completo..."

**Línea 118:**
```tsx
Inhackeable en cada documento: hash SHA-256, sello legal y anclaje blockchain
```
❌ **Problema:** "sello legal" sin contexto + "Inhackeable" es promesa técnica fuerte  
✅ **Recomendación:** "Evidencia técnica verificable en cada documento: hash SHA-256, sello de tiempo criptográfico y registro blockchain"

**Línea 126:**
```tsx
Nivel Legal: Firma Electrónica Avanzada (AES) Reforzada
```
❌ **Problema:** "Nivel Legal" implica jerarquía legal reconocida  
✅ **Recomendación:** "Especificación Técnica: Firma Electrónica Avanzada (AES) Reforzada"

**Línea 145:**
```tsx
Firma Certificada (El "Tanque Legal")
```
❌ **Problema:** Naming  
✅ **Recomendación:** "Firma Legal Regulada (El "Tanque Legal")"

**Línea 154:**
```tsx
La Potencia de un Proveedor Certificado + Blindaje Inhackeable
```
❌ **Problema:** "Inhackeable" sin tooltip  
✅ **Recomendación:** Agregar tooltip o cambiar a "Blindaje Técnico Verificable"

**Línea 180:**
```tsx
Nivel Legal: Firma Certificada (QES/AES vía Proveedor) + Blindaje Forense
```
❌ **Problema:** "Nivel Legal" + "Blindaje Forense"  
✅ **Recomendación:** "Especificación: Firma Legal Regulada (QES/AES) + Evidencia Técnica Verificable"

**Línea 201:**
```tsx
El Ranking de Seguridad Legal: No todas las firmas son iguales.
```
❌ **Problema:** "Ranking de Seguridad Legal" implica autoridad para clasificar  
✅ **Recomendación:** "Comparación Técnica: No todas las firmas son iguales."

**Línea 211:**
```tsx
Firma Legal (Avanzada y Blindada)
```
❌ **Problema:** Naming en tabla comparativa  
✅ **Recomendación:** "Firma Técnica (Avanzada y Blindada)" o "EcoSign Firma Técnica"

**Línea 214:**
```tsx
Firma Certificada (Pago por uso)
```
❌ **Problema:** Naming  
✅ **Recomendación:** "Firma Legal Regulada (Pago por uso)"

**Línea 240:**
```tsx
Blindaje Inhackeable
```
❌ **Problema:** Sin tooltip en tabla  
✅ **Recomendación:** Agregar explicación técnica o cambiar término

**Línea 254:**
```tsx
Privacidad del Contenido (Zero Knowledge)
```
❌ **Problema:** "Zero Knowledge" en tabla técnica  
✅ **Recomendación:** "Privacidad del Contenido (No accede al contenido)"

**Línea 264:**
```tsx
Firma Legal
```
❌ **Problema:** Naming repetido en tabla  
✅ **Recomendación:** "Firma Técnica EcoSign"

**Línea 287:**
```tsx
🛡️ Firma Legal: Tu documento es solo tuyo (Zero Knowledge)
```
❌ **Problema:** Naming + "Zero Knowledge"  
✅ **Recomendación:** "🛡️ Firma Técnica: Tu documento es solo tuyo (No accede al contenido)"

**Línea 352:**
```tsx
Tiempo: Sello de tiempo legal (TSA independiente).
```
❌ **Problema:** "Sello de tiempo legal"  
✅ **Recomendación:** "Tiempo: Sello de tiempo criptográfico verificable (TSA independiente)."

**Línea 356:**
```tsx
Anchoring público en blockchain
```
❌ **Problema:** "Anchoring" (término técnico en inglés)  
✅ **Recomendación:** "Registro público en blockchain"

---

## ⚠️ PRIORIDAD MEDIA - Dashboard y Componentes Internos

### 5. DashboardStartPage.tsx - ⚠️ MODERADO RIESGO

**Ubicación:** `client/src/pages/DashboardStartPage.tsx`

#### Conflictos Detectados:

**Línea 18:**
```tsx
Tu centro de firma y certificación
```
❌ **Problema:** "certificación" en título principal  
✅ **Recomendación:** "Tu centro de firma y protección legal"

**Línea 20:**
```tsx
Desde acá podés firmar, certificar, compartir bajo NDA y verificar tus documentos...
```
❌ **Problema:** "certificar" como acción principal  
✅ **Recomendación:** "...podés firmar, proteger, compartir bajo NDA..."

**Línea 27:**
```tsx
Certificar Documento
```
❌ **Problema:** Botón principal usa "Certificar"  
✅ **Recomendación:** "Proteger Documento" o "Generar Evidencia"

**Línea 61:**
```tsx
Certificar documento
```
❌ **Problema:** Título de explicación  
✅ **Recomendación:** "Proteger documento"

**Línea 63:**
```tsx
Protegé la integridad y trazabilidad legal de un archivo...
```
⚠️ **Mejorable:** "trazabilidad legal" podría necesitar disclaimer  
✅ **Recomendación:** "Protegé la integridad y trazabilidad técnica de un archivo..." + tooltip

---

### 6. VerifyPage.tsx - ✅ BAJO RIESGO (pero tiene términos)

**Ubicación:** `client/src/pages/VerifyPage.tsx`

#### Términos Detectados (No críticos pero revisar):

**Líneas 22-24:**
```tsx
const PROBATIVE_STATES = {
  uncertified: { label: 'NO CERTIFICADO', ... },
  certified: { label: 'CERTIFICADO', ... },
  reinforced: { label: 'CERTIFICADO REFORZADO', ... }
```
⚠️ **Problema:** Estados usan "CERTIFICADO"  
✅ **Recomendación:** 
```tsx
{
  unprotected: { label: 'NO PROTEGIDO', ... },
  protected: { label: 'PROTEGIDO', ... },
  reinforced: { label: 'PROTEGIDO REFORZADO', ... }
}
```

---

### 7. LegalProtectionOptions.tsx - ⚠️ MODERADO RIESGO

**Ubicación:** `client/src/components/LegalProtectionOptions.tsx`

#### Conflictos Detectados:

**Línea 27:**
```tsx
Falta información del documento para solicitar certificado NOM-151.
```
❌ **Problema:** "certificado NOM-151" - aunque es nombre oficial del estándar, podría confundir  
✅ **Recomendación:** "Falta información del documento para solicitar sello de tiempo NOM-151."

**Línea 73:**
```tsx
NOM-151 Certificate
```
⚠️ **Aceptable:** Es nombre del estándar oficial  
💡 **Nota:** Considerar agregar aclaración "Sello de tiempo regulado NOM-151"

---

## 📊 RESUMEN EJECUTIVO

### Archivos Críticos que Requieren Actualización Inmediata:

| Archivo | Nivel de Riesgo | Conflictos | Prioridad |
|---------|----------------|------------|-----------|
| ComparisonPage.tsx | 🔴 CRÍTICO | 20+ instancias | URGENTE |
| BusinessPage.tsx | ⚠️ ALTO | 12 instancias | ALTA |
| LawyersPage.tsx | ⚠️ ALTO | 10 instancias | ALTA |
| RealtorsPage.tsx | ⚠️ ALTO | 8 instancias | ALTA |
| DashboardStartPage.tsx | ⚠️ MODERADO | 5 instancias | MEDIA |
| LegalProtectionOptions.tsx | ⚠️ MODERADO | 2 instancias | MEDIA |
| VerifyPage.tsx | ⚠️ BAJO | 3 instancias | BAJA |

### Patrones de Conflicto Identificados:

1. **"Firma Legal" como nombre de producto** (aparece ~50 veces)
   - Debe cambiarse a: "Firma Técnica" o "Protección Legal"

2. **"Certificación" / "Certificar"** (aparece ~30 veces)
   - Debe cambiarse a: "Protección" / "Proteger" o "Generar evidencia"

3. **"Zero Knowledge"** (aparece ~8 veces)
   - Debe cambiarse a: "No accede al contenido" o eliminar

4. **"Sello de Tiempo Legal"** (aparece ~6 veces)
   - Debe cambiarse a: "Sello de tiempo criptográfico verificable"

5. **"Evidencia Irrefutable" / "Blindaje Forense"** (aparece ~5 veces)
   - Debe cambiarse a: "Evidencia técnica verificable" / "Protección técnica"

6. **"Certificado ECO"** (aparece en variables/estados)
   - Debe cambiarse a: "Contenedor de protección legal (.ECO)"

---

## 🎯 RECOMENDACIONES DE ACCIÓN

### Fase 1 - URGENTE (Próximas 48 horas):
1. ✅ **ComparisonPage.tsx** - Reescritura completa necesaria
2. ✅ **BusinessPage.tsx** - Actualización de títulos y CTAs
3. ✅ **LawyersPage.tsx** - Ajuste de promesas legales

### Fase 2 - PRIORITARIO (Próxima semana):
4. ✅ **RealtorsPage.tsx** - Consistencia de naming
5. ✅ **DashboardStartPage.tsx** - Botones y mensajes internos
6. ✅ **Tooltips** - Revisar todos los componentes tooltip

### Fase 3 - SEGUIMIENTO (Próximas 2 semanas):
7. ✅ Actualizar constantes y variables en código
8. ✅ Revisar templates de email
9. ✅ Actualizar metadata SEO

---

## 📋 CHECKLIST DE VALIDACIÓN

Para cada archivo actualizado, verificar:

- [ ] No usa "Certificación" / "Certificar" sin contexto defensivo
- [ ] No promete "validez legal automática"
- [ ] No usa "Firma Legal" como nombre de producto core
- [ ] Reemplaza "Zero Knowledge" por explicación simple
- [ ] Usa "Sello de tiempo criptográfico" en lugar de "legal"
- [ ] Identifica .ECO como "contenedor de protección legal"
- [ ] Incluye disclaimer "La validez legal depende del contexto" donde corresponda
- [ ] No promete "evidencia irrefutable" o similar

---

## 🔍 PRÓXIMOS ARCHIVOS A ANALIZAR

### Todavía no revisados (Prioridad Media-Baja):

- `client/src/pages/QuickGuidePage.tsx`
- `client/src/pages/HelpPage.tsx`
- `client/src/pages/PrivacyPage.tsx`
- `client/src/pages/SecurityPage.tsx`
- `client/src/pages/DocumentsPage.tsx`
- `client/src/pages/WorkflowsPage.tsx`
- `client/src/pages/WorkflowDetailPage.tsx`
- `client/src/components/VerificationSummary.tsx`
- `client/src/components/SignatureWorkshop.tsx`
- Templates de email en `/emails/`

---

**Nota Final:** Este reporte identifica conflictos de copy que representan riesgo legal. La actualización debe ser sistemática y consistente en toda la plataforma para mantener el blindaje legal implementado en los archivos ya actualizados.
