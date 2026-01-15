# Inventario de Señales del Sistema (System Signals Inventory)

Fecha: 2026-01-14T22:42:55.987Z

Resumen: listado exhaustivo (no modal) de señales visuales y notificaciones encontradas en el repo para auditar P1.2 (color/íconos) y P1.5 (notificaciones). Cada entrada incluye: ID/Nombre, Tipo, Contexto, Trigger, Momento, Copy exacto (ejemplos), Color actual (cuando aplica), Icono (si aplica), Duración (si aplica), Severidad lógica.

---

## 1) Badge: ProtectedBadge / ProtectionLayerBadge
- ID / Nombre: protected_badge / ProtectionLayerBadge
- Tipo: estado visual / badge
- Contexto: Documents list, DocumentRow, Document preview, Legal Center
- Trigger: derived protection level (protection_level !== 'NONE', ACTIVE, REINFORCED, TOTAL)
- Momento: inmediato (render) / async (upgrade via workers)
- Copy exacto mostrado: (varía) — e.g. "Protegido", "Protección activada", "Certificado Reforzado"
- Color actual: gris (inactive) / verde (reinf.) / azul (total) asigned in ProtectionLayerBadge
- Icono: shield / lock optional
- Duración: N/A
- Severidad lógica: info → success when reinforced

## 2) Badge: WorkflowStatusBadge / WorkflowStatus
- ID / Nombre: workflow_status_badge
- Tipo: estado visual / badge
- Contexto: Workflow list, WorkflowDetail, OperationRow
- Trigger: workflow.status (draft / active / completed / cancelled / archived)
- Momento: inmediato (render) or after update
- Copy exacto: status label (ej. "completed", "cancelled")
- Color actual: status-dependent (terminal → gris)
- Icono: optionally small check for completed
- Duración: N/A
- Severidad lógica: info / terminal

## 3) Badge: "Firmado" (signature badge)
- ID / Nombre: signed_badge
- Tipo: estado visual / badge
- Contexto: Document header / preview
- Trigger: signature applied / workflow signature recorded
- Momento: inmediato post-signature (or via subscription)
- Copy: "Firmado"
- Color: success (green) per decision log
- Icono: checkmark (lineal) optional
- Severidad lógica: success (terminal for document signature)

## 4) Toasts (react-hot-toast) - LegalCenter / Upload / Sign flows (many instances)
- ID / Nombre: toast:document_ready
  - Tipo: notificación (toast)
  - Contexto: LegalCenterModalV2 (document upload / certification flows)
  - Trigger: documento subido / protección activada / firma aplicada / errores
  - Momento: inmediato
  - Copy examples:
    - "Documento listo.\nEcoSign no ve tu documento.\nLa certificación está activada por defecto."
    - "🛡️ Protección activada — Este documento quedará respaldado por EcoSign."
    - "Firma aplicada correctamente."
    - "No se pudo guardar el PDF. Intentá nuevamente."
  - Color / Position: success → top-right; errors → bottom-right (project convention)
  - Icono: small emojis used in some copies (e.g. 🛡️, ✓), but library supports custom icons
  - Duración: variable (some have duration: 2000ms; others default)
  - Severidad lógica: info / success / error

- ID / Nombre: toast:guest_mode_messages (DocumentsPage)
  - Tipo: notificación (toast)
  - Contexto: DocumentsPage actions (invitado)
  - Copy examples: "Modo invitado: operaciones disponibles solo con cuenta.", "No hay borradores para continuar."
  - Position: top-right

- ID / Nombre: toast:action_feedback
  - Tipo: notificación (toast)
  - Contexto: CreateOperationModal, MoveToOperationModal, ShareDocumentModal, etc.
  - Examples: "Operación creada", "Borrador guardado.", "Enlace copiado al portapapeles"
  - Position: top-right or bottom-right depending on severity

