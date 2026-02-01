# Hallazgo Crítico: Executor Corre en Cloud (no local)

**Fecha:** 2026-01-24
**Severidad:** ALTA - Afecta validación de H0 y H1
**Estado:** Documentado

---

## Resumen

El `fase1-executor` NO corre en la base de datos local de desarrollo. Corre como Supabase Edge Function en la nube (producción), invocado por un cron job cada minuto.

## Evidencia

### 1. Cron Job Configurado

```sql
-- supabase/migrations/20260118070000_add_fase1_executor_cron.sql
SELECT cron.schedule(
  'invoke-fase1-executor',
  '*/1 * * * *',
  $$SELECT public.invoke_fase1_executor();$$
);
```

### 2. Función Invoca Edge Function Cloud

```sql
CREATE OR REPLACE FUNCTION public.invoke_fase1_executor()
...
  supabase_url text := 'https://uiyojopjbhooxrmamaiw.supabase.co';
  ...
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/fase1-executor',
    ...
  ) INTO request_id;
```

### 3. Base de Datos Local Vacía

```bash
$ psql ... -c "SELECT COUNT(*) FROM executor_jobs"
 count
-------
     0

$ psql ... -c "SELECT COUNT(*) FROM executor_job_runs"
 count
-------
     0
```

---

## Impacto en el Plan de Hitos

### H0 — Línea Base de Autoridad

**Problema:**
No podemos validar runs reales del executor en local.

**Solución:**
1. Ejecutar `scripts/h0-validate-shadow.sql` contra **base de datos de producción**
2. O configurar executor local para desarrollo

### H1 — Runs Reales Controlados

**Problema:**
Los runs reales están en producción, no en local.

**Solución:**
1. Ejecutar `scripts/h1-run-snapshot.sql` contra **base de datos de producción**
2. O generar tráfico real en ambiente local (requiere configurar executor local)

---

## Opciones de Acción

### Opción A: Validar contra Producción (recomendado corto plazo)

**Pros:**
- Datos reales ya existen
- No requiere configuración adicional
- Validación inmediata

**Contras:**
- Requiere acceso a producción
- No aislado del tráfico real

**Pasos:**
```bash
# 1. Obtener connection string de producción
export PROD_DB="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# 2. Ejecutar validación
psql $PROD_DB -f scripts/h0-validate-shadow.sql

# 3. Extraer snapshots de runs
psql $PROD_DB -v document_entity_id='UUID' -f scripts/h1-run-snapshot.sql
```

### Opción B: Configurar Executor Local (recomendado largo plazo)

**Pros:**
- Desarrollo aislado
- Control total de datos
- Testing repetible

**Contras:**
- Requiere configuración adicional
- Más tiempo de setup

**Pasos:**
1. Modificar `invoke_fase1_executor()` para detectar ambiente:
   ```sql
   IF current_setting('app.environment', true) = 'local' THEN
     supabase_url := 'http://127.0.0.1:54321';
   ELSE
     supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';
   END IF;
   ```

2. Ejecutar `fase1-executor` Edge Function localmente:
   ```bash
   supabase functions serve fase1-executor
   ```

3. Habilitar cron local (requiere pg_cron configurado)

---

## Recomendación Inmediata

**Para completar H0 y H1:**

1. ✅ **Usar Opción A** (validar contra producción)
   - Ejecutar scripts contra DB de producción
   - Documentar resultados en `PLAN_ACCION_HITOS.md`
   - Extraer 3-5 runs reales para análisis

2. ⏭️ **Planear Opción B** para fase de desarrollo iterativo
   - No urgente para validar H0/H1
   - Crítico para desarrollo continuo

---

## Scripts Actualizados

### h0-validate-shadow.sql

✅ Ya detecta cuando no hay jobs locales:
```
⚠️ SIN JOBS (verificar si executor corre en cloud)
```

### h1-run-snapshot.sql

✅ Funciona contra cualquier base de datos (local o cloud):
```bash
psql [CONNECTION_STRING] -v document_entity_id='UUID' -f scripts/h1-run-snapshot.sql
```

---

## Checklist de Validación

Para completar H0:

- [ ] Obtener acceso a base de datos de producción
- [ ] Ejecutar `h0-validate-shadow.sql` contra producción
- [ ] Verificar runs REALES (no simulados) > 0
- [ ] Verificar divergencias = 0
- [ ] Verificar executor activo (last_run < 1 hora)
- [ ] Actualizar estado H0 en `PLAN_ACCION_HITOS.md`

Para completar H1:

- [ ] Identificar 3-5 document_entity_id de producción
- [ ] Ejecutar `h1-run-snapshot.sql` para cada uno
- [ ] Completar tabla de registro en `PLAN_ACCION_HITOS.md`
- [ ] Verificar historia completa (events + jobs)

---

## Contactos / Referencias

- **Supabase Project:** uiyojopjbhooxrmamaiw
- **Edge Function:** fase1-executor
- **Cron Job:** invoke-fase1-executor (cada 1 minuto)
- **Migration:** 20260118070000_add_fase1_executor_cron.sql
