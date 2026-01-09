# Phased Migrations (Migraciones Faseadas)

Este documento registra migraciones técnicas en múltiples fases para reducir riesgo y permitir rollback controlado.

---

## Draft Storage Migration

**Objetivo:** Migrar almacenamiento de drafts de local-only (IndexedDB) a server-side (operations.status='draft')

**Razón:** Drafts local-only se pierden en crash del navegador. Server-side permite recovery automático y acceso multi-dispositivo.

### Phase 1: Dual-Write (2026-01) ✅ ACTUAL

**Estado:** Implementado en Sprint 3

**Estrategia:**
- Escribir simultáneamente a server (via `save-draft` Edge Function) y local (IndexedDB)
- Leer desde server primero, fallback a local si falla
- No hay cifrado real de archivos (solo referencias UUID)

**Garantías:**
- ✅ No hay pérdida de datos (dual-write)
- ✅ Recovery automático tras crash
- ✅ Backwards compatibility con drafts viejos

**Limitaciones conocidas:**
- ⚠️ Archivos NO están cifrados (pendiente Sprint 4)
- ⚠️ IndexedDB sigue activo (sincronización manual)

**Rollback:** Eliminar llamadas a `saveDraftOperation()`, volver a `addDraft()` solo

### Phase 2: Server-Primary (Q2 2026) 🔄 PENDIENTE

**Estado:** No iniciado

**Estrategia:**
- Server es fuente de verdad primaria
- Local solo como fallback en caso de desconexión
- Cifrado de archivos draft implementado (Sprint 4)

**Cambios requeridos:**
- Implementar encryption/decryption en `save-draft` y `load-draft`
- Actualizar UI para indicar estado de sincronización
- Migrar drafts legacy desde IndexedDB a server

**Garantías:**
- ✅ Drafts accesibles desde múltiples dispositivos
- ✅ Archivos cifrados en storage
- ✅ Fallback local en caso de desconexión

**Criterio de activación:**
- Sprint 4 (Custody Mode) completado y validado
- Tasa de éxito server-side > 99.5% por 2 semanas
- Testing de cifrado/decifrado sin errores

### Phase 3: Server-Only (Q3 2026) 🔮 FUTURO

**Estado:** No iniciado

**Estrategia:**
- Eliminar IndexedDB completamente
- Solo almacenamiento server-side
- Local cache efímero (no persistente)

**Cambios requeridos:**
- Remover `draftStorage.ts` completamente
- Actualizar UI para mostrar estado online/offline
- Service Worker para cache efímero

**Garantías:**
- ✅ Arquitectura simplificada (sin dual-source)
- ✅ Consistencia total (single source of truth)
- ✅ Menor footprint en cliente

**Criterio de activación:**
- Phase 2 en producción > 3 meses sin incidentes
- Migración de drafts legacy completada al 100%
- Aprobación de usuarios beta (sin quejas de UX offline)

---

## Decisiones Relacionadas

**¿Por qué no migrar directo a Phase 3?**
Porque dual-write reduce riesgo de pérdida de datos durante desarrollo/testing.

**¿Por qué NO hay Phase 0 (local-only)?**
Porque local-only es el estado legacy que estamos migrando.

**¿Qué pasa con drafts durante cada fase?**
- Phase 1: Drafts viven en server Y local (redundancia)
- Phase 2: Drafts viven en server, local es fallback
- Phase 3: Drafts viven SOLO en server

**¿Cuándo deprecamos draftStorage.ts?**
- Phase 1: @deprecated header (2026-01-10) ✅
- Phase 2: Move to `/legacy` folder
- Phase 3: Delete completamente

---

## Monitoreo y Métricas

### Phase 1 (Actual)
```sql
-- Tasa de éxito server-side
SELECT
  COUNT(*) as total_attempts,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM draft_save_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Drafts en server vs local
SELECT
  'server' as source, COUNT(*) as count
FROM operations WHERE status = 'draft'
UNION ALL
SELECT
  'local' as source, COUNT(*) as count
FROM user_draft_metadata_local; -- Tabla de tracking local
```

### Phase 2 (Futuro)
```sql
-- Tasa de cifrado exitoso
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN encrypted THEN 1 ELSE 0 END) as encrypted,
  ROUND(100.0 * SUM(CASE WHEN encrypted THEN 1 ELSE 0 END) / COUNT(*), 2) as encryption_rate
FROM operation_documents
WHERE draft_file_ref IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Lecciones Aprendidas (Post-Phase 1)

**✅ Qué funcionó bien:**
- Dual-write permitió migración sin downtime
- Auto-recovery generó confianza en usuarios
- Deprecation header evitó usos accidentales

**⚠️ Qué mejorar en Phase 2:**
- Agregar logs estructurados de save/load
- UI debe indicar estado de sincronización
- Testing automatizado de recovery

**🔮 Qué considerar para Phase 3:**
- Service Worker para cache offline
- Progressive Web App capabilities
- Sync automático al reconectar

---

**Última actualización:** 2026-01-10
**Owner:** Tech Lead
**Reviewers:** Backend Team, Security Team
