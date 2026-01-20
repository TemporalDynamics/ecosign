export interface JobProjectManifest {
  segments?: any[]; // Legacy compatibility for older manifests
}

export interface Job {
  id: string;
  type: string; // 'trim', 'convert', 'concat', etc.
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  result: any | null;
  error: string | null;
  metadata: Record<string, any> & {
    project?: JobProjectManifest;
  };
  priority: 'low' | 'medium' | 'high';
  retries: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface JobOptions {
  type: string;
  metadata: Record<string, any> & {
    project?: JobProjectManifest;
  };
  priority?: 'low' | 'medium' | 'high';
  maxRetries?: number;
}

export interface JobQueue {
  add(jobOptions: JobOptions): Promise<Job>;
  getJob(jobId: string): Promise<Job | null>;
  on(event: string, listener: (job: Job) => void): void;
  process(): void;
}

export interface CommandOptions {
  inputs: Array<{ path: string; options?: string[] }>;
  outputs: Array<{ path: string; options?: string[] }>;
  globalOptions?: string[];
}

/**
 * Processor interface - the extension point for custom job execution
 *
 * This is the abstraction that makes the orchestrator agnostic.
 * Implement this interface to handle any type of job:
 * - FFmpegProcessor: video/audio processing
 * - ArtifactProcessor: document assembly with signatures
 * - Any custom processor for your domain
 *
 * @template TInput - The shape of job.metadata expected by this processor
 * @template TOutput - The shape of job.result produced by this processor
 */
export interface Processor<TInput = Record<string, unknown>, TOutput = unknown> {
  /**
   * Execute a job and return the updated job with results
   *
   * @param job - The job to process (metadata typed as TInput)
   * @param onProgress - Callback to report progress (0-100)
   * @returns The completed job with result typed as TOutput
   */
  execute(
    job: Job & { metadata: TInput },
    onProgress: (progress: number) => void
  ): Promise<Job & { result: TOutput }>;
}
