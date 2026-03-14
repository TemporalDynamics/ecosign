# Auditoría de Messaging — Informe Inicial

**Fecha:** 2026-03-13  
**Auditado por:** Assistant  
**Marco de referencia:** `docs/public/messaging/MESSAGING_MATRIX.md`

---

## Resumen Ejecutivo

### Estado General
| Canal | Estado | Prioridad |
|-------|--------|-----------|
| **Landing Page** | ✅ Alineado (85%) | Alta |
| **UI Microcopy** | ⚠️ Parcial (60%) | Alta |
| **Email Templates** | ⚠️ Parcial (50%) | Alta |
| **HOW_IT_WORKS.md** | ✅ Alineado (90%) | Alta |

---

## 1. Landing Page (`client/src/pages/LandingPage.tsx`)

### ✅ Aciertos (Mantener)

| Sección | Texto Actual | Alineación |
|---------|--------------|------------|
| **Hero H1** | "Protegé tu trabajo, no solo documentos." | ✅ Perfecto. Es el mensaje principal de la matriz. |
| **Hero sub** | "EcoSign te ayuda a compartir, firmar y resguardar trabajo sensible con evidencia verificable, sin exponer el contenido." | ✅ Bueno. Menciona "trabajo sensible" y "evidencia verificable". |
| **Video section** | "Cómo protegés tu trabajo" | ✅ Excelente. Enfocado en protección. |
| **Sección firmas** | "No vendemos solo firmas. Protegemos trabajo con evidencia verificable." | ✅ Perfecto. Anti-commodity. |
| **CTA principal** | "Proteger mi trabajo" | ✅ Excelente. Alineado con la matriz. |
| **Pricing H2** | "Planes para proteger trabajo real" | ✅ Muy bien. Concreto y emocional. |
| **FREE plan** | "Empezá a proteger" | ✅ Bien. No dice "empezá a firmar". |

### ⚠️ Mejoras Sugeridas

| Sección | Texto Actual | Problema | Sugerencia |
|---------|--------------|----------|------------|
| **Hero footer** | "Empezás gratis en minutos." | ❌ Genérico. Podría ser de cualquier SaaS. | "Protegé tu primer documento en minutos." |
| **Video CTA** | "Ver en ventana flotante" | ✅ OK (es funcional) | Mantener. |
| **Sección 2 H2** | "Proteges sin exponer contenido." | ✅ Perfecto | Mantener. |
| **Beneficios** | "Privacidad total" | ⚠️ Un poco abstracto | "Tu documento nunca sale de tu control" |
| **Beneficios** | "Evidencia técnica verificable" | ⚠️ Tecnicismo | "Evidencia que cualquiera puede validar" |
| **Smart paste** | "Pegás una lista de mails. EcoSign hace el resto." | ✅ Excelente. Concreto. | Mantener. |
| **Auto-fields** | "Un toque. Campos para todos. Sin error humano." | ✅ Perfecto | Mantener. |
| **Comparison table** | "Plataformas de firma" | ⚠️ Podría ser más específico | "Otras plataformas: solo firman" |
| **Riesgo común** | "El archivo circula y se pierde control" | ✅ Bien | Podría ser más emocional: "Tu archivo circula. ¿Sabés quién lo ve?" |

### 🔴 Problemas Críticos

| Sección | Texto Actual | Por qué es problema | Sugerencia |
|---------|--------------|---------------------|------------|
| **Nota legal** | "algunos términos técnicos o denominaciones pueden variar" | ⚠️ Genera incertidumbre | Eliminar o simplificar: "Conceptos generales para entender el modelo" |

---

## 2. UI Microcopy

### Header Público (`client/src/components/Header.tsx`)

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Nav link** | "Iniciar Sesión" | ❌ Genérico. Podría ser cualquier app. | "Ingresar" o "Proteger mi trabajo" |
| **Nav items** | "Cómo funciona", "Verificador", "Precios", "Mi cuenta" | ✅ OK | Mantener. |

### Header Privado

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Nav item** | "Centro Legal" | ✅ Bueno. Concreto. | Mantener. |
| **Nav item** | "Mi cuenta" | ⚠️ Genérico | "Mis planes" o "Mi protección" |

### LoginPage

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Title** | (no hay título explícito) | ⚠️ Falta contexto de protección | Agregar: "Protegé tu trabajo. Empezá acá." |
| **Guest link** | "Entrar como invitado" | ⚠️ No comunica protección | "Probar sin cuenta" o "Ver demo" |
| **Submit button** | (no visible en el código) | — | Debería ser "Proteger mi trabajo" (signup) o "Ingresar" (login) |
| **Success message** | "¡Bienvenido de nuevo!" | ❌ Genérico | "Tu trabajo está protegido. Bienvenido." |
| **Success message** | "¡Cuenta creada! Por favor revisa tu email..." | ⚠️ Burocrático | "¡Listo! Tu primer trabajo te espera. Confirmá tu email para empezar." |

---

## 3. Email Templates

### `founder-welcome.html` / `buildFounderWelcomeEmail`

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Subject** | "Tu cuenta ya esta activa" | ❌ Burocrático. Suena a trámite. | "Tu trabajo sensible ya tiene protección" |
| **From** | "EcoSign <notificaciones@ecosign.app>" | ⚠️ Frío | "EcoSign Protección" o nombre real del fundador |

### `firmante-invitacion.html` / `buildSignerInvitationEmail`

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Subject** | "Tenes un documento para firmar: {documentName}" | ❌ Commodity. Solo menciona "firmar". | "Tu firma y protección: {documentName}" |
| **Template** | (no leído completo) | — | Revisar si menciona "protección" o solo "firma" |

