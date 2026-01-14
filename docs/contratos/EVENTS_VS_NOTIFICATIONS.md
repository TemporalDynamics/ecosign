# EVENTS VS NOTIFICATIONS

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## 0. Proposito
Separar eventos canonicos de notificaciones y emails para evitar acoplamientos.

## 1. Regla principal
- MUST: Todo email deriva de un evento.
- MUST: No todo evento genera email.

## 2. Implicancias
- SHOULD: UI puede escuchar eventos y decidir mostrar notificaciones.
- SHOULD: Los emails se encolan a partir de eventos (pipeline observable).

## 3. No-responsabilidades
- No define contenido ni templates.
