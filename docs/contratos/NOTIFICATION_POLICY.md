# NOTIFICATION POLICY

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## 0. Proposito
Definir politica de notificaciones para evitar spam y mantener trazabilidad.

## 1. Regla principal
- MUST: El sistema puede enviar recordatorios automaticos con limites claros.
- MUST: El agente puede reenviar manualmente.
- MUST: No se puede spammer; debe existir cooldown minimo.

## 2. Reglas sugeridas
- SHOULD: Cooldown minimo de 24h entre recordatorios automaticos.
- SHOULD: Maximo 3 recordatorios automaticos por firmante.
- MAY: Override manual con confirmacion explicita.

## 3. No-responsabilidades
- No define templates ni canales de entrega.

## 4. Implementación Técnica
- **Idempotencia**: MUST: La idempotencia se fuerza a nivel de base de datos con una restricción `UNIQUE` en los campos `(workflow_id, signer_id, notification_type, step)`. Cualquier intento de insertar una notificación duplicada para el mismo "step" fallará silenciosamente (usando `ON CONFLICT DO NOTHING`), garantizando que la notificación se encole una sola vez.
- **Notificaciones de Sistema (signer_id IS NULL)**: Las notificaciones que no van a un firmante específico (ej. al dueño del workflow, al sistema) tienen `signer_id` como `NULL`. La restricción `UNIQUE` de Postgres trata los `NULL`s como valores distintos, lo que significa que estas notificaciones operan en un canal de idempotencia separado y no colisionan con las notificaciones de los firmantes.
