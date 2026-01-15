# P2 — UX de Firma (Contract)

Fecha: 2026-01-15T02:26:34.080Z

Resumen canónico

P2 hace visible y obvia la firma en tres entregables concretos:

P2.1 — FieldGroup / Batch
Nombrar el conjunto lógico de campos (batch), asignarlo a un solo firmante y congelarlo al activar el workflow.

P2.2 — Firma "una vez / todas las veces"
Una signature_instance por firmante, aplicada como múltiples signature_application_event a todos los campos del batch.
No se regenera PDF. No cambia el hash.

P2.3 — Visibilidad progresiva
El Viewer siempre renderiza current_witness:
A ve su firma aplicada, B ve firmas previas.
No existen versiones paralelas.

Reglas canónicas (no negociables)

- Todo campo pertenece a un batch
- Solo se asigna el batch a un signer (no campos sueltos)
- Activar workflow → estructura y asignaciones congeladas
- Post-activate: cualquier mutación es rechazada y logueada
- La firma es un evento lógico (signature_instance + signature_application_event)
- La UI solo refleja la verdad del witness, no inventa estados

Checklist DoD (backend + frontend)

Backend
- fields.batch_id
- batch.assigned_signer_id
- batch_label (opcional)
- Entidades: signature_instance, signature_application_event
- Endpoints que: rechacen mutaciones en active/signed y registren evento de rechazo

Frontend
- UI de creación/duplicado preserva batch_id
- Pantalla de “Asignar bloques” en el flujo: listar bloques detectados, dropdown para asignar firmantes, resaltado visual del batch seleccionado
- Al activar workflow: edición bloqueada
- Viewer: consume siempre current_witness y muestra firmas ya aplicadas

Tests / QA
- Unit: asignación batch → signer + congelado
- Integration: una firma crea signature_application_event por campo del batch (sin nuevo PDF/hash)
- E2E: visibilidad progresiva entre firmantes

Plan de ejecución
- Rama: p2-ux-firma
- Commit 1: P2.1 — Batch / asignación / congelado
- Commit 2: P2.2 — Firma una vez / todas
- Commit 3: P2.3 — Viewer / visibilidad
- Merge único a main al completar los 3 commits

Terminología UX
- A nivel UX usaremos "Grupo de campos"; internamente: batch.
- Todo campo pertenece a un batch y solo se asigna el grupo a un firmante.

---

Archivo generado automáticamente como contrato de implementación P2.
