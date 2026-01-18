# IDENTITY + OTP + DECRYPTION CONTRACT

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## Convencion de eventos (Fase 1)
Las referencias a eventos en este documento deben interpretarse
segun la convencion canonica `kind + at + payload`.

## 0. Proposito
Definir el flujo obligatorio de pre-acceso, OTP y desbloqueo de lectura del documento
sin crear cuentas ni exponer contenido antes de la verificacion.

## 1. Reglas canónicas (MUST)
- El link abre **solo** el pre-acceso, nunca el documento completo.
- El OTP se envía **solo después** de `signer.identity_confirmed`.
- El preview completo permanece bloqueado hasta `otp.verified`.
- Todo acceso debe registrar eventos canónicos (ver `CANONICAL_EVENTS_LIST.md`).

## 2. Flujo mínimo
1) `signer.accessed`
2) `signer.identity_confirmed`
3) `otp.sent`
4) `otp.verified`
5) `document.decrypted` (opcional)
6) `signature.applied` / `signer.signed`

## 3. Pre-acceso (UI)
Antes de OTP, solo se muestra:
- Titulo/nombre del documento
- Quién lo envía
- Botones: Continuar / Rechazar

No se muestra ninguna página del PDF.

## 4. OTP (doble propósito)
- El OTP autentica y habilita descifrado.
- El OTP **no** es la clave de cifrado.
- El servidor puede derivar una clave de sesión (KDF) usando:
  - ECOSIGN_KDF_SALT (backend secret)
  - workflow_id + document_id + signer_id (context binding)

## 5. Seguridad
- `ECOSIGN_KDF_SALT` vive solo en Supabase Secrets.
- No se rota en v1.
- OTP expira y se registra en `otp.verified`.

## 6. No-responsabilidades
- No define templates de email.
- No define el flujo de firma presencial.
