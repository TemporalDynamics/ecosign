# PREGUNTAS CRÍTICAS PARA VALIDACIÓN - ANTES DE PROCEDER

**Fecha:** 2026-01-16  
**Propósito:** Resolver divergencias y gaps antes de ejecutar plan de acción  
**Estado:** REQUIERE RESPUESTA DEL EQUIPO

---

## 🚨 CATEGORÍA 1: DIVERGENCIAS ENTRE DESARROLLADORES (Resolver YA)

### Q1.1: Trigger de Blockchain - ¿Fue Aplicado el Fix?

**Contexto:**  
Dev 1 (Claude Code) identificó y corrigió un bug crítico donde el trigger `trigger_blockchain_anchoring()` fallaba porque requería `app.settings.supabase_url` que no está disponible en Supabase Cloud.

**Divergencia:**  
Dev 2 no menciona este problema ni el fix.

**Pregunta Específica:**
```
¿La migración 20260116120000_fix_blockchain_trigger_no_app_settings.sql 
fue aplicada en el ambiente de producción?

Validar con:
SELECT * FROM pg_migrations 
WHERE name LIKE '%fix_blockchain_trigger%';
```

**Impacto:** Si NO fue aplicado, los anchors NO se están creando automáticamente al subir documentos.

**Responsable:** Dev 4 (cuando responda) + DevOps

---

### Q1.2: Estructura de Eventos - ¿Hay Eventos Legacy sin Schema Canónico?

**Contexto:**  
- Dev 1 dice: "All events follow canonical schema"
- Dev 2 dice: "Partial - Some legacy events may vary"

**Pregunta Específica:**
```sql
-- Buscar eventos sin schema canónico (kind, at)
SELECT 
  id,
  events,
  created_at
FROM document_entities
WHERE 
  jsonb_typeof(events) != 'array'
  OR EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(events) AS evt
    WHERE evt->>'kind' IS NULL 
       OR evt->>'at' IS NULL
  )
LIMIT 50;
```

**Impacto:** Si hay muchos eventos legacy sin schema, el sistema de derivación de estado puede fallar.

**Responsable:** Dev 2 o Dev 3

---

## 🔍 CATEGORÍA 2: GAPS NO AUDITADOS (Información Faltante)

### Q2.1: Límites de Planes - ¿Dónde está el Enforcement?

**Contexto:**  
NINGUNO de los 3 devs encontró lógica de enforcement de límites (free/pro).

**Preguntas Específicas:**

