# Estado Actual del Sistema: Migración de Autoridad H6

## Fecha
26 de enero de 2026

## Resumen
El sistema ha sido actualizado para implementar una arquitectura de feature flags con sincronización unidireccional para permitir la transición controlada de autoridad desde el sistema legacy al executor canónico.

## Componentes Implementados

### 1. Arquitectura de Sincronización
- **Source of Truth**: Variables de entorno de Deno (TypeScript)
- **Sincronización**: Deno → SQL (una vez por ejecución del executor)
- **Lectura**: Triggers SQL leen de tabla ya sincronizada

### 2. Tabla Persistente de Flags
- `feature_flags` - Almacena estado de flags para triggers SQL
- Sincronizada automáticamente por el executor
- Soporta actualización manual vía endpoint

### 3. Funciones Actualizadas
- `is_decision_under_canonical_authority()` - Lee de tabla SQL
- `syncFlagsToDatabase()` - Sincroniza Deno → SQL
- `set-feature-flag` - Endpoint para gestión en tiempo de ejecución
- `feature-flags-status` - Endpoint para monitoreo de estado

### 4. Triggers Actualizados
- `trigger_blockchain_anchoring` - Verifica `D4_ANCHORS_ENABLED`
- `notify_signer_link` - Verifica `D5_NOTIFICATIONS_ENABLED`
- `notify_workflow_completed` - Verifica `D5_NOTIFICATIONS_ENABLED`
- `notify_signature_completed` - Verifica `D5_NOTIFICATIONS_ENABLED`
- `notify_creator_on_signature` - Verifica `D5_NOTIFICATIONS_ENABLED`

## Decisiones Soportadas
- `D1_RUN_TSA_ENABLED` - Controla ejecución de TSA
- `D3_BUILD_ARTIFACT_ENABLED` - Controla generación de artifacts
- `D4_ANCHORS_ENABLED` - Controla anclajes blockchain
- `D5_NOTIFICATIONS_ENABLED` - Controla notificaciones

## Estado de Migraciones
- ✅ `20260126200000_feature_flags_persistent_table.sql` - Crea tabla y funciones
- ✅ `20260126210000_update_blockchain_anchoring_trigger.sql` - Actualiza trigger de anclajes
- ✅ `20260126220000_update_signature_workflow_triggers.sql` - Actualiza triggers de workflow
- ✅ `20260126230000_update_creator_notification_trigger.sql` - Actualiza trigger de notificación al creador

## Archivos Actualizados
- `supabase/functions/fase1-executor/index.ts` - Incluye sincronización de flags
- `supabase/functions/_shared/featureFlags.ts` - Lógica de lectura de flags
- `supabase/functions/_shared/flagSync.ts` - Función de sincronización
- Nuevas funciones: `set-feature-flag`, `feature-flags-status`

## Validación Requerida
Antes de despliegue a producción:
- [ ] Aplicar migraciones en ambiente de staging
- [ ] Verificar que todas las funciones existen
- [ ] Confirmar que triggers tienen nueva lógica
- [ ] Probar activación manual de flags
- [ ] Validar sincronización entre sistemas
- [ ] Ejecutar tests automatizados

## Próximos Pasos
1. Desplegar en staging y validar
2. Ejecutar plan de cutover gradual
3. Monitorear sistema durante transición
4. Documentar lecciones aprendidas