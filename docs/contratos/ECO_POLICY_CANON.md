# ECO POLICY CANON (v1)
**Estado:** Canónico  
**Alcance:** Evidencia (.ECO / .ECOX), entrega, proofs, naming y compatibilidad EPI  
**Fecha:** 2026-02-08  

## Evaluación global
- Claridad de roles (ECO vs ECOX): impecable
- Naming blindado (EcoSign ≠ Cosign): decisión crítica
- Entrega infalible: núcleo del diferencial
- Proofs como refuerzo, no bloqueo: maduro y realista
- Momento psicológico: UX + legal alineados
- Mails reducidos: menos ruido, más confianza
- Hash estructural: entra en el momento justo
- EPI: preparado sin prometer humo
- Upgrade sin invalidar: arquitectura correcta
- Fallback legal: nadie queda desprotegido

## 1) Artefactos y roles (ECO vs ECOX)
- **ECO**: único documento que ve el usuario/firmante.
  - Siempre se entrega como `.ECO`.
  - Contiene evidencia suficiente para defensa legal + anexo técnico.
- **ECOX**: historial completo interno (operaciones, movimientos, decisiones, etc.).
  - No se muestra por defecto.
  - Disponible solo por planes altos o bajo solicitud.
  - Existe para auditoría total, no para UX.

## 1.1) Definición canónica de ECO (sin interpretación)
- Un ECO es evidencia autocontenida de un **acto de firma** emitida en un momento específico del flujo.
- Cada ECO corresponde a **un firmante** y captura **su acto**, no el estado final.
- **ECO.v2** es el formato (schema). **ECO #1, #2, #3...** son instancias por firmante.
- EcoSign **no interpreta** el documento (no declara tipo, rol ni contenido).

## 2) Naming (externo e interno)
- Usuario siempre ve `.ECO`.
- Versiones/estadios son internos (`eco.v2`, `stage`, `proofs[]`).
- **EcoSign es la plataforma. ECO es el artefacto.**
- **"cosign" no se usa** (ni externo ni interno).

## 3) Política de entrega (infalible)
- **ECO siempre se entrega.**
- Ninguna proof es bloqueante.
- Si uno falla, ECO se entrega igual con lo disponible.
- Si ninguno responde, ECO se entrega sin proofs y se puede “upgradear” luego.

## 4) Proofs rápidas (refuerzo, no bloqueo)
- Pruebas rápidas que pueden entrar en ECO:
  - TSA (base legal)
  - Rekor (transparency log)
  - Roughtime (refuerzo temporal)
- Todas son **best-effort**.
- No se usan servidores propios para estas proofs (autoridad externa siempre).

## 5) Momento psicológico de cierre
- El cierre real ocurre **cuando el firmante firma**.
- En ese momento se entrega:
  - PDF firmado
  - ECO (con lo que haya de proofs rápidas)
- El mail es canal secundario, no crítico.

## 6) Mails (mínimos y explícitos)
- Mails activos:
  1. “Tenés un documento para firmar”
  2. OTP
  3. “Flujo completado simple”
- **Se elimina el mail “firmaste”.**
  - Motivo: la UI ya confirma el acto y entrega PDF + ECO.

## 7) Hash estructural (EPI-ready)
- Se agregan:
  - `fields_schema_hash`: congela layout/asignación de campos.
  - `signer_state_hash`: hash de valores del firmante + firma.
- No dependen de bytes del PDF.
- Se calculan:
  - `fields_schema_hash` al commit del layout.
  - `signer_state_hash` al firmar.

## 8) EPI (camino allanado)
- Hashes estructurales entran ahora.
- Merkle/root (`Hr`) se agrega después sin romper ECO.
- ECO actual sigue siendo válido.

## 9) ECO inmediato + upgrades
- ECO entregado en el acto = snapshot válido.
- Luego se puede emitir ECO upgradeado con más proofs.
- El upgrade **no invalida** el ECO inicial, lo refuerza.

## 10) Fallback legal (consistencia del artefacto)
- Si proofs rápidas fallan, igual hay ECO + **firma técnica de integridad del sistema EcoSign**.
- **No reemplaza autoridades externas**; garantiza consistencia e integridad del artefacto.

## 11) Rekor Proof Identity
- EcoSign publica su clave pública Ed25519 para verificación de proofs en Sigstore Rekor.
- Uso exclusivo: firma de statements `ecosign.proof.v1`.
- **Public Key (Ed25519, base64):**
  - `HeJ9QDRHyJfcX03pdX39AvBiLiIl3OElaxJLOit+1q0=`
