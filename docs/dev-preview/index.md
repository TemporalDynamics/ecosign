# Developer Preview Pack — VerifySign

Bienvenido al piloto técnico de VerifySign. Este documento resume lo necesario para que developers auditen el protocolo `.ECO`, prueben el MVP en local y entiendan las limitaciones actuales.

## 1. ¿Qué es el formato `.ECO`?
- Archivo comprimido (`zip/DEFLATE`) que contiene `manifest.json` con metadatos del documento, hashes SHA-256 de cada activo y una firma Ed25519.
- La firma se genera con `eco-packer/` usando claves Ed25519 y se adjunta en `manifest.signatures[0]` junto a `keyId` y `createdAt`.
- El manifiesto sigue el esquema `eco-packer/src/schema/ECO_MANIFEST_SCHEMA.json` e incluye:
  - `projectId`, `title`, `createdAt`.
  - `assets[]`: id, mediaType, fileName, dimensiones, hash.
  - `signatures[]`: algoritmo, firma, timestamp.

## 2. Cómo generar un `.ECO` localmente
1. Instala dependencias:
   ```bash
   cd eco-packer && npm install
   cd ../server && npm install
   ```
2. Crea un archivo `.env` copiando `.env.example` y añade `SUPABASE_*` (aunque el servicio local usa mocks, esto deja el entorno listo para staging).
3. Ejecuta el servicio de generación:
   ```ts
   import { EcoGenerationService } from '../server/services/ecoGenerator';
   const service = new EcoGenerationService({
     privateKey: '<hex|base64|PEM>',
     keyId: 'dev-key-01',
   });
   const result = await service.generate({
     documentTitle: 'Demo NDA',
     documentHash: '<sha256 del PDF>',
     signer: { id: 'user-1', fullName: 'Dev Tester', email: 'dev@example.com' }
   });
   ```
4. El resultado expone `base64`, `sha256`, `bytes` y `fileName`. Guarda el buffer en disco para validar.

## 3. Cómo verificar un `.ECO`
- Usa la página `/verify` del cliente (`cd client && npm run dev`).
- También puedes descomprimir el archivo (`unzip sample.eco manifest.json`) y comprobar manualmente:
  - Sustituye `manifest.json` en un verificador JSON Schema.
  - Valida el hash de cada activo (`sha256sum archivo.bin`).
  - Verifica la firma Ed25519 con `eco-packer/src/eco-utils.ts` (requiere la clave pública asociada a `keyId`).

## 4. Limitaciones actuales del Preview
- **Sin backend real**: la app usa mocks; Supabase aún no está cableado al dashboard.
- **Anclaje blockchain pendiente**: no se ejecuta OpenTimestamps/Polygon; sólo se muestran estados simulados.
- **NDA links**: el flujo existe en UI pero no se ha conectado con las funciones de Netlify (`api/sign-url.js`).
- **Seguridad**: las claves privadas deben mantenerse fuera del repo; el servicio de generación acepta PEM/Hex/Base64 pero no maneja HSM todavía.
- **Tests**: sólo existe `eco-packer/tests/ecoGenerator.spec.ts` como smoke test; faltan suites E2E para el dashboard.

## 5. Cómo enviar feedback
- Abre issues con la etiqueta `dev-preview` describiendo hallazgos o vulnerabilidades.
- Para bugs de seguridad críticos, usa el proceso descrito en `README.md` (sección Bug Bounty) o envía correo a `security@verifysign.com`.
- Pull requests son bienvenidos en áreas: validadores `.ECO`, integraciones Supabase, funciones NDA y mejoras de UI.

Gracias por ayudarnos a blindar el MVP antes del lanzamiento público.
