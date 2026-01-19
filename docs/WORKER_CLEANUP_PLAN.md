# WORKER CLEANUP PLAN — Fase 0.5 (Clasificación y acciones)

Fecha: 2026-01-18T13:56:00Z
Estado: BORRADOR — rama: doc/fase1-canonical-events

Principio no negociable: Si una función/worker no contribuye DIRECTAMENTE al Happy Path de Fase 1, se apaga.

Happy Path Fase 1 (la única que importa ahora):
Crear documento → Persistir document_entity → Proteger → TSA (ok/fail explícito) → Evento visible → UI estable

Tabla de clasificación (recomendada)

| Función / Worker | ¿Se usa en Fase 1? | ¿Qué rompe si se apaga? | Acción recomendada |
|---|---:|---|---|
| accept-invite-nda | ❌ | Flujos de invitación (no crítico para Fase1) | OFF — no desplegar |
| accept-nda | ❌ | Invitaciones | OFF |
| accept-share-nda | ❌ | Compartir (no Fase1) | OFF |
| accept-workflow-nda | ❌ | Flujo colaboración | OFF |
| anchor-bitcoin | ❌ | Anclaje Bitcoin (fase siguiente) | OFF |
| anchor-polygon | ✅* | Envío de tx a Polygon (si worker invoked by executor) | KEEP (si el executor lo llama directamente), else OFF |
| anchoring-health-check | ✅ (opt) | Monitoring anchors | KEEP (optional, low-frequency) |
| append-tsa-event | ✅ | Helper para TSA event append | KEEP |
| apply-signer-signature | ❌ | Firma del signer | OFF |
| build-final-artifact | ❌ | Cierre/packaging final | OFF |
| cancel-workflow | ❌ | Cancelaciones (no crítico) | OFF |
| confirm-signer-identity | ❌ | Verificación identidad | OFF |
| create-custody-upload-url | ❌ | Custodia uploads | OFF |
| create-invite | ❌ | Invitaciones | OFF |
| create-signer-link | ❌ | Links de firmante | OFF |
| deno.json | — | Config | KEEP |
| fase1-executor | ✅ | Orquestación CORE — debe quedarse | KEEP |
| generate-link | ❌ | Links | OFF |
| get-signed-url | ❌ | Descargas | OFF |
| health-check | ✅ (opt) | Basic health endpoint | KEEP (simple) |
| legal-timestamp | ✅ | TSA — debe quedarse | KEEP |
| load-draft | ❌ | Editor | OFF |
| log-ecox-event | ❌ | Logs/audit (aux) | OFF (or keep if low-noise) |
| log-event | ✅ | used for appendEvent wrapper — keep | KEEP |
| log-workflow-event | ❌ | workflow logs | OFF |
| notify-artifact-ready | ❌ | Notificaciones | OFF |
| notify-document-certified | ❌ | Emails | OFF |
| notify-document-signed | ❌ | Emails | OFF |
| process-bitcoin-anchors | ❌ | Poller for Bitcoin anchors | OFF |
| process-polygon-anchors | ❌ | Poller for Polygon anchors (polling causes UI noise) | OFF (disable polling; rely on executor -> anchor-polygon worker) |
| process-signature | ❌ | Signature processing | OFF |
| process-signer-signed | ❌ | Signature callbacks | OFF |
| record-protection-event | ✅ | Core: persists protection events | KEEP |
| record-signer-receipt | ❌ | Receipts | OFF |
| register-custody-upload | ❌ | Custody | OFF |
| reissue-signer-token | ❌ | Token lifecycle | OFF |
| reject-signature | ❌ | Signature cancellation | OFF |
| repair-missing-anchor-events | ❌ | Recovery utility | OFF (can keep offline) |
| request-document-changes | ❌ | Editor flow | OFF |
| respond-to-changes | ❌ | Editor | OFF |
| save-draft | ❌ | Editor | OFF |
| send-pending-emails | ❌ | Email cron | OFF |
| send-share-otp | ❌ | OTP | OFF |
| send-signer-otp | ❌ | OTP | OFF |
| send-signer-package | ❌ | Emails | OFF |
| send-welcome-email | ❌ | Emails | OFF |
| signer-access | ❌ | Access flows | OFF |
| signnow | ❌ | External integr. | OFF |
| signnow-webhook | ❌ | Webhook | OFF |
| stamp-pdf | ❌ | PDF stamping | OFF |
| start-signature-workflow | ❌ | Full signature flow | OFF |
| store-encrypted-custody | ❌ | Custody storage | OFF |
| store-signer-signature | ❌ | Store sig | OFF |
| test-email | ❌ | Debug | OFF |
| test-insert-notification | ❌ | Debug | OFF |
| verify-access | ❌ | Auth checks | OFF (keep if required for RLS debug) |
| verify-ecox | ❌ | Verifications | OFF |
| verify-invite-access | ❌ | Invite flows | OFF |
| verify-signer-otp | ❌ | OTP | OFF |
| verify-workflow-hash | ❌ | Integrity checks (optional) | OFF (but useful for tests) |
| workflow-fields | ❌ | Metadata | OFF |

Notas y justificaciones
- KEEP: mínimo recomendado para Fase1: `record-protection-event`, `legal-timestamp`, `fase1-executor`, `log-event` (append utilities), `anchor-polygon` (si el executor invoca esta función para enviar tx), y `health-check`/`anchoring-health-check` (opcional, low-noise).
- OFF: todo lo demás reduce ruido operativo y superficie de fallos; se puede mantener en repo pero no desplegar ni ejecutar.
- Pollers and realtime subscriptions: `process-polygon-anchors`, `process-bitcoin-anchors` y cualquier cron/poller deben ser deshabilitados inmediatamente si provocan UI refreshes.

Acciones técnicas propuestas (pasos concretos)
1) Implementar un env-flag (FASE) en el entorno de deploy. Default: undefined.
2) Para funciones marcadas OFF: añadir a su handler al inicio un guard clause temporal: `if (process.env.FASE !== '1') return new Response('disabled', { status: 204 })` — esto es rápido y reversible.
3) Para crons/pollers: remover del deploy o return early como arriba.
4) Para notificaciones/emails: deshabilitar envío (env flag) o early return en el worker.
5) Ejecutar deploy mínimo con solo KEEP functions y validar en staging.

Recomendación operativa inmediata
- Prioridad 1: disable `process-polygon-anchors`, `process-bitcoin-anchors`, any notify-* functions, and realtime/poller workers.
- Priority 2: disable all non-KEEP. Keep logs for debugging but stop execution.

Siguiente paso propuesto
- Confirmas lista (KEEP/OFF). Si OK, procedo a crear un patch mínimo que inserte guard clauses `if (process.env.FASE !== '1')` en las funciones OFF (surgical, one-line change per function). No haré commits sin tu confirmación final.
