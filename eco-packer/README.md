# Librería: `@vistapulse/eco-packer`

## ¿Qué hace?

Implementa la gestión del innovador formato de archivo `.eco`. Esta librería proporciona las herramientas para **empaquetar** un proyecto de VISTA NEO (manifiesto + assets) en un único archivo autocontenido, y para **desempaquetar** un archivo `.eco` y reconstruir el estado del proyecto en el editor. Es la tecnología clave para la portabilidad y colaboración.

## ¿Cómo se usa?

```typescript
import { pack, unpack } from '@vistapulse/eco-packer';
import { useVistaStore } from '@vistapulse/state-store';

async function handleExport() {
  const project = useVistaStore.getState().project;
  if (!project) return;

  const assetResolver = async (src: string) => {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`No se pudo recuperar el asset: ${src}`);
    }
    return await response.blob();
  };

  const ecoBlob = await pack(project, {
    assetResolver,
    onProgress: (progress) => console.log(`Empaquetando… ${Math.round(progress * 100)}%`),
  });

  // ...luego, ofrecer ecoBlob para descarga...
}

async function handleImport(file: File) {
  const revokers: Array<() => void> = [];

  const project = await unpack(file, {
    registerObjectURL: (_url, revoke) => revokers.push(revoke),
  });

  useVistaStore.getState().loadProject(project);

  // Guardar revokers para liberar memoria cuando sea necesario:
  // revokers.forEach((cleanup) => cleanup());
}
```

## ¿Por qué es diferente?

El formato `.eco` no es un simple `zip`. Está diseñado para ser un "caballo de Troya" creativo: externamente puede tener una vista previa como si fuera una imagen, pero internamente contiene un proyecto de edición no lineal completo. Esta librería maneja la complejidad de obtener los datos de los `blob:URL` de los assets, empaquetarlos de forma segura y reconstruir el entorno de trabajo al importarlo, una proeza técnica que la mayoría de editores web no ofrecen.
