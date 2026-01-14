# WORKFLOW CLOSURE UX

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## 0. Proposito
Definir la señal de cierre para agentes y usuarios cuando un flujo termina.

## 1. Regla principal
- MUST: Al completar el ultimo firmante, el sistema muestra una confirmacion clara:
  "Todos los firmantes completaron".
- MUST: La operacion muestra estado "Lista" o "Completada" de forma visible.

## 2. UX recomendada
- SHOULD: Disparar una notificacion visible (toast o banner) en el cierre.
- SHOULD: Registrar evento workflow_completed (canonico).
- SHOULD: Ofrecer descarga directa del witness en el momento de cierre.

## 3. No-responsabilidades
- No define emails ni notificaciones externas.
