ECOSIGN — FLUJO PARA FIRMANTES (SIN CUENTA / GUEST SIGNERS)
Fecha: 2026-01-12T16:16:07.389Z

Objetivo
--------
Documento que define capacidades, límites y checks técnicos para firmantes que no poseen cuenta en el sistema. Sirve para QA, soporte y devs que implementan flujos guest.

Estado: PENDING / LIVE donde se indica.

1. ACCESO AL FLUJO (LIVE)
- El firmante recibe un enlace o un QR (owner-link o invitación) y accede a una página pública (SignWorkflowPage / SignerApp).
- Enlace puede requerir OTP para validar acceso (supabase/functions/send-signer-otp, verify-signer-otp).

2. CASOS DE FIRMANTE
A. Firmante CON cuenta (pero accede vía QR/link)
- El sistema intenta identificar el usuario (por token o sesión) y verifica que los documentos coincidan.
- Si los documentos ya fueron firmados por esa cuenta, mostrar advertencia: "Son los mismos documentos que ya firmaste" y permitir reconfirmar.

B. Firmante SIN cuenta (GUEST)
- Flujo principal:
  1. Acceso vía link/QR.
  2. Sistema solicita ECO(s) y/o datos mínimos para identificar al firmante (nombre, email) según políticas del flujo.
  3. Si se requiere, se pide al firmante que suba archivos originales (en caso de firma presencial que requiere comparación), o que acepte OTP recibido por email.
  4. Verificaciones: integrity checks (hash/ECO) con client/src/lib/verificationService.ts y funciones verify-ecox.
  5. Firma: visual (campo colocado por owner) o confirmación de aceptación (OTP/consent).
  6. Registro: se genera evento de firma y (según configuración) se ejecuta protección/TSA y se anexa evidencia.

Límites y consideraciones:
- El firmante guest no debe poder modificar documentos; solo firmar o aceptar cambios solicitados.
- Para firmas presenciales, guest puede firmar en dispositivo móvil tras escanear QR y completar checks de integridad.
- Guest flows deben evitar elevar Assurance Identity Level más allá de lo permitido (documentar en IDENTITY_ASSURANCE_RULES.md).

3. OTP y Seguridad (LIVE)
- OTP enviado por supabase/functions/send-signer-otp; ver supabase/functions/verify-signer-otp.
- Expiración y reintentos claramente establecidos (migrations: signer_receipts_otp.sql).
- Logs: registrar intentos y rate-limiting (supabase/functions/_shared/ratelimit.ts).

4. Integridad y evidencia (LIVE)
- Verificar ECO y hashes mediante verificationService y tsrVerifier/opentimestamps si aplica.
- Timeline: mostrar eventos de verificación y timestamp (VerifierTimeline) para que el firmante y el owner vean el historial.

5. UX y Mensajes (importante)
- Mensajes claros: si guest firma, informar límites (no acceso a cuenta, firma limitada a documento especificado).
- En caso de documento distinto al esperado, bloquear y mostrar «Documento no coincide — contactá al remitente».

6. Notificaciones post-firma
- Owner recibe notificación (email owner-firma-recibida + event notify-document-signed).
- Firmante puede recibir un comprobante (documento certificado / summary) si provee email.

7. QA / Tests recomendados
- Testar: enlace/QR + OTP + firma (con y sin cuenta).
- Testar integridad: subir documento distinto y validar que el sistema detecta mismatch.
- Testar firma presencial: QR flow end-to-end en mobile y desktop.

8. Puntos de mejora (para beta)
- Experiencia de upload móvil para guest (compress/resumable uploads).
- Feedback visual inmediato de integridad (hash check) antes de confirmar firma.
- Opcional: permitir registro opcional post-firma para convertir firmantes en usuarios (opt-in).

— FIN —
