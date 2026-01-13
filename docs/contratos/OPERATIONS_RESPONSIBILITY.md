# OPERATIONS RESPONSIBILITY

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## 0. Proposito
Establecer la responsabilidad explicita de cada operacion para reducir
ambiguedad operativa y mejorar auditoria interna.

## 1. Regla principal
- MUST: Cada operacion tiene un responsible_agent_id.

## 2. Visibilidad
- MUST: El responsable se muestra en el detalle de la operacion.
- SHOULD: El responsable se muestra en vistas de supervisor (futuro).
- SHOULD: Mostrar un historial minimo de responsables en el detalle.

## 3. Cambios de responsable
- MAY: El responsable puede cambiarse mientras la operacion no este archivada.
- MUST: Todo cambio genera evento canonical (operation.responsible_changed).

## 4. No-responsabilidades
- No define permisos ni roles.
- No define logica de asignacion automatica.
