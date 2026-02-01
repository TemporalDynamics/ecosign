# REPORT_SUPABASE_AUDIT_QUESTIONS.md

Fecha de generación: 2026-01-16T23:25:52.819Z

Resumen
-------
Archivo con la batería de preguntas para auditoría profunda de EcoSign/Supabase, plantilla de respuesta (checkbox/valor + evidencia + confianza), comandos SQL/supabase CLI sugeridos para obtener evidencia y una tabla de responsabilidades por área para distribuir entre equipos.

Instrucciones de uso
--------------------
1. Asignar responsables por área (ver tabla al final).
2. Cada responsable responde cada pregunta usando el formato: Respuesta directa (checkbox o valor), Evidencia (logs/queries/código con rutas y líneas), Confianza (alta/media/baja).
3. Adjuntar resultados (salida de comandos o enlaces a snippets) cuando sea posible.

Formato de respuesta requerido
-----------------------------
- Respuesta directa: ✅ / ❌ o valor específico.
- Evidencia: Comando ejecutado y/o path en repo o query ejecutada (pegar output relevante o link a gist/log).
- Confianza: Alta / Media / Baja

Ejemplo
-------
P1.5: ¿Qué componentes pueden cambiar document_entities.lifecycle_status?
Respuesta:
- Trigger: update_lifecycle_status_on_anchor
- Edge Function: complete-workflow
- Worker: process-bitcoin-anchors
- Executor: NO

Evidencia:
- Ver: supabase/migrations/20250114_trigger_lifecycle.sql
- Ver: supabase/functions/complete-workflow/index.ts#L45

Confianza: Alta

Batería de preguntas por área
-----------------------------

ÁREA 1: AUTORIDAD Y ORQUESTACIÓN (EXECUTOR)
Objetivo: Determinar quién decide qué, cuándo y cómo.

P1.1 Estado Actual del Executor
- ¿El executor está desplegado y funcionando en producción? (Sí/Parcial/No)
- Si parcial: especificar qué jobs está procesando.

P1.2 Inventario de jobs del executor
- Listar jobs: nombre, operación, eventos canónicos emitidos, frecuencia.

P1.3 ¿El executor mantiene ECOX (append-only log)?
- ¿Dónde escribe (tabla/stream)? (ecox_audit_trail, document_entities.events, otro)

P1.4 ¿El executor emite snapshots ECO?
- ¿Qué componente genera .eco y cuándo?

Duplicidad de Autoridad

P1.5 ¿Qué componentes pueden cambiar document_entities.lifecycle_status?
- Listar todos (triggers, workers, edge functions, UI, executor, etc.)

P1.6 ¿Qué componentes pueden crear registros en anchors?
- Enumerar componentes y rutas para cada uno.

P1.7 ¿Qué componentes pueden marcar un workflow como "completed"?

P1.8 ¿Qué componentes pueden escribir en document_entities.events?
- Listar frecuencia estimada y ejemplos de eventos.


ÁREA 2: ANCHORING (TSA, Polygon, Bitcoin)
Objetivo: Mapear todos los caminos que llevan a crear/confirmar anchors.

P2.1 ¿Cuántos caminos existen para crear un anchor?
- Mapear triggers, workers cron, edge functions, UI, otros.

P2.2 ¿Los anchors se crean antes o después de confirmar en blockchain?
- ¿Se guarda como pending → confirmed o solo cuando hay txid confirmado?

P2.3 ¿Qué pasa si falla el anchoring de Polygon? (retry/escalado/failed)

P2.4 ¿Qué pasa si falla el anchoring de Bitcoin?

P2.5 ¿Cuánto tiempo puede pasar entre upload y anchor confirmado?
- Polygon / Bitcoin / Casos edge

Race conditions

P2.6 ¿Puede un documento tener dos anchors del mismo tipo?

P2.7 ¿Qué pasa si dos workers intentan anclar el mismo documento? (locks/dedupe)

P2.8 ¿Los eventos de anchoring escriben en document_entities.events?


ÁREA 3: document_entities y eventos canónicos
Objetivo: Entender la verdad canónica y sus inconsistencias.

P3.1 ¿document_entities.events es append-only?

P3.2 ¿Qué componentes escriben en document_entities.events?

