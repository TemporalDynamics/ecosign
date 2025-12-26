# Resumen de Actualización de Copy - EcoSign

**Fecha:** 26 de diciembre de 2025  
**Objetivo:** Blindaje legal total del lenguaje y copy en toda la plataforma

## 🎯 Concepto Central Adoptado

### ❌ Abandonamos:
- **Certificación** / **Certificado** (términos que implican autoridad)
- **Firma legal** (para el core de EcoSign)
- **Fecha legal** / **Timestamp legal**
- **Zero-knowledge** (sin explicación adecuada)
- **Garantizamos** / **Certificamos** / **Validez automática**

### ✅ Adoptamos:
- **Protección legal del documento** (concepto paraguas)
- **Contenedor de protección legal (.ECO)** / **Archivo de protección legal (.ECO)**
- **Firma técnica de integridad y autoría**
- **Sello de tiempo criptográfico verificable**
- **Evidencia técnica verificable**
- **EcoSign no accede al contenido del documento**

## 📝 Cambios Implementados

### 1. LandingPage.tsx ✅
- **Hero principal:** "Protección legal para documentos digitales"
- **Descripción:** "EcoSign protege documentos digitales mediante evidencia técnica verificable, sin acceder a su contenido"
- **Sección beneficios:** Eliminadas promesas de certificación, enfoque en protección
- **Paso 2:** Cambiado de "Firma Legal/Certificada" a "Firma técnica de integridad" vs "firma legal regulada mediante proveedores externos"
- **Paso 3:** ".ECO" referido como "Contenedor de protección legal"
- **CTA final:** "Protegé tu trabajo. Generá evidencia verificable"

### 2. FooterPublic.tsx ✅
- **Disclaimer legal agregado:**
  > "EcoSign no actúa como autoridad certificante ni garantiza validez legal automática. Proporciona protección y evidencia técnica verificable que puede ser utilizada en contextos legales según corresponda."

### 3. HowItWorksPage.tsx ✅
- **Título sección:** "Privacidad ante Todo" mantenido pero ajustado copy
- **Paso 3:** "Sello de Tiempo Legal" → "Sello de tiempo criptográfico verificable"
- **Tipos de Firma:**
  - "Firma Legal" → "Firma técnica de integridad y autoría"
  - "Firma Certificada" → "Firma legal regulada (disponible mediante proveedores externos)"
- **El Certificado .ECO** → "El Contenedor de Protección Legal (.ECO)"
- **Disclaimer agregado:** "La validez legal depende del contexto y la jurisdicción"

### 4. FAQPage.tsx ✅
- Pregunta 1: "Zero-Knowledge" eliminado → "EcoSign no accede al contenido del documento"
- Pregunta 2: "certificado portable" → "contenedor de protección legal"
- Pregunta 3: Reformulada para evitar términos peligrosos
- Pregunta 4: "garantizan" → "aseguran" + disclaimer jurisdiccional

### 5. TermsPage.tsx ✅
- **Nueva sección principal:** "Naturaleza del servicio" con disclaimer completo
- **Privacidad:** "EcoSign no accede al contenido del documento"
- **Firmas externas:** "firma legal regulada disponible opcionalmente mediante proveedores externos"
- **Exclusión:** "contenedores de protección generados" en lugar de "certificados"

### 6. README.md ✅
- Descripción inicial: "certificación de documentos" → "protección y evidencia técnica de documentos digitales"
- "anclaje en blockchain" → "registro en blockchain"

### 7. COMO LO HACEMOS.md ✅
- Principios clave actualizados
- "Zero-knowledge" → "EcoSign no accede al contenido"
- "Timestamp legal" → "Sello de tiempo criptográfico verificable"
- "Certificado" → "Contenedor de protección legal"
- "Anclaje" → "Registro"
- Funciones renombradas: `certify()` → `protect()`, `anchorHash()` → `registerHash()`

## 🔍 Archivos Pendientes de Revisión

Los siguientes archivos contienen términos que deben ser revisados manualmente:

### Páginas de Marketing/Públicas:
- `client/src/pages/BusinessPage.tsx`
- `client/src/pages/ComparisonPage.tsx`
- `client/src/pages/LawyersPage.tsx`
- `client/src/pages/RealtorsPage.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/pages/QuickGuidePage.tsx`
- `client/src/pages/HelpPage.tsx`
- `client/src/pages/PrivacyPage.tsx`
- `client/src/pages/SecurityPage.tsx`

### Dashboard/Internas:
- `client/src/pages/DashboardPage.tsx`
- `client/src/pages/DashboardStartPage.tsx`
- `client/src/pages/DashboardVerifyPage.tsx`
- `client/src/pages/DashboardPricingPage.tsx`
- `client/src/pages/DocumentsPage.tsx`
- `client/src/pages/WorkflowsPage.tsx`
- `client/src/pages/WorkflowDetailPage.tsx`

