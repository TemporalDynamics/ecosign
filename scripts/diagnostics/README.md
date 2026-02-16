# Diagnostics scripts catalog

Generated: 2026-01-12T18:51:47.853Z

Purpose: catalog and explain the diagnostics scripts present in scripts/diagnostics/.

Guidance: these scripts should not be removed. Use them to detect operational problems, run them manually for triage, or wire them into monitoring if/when appropriate.

---

## check-canonical-readiness.sh

Detecta:
- Si el sistema ya cumple los gates minimos para operar con autoridad canonica (events + decision engine + executor).

Cuándo correr:
- Antes de avanzar de fase en la migración de convergencia.
- Antes de declarar `go/no-go` para apagar rutas legacy.

Qué significa si falla:
- Sigue habiendo branching por flags, requeue autónomo, triggers que encolan o rutas paralelas de progresión.

Acción manual:
- Corregir cada check fallido y volver a ejecutar hasta `READY`.

## check-decision-path-clean.sh

Detecta:
- Lecturas a tablas legacy/proyección (`anchors`, `user_documents`, `workflow_events`) dentro del path de decisión.

Cuándo correr:
- Antes de switch canónico.
- Después de cambios en decision engine/pipeline.

Qué significa si falla:
- Hay fuga de autoridad fuera de `events[]`.

Acción manual:
- Eliminar lecturas legacy del decision path y volver a validar.

## generate-progression-inventory.sh

Detecta:
- Inventario de motores de progresión reales: triggers, encolado SQL, flags runtime, requeue/retry, paths legacy y decisiones fuera del engine.

Cuándo correr:
- Al iniciar una fase de convergencia o durante incidentes de desalineación.

Qué significa si falla:
- El script no falla por hallazgos; genera snapshot para análisis. Si falla ejecución, revisar permisos/herramientas (`rg`).

Acción manual:
- Revisar el reporte en `docs/reports/canonical-convergence/` y abrir acciones correctivas por cada motor no canónico.

## ../verify-cron-inventory.sh

Detecta:
- Inventario real de cron jobs en runtime usando función SQL `public.get_cron_status(...)`.
- Divergencia entre expectativas canónicas y estado actual de scheduler.

Cuándo correr:
- Antes de pruebas canonical-only.
- Como evidencia de readiness en Fase 6/7.

Qué significa si falla:
- Hay cron crítico faltante/inactivo o cron legacy aún activo.

Acción manual:
- Aplicar/ajustar migraciones de cron y volver a ejecutar.

## ../test-canonical-only-mode.sh

Detecta:
- Si el pipeline canónico mantiene progresión con trigger legacy deshabilitado temporalmente.

Cuándo correr:
- En staging aislado antes de authority switch.

Qué significa si falla:
- Persisten dependencias de autoridad legacy o gaps de ejecución canónica.

Acción manual:
- Corregir ruta de progresión y repetir prueba.

## ../verify-runtime-crons.sh

Detecta:
- Estado real de cron jobs en runtime vía `public.get_cron_runtime_status()`.
- Desalineación entre inventario esperado y scheduler efectivo.

Cuándo correr:
- Antes de ejecutar pruebas canonical-only.
- Como evidencia de readiness para Fase 6/7.

Qué significa si falla:
- Cron canónico inactivo o cron legacy aún activo.

Acción manual:
- Ajustar cron jobs en migraciones/entorno y repetir verificación.

## ../test-canonical-only-proof.sh

Detecta:
- Prueba canónica aislada con evidencia JSON persistida en `tests/canonical-only/evidence/`.
- Ejecuta verificación de crons runtime antes de la prueba.

Cuándo correr:
- Como evidencia de Fase 6 (canonical-only proof) en staging.

Qué significa si falla:
- El entorno no cumple prerrequisitos de cron/runtime o la prueba canónica no completó.

Acción manual:
- Corregir prerrequisitos, reintentar y revisar el JSON de evidencia generado.

## ../production-canonical-switch.sh

Detecta:
- Gate go/no-go previo al switch de autoridad canónica en producción.

