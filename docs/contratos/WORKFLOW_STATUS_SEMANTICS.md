# WORKFLOW STATUS SEMANTICS

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## 0. Proposito
Definir la semantica visible de estados y sub-estados para reducir incertidumbre
en agentes, brokers y usuarios finales.

## 1. Estado principal (canonico)
El workflow mantiene estados tecnicos:
- DRAFT
- READY
- ACTIVE
- COMPLETED
- CANCELLED
- REJECTED
- ARCHIVED

## 2. Estado semantico (UI)
MUST: La UI debe mostrar un estado semantico legible para humanos.

Ejemplos:
- "Esperando firma de Juan Perez"
- "Esperando verificacion OTP"
- "Esperando acceso del firmante"
- "Bloqueado — requiere accion del agente"

## 3. Reglas MUST
- MUST: El estado semantico deriva de eventos reales (no inventados).
- MUST: El estado semantico nunca contradice el estado tecnico.
- MUST: Si falta informacion, la UI muestra "Esperando accion".

## 4. Reglas SHOULD
- SHOULD: Mostrar el nombre del firmante cuando aplique.
- SHOULD: Incluir la accion pendiente (firmar, verificar, abrir link).

## 5. No-responsabilidades
- No define eventos tecnicos ni transiciones.
- No crea evidencia; solo traduce estado existente.

## 6. Regla de terminalidad (MUST)

Estados terminales no reabribles:
- `completed`
- `rejected`
- `cancelled`

Reglas:
- MUST NOT: existir transicion valida desde estado terminal hacia `active`, `ready` o `draft`.
- MUST NOT: mutar el mismo `workflow_id` para reiniciar el proceso.
- MUST: conservar historial de eventos inmutable para el `workflow_id` cerrado.

## 7. Reintento canonico (MUST)

Si se desea retomar un documento tras `rejected`, `cancelled` o cierre previo del ciclo,
la unica via valida es crear un nuevo workflow:

- `start-signature-workflow` -> `new workflow_id`

Consecuencias:
- Se preserva la integridad historica del intento previo.
- No hay borrado logico ni mezcla de intentos.
- Cada `workflow_id` representa un grafo cerrado de eventos.

## 8. Invariante resumido

- `terminal(workflow.status) => no_transition(workflow_id)`
- `retry => new workflow_id`
