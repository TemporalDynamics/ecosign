# Plan de Auditoría de Messaging — EcoSign

**Status:** draft  
**Last Updated:** 2026-03-13  
**Owner:** Product/Marketing

---

## Objetivo

Auditar todo el contenido existente de EcoSign y alinearlo con la nueva matriz de messaging (protección del trabajo vs commodity de firmas).

---

## Prioridades

### 🔴 Alta Prioridad (Semana 1)
| Canal | Estado | Owner | Deadline |
|-------|--------|-------|----------|
| **Landing Page** | En progreso (reframe 2026-03-12) | Product | 2026-03-20 |
| **HOW_IT_WORKS.md** | Revisar alineación con matriz | Product | 2026-03-20 |
| **Emails de Onboarding** | Auditar y reescribir | Marketing | 2026-03-20 |
| **UI Microcopy (CTAs)** | Reemplazar "firmar" por "proteger" | Design | 2026-03-20 |

### 🟡 Media Prioridad (Semana 2-3)
| Canal | Estado | Owner | Deadline |
|-------|--------|-------|----------|
| **Documentación Técnica** | Revisar tono y analogías | Product | 2026-03-27 |
| **Blog Posts** | Reescribir títulos y intros | Marketing | 2026-03-27 |
| **Redes Sociales** | Alinear con matriz | Marketing | 2026-03-27 |
| **FAQ** | Actualizar con nuevo messaging | Support | 2026-03-27 |

### 🟢 Baja Prioridad (Semana 4+)
| Canal | Estado | Owner | Deadline |
|-------|--------|-------|----------|
| **Case Studies** | Crear con nuevo framing | Marketing | 2026-04-03 |
| **Sales Deck** | Actualizar posicionamiento | Sales | 2026-04-03 |
| **Help Center** | Revisar artículos | Support | 2026-04-03 |
| **API Docs** | Alinear introducciones | Engineering | 2026-04-03 |

---

## Checklist de Auditoría

### Landing Page
- [ ] Hero: ¿Es sobre protección o sobre firmas?
- [ ] Sub-hero: ¿Comunica valor o feature?
- [ ] CTAs: ¿Son "Proteger mi trabajo" o "Empezar gratis"?
- [ ] Sección de features: ¿Beneficios o especificaciones?
- [ ] Testimonios: ¿Comodity o protección?
- [ ] Pricing: ¿Operaciones o protección?

### Documentación Pública
- [ ] HOW_IT_WORKS.md: ¿Alineado con matriz?
- [ ] PUBLIC_VALIDATION_CONTRACT.md: ¿Tono preventivo?
- [ ] ARCHITECTURE.md: ¿Soberanía o dependencia?
- [ ] README.md: ¿Posicionamiento claro?

### Emails
- [ ] Bienvenida: ¿Propósito o burocracia?
- [ ] Onboarding: ¿Protección o features?
- [ ] Seguimiento: ¿Urgencia o miedo?
- [ ] Recovery: ¿Valor o spam?

### UI / Microcopy
- [ ] Botones principales: ¿"Proteger" o "Firmar"?
- [ ] Tooltips: ¿Claros o técnicos?
- [ ] Mensajes de error: ¿Útiles o fríos?
- [ ] Estados: ¿Evidencia o completado?
- [ ] Navegación: ¿Propósito o genérico?

### Blog / Contenido
- [ ] Títulos: ¿Protección o firmas?
- [ ] Introducciones: ¿Urgencia o descripción?
- [ ] Ejemplos: ¿Concretos o abstractos?
- [ ] CTAs: ¿Acción o lectura?

---

## Proceso de Auditoría

### Paso 1: Inventario
Listar todo el contenido existente en una hoja de cálculo:
- URL / Ubicación
- Tipo (landing, docs, email, UI, etc.)
- Estado actual (alineado / necesita cambios)
- Prioridad (alta / media / baja)
- Owner asignado

