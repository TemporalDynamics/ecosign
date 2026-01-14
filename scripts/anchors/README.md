# Scripts de Anchoring Catalog

Generado: 2026-01-12T19:53:00.000Z

Propósito: Catalogar y explicar los scripts relacionados con el proceso de anclaje (anchoring) en la blockchain.

Guía: Estos scripts son cruciales para el funcionamiento del anclaje. Deben ejecutarse con precaución y según las indicaciones específicas para cada uno.

---

## cleanup-legacy-bitcoin-pending.sql

Detecta:
- Entradas de anclaje de Bitcoin pendientes de versiones anteriores del sistema que pudieron haber quedado atascadas.

Propósito:
- Limpia registros de anclaje de Bitcoin antiguos o fallidos que no se procesaron correctamente.

Cuándo correr:
- Después de una migración de versión, o cuando se detectan problemas con anchors de Bitcoin que no se resuelven automáticamente.

Qué significa si falla:
- La consulta SQL puede fallar si la tabla o los datos no existen en el formato esperado, o por problemas de permisos de DB.

Acción manual:
- Verificar los logs de la DB, ajustar la consulta si es necesario o revisar los permisos.

---

## cleanup-legacy-polygon-pending.sql

Detecta:
- Entradas de anclaje de Polygon pendientes de versiones anteriores del sistema que pudieron haber quedado atascadas.

Propósito:
- Limpia registros de anclaje de Polygon antiguos o fallidos que no se procesaron correctamente.

Cuándo correr:
- Similar a `cleanup-legacy-bitcoin-pending.sql`, pero para la red Polygon.

Qué significa si falla:
- La consulta SQL puede fallar si la tabla o los datos no existen en el formato esperado, o por problemas de permisos de DB.

Acción manual:
- Verificar los logs de la DB, ajustar la consulta si es necesario o revisar los permisos.

---

## processAnchors.py

Detecta:
- Eventos de anclaje listos para ser procesados y enviados a la blockchain (Bitcoin o Polygon).

Propósito:
- Orquesta el proceso de lectura de eventos de anclaje de la base de datos y su posterior envío a la blockchain.

Cuándo correr:
- Típicamente ejecutado como un cron job o worker de fondo. Puede ser ejecutado manualmente para forzar un ciclo de procesamiento.

Qué significa si falla:
- Los eventos de anclaje no se procesarán, lo que resultará en un retraso en la inmutabilidad de los documentos. Puede indicar problemas con la conexión a la DB, credenciales de blockchain o errores en la lógica de procesamiento.

Acción manual:
- Revisar logs del script, verificar el estado de la DB y la conectividad a la red blockchain.

---

## processAnchorsWithNotifications.py

Detecta:
- Similar a `processAnchors.py`, pero con la adición de lógica de notificación.

Propósito:
- Procesa eventos de anclaje y, además, maneja las notificaciones asociadas a estos eventos (ej. notificar a los usuarios cuando un documento ha sido anclado).

Cuándo correr:
- Ejecutado como un worker o cron job. Manualmente para un procesamiento con notificaciones.

Qué significa si falla:
- Fallo en el anclaje y/o en el envío de notificaciones. Similar a `processAnchors.py` con el añadido de posibles errores en el sistema de notificación.

Acción manual:
- Revisar logs del script, verificar estado de DB, blockchain y el sistema de notificaciones.

---

## show-polygon-wallet.js

Detecta:
- El balance y estado de la wallet de Polygon utilizada para las transacciones de anclaje.

Propósito:
- Proporciona visibilidad sobre los fondos disponibles en la wallet de Polygon y su historial de transacciones, vital para la operatividad de los anclajes.

Cuándo correr:
- Para verificar el estado de la wallet de Polygon, especialmente antes o después de operaciones de anclaje o al diagnosticar fallos.

Qué significa si falla:
- No se puede acceder a la wallet o a la red Polygon. Podría indicar problemas de configuración, credenciales o conectividad.

Acción manual:
- Verificar la configuración de la wallet, las credenciales, la conectividad a la red Polygon y el estado del nodo.
