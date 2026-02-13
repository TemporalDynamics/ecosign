# Signature Capture Probative Policy (v1)

Estado: canonico operativo (pre-Canary)
Ambito: flujo de firmas y Mi Firma

## 1) Principio

La validez del acto de firma no depende de almacenamiento opcional de trazo o imagen.
El acto valido se determina por identidad + decision + transicion canónica de estado.

## 2) Reglas obligatorias

1. `strokes_hash` es accesorio probatorio.
2. `strokes_raw` no entra al hash canónico.
3. El flujo no se bloquea si `store_signature_vectors_opt_in=false`.
4. El flujo no se bloquea si `store_encrypted_signature_opt_in=false`.
5. `store_signature_vectors_opt_in` solo aplica a `capture_kind='draw'`.
6. Si `capture_kind!='draw'`, backend MUST forzar `store_signature_vectors_opt_in=false`.

## 3) Regla de binding

`witness_hash` permanece ligado al documento/evidencia canónica.
No se mezcla identidad o consentimientos opcionales dentro del binding base.

## 4) Eventos requeridos

- `signer.identity_confirmed` (identidad/aceptacion de acceso)
- `signature.capture.consent` (consentimientos opcionales de captura; separado semánticamente)
- `signer.signed` (acto de firma)
- `signer.rejected` (acto de rechazo cuando aplica)

## 5) Compatibilidad de modos

- `draw`: puede reportar ambos opt-ins opcionales.
- `type`: no presenta ni persiste opt-in de vectores.
- `upload`: no presenta ni persiste opt-in de vectores.
