# BLUEPRINT: Librería `@temporaldynamics/ffmpeg-orchestrator`

## Concepto Central

Es el motor de trabajo pesado del backend de VISTA NEO. Una librería para **Node.js** diseñada para gestionar de forma segura, eficiente y escalable la ejecución de procesos FFmpeg. Su misión es evitar la saturación de la CPU y garantizar que cada trabajo de renderizado o conversión se complete de manera fiable, incluso si el servidor se reinicia.

## Alineación con los Mandamientos

*   **"Exportarás Solo al Final":** Esta librería es la que ejecuta el sacramento final de la materialización (E2S) en el lado del servidor, convirtiendo la "poesía de metadatos" en un archivo MP4 real.
*   **"El Usuario Nunca Debe Esperar":** Al gestionar los trabajos en una cola de segundo plano, permite que la API responda instantáneamente al usuario con un `jobId`, mientras el trabajo pesado se procesa de forma asíncrona.
*   **"El Futuro es la Escalabilidad":** Está diseñada desde cero para ser escalable, pasando de una cola local a una distribuida (con Redis/BullMQ) sin cambiar su API pública.

## Arquitectura y Estructura Propuesta

```
librerias/5. ffmpeg-orchestrator/
├── src/
│   ├── index.ts        # API Pública: exporta la clase o función `createJobQueue`.
│   ├── queue.ts        # Lógica de la cola (abstracción sobre BullMQ o una cola en memoria).
│   ├── processor.ts    # El "worker" que consume trabajos de la cola y ejecuta FFmpeg.
│   ├── job-repository.ts # Persistencia del estado de los trabajos (ej. en SQLite o Redis).
│   ├── command-builder.ts# Utilidades seguras para construir comandos de FFmpeg y evitar inyecciones.
│   └── types.ts        # Definiciones (Job, JobStatus, JobOptions, etc.).
├── package.json
└── BLUEPRINT.md
```

### API Pública (`index.ts`)

*   `createJobQueue(options): JobQueue`: Función que inicializa y devuelve una instancia de la cola de trabajos.
*   Interfaz `JobQueue`:
    *   `add(jobOptions: JobOptions): Promise<Job>`: Añade un nuevo trabajo a la cola.
    *   `getJob(jobId: string): Promise<Job | null>`: Consulta el estado de un trabajo.
    *   `on(event, listener)`: Permite escuchar eventos globales de la cola (ej. `job_completed`, `job_failed`).

### Lógica Clave

*   **Cola Abstraída:** `queue.ts` ofrecerá una interfaz simple (`add`, `process`) que internamente puede usar BullMQ para producción o una cola simple en memoria para desarrollo/pruebas.
*   **Procesador Aislado:** `processor.ts` contendrá la lógica que efectivamente llama a `child_process.spawn` para ejecutar FFmpeg. Escuchará los eventos `stdout` y `stderr` para reportar el progreso.
*   **Persistencia:** `job-repository.ts` se encargará de guardar cada cambio de estado de un `Job` en una base de datos (idealmente SQLite para simplicidad o Redis para velocidad), asegurando que si el proceso se reinicia, la cola pueda reanudarse.
*   **Seguridad:** `command-builder.ts` será crítico. No concatenará strings. Usará arrays de argumentos para pasarlos a `spawn`, previniendo cualquier posibilidad de inyección de comandos.

## Plan de Desarrollo Sugerido

1.  **Tipos y Repositorio:** Definir la estructura de un `Job` en `types.ts` e implementar el `job-repository.ts` con una base de datos en memoria para empezar.
2.  **Constructor de Comandos:** Crear el `command-builder.ts` con funciones para operaciones comunes (ej. `trim`, `concat`, `transcode`).
3.  **Procesador Básico:** Implementar la lógica en `processor.ts` para ejecutar un solo comando de FFmpeg y capturar su salida.
4.  **Cola Simple:** Crear una primera versión de la cola en `queue.ts` que funcione en memoria y procese los trabajos de uno en uno.
5.  **Integración con BullMQ:** Como una mejora, reemplazar la cola en memoria con una implementación basada en BullMQ y Redis para obtener todas las ventajas de un sistema de colas distribuido.
6.  **Pruebas de Integración:** Probar el flujo completo: añadir un trabajo, esperar a que se complete y verificar el archivo de salida.
