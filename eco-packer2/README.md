# @vistapulse/eco-packer

Herramientas de empaquetado/validación para el formato **.ECOX** de VISTA NEO. Genera manifiestos firmados (Ed25519), valida su integridad y permite incrustar una versión pública (`packEcoFromEcoX`).

## Instalación

### En este monorepo
```bash
cd librerias/eco-packer
npm install
npm run build
```
La app principal puede consumir la librería con los alias existentes (`@vistapulse/eco-packer`).

### En otro proyecto (ej. `/home/manu/verifysign`)
```bash
# desde el proyecto destino
npm install --save ../NEO/librerias/eco-packer
```
Esto copia el paquete compilado a `node_modules/@vistapulse/eco-packer`. TypeScript obtiene los tipos desde `dist/index.d.ts` sin configuración extra.

## API principal

```ts
import { pack, unpack, packEcoFromEcoX } from '@vistapulse/eco-packer';
import type { EcoProject } from '@vistapulse/eco-packer';
import { generateEd25519KeyPair, sha256Hex } from '@vistapulse/eco-packer/eco-utils';

const project: EcoProject = { /* ... */ };
const assetHashes = new Map<string, string>();
assetHashes.set('asset-1', sha256Hex(actualBinaryData));

const { privateKey, publicKey } = generateEd25519KeyPair();
const ecoBuffer = await pack(project, assetHashes, { privateKey, keyId: 'tenant-key' });
const manifest = await unpack(ecoBuffer, { publicKey, expectedKeyId: 'tenant-key' });

const publicEco = packEcoFromEcoX(manifest, manifest.signatures[0].signature);
```

### `pack(project, assetHashes, options)`
- `project`: objeto `EcoProject`.
- `assetHashes`: `Map<assetId, sha256>` con hashes hexadecimales.
- `options`: `{ privateKey: Buffer; keyId: string }` (llaves DER Ed25519).
- Devuelve `ArrayBuffer` del `.ecox` resultante.

### `unpack(ecoFile, options)`
- `ecoFile`: `Blob | ArrayBuffer | Uint8Array`.
- `options`: `{ publicKey: Buffer | string; expectedKeyId?: string }`.
- Devuelve el `EcoManifest` validado (lanza error si la firma no coincide).

### `packEcoFromEcoX(project, signature)`
Genera una versión pública canónica para previews o auditorías sin exponer el proyecto completo.

## Tipos expuestos
- `EcoAsset`, `EcoSegment`, `EcoProject`.
- `PackOptions`, `UnpackerOptions`, `EcoManifest`.

## Scripts
- `npm run build` – compila a `dist/`.
- `npm run test` – ejecuta las pruebas de firma y roundtrip.

## Prácticas recomendadas
1. **Calcula hashes reales**: usa `sha256Hex` sobre los bytes del asset (no sobre strings arbitrarios).
2. **Protege las llaves**: empaqueta en un entorno seguro; el `privateKey` no debería residir en el cliente final.
3. **Reutiliza `packEcoFromEcoX`** para generar previews firmadas y almacenarlas junto al `.ecox`.

## Licencia
MIT.