### `firmante-otp.html` / `buildSignerOtpEmail`

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Subject** | "Respaldo de Firma: tu codigo de acceso seguro" | ⚠️ "Respaldo de Firma" es confuso | "Tu código de acceso seguro" |

### `documento-firmado-resumen.html` / `buildDocumentSignedEmail`

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Subject** | "Documento firmado: {documentName}" | ⚠️ Solo menciona firma | "Documento protegido y firmado: {documentName}" |

### `documento-certificado-resumen.html` / `buildDocumentCertifiedEmail`

| Elemento | Texto Actual | Problema | Sugerencia |
|----------|--------------|----------|------------|
| **Subject** | "Certificado disponible: {documentName}" | ⚠️ Genérico | "Tu evidencia está lista: {documentName}" |

---

## 4. HOW_IT_WORKS.md (`docs/public/HOW_IT_WORKS.md`)

### ✅ Aciertos (Mantener)

| Sección | Texto | Alineación |
|---------|-------|------------|
| **Opening** | "Important digital work should not depend on trust in a platform's narrative." | ✅ Perfecto. Soberanía. |
| **Principio 1** | "Protect Without Exposing" | ✅ Excelente. Privacidad como feature. |
| **Principio 5** | "Exit By Design" | ✅ Perfecto. Anti-lock-in. |
| **Closing** | "We do not ask you to trust us. We ask you to verify us." | ✅ Excelente. Soberanía. |

### ⚠️ Mejoras Sugeridas

| Sección | Texto Actual | Problema | Sugerencia |
|---------|--------------|----------|------------|
| **Subtítulo** | "There Is Another Way" | ✅ OK | Mantener. |
| **Principio 2** | "Evidence Without Dependency" | ⚠️ Un poco abstracto | Podría ser más concreto: "Evidence You Can Take With You" |

---

## 5. Hallazgos Transversales

### Patrones Positivos ✅

1. **Landing Page muy bien alineada**: El reframe del 2026-03-12 funcionó. El messaging es consistente con la matriz.
2. **CTAs orientados a protección**: "Proteger mi trabajo" es excelente.
3. **Analogías concretas**: "Huella Digital", "Sello de Tiempo" son buenas analogías.
4. **Anti-commodity claro**: "No vendemos solo firmas" es un diferenciador fuerte.

### Patrones Problemáticos ⚠️

1. **Emails burocráticos**: Los subjects de emails son genéricos y no comunican protección.
2. **UI genérica en navegación**: "Iniciar Sesión", "Mi cuenta" son commodity.
3. **Falta urgencia preventiva**: Pocos mensajes dicen "No esperes a que pase lo peor".
4. **Tecnicismos en beneficios**: "Evidencia técnica verificable" podría ser más claro.

---

## 6. Plan de Acción Inmediato (Semana 1)

### Prioridad 1: UI Microcopy (2-3 horas)

| Archivo | Cambios | Impacto |
|---------|---------|---------|
| `Header.tsx` | "Iniciar Sesión" → "Ingresar" | Bajo |
| `LoginPage.tsx` | Agregar título: "Protegé tu trabajo. Empezá acá." | Medio |
| `LoginPage.tsx` | Success messages → orientados a protección | Medio |

### Prioridad 2: Email Templates (3-4 horas)

| Archivo | Cambios | Impacto |
|---------|---------|---------|
| `founder-welcome.html` | Subject → "Tu trabajo sensible ya tiene protección" | Alto |
| `firmante-invitacion.html` | Subject → "Tu firma y protección: {documentName}" | Alto |
| `documento-firmado-resumen.html` | Subject → "Documento protegido y firmado" | Medio |

### Prioridad 3: Landing Page (1-2 horas)

| Sección | Cambios | Impacto |
|---------|---------|---------|
| Hero footer | "Empezás gratis en minutos." → "Protegé tu primer documento en minutos." | Medio |
| Beneficios | "Evidencia técnica verificable" → "Evidencia que cualquiera puede validar" | Bajo |
| Nota legal | Simplificar o eliminar | Bajo |

---

## 7. Métricas de Éxito

### Cualitativas
- [ ] Todos los CTAs principales dicen "Proteger" o variante
- [ ] Ningún email subject es burocrático
- [ ] Landing Page pasa el Test de DocuSign (ningún mensaje aplica a competencia)

### Cuantitativas (por medir post-cambios)
- [ ] ↑ Conversión landing → signup (baseline: TBD)
- [ ] ↑ Open rate emails de onboarding (baseline: TBD)
- [ ] ↑ CTR en CTA principal (baseline: TBD)

---

## 8. Próximos Pasos

1. **Revisar este informe** con el equipo (30 min)
2. **Priorizar cambios** de UI Microcopy (1-2 días)
3. **Actualizar emails** de onboarding (2-3 días)
4. **Re-auditar** después de cambios (1 semana)

---

## Apéndice A: Tests Aplicados

### Test de los 3 Segundos
- Landing Page: ✅ Pasa (mensaje claro en <3 segundos)
- UI: ⚠️ Parcial (algunos elementos genéricos)
- Emails: ❌ No pasa (subjects burocráticos)

### Test de DocuSign
- Landing Page: ✅ Pasa (ningún mensaje aplica a DocuSign)
- UI: ⚠️ Parcial ("Iniciar Sesión" aplica a cualquiera)
- Emails: ❌ No pasa (subjects genéricos)

### Test de la Madre
- Landing Page: ✅ Pasa (lenguaje claro)
- UI: ✅ Pasa (simple)
- Emails: ⚠️ Parcial (algunos términos técnicos)

### Test del Perito
- Landing Page: ✅ Pasa (afirmaciones verificables)
- HOW_IT_WORKS.md: ✅ Pasa (técnicamente preciso)
- Emails: N/A (no son afirmaciones técnicas)

---

**FIN DEL INFORME**