### Paso 2: Evaluación
Para cada ítem, aplicar los tests de COMMUNICATION_PRINCIPLES.md:
- Test de los 3 Segundos
- Test de DocuSign
- Test de la Madre
- Test del Perito

### Paso 3: Reemplazo
Usar MESSAGING_REPLACEMENTS.md para identificar frases a cambiar:
- Marcar frases de la columna "❌ EVITAR"
- Reemplazar con frases de la columna "✅ USAR"

### Paso 4: Revisión
Antes de publicar, revisar:
- ¿El mensaje es preventivo o reactivo?
- ¿Comunica valor o feature?
- ¿Es claro o tiene hype?
- ¿Motiva urgencia o miedo?
- ¿Empodera o crea dependencia?

### Paso 5: Publicación
- Implementar cambios
- Documentar en este plan
- Actualizar MESSAGING_MATRIX.md si surge nuevo aprendizaje

---

## Métricas de Éxito

### Cualitativas
- [ ] Consistencia de messaging en todos los canales
- [ ] Claridad en pruebas de usuario (5 segundos test)
- [ ] Feedback positivo de early adopters

### Cuantitativas (por definir baseline)
- [ ] ↑ Conversión landing → signup
- [ ] ↑ Tiempo en página de landing
- [ ] ↑ CTR en emails de onboarding
- [ ] ↓ Rebote en homepage
- [ ] ↑ Engagement en redes sociales

---

## Hallazgos y Ajustes

### Hallazgos Iniciales (2026-03-13)
| Canal | Hallazgo | Acción |
|-------|----------|--------|
| Landing Page | Buen reframe hacia protección (2026-03-12) | Mantener dirección |
| HOW_IT_WORKS_TECHNICAL.md | Split realizado pero verificar alineación | Revisar sección de principios |
| UI CTAs | Mezcla de "firmar" y "proteger" | Unificar hacia "proteger" |

### Ajustes a la Matriz
| Fecha | Ajuste | Razón |
|-------|--------|-------|
| 2026-03-13 | Creación inicial | N/A |

---

## Responsables

| Rol | Nombre | Responsabilidad |
|-----|--------|-----------------|
| **Product** | TBD | Landing, docs, UI |
| **Marketing** | TBD | Emails, blog, redes |
| **Design** | TBD | Microcopy, tooltips |
| **Support** | TBD | FAQ, help center |
| **Engineering** | TBD | API docs, technical |

---

## Timeline

```
Semana 1 (2026-03-13 → 2026-03-20)
├─ Landing Page ✅ (en progreso desde 2026-03-12)
├─ HOW_IT_WORKS.md
├─ Emails de Onboarding
└─ UI Microcopy (CTAs)

Semana 2 (2026-03-20 → 2026-03-27)
├─ Documentación Técnica
├─ Blog Posts
├─ Redes Sociales
└─ FAQ

Semana 3 (2026-03-27 → 2026-04-03)
├─ Case Studies
├─ Sales Deck
├─ Help Center
└─ API Docs

Semana 4 (2026-04-03 → 2026-04-10)
├─ Revisión general
├─ Métricas y ajustes
└─ Documentación de aprendizajes
```

---

## Herramientas

### Hoja de Cálculo de Auditoría
Crear en Google Sheets / Notion:
- Pestaña 1: Inventario completo
- Pestaña 2: Evaluación por tests
- Pestaña 3: Cambios implementados
- Pestaña 4: Métricas pre/post

### Repositorio de Ejemplos
Crear carpeta en `/docs/messaging/examples/`:
- Antes/Después de landing
- Antes/Después de emails
- Antes/Después de UI

---

## Próximos Pasos

1. **Completar inventario** de todo el contenido (2026-03-14)
2. **Asignar owners** a cada canal (2026-03-14)
3. **Comenzar auditoría** de alta prioridad (2026-03-15)
4. **Revisión semanal** de progreso (viernes 10am)

---

## Contacto

**Owner:** Product/Marketing  
**Email:** `support@email.ecosign.app`  
**Review Cadence:** Semanal (viernes 10am)

---

**FIN DEL DOCUMENTO**
