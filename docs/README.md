# 📚 EcoSign Documentation — README Canónico

**Autoridad:** SOURCE OF TRUTH  
**Estado:** CANONICAL — No refactorizar, solo referenciar  
**Versión:** 1.0  
**Fecha:** 2026-01-31  

> **⚠️ REGLA SUPREMA:** Si algo contradice un contrato canónico, el contrato tiene razón aunque el código compile.

---

## ⚡ TL;DR — Si solo vas a leer una cosa

**Sos desarrollador:** Empezá por [`contratos/README.md`](./contratos/README.md) → [`INDEX.md`](./INDEX.md)  
**Sos legal/compliance:** [`contratos/verdad-canonica.md`](./contratos/verdad-canonica.md)  
**Sos producto/UX:** [`contratos/IDENTITY_LEVELS_SUMMARY.md`](./contratos/IDENTITY_LEVELS_SUMMARY.md)  
**Necesitás arreglar algo:** [`ops/RUNBOOK.md`](./ops/RUNBOOK.md)  

**TODO LO DEMÁS ES SECUNDARIO hasta que entiendas esto.**

---

## 🏛️ Axiomas de Autoridad (Constitución Operativa)

Estos axiomas gobiernan toda la documentación de EcoSign. **Son inmutables.**

**AXIOMA 1 — Verdad Canónica > Código**  
Si un contrato dice X y el código hace Y, el código está mal. El contrato es la especificación.

**AXIOMA 2 — N0–N5 son append-only**  
Los contratos canónicos nunca se borran ni se reescriben. Solo se versionan (v1.0 → v1.1 → v2.0).

**AXIOMA 3 — Exceso sin fricción es daño**  
Documentar más de lo necesario es tan peligroso como documentar poco. El ruido histórico entierra la verdad.

**AXIOMA 4 — Autoridad antes que prolijidad**  
No automatizamos antes de fijar autoridad. No refactorizamos contratos cerrados.

**AXIOMA 5 — Todo documento tiene un dueño**  
Cada documento tiene un rol responsable. Si no tiene dueño, es huérfano y debe archivarse.

---

## 🎯 1. Qué documentos mandan (La Jerarquía Canónica)

```
Nivel 0: Constitución
└── contratos/verdad-canonica.md              [NO TOCAR]

Nivel 1: Entidad y Ledger  
├── contratos/DOCUMENT_ENTITY_CONTRACT.md     [Schema canónico]
└── contratos/HASH_CHAIN_RULES.md             [Cadena de hashes]

Nivel 2: Eventos Probatorios
├── contratos/TSA_EVENT_RULES.md              [Timestamping]
├── contratos/ANCHOR_EVENT_RULES.md           [Blockchain]
└── contratos/IDENTITY_ASSURANCE_RULES.md     [Identidad L0-L5]

Nivel 3: Protección y Certificación
├── contratos/PROTECTION_LEVEL_RULES.md       [Niveles de protección]
├── contratos/ECO_FORMAT_CONTRACT.md          [Formato .ECO]
├── contratos/WITNESS_PDF_CONTRACT.md         [Testigo visual]
└── contratos/ECO_ECOX_MIN_SCHEMA.md          [Schema mínimo]

Nivel 4: Flujos y Experiencia
├── contratos/FLOW_MODES_CONTRACT.md          [Modos de firma]
├── contratos/OPERACIONES_CONTRACT.md         [Carpetas lógicas]
└── contratos/WORKFLOW_STATUS_SEMANTICS.md    [Estados semánticos]

Nivel 5: Organización y Contexto
├── contratos/OPERATIONS_RESPONSIBILITY.md    [Responsabilidades]
└── contratos/CANONICAL_EVENTS_LIST.md        [Eventos mínimos]
```

**Regla de oro:** Si está en `contratos/`, es **append-only**. No se borra, no se reescribe. Solo se versiona.

---

## 📖 2. Cómo se lee EcoSign (Rutas por Rol)

### 🧑‍💻 Para Backend Developers

