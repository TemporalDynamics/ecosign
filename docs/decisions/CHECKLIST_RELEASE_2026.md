# Checklist Operativo EcoSign 2026

Esta checklist es la versión ejecutable del plan. Marcar ítems solo cuando el criterio de salida esté verificado.

## Gate 0 — Quick wins (2–3 días)

- [x] Multi-formato F1 implementado con `mode` (protección vs firma) en `convertToPDF`
- [x] Imágenes/texto en protección simple: pass-through sin error
- [x] Workflows con firma: imagen/texto se convierten a PDF witness
- [x] Preview: en modo firma usa PDF convertido (no métricas canónicas)
- [x] Shadow logging query sin inconsistencias activas
- [x] `docs/ops/SHADOW_LOGGING_STATUS.md` actualizado si hay gaps

## Gate 1 — Fundación (semana 1)

- [x] `document_id` rechazado explícitamente en funciones legacy
- [x] `document_id` removido de queries `.or(...)`
- [x] Tests TSA A3 habilitados y en verde
- [ ] Mock TSA implementado para tests unitarios
- [x] Rate limit por workspace usa fuente server-side
- [x] Tests 429: workspace/user/IP funcionando
- [x] Rate limit evita doble `auth.getUser()` (JWT decode local)

## Gate 2 — Security hardening (semana 2)

- [x] Guard explícito de trust store (`VITE_ECOSIGN_TRUSTED_PUBLIC_KEYS_JSON`) con warning
- [x] Verificación Ed25519 activa para ECO nuevo
- [x] ECO legacy sin firma Ed25519 no falla
- [x] Tabla `custody_key_rotations` creada
- [x] Tabla `custody_access_log` creada
- [x] Rotación de clave registrada en DB
- [x] Acceso a documento cifrado registra log

## Gate 3 — EPI Canvas Virtual (semanas 3–5)

- [x] `computeStateHash` usa canonicalize + sha256Hex
- [x] Coordenadas redondeadas antes del hash (sin floats)
- [x] Tests de Merkle canónico en verde
- [x] `canvas_snapshot` persistido con campos en la misma operación
- [x] `canvas_snapshot` inmutable post-activación
- [x] `epi_state_hash` persistido en evento `signature.completed` (schema definido)
- [x] `epi.root_hash` agregado al ECO en finalize
- [x] Verificador público valida EPI nivel 2

## Gate 4 — Cleanup + CI/CD (semana 6)

- [ ] `document_id` eliminado completamente (código + tipos)
- [ ] CI GitHub Actions en verde por PR
- [ ] Email de cierre workflow sin duplicados
- [x] UI muestra modo firma (secuencial/paralelo)
- [x] UI muestra estado EPI (nivel 1 vs 2)
- [ ] UI muestra progreso de anclaje (TSA → Rekor → Polygon)
- [ ] UI muestra `witness_history`
