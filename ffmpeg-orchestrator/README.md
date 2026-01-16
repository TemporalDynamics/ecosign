# Librería: `@temporaldynamics/ffmpeg-orchestrator`

## ¿Qué hace?

Es el motor de trabajo pesado para el backend de VISTA NEO, construido para **Node.js**. Su función es gestionar una cola de trabajos de procesamiento multimedia (ej. exportaciones con FFmpeg), controlando la concurrencia para no saturar la CPU, garantizando la persistencia de los trabajos y proveyendo una API segura para construir y ejecutar comandos.

## ¿Cómo se usa?

```typescript
import { createJobQueue } from '@temporaldynamics/ffmpeg-orchestrator';

// 1. Crear una cola de trabajos (ej. al iniciar el servidor)
const jobQueue = createJobQueue({ concurrency: 4 }); // Procesará 4 trabajos a la vez

// 2. Añadir un trabajo a la cola desde un endpoint de la API
app.post('/export', async (req, res) => {
  const jobOptions = { type: 'transcode', input: 'a.mov', output: 'b.mp4' };
  const job = await jobQueue.add(jobOptions);
  res.json({ message: 'Trabajo de exportación encolado', jobId: job.id });
});

// 3. Consultar el estado de un trabajo
app.get('/jobs/:id', async (req, res) => {
  const job = await jobQueue.getJob(req.params.id);
  res.json(job);
});
```

## ¿Por qué es diferente?

En lugar de ejecutar procesos FFmpeg de forma ingenua y peligrosa (`exec(`ffmpeg -i ...`))`), esta librería introduce un sistema robusto de nivel empresarial. Previene la inyección de comandos, gestiona una cola persistente que sobrevive a reinicios del servidor, controla la carga del sistema y abstrae la complejidad de la ejecución de procesos hijos en Node.js. Es la solución profesional para cualquier backend que necesite procesar video o audio de forma fiable.

## Recursos comerciales y técnicos

- `API.md`: contratos detallados (`createJobQueue`, eventos, CommandBuilder).
- `EXAMPLES.md`: flujos listos para copiar (quickstart, timeline-aware exports, hooks de monitoreo).
- `PRICING.md` + `LICENSE-COMMERCIAL.md`: licenciamiento dual tipo Community/Professional/Enterprise.
- `SECURITY.md`: controles y buenas prácticas para operar workers FFmpeg en entornos productivos.
- `DOCUMENTATION-ROADMAP.md`: plan de próximos entregables (runbooks, observabilidad, colas distribuidas).
