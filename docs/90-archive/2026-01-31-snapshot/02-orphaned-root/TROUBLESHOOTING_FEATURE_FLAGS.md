# Guía de Troubleshooting: Sistema de Feature Flags

## Problemas Comunes y Soluciones

### 1. Desincronización entre TypeScript y SQL

**Síntomas:**
- El executor toma decisiones diferentes a los triggers
- El endpoint `/feature-flags-status` muestra `sync_status: MISMATCH`
- Se observan discrepancias en la lógica de ejecución

**Solución:**
1. Verificar el estado actual con: `GET /feature-flags-status`
2. Confirmar que las variables de entorno están correctamente configuradas
3. Forzar una ejecución del executor para que sincronice los flags
4. Si persiste, verificar que la tabla `feature_flags` exista y tenga datos

### 2. Flags no se actualizan en triggers

**Síntomas:**
- A pesar de activar un flag, los triggers legacy siguen ejecutando side-effects
- Los logs no muestran mensajes de "skipping" cuando deberían

**Solución:**
1. Verificar que la función `is_decision_under_canonical_authority` esté funcionando
2. Confirmar que la tabla `feature_flags` tiene los valores correctos
3. Revisar que el executor haya sincronizado los flags recientemente
4. Verificar que no haya errores en la función PL/pgSQL

### 3. Error en sincronización del executor

**Síntomas:**
- El executor falla con errores relacionados a `syncFlagsToDatabase`
- Mensajes de error sobre la tabla `feature_flags`

**Solución:**
1. Verificar que la migración `20260126200000_feature_flags_persistent_table.sql` se haya aplicado
2. Confirmar que la tabla `feature_flags` existe en la base de datos
3. Verificar permisos del service role para acceder a la tabla

### 4. Endpoint de gestión de flags no responde

**Síntomas:**
- `POST /set-feature-flag` devuelve errores 401 o 500
- No se puede cambiar el estado de los flags en tiempo de ejecución

**Solución:**
1. Verificar que el header `Authorization` contenga el `SUPABASE_SERVICE_ROLE_KEY` correcto
2. Confirmar que la función `set-feature-flag` esté correctamente desplegada
3. Revisar los logs de la función para identificar errores específicos

### 5. Duplicación de side-effects

**Síntomas:**
- Se observan ejecuciones duplicadas (emails dobles, anclajes dobles, etc.)
- Los logs muestran actividad tanto en triggers como en executor

**Solución:**
1. Verificar inmediatamente el estado de los flags con `/feature-flags-status`
2. Confirmar que los flags relevantes (`D4_ANCHORS_ENABLED`, `D5_NOTIFICATIONS_ENABLED`, etc.) estén correctamente activados
3. Revisar que los triggers tengan la lógica de verificación de flags
4. Si es necesario, reiniciar el executor para asegurar sincronización

## Comandos de Diagnóstico

### Verificar estado de todos los flags:
```bash
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     https://[your-project].supabase.co/functions/v1/feature-flags-status
```

### Activar un flag específico:
```bash
curl -X POST \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"flagName": "D1_RUN_TSA_ENABLED", "enabled": true}' \
     https://[your-project].supabase.co/functions/v1/set-feature-flag
```

### Consultar directamente la tabla de flags:
```sql
SELECT * FROM feature_flags ORDER BY flag_name;
```

## Procedimiento de Emergencia

Si se detecta un problema crítico:

1. **Detener propagación**: Desactivar todos los flags canónicos
2. **Modo seguro**: Permitir que el sistema opere en modo legacy
3. **Investigar**: Analizar logs y estado actual
4. **Corregir**: Aplicar solución al problema raíz
5. **Reanudar**: Reactivar flags gradualmente según sea seguro

## Logging y Monitoreo

Los siguientes mensajes de log son indicativos del estado del sistema:

- `[fase1-executor] Flags sincronizados a la base de datos` - Sincronización exitosa
- `skipping direct calls` - Trigger respetando el flag y no ejecutando side-effect
- `decision mismatch` - Posible discrepancia entre lógica legacy y canónica
- `decision matches canonical` - Lógica funcionando correctamente