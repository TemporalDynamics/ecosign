# VerifySign Server Module

Este directorio agrupa los servicios Node/Express que viven en el monolito modular:

- `index.js`: bootstrap de Express + Supabase Service Role para funciones administrativas.
- `services/ecoGenerator.ts`: servicio reutilizable que envuelve a `eco-packer` y normaliza hashes, claves y payloads.
- `types/contracts.ts`: contratos compartidos para auth, generación de enlaces NDA y generación `.eco`.

> Próximo paso sugerido: migrar este módulo a `packages/eco-core` si se requiere publicar artefactos NPM. Mientras tanto se versiona aquí para garantizar trazabilidad.
