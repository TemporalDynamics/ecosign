# CONTRATO_ORQUESTACION_FLUJOS

## Proposito
Define la capa canonica de orquestacion para EcoSign. El orquestador es la
unica autoridad que determina el orden de los jobs, los reintentos y el cierre
terminal. Las Edge Functions ejecutan tareas; no deciden el flujo.

## Alcance
- Aplica a todos los CTAs: Proteccion, NDA, Firma del owner, Firmas del workflow.
- Cubre TSA, Polygon, Bitcoin, generacion de witness y artefacto final.

## Principios Nucleares
1) **Autoridad unica**: El orquestador decide que corre y cuando finaliza un flujo.
2) **Entradas declarativas**: Los CTAs declaran intencion, no codifican logica.
3) **Ejecucion idempotente**: Los jobs se pueden reintentar con seguridad.
4) **Estado observable**: Cada job escribe estado y timestamps.
5) **Sin orquestacion en Edge**: Las Edge Functions solo ejecutan.

## Responsabilidades del Orquestador
- Crear jobs a partir de la intencion del CTA.
- Evaluar estado del documento y decidir pasos siguientes.
- Invocar Edge Functions en orden.
- Reintentar pasos fallidos con backoff.
- Marcar cierre terminal o fallo.

## Modelo de Ejecucion
- Corre como servicio Node (no Edge).
- Usa un JobRepository persistente.
- Emite eventos: job_queued, job_started, job_completed, job_failed, job_retrying.

## Estrategia Minima Viable (sin refactor grande)
1) **orchestrator-core** (agnostico)
   - Job, JobStatus, JobQueue (sin FFmpeg), JobRepository (interfaz), Processor (interfaz).
2) **ffmpeg-adapter**
   - FFmpegProcessor, CommandBuilder, parsing de progreso.
   - Depende de orchestrator-core, no al reves.
3) **ecosign-processor**
   - Solo coordina: llama Edge Functions en orden y reintenta.
   - No ejecuta binarios ni logica de negocio adicional.

## Entradas
Un CTA produce un DocumentJob con intencion explicita:

```ts
type DocumentJob = {
  document_entity_id: string;
  actions: {
    protect?: boolean;
    nda?: boolean;
    sign_owner?: boolean;
    sign_workflow?: boolean;
  };
  forensic: {
    tsa?: boolean;
    polygon?: boolean;
    bitcoin?: boolean;
  };
  metadata?: Record<string, unknown>;
};
```

## Pasos Canonicos
El orquestador deriva pasos segun el estado actual:

1) encrypt_source
2) create_witness
3) append_tsa
4) anchor_polygon
5) anchor_bitcoin
6) build_artifact
7) notify_artifact_ready

Notas:
- Los pasos se saltan si ya estan satisfechos por estado.
- Los pasos se reintentan ante fallos transitorios.

## Estados Terminales
Un documento es terminal cuando el orquestador marca explicitamente:
- `completed` (todos los pasos requeridos completos)
- `failed` (reintentos agotados o error fatal)

Estos estados son distintos de los intermedios de lifecycle_status.

## No Objetivos
- No reemplaza Edge Functions.
- No es una maquina de estados de UI.
- No se encarga del rendering de PDFs.

## Decisiones Pendientes
- Backend de storage de jobs (SQL/Redis).
- Politica de backoff y limites de reintentos por paso.
- Mapeo de estados terminales a document_entities.lifecycle_status.

## Referencias
- CONTRATO_AUTORIDAD_EJECUTOR.md
- LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR.md
- CONTRATO_MAPEO_EJECUTOR.md