**Obligatorio (en orden):**
1. `contratos/DOCUMENT_ENTITY_CONTRACT.md` — Entender el modelo de datos
2. `contratos/HASH_CHAIN_RULES.md` — Cómo se calculan los hashes
3. `architecture/ARCHITECTURE.md` — Visión general del sistema
4. `security/TRUST_BOUNDARIES.md` — Límites de confianza
5. `INDEX.md` — Navegación completa

**Cuándo necesites implementar:**
- TSA → `tsa/TSA_IMPLEMENTATION.md`
- Anchoring → `anchoring/README_ANCHORING.md`
- Firmas → `signatures/SIGNATURE_WORKFLOW_ARCHITECTURE.md`

### 🎨 Para Frontend/UX Developers

**Obligatorio (en orden):**
1. `contratos/IDENTITY_LEVELS_SUMMARY.md` — Copy de identidad (1 min)
2. `contratos/FLOW_MODES_CONTRACT.md` — UX de firma
3. `contratos/OPERACIONES_CONTRACT.md` — Carpetas lógicas
4. `ux/MATRIZ_EXPLOSIONES_UX.md` — Análisis de UX
5. `design/DESIGN_SYSTEM.md` — Tokens y componentes

**Implementación específica:**
- Centro Legal → `centro-legal/` (si existe)
- Notificaciones → `communication/EMAIL_TEMPLATES_MAP.md`

### ⚖️ Para Legal/Compliance

**Obligatorio (en orden):**
1. `contratos/verdad-canonica.md` — Posición legal base
2. `contratos/IDENTITY_ASSURANCE_RULES.md` — Declaración de identidad
3. `contratos/ECO_FORMAT_CONTRACT.md` — Estructura de certificados
4. `security/TRUST_BOUNDARIES.md` — Modelo de amenaza

### 📊 Para Producto/PM

**Obligatorio (en orden):**
1. `contratos/IDENTITY_LEVELS_SUMMARY.md` — Casos de uso L0-L5
2. `ANALISIS_INTEGRAL_ECOSIGN.md` — Análisis de mercado
3. `strategy/OPEN_SOURCE_STRATEGY.md` — Estrategia open source
4. `planning/` — Roadmaps y sprints

### 🔧 Para DevOps/Operaciones

**Obligatorio (en orden):**
1. `ops/RUNBOOK.md` — Runbook operativo
2. `ops/DEPLOYMENT_GUIDE.md` — Guía de despliegue
3. `ops/CRON_JOBS_MANAGEMENT.md` — Tareas programadas
4. `ops/SENTRY_SETUP.md` — Trazabilidad

---

## 🚫 3. Qué NO leer primero (Y por qué)

### ❌ NO leer todavía:

**`deprecate/`** — 35% de la documentación está acá. Es ruido histórico valioso pero no es truth actual.  
→ *Leer solo si estás debuggeando algo muy viejo o necesitás trazabilidad histórica.*

**`archive/`** — Documentos archivados de versiones anteriores.  
→ *Similar a deprecate, pero más organizado cronológicamente.*

**Archivos sueltos en raíz de `docs/`** — 30 archivos sin categoría clara.  
→ *Algunos son válidos, otros son bugs de organización. Ver `INDEX.md` para filtrar.*

**`docs/README.md` (actual)** — Bug conceptual. Ese archivo es de Supabase CLI, no de EcoSign.  
→ *Ignorar completamente. Este archivo (`README_CANONICO.md` o el nuevo `README.md`) es la fuente.*

**`technical/` a profundidad** — Análisis técnico detallado.  
→ *Útil para auditorías, no para entender el sistema.*

**`log/`** — Notas operacionales informales.  
→ *Diarios de desarrollo, no documentación canónica.*

### ⚠️ Leer con precaución:

**Documentos duplicados** — Hay 4 `README.md` y 3 `INDEX.md` en diferentes carpetas.  
→ *Siempre preferir el que está más cerca de `contratos/` en la jerarquía.*

