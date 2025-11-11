# BLUEPRINT: Librería `@vistapulse/eco-packer`

## Concepto Central

Es la librería que materializa el mandamiento "El Archivo .eco es el Arca de la Verdad". Su única responsabilidad es gestionar la creación (empaquetado) y la lectura (desempaquetado) del formato de archivo `.eco`, garantizando la total portabilidad de un proyecto de VISTA NEO entre diferentes sesiones, navegadores o usuarios.

## Alineación con los Mandamientos

*   **"El Archivo .eco es el Arca de la Verdad":** Esta librería es la implementación directa de dicho concepto.
*   **"Exportarás Solo al Final":** Mientras que el E2S se encarga del MP4, esta librería se encarga de la exportación del *proyecto editable*, que es un estado intermedio pero crucial para la colaboración y el backup.
*   **"Nunca Duplicarás":** Al empaquetar, la librería puede ser inteligente y solo incluir los `Assets` realmente utilizados en la `timeline`, optimizando el tamaño del archivo.

## Arquitectura y Estructura Propuesta

```
librerias/3. eco-packer/
├── src/
│   ├── index.ts        # API Pública: exporta las funciones `pack` y `unpack`.
│   ├── packer.ts       # Lógica para crear el archivo .eco (usando ej. JSZip).
│   ├── unpacker.ts     # Lógica para leer, validar y reconstruir un proyecto desde un .eco.
│   ├── validator.ts    # Esquemas y lógica para validar la integridad del manifiesto del proyecto.
│   └── types.ts        # Tipos de datos para las opciones de empaquetado/desempaquetado.
├── package.json
└── BLUEPRINT.md
```

### API Pública (`index.ts`)

La API será simple y funcional:

*   `pack(project: Project, options: PackOptions): Promise<ArrayBuffer>`: Toma un objeto `Project` de Timeline Engine, consolida los metadatos y hashes de los `Assets`, y genera un contenedor `.ECOX` listo para firmarse y distribuirse.
*   `unpack(ecoFile: File): Promise<EcoManifest>`: Toma un archivo `.ECOX`, verifica criptográficamente su manifiesto y devuelve un objeto `EcoManifest` íntegro listo para reconstruir el proyecto en el editor.

### Lógica Clave

*   **Empaquetado:** La función `pack` utilizará una librería como `JSZip` para crear un archivo zip en memoria. Añadirá una carpeta `assets/` con todos los videos/audios necesarios y un archivo `project.json` (el manifiesto). Opcionalmente, añadirá una `cover.jpg` en la raíz, que puede ser usada como thumbnail.
*   **Desempaquetado:** La función `unpack` leerá el archivo, validará la existencia y el formato del `project.json` usando los esquemas de `validator.ts`, y creará `blob:URL` locales para cada archivo en la carpeta `assets/`, reconstruyendo el objeto `Project` con las `src` correctas para que el navegador pueda usarlas.

## Plan de Desarrollo Sugerido

1.  **Dependencias:** Elegir e instalar una librería para la manipulación de archivos zip en el navegador (ej. `JSZip`).
2.  **Empaquetador:** Implementar la función `pack`. El reto principal será obtener el contenido de los `Assets` a partir de sus `blob:URL`.
3.  **Desempaquetador:** Implementar la función `unpack`, poniendo especial atención en la validación de seguridad para evitar la carga de archivos maliciosos.
4.  **Validador:** Crear un esquema (`zod`, `ajv` o manual) en `validator.ts` que asegure que el `project.json` dentro de un `.eco` tenga la estructura correcta.
5.  **Pruebas de Ciclo Completo:** La prueba principal será empaquetar un proyecto y luego desempaquetarlo, verificando que el objeto `Project` resultante sea idéntico al original.
