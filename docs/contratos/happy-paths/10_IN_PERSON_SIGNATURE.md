# Happy Path 10: Firma presencial (QR)

**Clasificacion:** SECONDARY
**Actor:** Owner (inicia sesion) + Signer (confirma en su dispositivo)
**Trigger:** Owner clickea "Firma presencial" desde documento o batch
**Fuentes:** IN_PERSON_SIGNATURE_CONTRACT.md, ECOSIGN_HAPPY_PATHS_USERS.md

---

## Paso a paso

1. Owner selecciona documento o operacion/batch
2. Owner clickea "Firma presencial" (desde Documents u Operations)
3. Sistema crea `InPersonSession`:
   - `subject_type`: 'document' | 'batch'
   - `subject_id`: UUID
   - `expires_at`: 15-60 minutos desde ahora
   - `status`: 'active'
4. Sistema genera QR codificando: `/in-person-signature?session=UUID`
5. Owner muestra QR (pantalla, impreso, etc.)
6. Firmante escanea QR con su propio dispositivo

### Si el firmante tiene cuenta:

7a. Sistema autentica al firmante
8a. Sistema verifica que `subject_id` matchee la sesion
9a. Muestra: "Confirma la firma de X documento(s)"
10a. Firmante confirma -> Evento `InPersonSignatureConfirmed` registrado

### Si el firmante NO tiene cuenta:

7b. Sistema pide snapshot ECO (identificacion minima)
8b. Sistema valida hash del ECO contra `subject_id`
9b. Si mismatch: "Documento no coincide - contacta al remitente"
10b. Si coincide: Firmante confirma -> Evento registrado

11. Sesion se marca `status: 'closed'`
12. Nivel de identidad (Identity Assurance) se eleva para esta firma
13. Owner recibe notificacion: "X confirmo presencialmente"

## Estado final

Confirmacion presencial registrada, nivel de identidad elevado.

## Reglas

- La sesion QR expira: 15-60 minutos (configurable), no reutilizable
- Anti-replay: cada sesion tiene fingerprint unico
- La elevacion de identidad es permanente para esa firma
- El QR NO contiene datos sensibles, solo el session UUID