**Documentos en inglés/español mixto** — No hay política definida todavía.  
→ *Los contratos canónicos están en español. El código suele estar en inglés.*

---

## 🗺️ Mapa de Navegación Rápida

### ¿Necesitás...?

| Necesidad | Documento | Prioridad |
|-----------|-----------|-----------|
| Entender el modelo de datos | `contratos/DOCUMENT_ENTITY_CONTRACT.md` | 🔴 Crítica |
| Saber qué es un documento | `contratos/verdad-canonica.md` | 🔴 Crítica |
| Implementar firma digital | `signatures/SIGNATURE_WORKFLOW_ARCHITECTURE.md` | 🟠 Alta |
| Configurar anchoring | `anchoring/README_ANCHORING.md` | 🟠 Alta |
| Entender niveles de identidad | `contratos/IDENTITY_LEVELS_SUMMARY.md` | 🟡 Media |
| Ver roadmap | `planning/` | 🟢 Baja |
| Debuggear un bug viejo | `archive/` + `deprecate/` | ⚪ Depende |

---

## 📋 Convenciones de este Repositorio

### Nomenclatura de Archivos

- `UPPER_SNAKE_CASE.md` → Contratos canónicos (inmutables)
- `CamelCase.md` → Documentación técnica
- `lowercase-kebab.md` → Guías y procedimientos

### Estados de Documentos

- `[CANONICAL]` — Fuente de verdad, append-only
- `[ACTIVE]` — Documentación viva, se actualiza
- `[DEPRECATED]` — Obsoleto, no usar para nuevas implementaciones
- `[ARCHIVED]` — Histórico, solo referencia

### Versionado

- Contratos canónicos: SemVer (v1.0, v1.1, v2.0)
- Guías: Fecha de última actualización
- Logs: Timestamp ISO

---

## 🔗 Referencias Cruzadas Mínimas

**Para no perderte:**
- Este README → Tu entry point
- `contratos/README.md` → Índice de contratos canónicos
- `INDEX.md` → Índice completo navegable
- `architecture/ARCHITECTURE.md` → Visión de sistema

**Regla:** Si un documento no está en estas 4 referencias, es secundario.

---

## 🎯 Work Markers — Trabajo Diferido Consciente

**NO son TODOs.** Son áreas con trabajo planificado y diferido estratégicamente.

### Áreas Activas

| Área | Estado | Documentación | Prioridad |
|------|--------|---------------|-----------|
| **Migración Canónica** | En progreso | `docs/EDGE_CANON_MIGRATION_PLAN.md` | 🔴 Alta |
| **Validaciones TSA A3** | En desarrollo | `contratos/TSA_EVENT_RULES.md` | 🟡 Media |
| **Custodia Phase 2** | Planificado Q2 2026 | `docs/ops/` (roadmap) | 🟡 Media |
| **Dashboard Legacy** | Coexistencia estable | `client/src/pages/DashboardPage.tsx` | 🟢 Baja |

### Regla de Work Markers

- **NO se enumeran TODOs individuales** en este README
- **SÍ se referencia** dónde está el plan de cada área
- **NO son incertidumbre** — son decisiones diferidas conscientemente
- **SÍ tienen dueño** — cada área tiene responsable en `contratos/OPERATIONS_RESPONSIBILITY.md`

**Consultar `docs/TODO_REPORT.md` para análisis técnico completo.**

---

## 📝 Notas para el Mantenedor

Este README es **SOURCE OF TRUTH** para la navegación de documentación.  
Cambios requieren:
1. Consenso de Tech Lead
2. Actualización de `INDEX.md` si es necesario
3. NO romper links externos ( bookmarks, referencias en código)

**Última actualización:** 2026-01-31  
**Próxima revisión:** Post-implementación Centro Legal (Q1 2026)

---

**¿Encontraste un documento que no está referenciado acá?**  
→ Es un bug. Reportarlo para incluirlo o moverlo a `archive/`.

**¿No sabés por dónde empezar?**  
→ Volvé a la sección "TL;DR — Si solo vas a leer una cosa" arriba.
