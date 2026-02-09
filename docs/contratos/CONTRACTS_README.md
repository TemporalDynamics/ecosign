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
- ECO_POLICY_CANON.md — Contrato canónico de evidencia (ECO/ECOX), proofs, naming, entrega y compatibilidad CAI.
- ECO_SCHEMA_V2.md — Especificación canónica del formato ECO.v2 y distinción entre instancias por firmante.
- diagrams/ — Diagramas de estados y secuencia (Mermaid) que ilustran los contratos.
- NOTAS.md — Ajustes menores y recomendaciones de implementación (no bloqueantes).

Procesos operativos
-------------------
- Para cambios críticos (p. ej. cambiar regla de evidencia o inmutabilidad de documentos) crear un RFC y adjuntar tests de aceptación.
- Para cambios menores (microcopy, UI) referenciar la sección del contrato afectada y documentar en PR el compliance con el contrato.

Contacto
--------
Mantener un responsable por cada contrato para coordinar producto/seguridad/legal: /OWNERS

Source of Truth
---------------
This document and the diagrams it references are the canonical source of truth for workflow, signer, field, delivery and forensic behavior in EcoSign.
Any implementation that diverges from these rules must introduce a new contract version and document the exception.

Irreversibility and Evidence
----------------------------
Once a workflow enters ACTIVE state and evidence is generated, no state transition may invalidate or overwrite existing evidence. Any correction requires creating a new workflow for the same document_entity; historical evidence remains immutable.

Enterprise / HR note
--------------------
These contracts are designed to support HR, payroll and enterprise integrations where signers may not have email addresses and delivery may be link-based. The protocol and data model accommodate signers without email and permit different delivery modes while preserving evidence and auditability.
