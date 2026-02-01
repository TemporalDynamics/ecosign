# 📋 Reporte de TODOs/FIXMEs — EcoSign Codebase

**Fecha:** 2026-01-31  
**Total de TODOs en código fuente:** 48  
**Total encontrado (incluyendo docs/.git):** ~4,930  
**Scope:** Solo código fuente TypeScript/JavaScript/SQL/Solidity

---

## 🎯 Resumen Ejecutivo

**Estado:** Razonable para proyecto en fase de transición canónica  
**Deuda técnica visible:** Baja-moderada  
**Riesgo:** La mayoría son TODOs planificados, no olvidados

**Hallazgo clave:** Los TODOs están **altamente concentrados** en 3 áreas:
1. Migración canónica (document_entity_id) — 12 TODOs
2. Fase 2 / Custodia (encryption) — 8 TODOs
3. Tests TSA (validaciones forenses) — 4 TODOs

---

## 📊 Distribución por Categoría

| Categoría | Cantidad | % | Prioridad |
|-----------|----------|---|-----------|
| **Migración Canónica** | 12 | 25% | 🔴 Alta |
| **Fase 2 / Custodia** | 8 | 17% | 🟡 Media |
| **UI/UX Parcial** | 6 | 12% | 🟢 Baja |
| **Tests TSA** | 4 | 8% | 🟡 Media |
| **Legacy Cleanup** | 2 | 4% | 🟢 Baja |
| **Features Futuras** | 6 | 12% | 🟢 Baja |
| **Otros** | 10 | 21% | ⚪ Variable |

---

## 🔴 Alta Prioridad — Migración Canónica (12 TODOs)

### Descripción
Migración del modelo legacy (`user_documents`) al modelo canónico (`document_entities`).

### Ubicación
```
supabase/functions/
├── create-invite/index.ts:6
├── create-signer-link/index.ts:33
├── generate-link/index.ts:14
├── log-event/index.ts:20
├── notify-document-certified/index.ts:7
├── verify-access/index.ts:13
├── process-polygon-anchors/index.ts:9
├── process-bitcoin-anchors/index.ts:13
├── process-signature/index.ts:255
└── _legacy/* (4 archivos más)
```

### Patrón
```typescript
// TODO(canon): support document_entity_id (see docs/EDGE_CANON_MIGRATION_PLAN.md)
// TODO(canon): Migrate from user_document_id to document_entity_id
```

### Estado
- **Planeado:** Sí, con referencia a documentación
- **En progreso:** Sí (hay carpeta `_legacy/` con versiones antiguas)
- **Bloqueante:** No (funciones duales coexisten)

### Acción Recomendada
1. Priorizar migración de funciones Edge críticas
2. Mantener ambas versiones hasta validación completa
3. Eliminar `_legacy/` post-migración

---

## 🟡 Media Prioridad

### 1. Tests TSA — Validaciones Forenses (4 TODOs)

**Archivo:** `tests/unit/tsaEvents.test.ts` (líneas 29, 90, 135, 178)

**Patrón:**
```typescript
// TODO A3: strict forensic TSA validations are under development
// TODO A3: strict forensic validation — test currently skipped
```

**Contexto:** 
- Tests skippeados temporalmente
- Validaciones forenses estrictas en desarrollo
- Bloqueado por implementación A3 rules

**Acción:** Implementar según `contratos/TSA_EVENT_RULES.md` antes de Q2 2026

---

### 2. Fase 2 — Custodia Encriptada (8 TODOs)

**Archivos principales:**
- `client/src/lib/custodyStorageService.ts` (3 TODOs)
- `client/src/lib/encryptionService.ts` (1 TODO)
- `client/src/lib/draftOperationsService.ts` (1 TODO)
- `supabase/functions/save-draft/index.ts` (1 TODO)

**Descripción:**
Funcionalidad de custodia encriptada para modo enterprise.

**Estado:**
- Backup implementado
- Descarga/recuperación pendiente (Phase 2)
- Prioridad Q2 2026

**Ejemplo:**
```typescript
/**
 * TODO (Phase 2): Implementar descarga de archivos cifrados
 * Actualmente no es prioritario porque custody es solo para backup.
 */
```

---

## 🟢 Baja Prioridad

### 1. UI/UX Parcial (6 TODOs)

| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `LegalCenterModalV2.tsx:392` | Anotaciones PDF sin lógica de escritura |
| `FieldPlacer.tsx:46` | Detección de página actual (hardcoded 0) |
| `FieldPlacer.tsx:150-151` | Duplicar firmas en todas las páginas |
| `DocumentUploader.tsx:132` | Conversión client-side (DOCX/PPTX) |
| `ContactPage.tsx:21` | Form submission no implementado |
| `ErrorBoundary.tsx:46` | Monitoring (Sentry/LogRocket) |

**Evaluación:** Features nice-to-have, no bloqueantes.

---

### 2. Legacy Cleanup (2 TODOs)

