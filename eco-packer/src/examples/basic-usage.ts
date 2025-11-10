import { pack, unpack } from '../index';
import type { EcoProject } from '../types';
import { generateEd25519KeyPair, sha256Hex } from '../eco-utils';

// Este archivo demuestra el ciclo completo de empaquetar y desempaquetar un proyecto.

async function main() {
  const project: EcoProject = {
    id: 'demo-project',
    name: 'Proyecto para ECO',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
    assets: {
      videoAsset: {
        id: 'videoAsset',
        mediaType: 'video',
        fileName: 'a.mp4',
        duration: 60,
        originalFileName: 'a.mp4',
        src: 'file://a.mp4',
        createdAt: Date.now(),
      },
    },
    timeline: [
      {
        id: 'segment-1',
        assetId: 'videoAsset',
        startTime: 10,
        endTime: 20,
        projectStartTime: 0,
      },
    ],
  };

  console.log('Proyecto original:', project);

  // 2. Empaquetar el proyecto en un archivo .ecox firmando el manifiesto
  console.log('\nEmpaquetando el proyecto...');
  const { privateKey, publicKey } = generateEd25519KeyPair();
  const assetHashes = new Map<string, string>();
  assetHashes.set('videoAsset', sha256Hex('contenido-del-video'));
  const ecoBuffer = await pack(project, assetHashes, { privateKey, keyId: 'demo-key' });
  console.log('Proyecto empaquetado en un ArrayBuffer con bytes:', ecoBuffer.byteLength);

  // 3. Desempaquetar el archivo .ecox para verificar la integridad
  console.log('\nDesempaquetando el archivo .ecox (simulado)...');
  const manifest = await unpack(ecoBuffer, { publicKey });
  console.log('Manifiesto verificado:', manifest);

  console.assert(manifest.projectId === project.id, 'La verificación ha fallado!');
}

main();