Cuándo correr:
- Justo antes de declarar switch readiness.

Qué significa si falla:
- Algún invariante crítico de canonical authority no está cumplido.

Acción manual:
- Corregir el check fallido y repetir el gate completo.

Nota:
- En modo `SWITCH_ENV=production`, el gate exige prueba canónica real (`REQUIRE_REAL_PROOF=1`) y falla si la evidencia salió `skipped`.

---

## check-cron-jobs.sql

Detecta:
- Crons faltantes/pendientes o entradas de cron mal configuradas en la base.

Cuándo correr:
- Manualmente durante incidentes cron, o como parte de diagnósticos periódicos.

Qué significa si falla:
- Indica que los jobs programados no se están ejecutando; posible causa: cron desincronizado o permisos cambiados.

Acción manual:
- Revisar logs del scheduler y reiniciar/reenlistar los crons.
- Verificar credenciales y permisos del worker.

## check-cron-status.js

Detecta:
- Estado de los cron jobs desde la perspectiva del servicio/worker (si responde).

Cuándo correr:
- Para comprobar que el servicio que ejecuta crons está vivo.

Qué significa si falla:
- El worker está caído o no responde al endpoint de healthcheck.

Acción manual:
- Revisar logs del worker y reiniciar el servicio.

## check-pending-anchors.js

Detecta:
- Anchors pendientes o eventos de anclaje que no progresan.

Cuándo correr:
- Regularmente durante runs de diagnóstico o tras alertas de anchoring.

Qué significa si falla:
- Hay anchoring jobs atascados; puede implicar problemas de conectividad con la blockchain o con el worker.

Acción manual:
- Revisar colas de trabajo, logs del worker y la conexión a los servicios externos (Polygon/Bitcoin).

## check-pending-emails.sql

Detecta:
- Correos pendientes en la cola que no fueron enviados.

Cuándo correr:
- Durante incidentes de envío de emails o en diagnósticos de notificaciones.

Qué significa si falla:
- El sistema de envío está fallando o la integración con el proveedor está caída.

Acción manual:
- Revisar logs de la función de envío, retener/reintentar envíos manualmente.

## check-policies.sql

Detecta:
- Inconsistencias o ausencias en políticas (RLs, roles) en la base de datos.

Cuándo correr:
- Al auditar seguridad de RLS o después de migraciones.

Qué significa si falla:
- Políticas críticas pueden estar faltantes o mal aplicadas; riesgo de exposición o denegación de acceso.

Acción manual:
- Aplicar las políticas desde los backups/migrations y revisar auditoría de cambios.

## check-polygon-anchors.js

Detecta:
- Estado específico de anclajes Polygon / configuración de anchoring / wallet.

Cuándo correr:
- Tras fallos de anchoring o para chequeos periódicos de integridad.

Qué significa si falla:
- Problema con la integración Polygon (config/credenciales/wallet) o con el servicio de envío.

Acción manual:
- Verificar configuraciones, claves y quotas de la wallet; revisar transacciones pendientes.

## check-polygon-config.js

Detecta:
- Estado específico de anclajes Polygon / configuración de anchoring / wallet.

Cuándo correr:
- Tras fallos de anchoring o para chequeos periódicos de integridad.

Qué significa si falla:
- Problema con la integración Polygon (config/credenciales/wallet) o con el servicio de envío.

Acción manual:
- Verificar configuraciones, claves y quotas de la wallet; revisar transacciones pendientes.

## check-polygon-wallet.mjs

Detecta:
- Estado específico de anclajes Polygon / configuración de anchoring / wallet.

Cuándo correr:
- Tras fallos de anchoring o para chequeos periódicos de integridad.

Qué significa si falla:
- Problema con la integración Polygon (config/credenciales/wallet) o con el servicio de envío.

Acción manual:
- Verificar configuraciones, claves y quotas de la wallet; revisar transacciones pendientes.

## diagnose-bitcoin-anchoring.sql

Detecta:
- Anclajes Bitcoin pendientes o inconsistencias en tablas relacionadas.