1. ¿Existe una tabla `user_plans` o `subscriptions` en la DB?
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name ILIKE '%plan%' 
      OR table_name ILIKE '%subscription%';
   ```

2. ¿Hay validación de límites en el frontend?
   ```bash
   # Buscar en código
   rg "free.*plan|pro.*plan|plan.*limit|document.*limit" client/src -i -A 3
   ```

3. ¿Hay edge function que valide límites antes de upload?
   ```bash
   rg "plan|limit|quota" supabase/functions/*/index.ts -i -A 3
   ```

**Impacto:** Si NO hay enforcement, usuarios free pueden usar recursos infinitos.

**Responsable:** Dev de Backend + Frontend lead

---

### Q2.2: Métricas de Producción - ¿Cuántos Documentos se Procesan Realmente?

**Preguntas Específicas:**

1. ¿Cuántos documentos se suben por día actualmente?
   ```sql
   SELECT 
     date_trunc('day', created_at) AS day,
     COUNT(*) AS uploads
   FROM user_documents
   WHERE created_at > NOW() - INTERVAL '30 days'
   GROUP BY day
   ORDER BY day DESC;
   ```

2. ¿Cuántos documentos están pendientes de anchor?
   ```sql
   SELECT 
     COUNT(*) AS pending_polygon
   FROM anchors
   WHERE network = 'polygon' 
     AND status = 'pending'
     AND created_at > NOW() - INTERVAL '7 days';
   
   SELECT 
     COUNT(*) AS pending_bitcoin
   FROM anchors
   WHERE network = 'bitcoin' 
     AND status = 'pending'
     AND created_at > NOW() - INTERVAL '7 days';
   ```

3. ¿Cuántos workers fallan por semana?
   ```sql
   -- Si existe tabla de logs de workers
   SELECT 
     date_trunc('week', created_at) AS week,
     status,
     COUNT(*) AS executions
   FROM executor_job_runs
   GROUP BY week, status
   ORDER BY week DESC
   LIMIT 12;
   ```

**Impacto:** Sin métricas, no podemos saber si el sistema está bajo estrés.

**Responsable:** DBA + DevOps

---

### Q2.3: Validación de Email - ¿El Bug de Toast existe?

**Contexto:**  
En la descripción inicial mencionaste: "La validación de email dispara toasts en cada keystroke"

**Preguntas Específicas:**

1. ¿Dónde está el componente de validación de email?
   ```bash
   rg "email.*validation|validateEmail" client/src -i -l
   ```

2. ¿Usa `onChange` o `onBlur`?
   ```bash
   rg "onChange.*email|onBlur.*email" client/src -i -A 5
   ```

**Impacto:** UX bug molesto pero no crítico.

**Responsable:** Frontend lead

---

## ⚙️ CATEGORÍA 3: ESTADO OPERACIONAL (Validar en Producción)

### Q3.1: Workers Cron - ¿Están Activos y Funcionando?

**Preguntas Específicas:**

1. ¿Los workers cron están habilitados?
   ```sql
   SELECT 
     jobname,
     schedule,
     active,
     last_run,
     next_run
   FROM cron.job
   WHERE jobname ILIKE '%anchor%' 
      OR jobname ILIKE '%orphan%'
      OR jobname ILIKE '%artifact%';
   ```

2. ¿Cuándo fue la última ejecución exitosa?
   ```sql
   SELECT 
     jobid,
     jobname,
     start_time,
     end_time,
     status
   FROM cron.job_run_details
   WHERE jobname ILIKE '%polygon%'
   ORDER BY start_time DESC
   LIMIT 20;
   ```

**Impacto:** Si los workers NO están activos, los documentos quedan pendientes.

**Responsable:** DevOps

---

### Q3.2: Executor Jobs Table - ¿Tiene Registros?

**Pregunta Específica:**
```sql
-- Verificar si el executor alguna vez creó jobs
SELECT 
  COUNT(*) AS total_jobs,
  status,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending
FROM executor_jobs
GROUP BY status;
```

**Impacto:** Si la tabla está vacía, confirma que el executor NUNCA estuvo activo.

**Responsable:** Backend lead

---

### Q3.3: Anchors - ¿Hay Documentos con Anchors Duplicados?

**Contexto:**  
Ambos devs dicen que NO puede haber duplicados, pero queremos validarlo.

**Pregunta Específica:**
```sql
-- Buscar documentos con >1 anchor del mismo tipo
SELECT 
  user_document_id,
  network,
  COUNT(*) AS anchor_count
FROM anchors
GROUP BY user_document_id, network
HAVING COUNT(*) > 1;
```

**Impacto:** Si hay duplicados, confirma race condition no mitigada.

**Responsable:** Backend lead o DBA

---

## 🎯 CATEGORÍA 4: VALIDACIÓN DE CONTRATOS (vs Implementación)

### Q4.1: ECO Snapshots - ¿Existen Archivos .eco en Storage?

**Pregunta Específica:**
```sql
-- Buscar archivos .eco en Supabase Storage
SELECT 
  name,
  metadata,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'documents' -- o el bucket correspondiente
  AND name LIKE '%.eco'
ORDER BY created_at DESC
LIMIT 100;
```

**Impacto:** Validar si ECO snapshots se están generando (aunque sea client-side).

**Responsable:** Backend lead

---

### Q4.2: EcoSign Signature - ¿Existe la Clave Privada?

**Contexto:**  
El contrato requiere que EcoSign firme cada snapshot ECO, pero ambos devs confirman que NO está implementado.

**Preguntas Específicas:**

1. ¿Existe una clave privada de EcoSign en secrets?
   ```bash
   # Buscar en Supabase secrets
   supabase secrets list --project-ref <PROJECT_REF>
   ```

2. ¿Hay código que firma algo con "ecosign"?
   ```bash
   rg "ecosign.*sign|sign.*ecosign|private.*key" supabase/functions -i -A 5
   ```

**Impacto:** Si NO existe, hay que generar la clave antes de implementar firmas.

**Responsable:** Security lead + Backend lead

---

### Q4.3: Artefacto Final - ¿Se Regenera Alguna Vez?

**Pregunta Específica:**
```sql
-- Buscar workflows con múltiples artefactos
SELECT 
  workflow_id,
  COUNT(*) AS artifact_count,
  array_agg(artifact_hash ORDER BY created_at) AS hashes,
  array_agg(created_at ORDER BY created_at) AS timestamps
FROM workflow_artifacts
GROUP BY workflow_id
HAVING COUNT(*) > 1
LIMIT 50;
```

**Impacto:** Validar si alguna vez se regenera un artefacto (debería ser idempotente).

**Responsable:** Backend lead

---

## 📊 CATEGORÍA 5: MÉTRICAS DE CONFIABILIDAD (Baseline)

### Q5.1: Anchoring - ¿Cuántos Fallan Permanentemente?

**Pregunta Específica:**
```sql
-- Anchors en estado 'failed' (nunca se recuperaron)
SELECT 
  network,
  COUNT(*) AS failed_count,
  MIN(created_at) AS oldest_failure,
  MAX(created_at) AS newest_failure
FROM anchors
WHERE status = 'failed'
GROUP BY network;
```

**Impacto:** Baseline de tasa de fallo de anchoring.

**Responsable:** Backend lead

---

### Q5.2: Documentos - ¿Cuántos están en Estado "Incompleto"?

**Pregunta Específica:**
```sql
-- Documentos que esperan protección hace >7 días
SELECT 
  COUNT(*) AS stuck_documents,
  MIN(created_at) AS oldest_stuck,
  MAX(created_at) AS newest_stuck
FROM user_documents
WHERE created_at < NOW() - INTERVAL '7 days'
  AND lifecycle_status NOT IN ('completed', 'failed', 'cancelled')
  AND protection_requested = true;
```

**Impacto:** Baseline de documentos "atascados" que nunca completaron.

**Responsable:** Backend lead

---

## 🚀 CATEGORÍA 6: READINESS PARA ACTIVAR EXECUTOR

### Q6.1: Infraestructura - ¿Puede Desplegarse un Worker del Executor?

**Preguntas Específicas:**

1. ¿Hay un Dockerfile para el executor worker?
   ```bash
   ls packages/ecosign-orchestrator/Dockerfile
   ```

2. ¿Hay un script de deployment?
   ```bash
   ls scripts/deploy-executor.sh
   ```

3. ¿Hay documentación de cómo desplegar?
   ```bash
   ls docs/deployment/EXECUTOR_DEPLOYMENT.md
   ```

**Impacto:** Si NO existe, hay que crear la infra de deployment antes de activar.

**Responsable:** DevOps + Backend lead

---

### Q6.2: Configuración - ¿Están las Variables de Entorno?

**Preguntas Específicas:**

1. ¿Qué variables necesita el executor?
   ```bash
   rg "process.env" packages/ecosign-orchestrator/src -n
   ```

2. ¿Están configuradas en producción?
   ```bash
   # Validar secrets de Supabase o variables de entorno
   ```

**Impacto:** Si faltan variables, el executor fallará al arrancar.

**Responsable:** DevOps

---

## 📝 FORMATO DE RESPUESTA REQUERIDO

Para cada pregunta, responder con:

```markdown
### Q[X.Y]: [Título de la Pregunta]

**Respuesta:** [Respuesta directa]

**Evidencia:**
```sql
-- Query ejecutada (si aplica)
[Resultado de la query]
```

**Confianza:** Alta / Media / Baja

**Notas adicionales:** [Cualquier contexto relevante]

**Acción requerida:** [Si hay que hacer algo]
```

---

## 🎯 PRIORIZACIÓN DE PREGUNTAS

### P0 - Responder ANTES de proceder (Bloqueantes)
- Q1.1: ¿Trigger de blockchain fue aplicado?
- Q3.1: ¿Workers cron están activos?
- Q3.2: ¿Executor jobs tiene registros?
- Q2.2: ¿Cuántos documentos se procesan?
- Q5.2: ¿Cuántos documentos atascados?

### P1 - Responder esta semana (Importante)
- Q1.2: ¿Eventos legacy sin schema?
- Q2.1: ¿Dónde está enforcement de planes?
- Q3.3: ¿Hay anchors duplicados?
- Q4.1: ¿Existen archivos .eco?
- Q5.1: ¿Tasa de fallo de anchoring?

### P2 - Responder en 2 semanas (Menos urgente)
- Q2.3: ¿Bug de validación email?
- Q4.2: ¿Existe clave EcoSign?
- Q4.3: ¿Se regenera artefacto?
- Q6.1: ¿Infra de deployment lista?
- Q6.2: ¿Variables de entorno configuradas?

---

## 🚨 WORKFLOW DE VALIDACIÓN PROPUESTO

1. **Dev 4 responde su batería** (puede tomar 1-2 días)
2. **Consolidar respuestas de los 4 devs** (1 hora)
3. **Ejecutar queries P0** con acceso a DB producción (2-3 horas)
4. **Generar reporte consolidado** con respuestas (1 hora)
5. **Decidir si proceder con plan de acción** o si hay que refactorizar más

**Tiempo total estimado:** 2-4 días

---

**Próximo paso:** Esperar respuesta de Dev 4 y acceso a DB producción para ejecutar queries P0.

<current_datetime>2026-01-17T00:02:45.611Z</current_datetime>