P3.3 ¿Los eventos tienen estructura uniforme (schema)?

P3.4 ¿Qué eventos se consideran "canónicos" hoy?

Derivación de estado

P3.5 ¿El nivel de protección se deriva de eventos o de campos legacy?

P3.6 ¿Dónde se calcula el nivel de protección actualmente? (frontend/backend/SQL/edge)

P3.7 ¿Hay documentos legacy sin eventos pero con anchors? ¿Cuántos aprox.?

P3.8 ¿Los documentos legacy se están migrando a eventos canónicos?


ÁREA 4: NOTIFICACIONES
Objetivo: Identificar productores duplicados de notificaciones.

P4.1 ¿Qué componentes pueden crear notificaciones para un workflow completado?

P4.2 ¿Puede un usuario recibir notificaciones duplicadas?

P4.3 ¿Las notificaciones se generan antes o después del artefacto final?

P4.4 ¿Qué pasa si falla el envío de notificación? (retry/cola/perdida)


ÁREA 5: ARTEFACTO FINAL (ECO/PDF)
Objetivo: Entender cuándo y cómo se genera el artefacto entregable.

P5.1 ¿Cuándo se genera el artefacto final? (al completar workflow / al confirmar anchors / bajo demanda)

P5.2 ¿Qué componente genera el artefacto final? (worker/edge/trigger/executor)

P5.3 ¿El artefacto final puede regenerarse y es idéntico?

P5.4 ¿El artefacto final incluye todos los anchors confirmados?

ECO vs ECOX

P5.5 ¿Existe ECOX (log vivo) separado de ECO (snapshot)?

P5.6 ¿Se pueden generar múltiples snapshots ECO para un documento?

P5.7 ¿EcoSign firma cada snapshot ECO? (claves, proceso, auditoría)


ÁREA 6: WORKERS Y CRON JOBS
Objetivo: Mapear frecuencia, overlaps y posibles colisiones.

P6.1 Listar TODOS los workers activos (nombre | frecuencia | qué hace | escribe en)

P6.2 ¿Hay workers que hacen tareas similares/overlapping?

P6.3 ¿Los workers tienen locks para evitar ejecución concurrente?

Observabilidad

P6.4 ¿Cómo se monitorean los workers? (logs en supabase / external logging)

P6.5 ¿Cuántas ejecuciones de workers fallan por semana (aprox)?

P6.6 ¿Hay alertas cuando un worker falla crítico?


ÁREA 7: RLS Y PERMISOS
Objetivo: Identificar escrituras directas desde UI que bypassean lógica.

P7.1 ¿Los usuarios pueden hacer INSERT directo en anchors via RLS?

P7.2 ¿Los usuarios pueden hacer UPDATE directo en document_entities?

P7.3 ¿Los usuarios pueden modificar document_entities.events?

P7.4 ¿Qué tablas tienen RLS permisivo que permita mutación?


ÁREA 8: UI Y UX (BUGS OBSERVADOS)
Objetivo: Conectar bugs de UI con problemas de backend.

P8.1 ¿El badge de protección se deriva de eventos o legacy fields?

P8.2 ¿Hay casos donde el badge no refleja la realidad?

P8.3 ¿Qué pasa si un anchor tarda días en confirmarse? (auto-update/refresh/manual)

P8.4 ¿La validación de email dispara toasts en cada keystroke? (onChange vs onBlur)

P8.5 ¿Hay otras validaciones con comportamiento similar? Listar.


ÁREA 9: LÍMITES Y PLANES
Objetivo: Entender enforcement de límites.

P9.1 ¿Dónde se validan los límites de plan (free/pro)? (frontend/backend/trigger)

P9.2 ¿Qué pasa si un usuario free intenta proteger documento 11? (bloqueo antes/after/upload)

P9.3 ¿Los límites son soft (avisos) o hard (bloqueos)? Especificar.


ÁREA 10: ESCALABILIDAD
Objetivo: Identificar cuellos de botella.

P10.1 ¿Cuántos documentos se procesan por día actualmente? (rangos)

P10.2 ¿Cuál es el tiempo promedio de protección completa (upload → TSA → Polygon → Bitcoin)? Promedio / P95 / Máximo observado

P10.3 ¿Qué pasa si llegan 1000 uploads simultáneos? (escala/queue/se cae)

