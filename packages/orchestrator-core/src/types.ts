export type JobStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobPriority = 'low' | 'medium' | 'high';

export interface Job<Payload = unknown, Result = unknown> {
  id: string;
  type: string;
  payload: Payload;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: Result;
  error?: string;
}

export interface JobResult<Result = unknown> {
  status: Extract<JobStatus, 'completed' | 'failed' | 'waiting'>;
  result?: Result;
  error?: string;
  retryAfterMs?: number;
}

export interface JobOptions<Payload = unknown> {
  type: string;
  payload: Payload;
  priority?: JobPriority;
  maxAttempts?: number;
}
