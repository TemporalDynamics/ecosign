# Happy Path 07: Orquestacion (ejecucion de jobs)

**Clasificacion:** CORE
**Actor:** Sistema (orchestrator + executor)
**Trigger:** Accion de CTA (Protect, NDA, Sign, Workflow) crea intent declarativo
**Fuentes:** CONTRATO_ORQUESTACION_FLUJOS.md, LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR.md

---

## Paso a paso

1. Frontend declara intent via CTA:
   ```json
   {
     "document_entity_id": "...",
     "actions": { "protect": true, "sign_workflow": true },
     "forensic": { "tsa": true, "polygon": true }
   }
   ```
2. Orchestrator crea `DocumentJob` a partir del intent
3. Orchestrator deriva pasos requeridos segun estado actual:
   - `encrypt_source` (si no esta cifrado)
   - `create_witness` (si necesita PDF)
   - `append_tsa` (si requiere forense)
   - `anchor_polygon` (si pide blockchain)
   - `anchor_bitcoin` (si el tier lo incluye)
   - `build_artifact` (generacion ECO/ECOX)
   - `notify_artifact_ready`
4. Orchestrator invoca Edge Functions en orden
5. Cada paso del job:
   - Se ejecuta de forma idempotente
   - Actualiza status del job en repository
   - En fallo: retry con backoff
   - En exito: avanza al siguiente paso
6. Estados terminales:
   - `completed`: todos los pasos requeridos ejecutados
   - `failed`: retries agotados, se logea error

## Estado final

Todas las transformaciones del documento completas, listo para entrega.

## Reglas

- Cada paso DEBE ser idempotente (ejecutar 2 veces = mismo resultado)
- TSA no debe duplicar timestamps (deduplicacion por hash)
- El orchestrator es el unico que avanza el estado del job
- Los jobs fallidos quedan en `failed` para investigacion manual
- pg_cron dispara runtime-tick cada 5 min que invoca executor + orchestrator
