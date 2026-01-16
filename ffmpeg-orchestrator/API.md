# API Reference — `@temporaldynamics/ffmpeg-orchestrator`

Version 1.1.0 · Runtime: Node.js 18+

## Entry point
```ts
import {
  createJobQueue,
  MemoryJobQueue,
  JobRepository,
  FFmpegProcessor,
  CommandBuilder,
  type Job,
  type JobOptions,
  type JobQueue,
} from '@temporaldynamics/ffmpeg-orchestrator';
```

## `createJobQueue(options)`
| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ffmpegPath` | `string` | `"ffmpeg"` | Ruta al binario FFmpeg a ejecutar.
| `repository` | `JobRepository` | instancia interna en memoria | Permite inyectar repositorios personalizados (Redis, SQL, etc.). |

Regresa un `JobQueue` con métodos:
- `add(jobOptions)` → `Promise<Job>`
- `getJob(jobId)` → `Promise<Job | null>`
- `on(event, listener)` → suscribe a `job_queued`, `job_completed`, `job_failed`.
- `process()` → inicia el loop manualmente (generalmente se llama automáticamente tras el primer `add`).

## JobOptions
```ts
interface JobOptions {
  type: string; // 'transcode', 'thumbnail', etc.
  metadata: {
    args?: string[];           // argumentos FFmpeg ya sanitizados
    commandOptions?: CommandOptions; // alternativa declarativa al builder
    duration?: number;         // segundos, usado para calcular progreso
    output?: string;           // ruta de salida esperada
    project?: JobProjectManifest; // metadata de timeline
    [key: string]: unknown;
  };
  priority?: 'low' | 'medium' | 'high';
  maxRetries?: number; // intentos adicionales
}
```

## CommandBuilder
```ts
import { CommandBuilder } from '@temporaldynamics/ffmpeg-orchestrator';

const args = CommandBuilder.buildCommand({
  inputs: [
    { path: '/tmp/in.mp4', options: ['-ss', '00:00:01.000'] },
  ],
  outputs: [
    { path: '/tmp/out.mp4', options: ['-c:v', 'libx264', '-preset', 'fast'] },
  ],
  globalOptions: ['-y'],
});
```
- Siempre devuelve un array listo para `spawn(ffmpegPath, args, { stdio: [...] })`.
- No pasa por `shell`, evitando injection.

## Job shape
```ts
interface Job {
  id: string;
  type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  result: { output?: string } | null;
  error: string | null;
  metadata: Record<string, unknown> & { project?: JobProjectManifest };
  priority: 'low' | 'medium' | 'high';
  retries: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

## Timeline manifests
`metadata.project` acepta `JobProjectManifest` (basado en `@temporaldynamics/timeline-engine`).
El `JobQueue` normaliza y valida la timeline automáticamente usando `validateTimeline` y `getTotalDuration`.

## Events
| Event | Payload | Description |
| --- | --- | --- |
| `job_queued` | `Job` | Se dispará inmediatamente después de persistir un job.
| `job_completed` | `Job` | Job con `status='completed'` y `result` poblado.
| `job_failed` | `Job` | Job marcado como fallido tras agotar retries.

## Error handling
- `add()` arroja si la metadata es inválida (timeline con errores, options ausentes, etc.).
- `FFmpegProcessor` rechaza la promesa si FFmpeg devuelve código != 0.
- `CommandBuilder` lanza `Error` cuando faltan inputs/outputs obligatorios.

## Testing utilities
- `MemoryJobQueue` + `JobRepository` permiten ejecutar suites locales sin infraestructura externa.
- Usa Vitest (`npm run test`) para mockear `spawn` y simular progresos.

> ¿Necesitas adaptadores para BullMQ, SQS o Kubernetes Jobs? Contáctanos: los tenemos en la hoja de ruta empresarial.