Bottlenecks

P10.4 ¿Cuál es el componente más lento del pipeline? (upload/TSA/Polygon/Bitcoin/artefacto)

P10.5 ¿Hay límites de rate en servicios externos? (TSA/Polygon RPC/Bitcoin)


SECCIÓN ESPECIAL: PREGUNTAS CRÍTICAS DE SUPERVIVENCIA
--------------------------------------------------
PC1: Si un documento se sube HOY y Bitcoin tarda 7 DÍAS en confirmar, ¿el usuario recibe su artefacto final completo en el día 7? (Sí/A veces/No)

PC2: Si un worker cron falla durante 48h, ¿se recupera automáticamente? (Sí/No/Depende)

PC3: Si hay un bug en el código y se despliega mal, ¿se puede corromper document_entities.events (append-only log)? (No/Sí/No sé)

PC4: ¿Existe un mecanismo de "rebuild truth" desde eventos canónicos? (Sí/No/Parcial)

PC5: ¿El executor actual puede procesar 10,000 documentos en paralelo? (Sí/No/No sé)


Comandos SQL / supabase CLI sugeridos para obtener evidencia
-----------------------------------------------------------
Nota: ejecutar estos comandos conectándose a la DB con supabase CLI o psql usando credenciales de servicio.

Sugerencias generales:
- supabase functions list
- supabase projects status (según versión del CLI)

Queries útiles (ejemplos):

-- Últimos eventos canónicos
SELECT * FROM document_entities.events ORDER BY occurred_at DESC LIMIT 50;

-- Contar documentos legacy sin eventos
SELECT ud.id, ud.created_at FROM user_documents ud
LEFT JOIN LATERAL (
  SELECT 1 FROM document_entities.events e WHERE e.document_id = ud.id LIMIT 1
) ev ON true
WHERE ev IS NULL
LIMIT 100;

-- Ver triggers asociados a una tabla
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_documents';

-- Ver políticas RLS (Postgres 14+)
SELECT pol.polname, pg_get_ruledef(pol.oid)
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
WHERE c.relname = 'anchors';

-- Locks y actividad (para investigar colisiones)
SELECT * FROM pg_locks l JOIN pg_stat_activity a ON l.pid = a.pid LIMIT 50;

-- Jobs / workers (si usan una tabla job_store)
SELECT * FROM executor_jobs ORDER BY created_at DESC LIMIT 100;

-- Anchors pendientes/fallidos
SELECT * FROM anchors WHERE status IN ('pending','failed') ORDER BY updated_at DESC LIMIT 200;

-- Buscar referencias a document_entities.events en codigo
-- (Ejecutar localmente: rg "document_entities.events" -n || git grep -n "document_entities.events")


Comandos/queries para obtener evidencia operativa
- supabase db query "<SQL>" --project-ref <REF>  # si la CLI lo soporta
- psql "host=... user=... dbname=... password=..." -c "<SQL>"
- docker logs <worker_container> | rg "ERROR|WARN|anchor" --no-ignore


Tabla de responsables propuesta
------------------------------
- Backend / Executor: Responsable A (ej: lead-backend)
- Eventos / Evidencia: Responsable B (ej: data-engineering)
- Workers / Cron: Responsable C (ej: infra/ops)
- Frontend: Responsable D (ej: lead-frontend)
- Infra (K8s / VM / scaling): Responsable E (ej: infra-sre)
- DBA / RLS / Seguridad: Responsable F (ej: dba)
- Notificaciones: Responsable G (ej: backend-notifs)

(Modificar nombres con personas reales al distribuir.)

Checklist de salida
-------------------
- Cada responsable responde su conjunto de preguntas.
- Reunir evidencias en un repositorio (gists / docs / issue tracker) y enlazar a este archivo.
- Ejecutar una "reconstrucción de verdad" en staging usando sólo document_entities.events para validar el pipeline de reconstrucción.

Notas finales
-------------
- Priorizar: 1) asegurar append-only y habilidad de rebuild; 2) centralizar derivación de niveles de protección; 3) garantizar idempotencia y dedupe en executor; 4) observar y alertar fallos de workers.
- Después de recoger respuestas, se puede generar un plan de migración y un backlog de refactors con prioridad y estimación.

---

Fin del archivo.
