import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CommandBuilder } from '../command-builder';
import { FFmpegProcessor } from '../processor';
import { MemoryJobQueue } from '../queue';
import { Job, JobRepository } from '../job-repository';
import type { JobProjectManifest } from '../types';
import { EventEmitter } from 'node:events';
import { spawn } from 'child_process';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

const spawnMock = vi.mocked(spawn);

describe('CommandBuilder', () => {
  it('construye un comando seguro usando CommandOptions', () => {
    const args = CommandBuilder.buildCommand({
      inputs: [{ path: 'input.mp4' }],
      outputs: [{ path: 'output.mp4', options: ['-c:v', 'libx264'] }],
      globalOptions: ['-hide_banner'],
    });

    expect(args).toContain('-i');
    expect(args).toContain('input.mp4');
    expect(args).toContain('output.mp4');
  });
});

describe('FFmpegProcessor', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('procesa un trabajo y reporta progreso', async () => {
    const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
    child.stderr = new EventEmitter();
    spawnMock.mockReturnValue(child as any);

    const processor = new FFmpegProcessor('ffmpeg');
    const job: Job = {
      id: 'job-1',
      type: 'transcode',
      status: 'processing',
      progress: 0,
      result: null,
      error: null,
      metadata: { args: ['-version'], duration: 10 },
      priority: 'medium',
      retries: 0,
      maxRetries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const progressSpy = vi.fn();
    const promise = processor.processJob(job, progressSpy);

    child.stderr.emit('data', Buffer.from('frame=1 time=00:00:02.00'));
    child.emit('close', 0);

    const result = await promise;
    expect(progressSpy).toHaveBeenCalled();
    expect(result.status).toBe('completed');
    expect(result.progress).toBe(100);
  });

  it('rechaza si FFmpeg termina con error', async () => {
    const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
    child.stderr = new EventEmitter();
    spawnMock.mockReturnValue(child as any);

    const processor = new FFmpegProcessor('ffmpeg');
    const job = {
      id: 'job-2',
      type: 'transcode',
      status: 'processing',
      progress: 0,
      result: null,
      error: null,
      metadata: { args: ['-version'] },
      priority: 'medium',
      retries: 0,
      maxRetries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Job;

    const promise = processor.processJob(job, () => {});
    child.emit('close', 1);

    await expect(promise).rejects.toThrow();
  });
});

describe('MemoryJobQueue', () => {
  let repository: JobRepository;

  beforeEach(async () => {
    repository = new JobRepository();
    await repository.clearAll();
  });

  afterEach(async () => {
    await repository.clearAll();
  });

  const createManifest = (overrides: Partial<JobProjectManifest> = {}): JobProjectManifest => {
    const baseAsset = {
      id: 'asset-1',
      fileName: 'clip.mp4',
      originalFileName: 'clip.mp4',
      src: 'blob:clip',
      duration: 10,
      createdAt: Date.now(),
      mediaType: 'video' as const,
    };

    const baseTimeline = [
      {
        id: 'segment-1',
        assetId: 'asset-1',
        startTime: 0,
        endTime: 5,
        projectStartTime: 0,
      },
      {
        id: 'segment-2',
        assetId: 'asset-1',
        startTime: 5,
        endTime: 10,
        projectStartTime: 5,
      },
    ];

    return {
      id: 'project-1',
      name: 'Proyecto de prueba',
      version: '1.0.0',
      assets: { 'asset-1': baseAsset },
      timeline: baseTimeline,
      duration: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  };

  it('procesa un trabajo y emite job_completed', async () => {
    const queue = new MemoryJobQueue('ffmpeg', repository);
    await queue.initialize();

    const processorMock = {
      processJob: vi.fn(async (job: Job) => ({
        ...job,
        status: 'completed',
        progress: 100,
        result: { output: 'out.mp4' },
        completedAt: new Date(),
      })),
    };

    (queue as unknown as { processor: typeof processorMock }).processor = processorMock as any;

    const jobCompleted = new Promise<Job>((resolve) => {
      queue.on('job_completed', (job) => resolve(job));
    });

    await queue.add({
      type: 'transcode',
      metadata: { args: ['-version'] },
    });

    const completed = await jobCompleted;
    expect(completed.status).toBe('completed');
    expect(processorMock.processJob).toHaveBeenCalled();
  });

  it('rechaza manifiestos con timeline inválida', async () => {
    const queue = new MemoryJobQueue('ffmpeg', repository);
    await queue.initialize();

    const invalidManifest = createManifest({
      timeline: [
        {
          id: 'segment-1',
          assetId: 'asset-1',
          startTime: 0,
          endTime: 5,
          projectStartTime: 0,
        },
        {
          id: 'segment-2',
          assetId: 'asset-1',
          startTime: 5,
          endTime: 10,
          projectStartTime: 2,
        },
      ],
    });

    await expect(
      queue.add({
        type: 'transcode',
        metadata: {
          project: invalidManifest,
        },
      })
    ).rejects.toThrow(/manifest inválido/i);
  });

  it('normaliza la duración del manifiesto antes de encolar el trabajo', async () => {
    const queue = new MemoryJobQueue('ffmpeg', repository);
    await queue.initialize();

    const manifest = createManifest({
      duration: 0,
      timeline: [
        {
          id: 'segment-1',
          assetId: 'asset-1',
          startTime: 0,
          endTime: 5,
          projectStartTime: 0,
        },
        {
          id: 'segment-2',
          assetId: 'asset-1',
          startTime: 5,
          endTime: 10,
          projectStartTime: 6,
        },
      ],
    });

    const job = await queue.add({
      type: 'render',
      metadata: {
        project: manifest,
      },
    });

    expect(job.metadata.project?.duration).toBeCloseTo(11, 5);
    expect(job.metadata.project?.timeline[1].projectStartTime).toBe(6);
  });
});
