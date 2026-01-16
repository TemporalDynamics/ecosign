import { spawn } from 'child_process';
import { Job } from './types';
import { CommandBuilder } from './command-builder';
import { CommandOptions } from './types';

export type ProgressCallback = (progress: number) => void;

const TIME_REGEX = /time=([\d:.]+)/;

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 3) {
    return Number.NaN;
  }
  const [hours, minutes, seconds] = parts;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.min(100, Math.max(0, progress));
}

export class FFmpegProcessor {
  constructor(private readonly ffmpegPath: string = 'ffmpeg') {}

  private resolveArgs(job: Job): string[] {
    const metadata = job.metadata || {};

    if (Array.isArray(metadata.args)) {
      return metadata.args as string[];
    }

    if (metadata.commandOptions) {
      return CommandBuilder.buildCommand(metadata.commandOptions as CommandOptions);
    }

    throw new Error(`Job ${job.id} no contiene metadata suficiente para construir el comando de FFmpeg.`);
  }

  async processJob(job: Job, onProgress: ProgressCallback): Promise<Job> {
    const args = this.resolveArgs(job);
    const totalDuration = typeof job.metadata?.duration === 'number' ? job.metadata.duration : undefined;

    return new Promise<Job>((resolve, reject) => {
      const child = spawn(this.ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      const startTime = new Date();
      let currentProgress = clampProgress(job.progress ?? 0);
      let lastProgressReport = -1;

      const updateProgress = (progress: number) => {
        const normalized = clampProgress(progress);
        currentProgress = normalized;
        if (normalized !== lastProgressReport) {
          onProgress(normalized);
          lastProgressReport = normalized;
        }
      };

      child.stderr?.on('data', (buffer: Buffer) => {
        const text = buffer.toString();
        const match = TIME_REGEX.exec(text);
        if (!match) {
          return;
        }

        const seconds = parseTimeToSeconds(match[1]);
        if (!Number.isFinite(seconds)) {
          return;
        }

        if (totalDuration && totalDuration > 0) {
          const percentage = (seconds / totalDuration) * 100;
          updateProgress(percentage);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          const completedJob: Job = {
            ...job,
            status: 'completed',
            progress: 100,
            result: {
              output: job.metadata?.output,
            },
            error: null,
            updatedAt: new Date(),
            completedAt: new Date(),
            startedAt: job.startedAt ?? startTime,
          };
          resolve(completedJob);
        } else {
          reject(new Error(`FFmpeg terminó con código de error: ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      updateProgress(currentProgress);
    });
  }
}
