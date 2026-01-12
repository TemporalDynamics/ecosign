# Workflow States — EcoSign
Fecha: 2026-01-12T17:33:37.144Z

Descripción
-----------
Diagrama de estados canónico para un signature workflow. Uso: product/dev/QA para entender transiciones permitidas.

Mermaid (state diagram)
-----------------------
```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> READY: define firmantes y campos
  READY --> ACTIVE: activar / enviar (mail o link)
  ACTIVE --> COMPLETED: todas las firmas requeridas
  ACTIVE --> CANCELLED: owner cancela
  ACTIVE --> REJECTED: firmante rechaza
  COMPLETED --> ARCHIVED: opcional
  CANCELLED --> ARCHIVED: opcional
  REJECTED --> ARCHIVED: opcional

  note right of ACTIVE: En ACTIVE se generan eventos y evidencia.
  note left of READY: READY = listo para activar, editable.
```

Notas rápidas
-------------
- DRAFT: editable completamente.
- READY: definición final pero aún sin evidencia ni notificaciones.
- ACTIVE: flujos en curso; algunas modificaciones permitidas (firmantes no firmados), documento inmutable.
- COMPLETED/CANCELLED/REJECTED: sólo lectura y exportables.

Nota adicional
---------------
- Un workflow en CANCELLED o REJECTED no puede reactivarse. Para continuar, crear un nuevo workflow para el mismo document_entity.
