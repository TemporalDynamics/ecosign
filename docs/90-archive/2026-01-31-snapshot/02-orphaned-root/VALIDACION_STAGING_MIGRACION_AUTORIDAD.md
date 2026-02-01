# Guía de Validación en Staging: Migración Controlada de Autoridad

## Objetivo
Validar la transición controlada de autoridad desde el sistema legacy al executor canónico usando feature flags con sincronización unidireccional.

## Arquitectura de Sincronización

### Modelo de Sincronización Unidireccional
- **Source of Truth**: Variables de entorno de Deno (TypeScript)
- **Sincronización**: Deno → SQL (una vez por ejecución del executor)
- **Lectura**: Triggers SQL leen de tabla ya sincronizada

### Componentes
1. `featureFlags.ts` - Lee de Deno env (rápido, sin RPC)
2. `flagSync.ts` - Sincroniza Deno → SQL al inicio del executor
3. `feature_flags` (tabla) - Almacena estado para triggers SQL
4. Funciones PL/pgSQL - Leen de tabla sincronizada

## Preparación del Entorno de Staging

### 1. Desplegar Cambios
Asegúrate de que los siguientes cambios estén desplegados en staging:
- `supabase/functions/_shared/featureFlags.ts`
- `supabase/functions/_shared/flagSync.ts`
- `supabase/functions/_shared/featureFlags.ts`
- Migraciones de actualización de triggers
- Nueva tabla `feature_flags`

### 2. Verificar Variables de Entorno
Confirma que las siguientes variables estén configuradas en staging:
```
ENABLE_D1_CANONICAL=false  # Por defecto, cambiar a true para pruebas
ENABLE_D3_CANONICAL=false  # Por defecto, cambiar a true para pruebas
ENABLE_D4_CANONICAL=false  # Por defecto, cambiar a true para pruebas
ENABLE_D5_CANONICAL=false  # Por defecto, cambiar a true para pruebas
SIMULATE=false             # Importante: debe ser false para pruebas reales
```

## Procedimiento de Validación

### Paso 1: Validar Estado Inicial (Modo Legacy)
1. Confirmar que todos los flags están en `false`
2. Ejecutar flujos de prueba (protección de documentos, firmas, anclajes)
3. Verificar que:
   - Los triggers legacy siguen funcionando
   - El executor está en modo shadow (registra discrepancias pero no ejecuta)
   - No hay interrupciones en la funcionalidad

### Paso 2: Activar D1 (TSA) en Modo Canónico
1. Establecer `ENABLE_D1_CANONICAL=true` en staging
2. Ejecutar flujo de protección de documento
3. Verificar que:
   - El trigger legacy ya no ejecuta TSA directamente
   - El executor ahora toma la decisión y ejecuta TSA
   - No hay duplicación de TSA
   - Los logs muestran `phase: 'PASO_2_CANONICAL_ACTIVE'`

### Paso 3: Validar Monitoreo y Métricas
1. Confirmar que los logs del executor muestran:
   - Decisiones canónicas activas
   - No discrepancias en la decisión de TSA
   - Jobs de TSA ejecutándose correctamente

### Paso 4: Prueba de Sincronización
1. Usar endpoint `/feature-flags-status` para verificar sincronización
2. Confirmar que `sync_status` es `OK`
3. Verificar que no hay `mismatches` entre TypeScript y SQL

### Paso 5: Prueba de Gestión de Flags
1. Usar endpoint `/set-feature-flag` para cambiar flags
2. Verificar que los cambios se reflejan en la tabla SQL
3. Confirmar que el executor los reconoce en la siguiente ejecución

## Indicadores Clave de Éxito

### Técnicos
- [ ] No hay duplicación de side-effects
- [ ] El executor procesa jobs correctamente
- [ ] Los triggers legacy se desactivan cuando los flags están activos
- [ ] No hay errores en la ejecución de flujos críticos
- [ ] El sistema es reversible (rollback funciona)
- [ ] Sincronización entre TypeScript y SQL funciona

### Operacionales
- [ ] Los tiempos de respuesta son aceptables
- [ ] No hay pérdida de eventos o notificaciones
- [ ] El orden de emails se mantiene correctamente
- [ ] La protección de documentos funciona como antes

## Validación por Decisión

### D1 - run_tsa
- Activar `ENABLE_D1_CANONICAL=true`
- Proteger un documento
- Verificar que solo el executor ejecute TSA
- Confirmar que no hay llamadas directas desde triggers

### D3 - build_artifact
- Activar `ENABLE_D3_CANONICAL=true`
- Completar flujo de protección con todos los anclajes
- Verificar que solo el executor encole build_artifact

### D4 - anchors
- Activar `ENABLE_D4_CANONICAL=true`
- Proteger documento con anclajes a Polygon/Bitcoin
- Verificar que solo el executor encole los anclajes

### D5 - notifications
- Activar `ENABLE_D5_CANONICAL=true`
- Ejecutar flujos de firma
- Verificar que solo el executor maneje las notificaciones

## Checklist Final de Validación

- [ ] Todos los flags funcionan individualmente
- [ ] Combinaciones de flags funcionan correctamente
- [ ] No hay regresiones en funcionalidad
- [ ] El sistema es completamente reversible
- [ ] Los logs son claros y útiles para monitoreo
- [ ] No hay duplicación de trabajos
- [ ] El rendimiento es aceptable
- [ ] Sincronización entre sistemas funciona correctamente
- [ ] Endpoints de gestión de flags responden adecuadamente

## Siguiente Paso
Después de completar exitosamente esta validación, proceder con el cutover en producción siguiendo el protocolo de cambio controlado.