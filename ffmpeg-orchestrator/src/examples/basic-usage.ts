import { createJobQueue } from '../index';

async function setupServer() {
  console.log('Iniciando el orquestador de FFmpeg...');

  const queue = createJobQueue({ ffmpegPath: '/usr/bin/ffmpeg' });

  queue.on('job_completed', (job) => {
    console.log(`¡Trabajo ${job.id} completado!`, job.result);
  });

  queue.on('job_failed', (job) => {
    console.error(`El trabajo ${job.id} ha fallado:`, job.error);
  });

  try {
    const job = await queue.add({
      type: 'transcode',
      metadata: {
        project: {
          id: 'demo-project',
          name: 'Demo Project',
          assets: {},
          timeline: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: '1.0.0',
        },
        input: {
          path: '/path/to/source.mov',
          options: ['-threads', '2'],
        },
        output: {
          path: '/path/to/output.mp4',
          options: ['-c:v', 'libx264', '-c:a', 'aac'],
        },
      },
      priority: 'medium',
    });

    console.log(`Trabajo encolado con ID ${job.id}. Estado inicial: ${job.status}`);

    setTimeout(async () => {
      const currentJob = await queue.getJob(job.id);
      console.log(
        `Estado actual del trabajo ${job.id}:`,
        currentJob?.status,
        `Progreso: ${currentJob?.progress ?? 0}%`
      );
    }, 2000);
  } catch (error) {
    console.error('Error al encolar el trabajo:', error);
  }
}

setupServer().catch((error) => {
  console.error('Error iniciando el orquestador:', error);
});
