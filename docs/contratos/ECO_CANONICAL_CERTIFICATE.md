# ECO_CANONICAL_CERTIFICATE

Version: v1.0  
Estado: Canonical  
Ambito: Formato publico de certificado ECO para snapshots y artefacto final  
Fecha: 2026-02-16

## 0. Proposito
Definir un **unico modelo canónico de certificado ECO** para:
- snapshot de firmante,
- snapshot de documento protegido,
- artifact final.

Este contrato separa explicitamente:
- **ECO certificado** (publico, legible, verificable),
- **ECOX forense** (interno, tecnico, append-only).

## 1. Regla principal
- El certificado ECO que se entrega a usuarios MUST seguir el schema declarativo
  `format=eco`, `format_version=2.0`, `version=eco.v2`.
- El certificado MUST ser autosuficiente para verificacion de hash contra PDF.
- El certificado MUST NOT ser dump completo de `events[]` ni payloads internos.

## 2. Campos minimos del certificado
- `format`, `format_version`, `version`, `issued_at`
- `evidence_declaration`
- `trust_summary`
- `document`
- `signing_act` (puede tener `null` cuando no aplica firmante)
- `proofs` (TSA/anchors/rekor cuando existan)
- `system`

## 3. Compatibilidad y legacy
- El verificador MUST aceptar certificados legacy emitidos previamente.
- El verificador MUST validar siempre contra hash declarado + PDF subido.
- Nuevos cambios de diseño MAY agregar campos, pero no romper el minimo verificable.

## 4. Artifact final
- `artifact.finalized` MUST representar disponibilidad de:
  - artefacto PDF final
  - certificado ECO canónico asociado
- El payload del evento SHOULD incluir `eco_storage_path`.
- El certificado final MAY incluir firma institucional de EcoSign en bloque
  `ecosign_signature` con:
  - `version`
  - `alg`
  - `public_key_id`
  - `eco_hash`
  - `signature_b64`
  - `signed_at`
- El certificado final MAY incluir `ecosign_signature_policy`:
  - `rotation_policy`
  - `revocation_endpoint`
  - `contact`

## 5. Snapshots
- Un documento MAY tener multiples snapshots ECO validos.
- Cada snapshot certifica el estado observado en su `issued_at`.
- La existencia de snapshots multiples no invalida snapshots previos.

## 6. ECO vs ECOX
- ECO: certificado publico y presentable.
- ECOX: timeline forense interno (debug/auditoria/operacion).
- ECOX no reemplaza ECO ni debe mezclarse con el payload publico del certificado.

## 7. Claves y rotacion (minimo)
- Clave privada institucional (Canary): `ECO_SIGNING_PRIVATE_KEY_B64`.
- Identificador de clave publica activa: `ECO_SIGNING_PUBLIC_KEY_ID`.
- Flag de enforcement: `ECO_REQUIRE_INSTITUTIONAL_SIGNATURE=1` para exigir firma en final.
- Rotacion: incrementar `public_key_id`, publicar clave nueva y mantener verificacion de claves previas.
- Metadata opcional embebida en ECO final:
  - `ECO_SIGNING_ROTATION_POLICY`
  - `ECO_SIGNING_REVOCATION_ENDPOINT`
  - `ECO_SIGNING_CONTACT`
- Verificador (trust store, opcional pero recomendado):
  - `VITE_ECOSIGN_TRUSTED_PUBLIC_KEYS_JSON` (JSON `{"k1":"<public_key_b64>", ...}` o lista equivalente).
  - `VITE_ECOSIGN_REVOKED_KEY_IDS` (lista CSV de `key_id` revocadas).

## 8. Politica de validacion de firma institucional
- Si `ecosign_signature` existe, el verificador MUST validar:
  - `eco_hash` contra canonical JSON sin `ecosign_signature`.
  - firma Ed25519 sobre `eco_hash`.
- Si falla hash/firma/formato, estado de verificacion MUST ser `tampered`.
- Si la firma es criptograficamente valida pero `key_id` no esta en trust store, resultado MAY mantenerse valido con advertencia de confianza.
- Si la firma es criptograficamente valida pero la `key_id` esta revocada, resultado MAY mantenerse valido con advertencia de revocacion.
