import type { Job, JobStatus } from './types';

export interface JobRepository<Payload = unknown, Result = unknown> {
  get(jobId: string): Promise<Job<Payload, Result> | null>;
  save(job: Job<Payload, Result>): Promise<void>;
  listByStatus(
    status: JobStatus,
    limit?: number,
  ): Promise<Array<Job<Payload, Result>>>;
}