Cuándo correr:
- Cuando se detectan problemas con la canalización de anchoring en Bitcoin.

Qué significa si falla:
- Eventos de anchoring no se están registrando o procesando; posible fallo en worker o external service.

Acción manual:
- Revisar colas, logs y reintentar procesamiento de eventos.

## diagnose-email-flow.sh

Detecta:
- Problemas en el flujo de envío de emails (plantillas, colas, integraciones).

Cuándo correr:
- Tras reportes de emails no enviados o errores en notificaciones.

Qué significa si falla:
- El subsistema de emails falla; usuarios no reciben notificaciones críticas.

Acción manual:
- Ver logs del servicio de email, comprobar plantillas y reintentar envíos.

## diagnose-polygon-anchoring.sql

Detecta:
- Anchors pendientes > umbral (p. ej. X minutos) y discrepancias en estados de la tabla de anchoring.

Causa histórica:
- Worker caído
- Cron desincronizado
- Problemas de conexión con el proveedor de nodos

Cuándo correr:
- Periodicamente durante operaciones o al investigar anchoring lento/pendiente.

Qué significa si falla:
- Que hay anchoring jobs atascados que requieren intervención.

Acción manual:
- Revisar logs del worker, reiniciar worker/crons y reintentar los eventos pendientes.

## rls_postgrest_test_fixed.js

Detecta:
- Problemas con RLS y acceso a través de PostgREST/Supabase.

Cuándo correr:
- Al validar políticas RLS después de cambios en la BD o en despliegues.

Qué significa si falla:
- Reglas RLS podrían estar mal aplicadas, comprometiendo seguridad o funcionalidad.

Acción manual:
- Revisar las políticas, revisar migrations recientes y restaurar/ajustar políticas según sea necesario.

## rls_postgrest_test.js

Detecta:
- Problemas con RLS y acceso a través de PostgREST/Supabase.

Cuándo correr:
- Al validar políticas RLS después de cambios en la BD o en despliegues.

Qué significa si falla:
- Reglas RLS podrían estar mal aplicadas, comprometiendo seguridad o funcionalidad.

Acción manual:
- Revisar las políticas, revisar migrations recientes y restaurar/ajustar políticas según sea necesario.

## rls_test_working.js

Detecta:
- Problemas con RLS y acceso a través de PostgREST/Supabase.

Cuándo correr:
- Al validar políticas RLS después de cambios en la BD o en despliegues.

Qué significa si falla:
- Reglas RLS podrían estar mal aplicadas, comprometiendo seguridad o funcionalidad.

Acción manual:
- Revisar las políticas, revisar migrations recientes y restaurar/ajustar políticas según sea necesario.

## test-anchor-event-insert.js

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## test-bitcoin-anchoring.sh

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## test-email.sh

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## test-flow.sh

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## test-functions.sh

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## test-send-emails-manual.sh

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## test-send-pending.sh

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## test-workflow-notifications.sql

Detecta:
- Caso de prueba específico; se usa para validar flujos (emails, anchoring, funciones).

Cuándo correr:
- Durante troubleshooting o antes de despliegues cuando se desea verificar el comportamiento.

Qué significa si falla:
- El flujo al que corresponde el test está roto y requiere investigación.

Acción manual:
- Ejecutar el test en local, revisar logs y arreglar la parte que falla.

## verify-cron-jobs.sql

Detecta:
- Verificación de existencia y estado de crons programados.

Cuándo correr:
- Después de cambios en programación/infraestructura o tras incidentes.

Qué significa si falla:
- Los crons esperados no están presentes o sus entries están corruptas.

Acción manual:
- Reaplicar definiciones de cron y reiniciar scheduler.

## verify-eco.mjs

Detecta:
- Pruebas de integración/eco sanity checks.

Cuándo correr:
- Para validar integraciones clave de la plataforma.

Qué significa si falla:
- Alguna dependencia o integración esencial no está funcionando como se espera.

Acción manual:
- Revisar logs de integración, endpoints y revisar credenciales.
