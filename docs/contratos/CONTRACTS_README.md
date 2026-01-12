# Contracts — EcoSign

Resumen
------
Esta carpeta contiene los contratos canónicos que gobiernan el comportamiento del sistema de firmas (workflow, signers, delivery modes, fields, y evidencia forense).

Regla de uso
-----------
- Estos documentos son la "fuente de verdad" (protocolos) para producto, desarrollo, QA y legal.
- Ninguna nueva funcionalidad o cambio de comportamiento puede violar estos contratos sin crear una versión nueva del contrato y documentar la excepción.

Estructura
----------
- HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md — Contrato maestro (v1) con reglas, acceptance criteria y tests recomendados.
- diagrams/ — Diagramas de estados y secuencia (Mermaid) que ilustran los contratos.
- NOTAS.md — Ajustes menores y recomendaciones de implementación (no bloqueantes).

Procesos operativos
-------------------
- Para cambios críticos (p. ej. cambiar regla de evidencia o inmutabilidad de documentos) crear un RFC y adjuntar tests de aceptación.
- Para cambios menores (microcopy, UI) referenciar la sección del contrato afectada y documentar en PR el compliance con el contrato.

Contacto
--------
Mantener un responsable por cada contrato para coordinar producto/seguridad/legal: /OWNERS
