import {
  Job,
  JobOptions,
  JobQueue,
  JobProjectManifest,
} from './types';
import { JobRepository } from './job-repository';
import { FFmpegProcessor } from './processor';

// Minimal timeline utilities reintroduced locally to satisfy tests without external dependency.

function cloneSegments(segments: any[] = []): any[] {
  return segments.map((segment) => ({ ...segment }));
}

function validateTimeline(timeline: any[] = []): string[] {
  const errors: string[] = [];
  // Ensure segments are ordered by projectStartTime
  const sorted = [...timeline].sort((a, b) => (a.projectStartTime ?? 0) - (b.projectStartTime ?? 0));

  let lastEnd = -Infinity;
  for (const seg of sorted) {
    const start = typeof seg.startTime === 'number' ? seg.startTime : NaN;
    const end = typeof seg.endTime === 'number' ? seg.endTime : NaN;
    const projStart = typeof seg.projectStartTime === 'number' ? seg.projectStartTime : NaN;

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      errors.push(`Segment ${seg.id || '<unknown>'} tiene tiempo inválido`);
      continue;
    }

    const segDuration = end - start;
    if (!Number.isFinite(projStart)) {
      errors.push(`Segment ${seg.id || '<unknown>'} faltante projectStartTime`);
      continue;
    }

    if (projStart < lastEnd) {
      errors.push(`Segment ${seg.id || '<unknown>'} overlap detected`);
    }

    lastEnd = Math.max(lastEnd, projStart + segDuration);
  }

  return errors;
}

function getTotalDuration(project: any): number {
  const timeline = Array.isArray(project.timeline) ? project.timeline : project.segments ?? [];
  let maxEnd = 0;
  for (const seg of timeline) {
    const projStart = typeof seg.projectStartTime === 'number' ? seg.projectStartTime : 0;
    const segDuration = typeof seg.endTime === 'number' && typeof seg.startTime === 'number' ? seg.endTime - seg.startTime : 0;
    maxEnd = Math.max(maxEnd, projStart + segDuration);
  }
  return maxEnd;
}

function normalizeProject(project: JobProjectManifest): JobProjectManifest {
  const p: any = project as any;
  const timeline = cloneSegments(
    Array.isArray(p.timeline) && p.timeline.length > 0
      ? p.timeline
      : p.segments ?? []
  ).sort((a: any, b: any) => (a.projectStartTime ?? 0) - (b.projectStartTime ?? 0));

  const timelineErrors = validateTimeline(timeline);
  if (timelineErrors.length > 0) {
    throw new Error(`JobQueue: manifest inválido. Errores en timeline: ${timelineErrors.join('; ')}`);
  }

  const normalizedAssets: any = Object.fromEntries(
    Object.entries(p.assets ?? {}).map(([id, asset]) => [id, { ...(asset as any) }])
  );

  const baseProject: any = {
    ...p,
    assets: normalizedAssets,
    timeline,
    version: p.version ?? '1.0.0',
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? Date.now(),
  };

  const duration = getTotalDuration(baseProject);

  return {
    ...baseProject,
    duration,
    segments: timeline,
  };
}

function normalizeMetadata(metadata: JobOptions['metadata']): JobOptions['metadata'] {
  const nextMetadata = { ...metadata } as JobOptions['metadata'];

  if (nextMetadata.project) {
    nextMetadata.project = normalizeProject(nextMetadata.project);
  }

  return nextMetadata;
}

export class MemoryJobQueue implements JobQueue {
  private jobs: Map<string, Job> = new Map();
  private queue: string[] = [];
  private isProcessing: boolean = false;
  private processor: FFmpegProcessor;
  private repository: JobRepository;
  private eventListeners: Map<string, Array<(job: Job) => void>> = new Map();

  constructor(ffmpegPath: string = 'ffmpeg', repository?: JobRepository) {
    this.processor = new FFmpegProcessor(ffmpegPath);
    this.repository = repository || new JobRepository();
  }

  async initialize(): Promise<void> {
    await this.repository.initialize();
  }

  async add(jobOptions: JobOptions): Promise<Job> {
    const jobId = this.generateId();
    const metadata = normalizeMetadata(jobOptions.metadata);
    
    const job: Job = {
      id: jobId,
      type: jobOptions.type,
      status: 'queued',
      progress: 0,
      result: null,
      error: null,
      metadata,
      priority: jobOptions.priority || 'medium',
      retries: 0,
      maxRetries: jobOptions.maxRetries || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    
    // Persist the job
    await this.repository.insertJob(job);
    
    // Emit queued event
    this.emit('job_queued', job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.process();
    }
    
    return job;
  }

  async getJob(jobId: string): Promise<Job | null> {
    // Check in-memory cache first
    let job = this.jobs.get(jobId) || null;
    
    // If not found in memory, check repository
    if (!job) {
      job = await this.repository.getJobById(jobId);
      if (job) {
        this.jobs.set(jobId, job); // Cache it
      }
    }
    
    return job;
  }

  on(event: string, listener: (job: Job) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  private emit(event: string, job: Job): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(job));
    }
  }

  async process(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) {
        break;
      }

      const jobRecord = await this.getJob(jobId);
      if (!jobRecord) {
        continue;
      }

      let job: Job = jobRecord;

      try {
        // Update job status to processing in memory and persistence
        job.status = 'processing';
        job.updatedAt = new Date();
        job.startedAt = job.startedAt ?? new Date();
        this.jobs.set(jobId, job);
        await this.repository.updateJob(job);

        // Process the job: prefer execute(), fallback to legacy processJob()
        if (typeof (this.processor as any).execute === 'function') {
          job = await (this.processor as any).execute(job, (progress: number) => {
            job.progress = progress;
            job.updatedAt = new Date();
            this.jobs.set(jobId, job);
          });
        } else if (typeof (this.processor as any).processJob === 'function') {
          job = await (this.processor as any).processJob(job, (progress: number) => {
            job.progress = progress;
            job.updatedAt = new Date();
            this.jobs.set(jobId, job);
          });
        } else {
          throw new Error('Processor does not implement execute or processJob');
        }

        // Update the completed job
        this.jobs.set(jobId, job);
        await this.repository.updateJob(job);

        // Emit completed event
        this.emit('job_completed', job);

      } catch (error) {
        // Handle job failure
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.updatedAt = new Date();
        this.jobs.set(jobId, job);
        await this.repository.updateJob(job);

        // Check if we should retry
        if (job.retries < job.maxRetries) {
          job.retries += 1;
          job.status = 'queued';
          this.queue.unshift(jobId); // Add to front of queue to retry immediately
        } else {
          this.emit('job_failed', job);
        }
      }
    }

    this.isProcessing = false;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}
