import type { Job, JobResult } from './types';

export interface Executor<Payload = unknown, Result = unknown> {
  canExecute(job: Job<Payload, Result>): boolean;
  execute(job: Job<Payload, Result>): Promise<JobResult<Result>>;
}
