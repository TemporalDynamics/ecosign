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