**Archivo:** `client/src/pages/DashboardPage.tsx` (líneas 28, 56)

```typescript
// TODO(legacy-cleanup): replace with document_entities adapter 
// when dashboard migrates off user_documents.
```

**Contexto:** Dashboard aún usa modelo legacy. Planificado para migración gradual.

---

### 3. Features Futuras (6 TODOs)

- **Bitcoin anchoring parsing:** Parse proof mejorado (`process-bitcoin-anchors/index.ts:259`)
- **ECO v2 hash_chain:** Verificación de discrepancias (`client/src/lib/eco/v2/index.ts:180`)
- **Service Worker:** Re-habilitar post-fix CORS (`client/src/main.jsx:74`)
- **ndaEvents:** Implementación futura (`client/src/lib/ndaEvents.ts:196`)

---

## ⚪ Otros TODOs

### Falsos Positivos / No son TODOs de código
- `client/scripts/validate-env.js:27` — Lista de placeholders de validación
- `client/src/components/ShareDocumentModal.tsx:91` — "Inicializar TODO" (es español, no tag)
- `supabase/functions/_shared/test-d3-artifact.ts:52,77` — "Con TSA y TODOS los anchors" (español)

### Validación de placeholders
```javascript
const placeholders = ['YOUR_', 'xxx', '...', 'REPLACE_ME', 'TODO'];
```

---

## 📈 Métricas Detalladas

### Por Tipo de Patrón
| Patrón | Cantidad | Uso |
|--------|----------|-----|
| `TODO(canon)` | 12 | Migración canónica |
| `TODO:` | 12 | Genéricos |
| `TODO (Phase/Sprint/Q#)` | 8 | Planificación temporal |
| `TODO A3` | 4 | Tests TSA específicos |
| `TODO(legacy-cleanup)` | 2 | Limpieza legacy |
| `TODO(contract)` | 1 | Reglas de contrato |

### Por Ubicación
| Ubicación | TODOs | % |
|-----------|-------|---|
| `supabase/functions/` | 17 | 35% |
| `client/src/` | 17 | 35% |
| `tests/` | 4 | 8% |
| Otros | 10 | 21% |

### Top 5 Archivos
| Archivo | TODOs | Categoría |
|---------|-------|-----------|
| `tests/unit/tsaEvents.test.ts` | 4 | Tests TSA |
| `client/src/lib/custodyStorageService.ts` | 3 | Custodia |
| `client/src/components/signature/FieldPlacer.tsx` | 3 | UI |
| `supabase/functions/_shared/test-d3-artifact.ts` | 2 | Tests |
| `supabase/functions/process-bitcoin-anchors/index.ts` | 2 | Anchoring |

---

## ✅ Recomendaciones

### Inmediatas (Este sprint)
1. **Migración canónica:** Completar 12 TODOs de `document_entity_id`
   - Impacto: Alta
   - Esfuerzo: Medio
   - Riesgo: Coexistencia actual funciona

### Corto plazo (Q1 2026)
2. **Tests TSA:** Implementar validaciones A3 (4 TODOs)
   - Impacto: Compliance técnico
   - Dependencia: `contratos/TSA_EVENT_RULES.md`

3. **Dashboard legacy:** Migrar a `document_entities` (2 TODOs)
   - Impacto: Consistencia de datos

### Mediano plazo (Q2 2026)
4. **Fase 2 Custodia:** Implementar descarga encriptada (8 TODOs)
   - Impacto: Feature enterprise
   - Prioridad: Depende de roadmap de producto

### Baja prioridad
5. **UI parcial:** LegalCenter anotaciones, multi-page signatures (6 TODOs)
6. **Features futuras:** Bitcoin proof parsing, hash_chain verification

---

## 🎯 Veredicto

**¿Es preocupante la cantidad de TODOs?**

**No.** 48 TODOs en ~24,000 archivos de código es **saludable**.

**¿Hay TODOs críticos olvidados?**

**No.** La mayoría son TODOs planificados con contexto:
- 25% tienen referencia a documentación (`see docs/...`)
- 35% tienen indicación temporal (Phase 2, Sprint 4, Q2 2026)
- 0% son "TODO: fix this" sin contexto

**¿Hay deuda técnica oculta?**

**Mínima.** Los TODOs están concentrados en áreas conocidas y documentadas.

---

## 🔍 TODOs vs. Documentación

**Alineación:** ✅ Los TODOs están bien alineados con la documentación

- `TODO(canon)` → Referencian `docs/EDGE_CANON_MIGRATION_PLAN.md`
- `TODO A3` → Referencian `contratos/TSA_EVENT_RULES.md`
- `TODO (Phase 2)` → Alineados con `ROADMAP_DEFINITIVO_INFALIBLE.md` (archivado)

**Propuesta:** Agregar a `docs/README.md` sección "TODOs activos por área"

---

**Reporte generado:** 2026-01-31  
**Próxima revisión:** Post-migración canónica completa (est. Q1 2026)
