# Scripts de Cron Catalog

Generado: 2026-01-12T20:10:00.000Z

Propósito: Catalogar y explicar los scripts relacionados con la gestión de los cron jobs (tareas programadas) del sistema.

Guía: Estos scripts son para configurar, reparar y mantener los cron jobs. Muchos de estos son "fixes" que, idealmente, deberían volverse obsoletos a medida que el sistema subyacente se vuelve más robusto.

---

## cleanup-cron-jobs.sql

Propósito:
- Elimina o limpia registros de cron jobs antiguos, duplicados o que ya no son necesarios en la base de datos (ej. `pg_cron`).

Cuándo correr:
- Durante mantenimientos programados o cuando se sospecha que hay una acumulación de tareas programadas obsoletas que pueden afectar el rendimiento.

Acción manual:
- Ejecutar la consulta SQL contra la base de datos. Se recomienda hacer un backup o ejecutar en un entorno de pruebas primero.

---

## fix-all-blockchain-crons.sql

Propósito:
- Intenta reparar el estado de todos los cron jobs relacionados con la blockchain (Bitcoin y Polygon) si se encuentran en un estado inconsistente.

Cuándo correr:
- Cuando los procesos de anclaje de ambas blockchains fallan simultáneamente y se sospecha de un problema generalizado con los crons.

Acción manual:
- Ejecutar la consulta SQL. Este es un script de alto impacto, por lo que se debe usar con precaución y después de diagnosticar el problema.

---

## fix-crons-ready.sql

Propósito:
- Probablemente ajusta o "desatasca" cron jobs que están en un estado "listo" (ready) pero no se ejecutan.

Cuándo correr:
- Cuando el diagnóstico (`check-cron-status.js`) muestra tareas listas que no se procesan.

Acción manual:
- Ejecutar la consulta para forzar la actualización de estado o re-encolar los jobs.

---

## fix-polygon-cron-auth.sh

Propósito:
- Repara un problema específico de autenticación con el cron de Polygon. Sugiere un problema donde las credenciales o tokens de autenticación del cron expiran o se corrompen.

Cuándo correr:
- Cuando fallan específicamente los cron jobs de Polygon y los logs indican un error de autenticación (Auth).

Acción manual:
- Ejecutar el script de shell, que probablemente recarga variables de entorno, renueva un token o actualiza las credenciales en la configuración del cron.

---

## setup-all-crons.sql

Propósito:
- Configura e instala *todos* los cron jobs necesarios para el funcionamiento del sistema desde cero.

Cuándo correr:
- Durante la configuración inicial de un nuevo entorno (desarrollo, staging, producción) o después de una limpieza completa para restaurar la configuración.

Acción manual:
- Ejecutar la consulta SQL en una base de datos nueva o limpia para registrar todas las tareas programadas.

---

## setup-email-cron.sql

Propósito:
- Configura específicamente el cron job responsable de procesar la cola de envío de correos electrónicos.

Cuándo correr:
- Durante la configuración de un nuevo entorno o si el cron de email se ha eliminado accidentalmente y necesita ser restaurado.

Acción manual:
- Ejecutar la consulta SQL para registrar únicamente el cron de emails.
