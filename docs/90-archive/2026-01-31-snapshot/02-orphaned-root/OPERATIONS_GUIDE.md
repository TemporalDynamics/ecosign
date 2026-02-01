# Guía de Operaciones: Sistema Canónico Ecosign

## 🎯 Arquitectura Canónica

### Componentes Principales

#### **🧠 DecisionAuthority** (`fase1-executor`)
- **Responsabilidad**: Decide qué debe hacerse basado en verdad + autoridad
- **No hace**: Ejecuta trabajos directamente
- **Lee de**: `document_entities.events[]`
- **Escribe en**: `executor_jobs` (cola neutral)
- **Lógica**: `packages/authority`

#### **⚙️ ExecutionEngine** (`orchestrator`)
- **Responsabilidad**: Ejecuta jobs que le indica DecisionAuthority
- **No hace**: Decide reglas de negocio
- **Lee de**: `executor_jobs` (cola neutral)
- **Escribe en**: `document_entities.events[]` (eventos resultado)
- **Lógica**: Ejecución de trabajos pesados

#### **⏰ WakeExecutionEngine** (cron SQL)
- **Responsabilidad**: Despertar ExecutionEngine periódicamente
- **No hace**: Decide, ejecuta, procesa lógica
- **Llama a**: `process_orchestrator_jobs()`
- **Frecuencia**: Cada 30 segundos

---

## 📊 Monitoreo del Sistema

### Métricas Clave

#### **Verdad Canónica**
```sql
-- Cantidad de entidades documentales
SELECT COUNT(*) FROM document_entities;

-- Eventos recientes (últimos 10 minutos)
SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '10 minutes';

-- Eventos por tipo
SELECT kind, COUNT(*) FROM events GROUP BY kind ORDER BY COUNT(*) DESC;
```

#### **Autoridad Canónica**
```sql
-- Estado de feature flags
SELECT flag_name, enabled, updated_at FROM feature_flags ORDER BY updated_at DESC;

-- DecisionAuthority actividad
SELECT COUNT(*) FROM executor_job_runs WHERE started_at > NOW() - INTERVAL '1 hour';
SELECT status, COUNT(*) FROM executor_job_runs GROUP BY status;
```

#### **ExecutionEngine actividad**
```sql
-- Jobs pendientes
SELECT COUNT(*) FROM executor_jobs WHERE status = 'queued';

-- Jobs recientes
SELECT type, status, created_at FROM executor_jobs 
WHERE created_at > NOW() - INTERVAL '1 hour' 
ORDER BY created_at DESC;

-- Tiempos de ejecución
SELECT 
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds,
  COUNT(*) as total_runs
FROM executor_job_runs 
WHERE finished_at IS NOT NULL 
  AND started_at > NOW() - INTERVAL '1 hour';
```

---

## 🚨 Alertas Clave

### **Alertas de Salud del Sistema**

#### **1. No hay actividad en DecisionAuthority**
```sql
-- Alerta si no hay ejecuciones en última hora
SELECT COUNT(*) FROM executor_job_runs WHERE started_at > NOW() - INTERVAL '1 hour';
-- Si es 0, puede indicar que DecisionAuthority no está corriendo
```

#### **2. Acumulación de jobs pendientes**
```sql
-- Alerta si hay más de 100 jobs pendientes
SELECT COUNT(*) FROM executor_jobs WHERE status = 'queued';
-- Si > 100, puede indicar problemas de ExecutionEngine
```

#### **3. Tasa de éxito baja**
```sql
-- Alerta si tasa de éxito < 90%
SELECT 
  (COUNT(*) FILTER (WHERE status = 'succeeded') * 100.0 / COUNT(*)) as success_rate
FROM executor_job_runs 
WHERE started_at > NOW() - INTERVAL '1 hour';
-- Si < 90%, investigar errores
```

#### **4. Duplicación de eventos**
```sql
-- Alerta si hay eventos duplicados sospechosos
SELECT 
  entity_id, 
  kind, 
  COUNT(*) as event_count
FROM events 
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY entity_id, kind
HAVING COUNT(*) > 1;
-- Si hay resultados, puede indicar doble autoridad activa
```

---

