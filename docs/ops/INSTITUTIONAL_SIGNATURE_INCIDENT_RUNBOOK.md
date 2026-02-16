# INSTITUTIONAL SIGNATURE INCIDENT RUNBOOK

Estado: Operativo  
Ambito: ECO final con `ecosign_signature`  
Fecha: 2026-02-16

## 1. Objetivo
Responder de forma controlada a incidentes de clave institucional:
- sospecha de compromiso,
- uso indebido de firma,
- firma invalida en produccion.

## 2. Disparadores
- Verificador reporta `institutional_signature_invalid`.
- Verificador reporta `institutional_signature_eco_hash_mismatch`.
- Acceso no autorizado a secretos de firma.
- Hallazgo de certificado firmado fuera de flujo `artifact.finalized`.

## 3. Contencion inmediata (0-30 min)
1. Congelar emision institucional:
   - `ECO_REQUIRE_INSTITUTIONAL_SIGNATURE=0` temporal si bloquea operacion.
   - Alternativa preferida: mantener `=1` y rotar clave inmediata.
2. Rotar clave:
   - Generar nueva Ed25519.
   - Cargar nuevo `ECO_SIGNING_PRIVATE_KEY_B64`.
   - Incrementar `ECO_SIGNING_PUBLIC_KEY_ID` (ej. `k2`).
3. Publicar trust store actualizado para verificador:
   - agregar nueva `key_id`.
   - mover clave comprometida a `VITE_ECOSIGN_REVOKED_KEY_IDS`.

## 4. Recuperacion (30-180 min)
1. Confirmar que nuevos artifacts finales salen con:
   - `ecosign_signature.public_key_id` nuevo,
   - verificacion criptografica valida.
2. Auditar ventana afectada:
   - listar certificados emitidos con `key_id` comprometida.
   - clasificar impacto (integridad, confianza, legal).
3. Comunicar estado:
   - interno: producto/soporte/legal.
   - externo: clientes afectados (si aplica).

## 5. SQL operativo de auditoria (referencial)
```sql
select
  e.at,
  e.entity_id as document_entity_id,
  e.payload->>'eco_storage_path' as eco_storage_path,
  e.payload->>'eco_institutional_signature' as eco_signature_state
from public.document_entity_events e
where e.kind = 'artifact.finalized'
order by e.at desc
limit 200;
```

## 6. Criterios de cierre
- Clave nueva activa en produccion.
- Clave comprometida marcada como revocada en verificador.
- Emision validada en al menos 1 workflow nuevo end-to-end.
- Postmortem publicado con causa raiz y accion preventiva.

## 7. Prevencion minima
- Rotacion programada trimestral/semestral.
- Separar trust store por `key_id` (no una sola clave hardcoded).
- Alerta automatica cuando aparezca:
  - firma invalida,
  - `key_id` desconocida,
  - mismatch de `eco_hash`.
