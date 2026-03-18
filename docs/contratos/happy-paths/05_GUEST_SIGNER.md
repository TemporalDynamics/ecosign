# Happy Path 05: Firmante invitado (guest)

**Clasificacion:** CORE
**Actor:** Guest signer (sin cuenta o con cuenta)
**Trigger:** Guest recibe link/QR del owner
**Fuentes:** ECOSIGN_HAPPY_PATHS_SIGNERS.md, GUEST_SIGNATURE_FLOW.md

---

## Caso A: Guest CON cuenta

1. Guest recibe link o escanea QR
2. Guest se loguea con su cuenta existente
3. Sistema verifica que el documento corresponda
4. Sistema muestra: "Estos son los documentos que ya firmaste" (si ya firmo)
5. Guest puede reconfirmar o cancelar
6. Sistema registra evento y notifica al owner

## Caso B: Guest SIN cuenta (flujo principal)

1. Guest recibe link o escanea QR
2. Sistema muestra pagina publica de firma (`SignWorkflowPage` / `SignerApp`)
3. Guest opcionalmente provee nombre + email (para recibo)
4. (Si requerido) Guest sube ECO(s) originales para verificacion de integridad
5. Sistema ejecuta verificacion de hash via `verificationService`
6. Si hay mismatch: muestra "Documento no coincide - contacta al remitente"
7. Si coincide: Guest avanza a firma
8. Guest selecciona metodo de firma:
   - Visual (dibujar en canvas)
   - Texto/aceptacion (confirmacion OTP)
9. Guest aplica firma
10. Sistema agrega evento de firma
11. Sistema aplica TSA (si configurado)
12. Owner recibe notificacion: "X firmo el documento"
13. Guest recibe recibo opcional (si proveyó email)

## Estado final

Firma del guest registrada, evidencia forense capturada, owner notificado.

## Reglas

- El access_token del link es unico por firmante y single-use
- La verificacion de hash es server-side, no confiamos en el cliente
- Si el guest provee email, el recibo es best-effort (no bloquea el flujo)
- La pagina de firma es publica: NO requiere autenticacion