## 🔧 Operaciones de Mantenimiento

### **Activar Autoridad Canónica (Gradual)**
```bash
# 1. Activar flag en base de datos
UPDATE feature_flags 
SET enabled = true, updated_at = NOW()
WHERE flag_name = 'D1_RUN_TSA_ENABLED';

# 2. Opcional: Actualizar variable de entorno
# (requiere redeploy para efecto completo)
```

### **Desactivar Autoridad Canónica (Rollback)**
```bash
# 1. Desactivar flag en base de datos
UPDATE feature_flags 
SET enabled = false, updated_at = NOW()
WHERE flag_name = 'D1_RUN_TSA_ENABLED';

# 2. El sistema vuelve a modo legacy automáticamente
```

### **Verificar Sincronización**
```bash
# Endpoint para verificar estado de sincronización
curl -X GET "http://127.0.0.1:54321/functions/v1/feature-flags-status" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## 📋 Checklist de Operaciones

### **Antes de Activar Nuevo Flag**
- [ ] Verificar que DecisionAuthority está procesando jobs
- [ ] Confirmar que ExecutionEngine está ejecutando jobs
- [ ] Validar que no hay errores en logs
- [ ] Probar en staging con carga real
- [ ] Documentar plan de rollback

### **Después de Activar Nuevo Flag**
- [ ] Monitorear tasa de éxito de jobs
- [ ] Verificar que no hay duplicación de side-effects
- [ ] Confirmar que eventos resultado se registran correctamente
- [ ] Validar que DecisionAuthority sigue funcionando
- [ ] Verificar que ExecutionEngine procesa nuevos tipos de jobs

### **En Caso de Problemas**
- [ ] Desactivar flag problemático inmediatamente
- [ ] Revisar logs de DecisionAuthority y ExecutionEngine
- [ ] Verificar estado de colas y eventos
- [ ] Consultar métricas de rendimiento
- [ ] Documentar incidente y solución

---

## 🛡️ Seguridad y Legal

### **Garantías del Sistema**
- ✅ Un solo libro contable: `document_entities.events[]`
- ✅ Un solo cerebro: `packages/authority`
- ✅ Separación completa: Decisión vs Ejecución
- ✅ Sistema auditado: Todo como eventos inmutables
- ✅ Reversible: Rollback instantáneo con flags
- ✅ Legalmente protegido: Autoridad clara y separada

### **Auditoría de Decisiones**
```sql
-- Verificar flujo completo de una entidad
SELECT 
  de.id as entity_id,
  de.events,
  ej.type as job_type,
  ej.status as job_status,
  ejr.status as run_status,
  ejr.started_at,
  ejr.finished_at
FROM document_entities de
LEFT JOIN executor_jobs ej ON ej.entity_id = de.id
LEFT JOIN executor_job_runs ejr ON ejr.job_id = ej.id
WHERE de.id = 'YOUR_ENTITY_ID'
ORDER BY de.created_at DESC, ej.created_at DESC, ejr.started_at DESC;
```

---

## 🚀 Escalabilidad

### **Componentes Escalables**
- **DecisionAuthority**: Stateless, puede escalar horizontalmente
- **ExecutionEngine**: Puede usar pools de workers
- **Base de Datos**: Soporta millones de eventos con índices adecuados
- **Colas**: Desacopladas, manejan picos de carga

### **Consideraciones de Rendimiento**
- Mantener índices en `executor_jobs(status, run_at)`
- Monitorear tamaño de `document_entities.events[]`
- Ajustar frecuencia de cron según volumen
- Considerar particionamiento para millones de eventos

---

## 📞 Soporte Operativo

### **Endpoints de Diagnóstico**
- `/functions/v1/feature-flags-status` - Estado de sincronización
- `/functions/v1/fase1-executor` - Procesamiento de jobs
- `/functions/v1/orchestrator` - Ejecución de trabajos

### **Logs Importantes**
- DecisionAuthority: `[fase1-executor]` 
- ExecutionEngine: `[orchestrator]`
- Sincronización: `[FLAG_SYNC]`

---

**Versión**: 1.0  
**Fecha**: 27 de enero de 2026  
**Equipo**: Ecosign Engineering