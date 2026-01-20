import {
  Job,
  JobOptions,
  JobQueue,
  JobProjectManifest,
} from './types';
import { JobRepository } from './job-repository';
import { FFmpegProcessor } from './processor';

// Timeline normalization removed to keep core agnostic.

function normalizeMetadata(metadata: JobOptions['metadata']): JobOptions['metadata'] {
  return { ...metadata };
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

        // Process the job
        job = await this.processor.execute(job, (progress) => {
          job.progress = progress;
          job.updatedAt = new Date();
          this.jobs.set(jobId, job);
        });

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