## 5) Toasts: Protection level upgrade toasts (realtime)
- ID / Nombre: toast:protection_reinforced / toast:protection_total
- Tipo: notificación (toast)
- Contexto: LegalCenterModalV2 realtime subscription -> badge upgrades
- Trigger: backend worker confirms Polygon / Bitcoin anchor
- Copy exacto: "🛡️ ${levelNames[newProtectionLevel] || newProtectionLevel} confirmada"
- Momento: async (worker confirmation, ~30s for polygon, hours for bitcoin)
- Color / Position: success / top-right
- Severidad lógica: success

## 6) Inline messages / error messages (forms, upload)
- ID / Nombre: inline:upload_error
- Tipo: mensaje inline (texto en componente)
- Contexto: LegalCenterModalV2, Upload handlers
- Trigger: validation failure, upload error
- Copy examples: "Solo se puede aplicar firma a archivos PDF. Por favor, seleccioná un archivo PDF.", "No se pudo recuperar el PDF para guardarlo."
- Momento: inmediato
- Color: error (visual via CSS) but typically subtle
- Severidad lógica: warning / error

## 7) Banners (offline / informational)
- ID / Nombre: banner:offline
- Tipo: banner informativo
- Contexto: global app (showOfflineBanner referenced)
- Trigger: network/offline detection
- Momento: immediate
- Copy: dependiente (e.g. "Estás sin conexión")
- Color: warning / neutral
- Severidad lógica: warning

## 8) Email notifications / workflow_notifications (backend -> email)
- ID / Nombre: workflow_notifications entries (table)
- Tipo: notificación (email / system notification queue)
- Contexto: anchors workers, signature processing, resend, welcome emails
- Trigger: events in backend (polygon_confirmed, bitcoin_confirmed, your_turn_to_sign, workflow_completed, owner_document_signed, signer_copy_ready, change_requested, change_accepted, change_rejected, creator_detailed_notification, welcome_founder, signer_invite, signature_request, signature_reminder, system, other)
- Momento: async (cron / worker / function)
- Copy: template-driven; examples in /emails and supabase functions
- Delivery status: pending → sent / failed; fields: retry_count, resend_email_id, notification_sent boolean
- Severidad lógica: informative / action (e.g., your_turn_to_sign requires action)
- Notes: DB enforces idempotency (unique workflow_id, signer_id, notification_type, step). Event `notification.skipped` exists for blocked attempts.

## 9) Notification skipped events / observability
- ID / Nombre: event:notification.skipped
- Tipo: event / audit signal
- Contexto: backend (supabase functions), used by P1.5 DoD
- Trigger: attempt to send notification blocked by cooldown / limits or missing API key
- Copy/log: structured event payload ('notification.skipped')
- Momento: immediate when blocked
- Severidad lógica: info / audit

## 10) CTA state rules / disabled CTAs in terminal states
- ID / Nombre: ui:terminal-state-cta-disable
- Tipo: state / UI rule (no visible signal but behavior)
- Contexto: Operations / Workflows / Documents
- Trigger: workflow/document is completed / archived / cancelled
- Behavior: hide or disable CTAs (No actions active after closure)
- Visual: UI should present gray terminal state + no active CTAs as per P1.3
- Severidad: policy / terminal

---

Notas y recomendaciones rápidas:
- Toastr library: react-hot-toast is the standard (client/package.json). Toast position conventions are documented: success/info → top-right; errors → bottom-right.
- workflow_notifications table is the single source of truth for outgoing emails; many supabase functions insert rows with specific notification_type values (see supabase/functions/* and deploy-ready/*).
- Badges are used widely: ProtectedBadge, ProtectionLayerBadge, WorkflowStatusBadge, "Firmado" badge. Badges encode canonical states; prefer auditing them first for P1.2.
- P1.5 will need UI to read cooldown/limits from backend and map blocked attempts to `notification.skipped` events (already present in types).

Siguiente paso sugerido (no solicitado): validar cada copy exacto y posición en una tabla CSV si se quiere una revisión de UX/hierarchy por stakeholders.

---

Archivo generado automáticamente a partir de un scan del repo. Si querés, generaré una tabla más detallada con links a los archivos exactos donde cada copy aparece (por ejemplo: LegalCenterModalV2.tsx, DocumentsPage.tsx, supabase/functions/*).