### Componentes:
- `client/src/components/VerificationComponent.tsx`
- `client/src/components/VerificationSummary.tsx`
- `client/src/components/LegalCenterModalV2.tsx`
- `client/src/components/LegalProtectionOptions.tsx`
- `client/src/components/SignatureWorkshop.tsx`
- `client/src/components/FooterInternal.tsx`
- Todos los tooltips (ya usan terminología correcta en su mayoría)

### Flujos de Firma:
- `client/src/pages/SignWorkflowPage.tsx`
- `client/src/pages/NdaPage.tsx`
- `client/src/pages/NdaAccessPage.tsx`
- `client/src/components/signature-flow/*`

### Código Backend:
- `supabase/functions/` (múltiples funciones mencionan "certificate", "legal timestamp")
- `client/src/lib/tsaService.ts` (nombres de funciones)
- `client/src/lib/basicCertificationWeb.ts` (archivo crítico)
- `client/src/utils/documentStorage.ts`

## 🛡️ Frases de Blindaje Legal Recomendadas

### Para Footer (✅ Implementado):
```
EcoSign no actúa como autoridad certificante ni garantiza validez legal automática. 
Proporciona protección y evidencia técnica verificable que puede ser utilizada 
en contextos legales según corresponda.
```

### Para secciones técnicas:
```
La validez legal depende del contexto y la jurisdicción.
```

### Para explicar privacidad:
```
EcoSign no accede al contenido del documento.
La protección se realiza sin leer ni almacenar el contenido.
```

## 📊 Tabla de Conversión de Términos

| ❌ Término Anterior | ✅ Término Nuevo |
|-------------------|-----------------|
| Certificación | Protección legal |
| Certificado ECO | Contenedor de protección legal (.ECO) |
| Certificamos documentos | Protege documentos / Genera evidencia técnica |
| Firma Legal (core) | Firma técnica de integridad y autoría |
| Firma Certificada | Firma legal regulada (proveedores externos) |
| Fecha legal / Timestamp legal | Sello de tiempo criptográfico verificable |
| Zero-knowledge | No accede al contenido del documento |
| Garantizamos | Proporciona / Genera |
| Validez legal | La validez legal depende del contexto |
| Anclaje blockchain | Registro blockchain |
| Certificar | Proteger / Generar evidencia |

## 🚀 Próximos Pasos Recomendados

### Prioridad Alta:
1. **Revisar todas las páginas públicas** (Business, Lawyers, Realtors, Comparison)
2. **Actualizar tooltips** que aún mencionen términos antiguos
3. **Revisar emails y notificaciones** (carpeta `emails/`)
4. **Actualizar metadata SEO** (títulos, descripciones)

### Prioridad Media:
1. **Dashboard y páginas internas** (menos crítico legalmente pero debe ser consistente)
2. **Documentación técnica adicional** (`docs/` folder)
3. **Componentes de verificación** y mensajes de estado

### Prioridad Baja (pero necesaria):
1. **Nombres de funciones en código** (más técnico, menos expuesto)
2. **Comentarios en código** que usen terminología antigua
3. **Logs y mensajes de debug**

## ⚠️ Puntos Críticos de Atención

### NO hacer:
- ❌ Prometer "fe pública"
- ❌ Prometer "validez automática"
- ❌ Afirmar que EcoSign es una "autoridad certificante"
- ❌ Usar "certificación" sin contexto claro
- ❌ Decir "fecha legal" sin disclaimer

### SÍ hacer:
- ✅ Describir funciones, no autoridad
- ✅ Enfatizar "evidencia técnica verificable"
- ✅ Aclarar que la validez depende del contexto
- ✅ Separar responsabilidades (firma técnica vs firma regulada)
- ✅ Mantener honestidad y simplicidad

## 📄 Archivos Modificados en Este Commit

1. `/client/src/pages/LandingPage.tsx`
2. `/client/src/components/FooterPublic.tsx`
3. `/client/src/pages/HowItWorksPage.tsx`
4. `/client/src/pages/FAQPage.tsx`
5. `/client/src/pages/TermsPage.tsx`
6. `/README.md`
7. `/COMO LO HACEMOS.md`

## 🎯 Resultado Esperado

El lenguaje ahora es:
- ✅ **Honesto** - No promete lo que no puede cumplir
- ✅ **Simple** - Entendible para cualquier usuario
- ✅ **Defendible** - Resistente a cualquier tipo de acusación o demanda
- ✅ **Técnico cuando corresponde** - Preciso sin ser pretencioso
- ✅ **Blindado legalmente** - No asume autoridad que no tiene

---

**Nota:** Este documento debe ser usado como guía para las próximas actualizaciones de copy en toda la plataforma. Mantener consistencia es crítico para el blindaje legal.
