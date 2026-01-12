ECOSIGN — HAPPY PATH (USUARIOS REGISTRADOS)
Fecha: 2026-01-12T16:16:07.389Z

Objetivo
--------
Documento de referencia que describe un happy path completo para usuarios registrados (cuenta verificada). Sirve como checklist funcional y técnica para enviar a QA/dev antes de beta.

Estado global: LIVE / PENDING se indica en cada sección.

1. ONBOARDING (LIVE)
- Usuario crea cuenta: email + password + confirmación.
- Sistema envía email de verificación (supabase/templates/verify-email.html, supabase/functions/verify-access).
- Al verificar, redirigir al Home interno (sin pasos intermedios ni accesos parciales).
- Post-verificación: bienvenida + CTAs (Enviar NDA, Proteger documento, Firmar documento, Crear flujo de firmas).

Checks para dev:
- verify-access bloquea rutas internas hasta verificación.
- Tests e2e que validen redirección y ausencia de acceso parcial.

2. CENTRO LEGAL (LIVE)
- Centro Legal como modal transversal (client/src/components/LegalCenterModalV2.tsx, LegalCenterRoot/Context).
- Debe abrirse desde Home, Documents, Operations, Planes o CTA legal.

Checks para dev:
- Modal no altera rutas; presencia desde múltiples entradas.
- Contract/Docs: docs/contratos/LEGAL_CENTER_LAYOUT_CONTRACT.md

3. DOCUMENTOS — PROTEGER (LIVE)
- Usuario sube documento desde Centro Legal o Documents.
- Protección activada por default (ProtectionToggle). Usuario puede desactivar explícitamente.
- Al proteger: se aplica TSA (client/src/lib/tsaService.ts, supabase/functions/legal-timestamp) y se genera evidencia (eventos TSA en tabla de eventos).
- Documento queda en directorio Documents; no existen documentos “suelta”.

Checks para dev:
- record-protection-event y stamp-pdf generan evento y archivo.
- Migrations y RLS garantizan integridad de acceso.

4. DOCUMENTOS — FIRMAR VISUAL (LIVE, UX PENDIENTE)
- Flujo: Centro Legal → elegir Mi firma → SignatureModal / SignaturePad.
- Opciones: dibujar (canvas), subir, teclear.
- Al colocar firma visual en documento: la firma queda flotando y editable (drag & drop, borrar, reposicionar).

Notas técnicas:
- Mejorar drag continuo con scroll (ya modificado en FieldPlacer). Añadir touch + rAF para fluidez en mobile.
- Aceptación: pruebas manuales e2e que arrastren firma mientras hacen scroll y verifiquen coordenadas finales.

5. BATCH / FLOWS (PENDING)
- Selección múltiple en Operations o Documents (checkboxes) → Enviar como batch.
- El sistema verifica TSA en todos los documentos; genera TSA faltantes automáticamente.
- Construye batch witness y flujo unificado de firmas si corresponde.

Checks para dev:
- flow.rules.ts y start-signature-workflow garantizan generación de TSA previo al envío.
- Tests de integración que validen batch con documentos mixtos (con y sin TSA).
- Definir naming en UI ("conjunto" vs "batch").

6. FIRMA PRESENCIAL (PENDING)
- Desde Documents / Operations: activar Firma presencial → generar QR.
- Firmante con cuenta: verifica documentos coincidentes, puede reconfirmar.
- Firmante sin cuenta: proceso guest (ECO, subir archivos originales, verificar integridad).
- Al completar: elevar Assurance Identity Level y registrar evento especial de cierre.

Checks para dev:
- signnow / signer-access / verify-signer-otp flows cubiertos por supabase/functions.
- Incluir tests de QR scan flows (integration).

7. OPERACIONES (LIVE / PENDING)
- Crear operación desde CTA o documento (CreateOperationModal).
- Mover documentos a operación: manteniendo referencias y RLS.
- Compartir documentos: link + OTP ok; falta cerrar compartir batch con protección avanzada.

Checks para dev:
- documentEntityService + operationsService cubren API; cubrir casos de compartición protegida que redirigen al Centro Legal.

8. VERIFICACIÓN EXTERNA (LIVE)
- Verificador público sube ECO + documento y obtiene timeline con eventos (client/src/pages/VerifyPage.tsx, VerifierTimeline).

Checks para dev:
- verify-ecox function y verifier normalizers muestran historial completo.

9. EMAILS Y NOTIFICACIONES
- Mail Founder (welcome_founder_template) enviado diferido (supabase/functions/send-welcome-email). Verificar timing y no dependencia para desbloquear features.
- Invitaciones a firmar, notificaciones, y plantillas están en supabase/functions/_shared/templates.

Checks para dev:
- Cron / queue que envía mails diferidos (send-pending-emails) y pruebas manuales de entrega.

10. QA / PRE-BETA CHECKLIST (acción concreta)
- Ejecutar suite smoke + e2e (client/smoke + tests/integration).
- Tests de seguridad RLS y migrations en staging (supabase migrations + tests/security).
- Pruebas de rendimiento del anchoring y TSA.
- Revisar UX móvil (touch drag + rAF) y agregar tests manuales para drag+scroll.

— FIN —
