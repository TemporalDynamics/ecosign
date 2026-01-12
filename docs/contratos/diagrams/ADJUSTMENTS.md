# Diagrams — Ajustes mínimos recomendados

Fecha: 2026-01-12T17:45:00Z

Resumen
------
Pequeñas notas para elevar los diagramas a "protocolo de verdad". No requieren cambios de arquitectura, solo añadir estas aclaraciones en las respectivas páginas de los diagramas.

1) WORKFLOW_STATES
- Nota a agregar: "Un workflow en CANCELLED o REJECTED no puede reactivarse. Para continuar, crear un nuevo workflow para el mismo document_entity." 
- Rationale: evita ambigüedad sobre reactivación en futuras decisiones producto.

2) SIGNER_STATES
- Nota a agregar: "EXPIRED is a transient state; the signer may return to INVITED upon token reissue." 
- Rationale: evita interpretación de 'expired' como estado terminal.

3) DELIVERY_MODE
- Nota a agregar: "Delivery mode may be changed while workflow is ACTIVE, provided the signer has not signed." 
- Rationale: permite corrección de delivery (email→link) sin romper invariantes si el signer no firmó.

4) FIELDS_LIFECYCLE
- Nota a agregar: "Field instances are immutable once the workflow enters ACTIVE state." 
- Rationale: garantiza materialización determinista y solidez forense.

5) SIGNATURE_FORENSIC
- Nota a agregar: "process-signature must be idempotent per signer and workflow to prevent duplicate evidence on retries." 
- Rationale: protege contra retries y duplicados en producción.

Siguiente paso: si querés, aplico estas notas inline a cada archivo de diagrama (edición ligera). Por ahora están documentadas en este archivo para referencia rápida.
