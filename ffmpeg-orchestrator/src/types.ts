import type { Project as EngineProject, Segment as EngineSegment } from '@temporaldynamics/timeline-engine';

export interface JobProjectManifest extends EngineProject {
  segments?: EngineSegment[]; // Legacy compatibility for older manifests
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
