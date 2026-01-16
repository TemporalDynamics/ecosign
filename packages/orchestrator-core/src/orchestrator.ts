import type { Job, JobResult, JobStatus } from './types';
import type { JobQueue } from './job-queue';
import type { JobRepository } from './job-repository';
import type { Executor } from './executor';

export interface Orchestrator {
  enqueue(jobId: string): Promise<void>;
  reconcile(): Promise<void>;
}

type Now = () => number;

export class DefaultOrchestrator<Payload = unknown, Result = unknown>
  implements Orchestrator
{
  constructor(
    private readonly repository: JobRepository<Payload, Result>,
    private readonly queue: JobQueue,
    private readonly executor: Executor<Payload, Result>,
    private readonly now: Now = () => Date.now(),
  ) {}

  async enqueue(jobId: string): Promise<void> {
    await this.queue.enqueue(jobId);
  }

  async reconcile(): Promise<void> {
    const jobId = await this.queue.dequeue();
    if (!jobId) {
      return;
    }

    const job = await this.repository.get(jobId);
    if (!job) {
      await this.queue.acknowledge(jobId);
      return;
    }

    if (this.isTerminal(job.status)) {
      await this.queue.acknowledge(jobId);
      return;
    }

    if (!this.executor.canExecute(job)) {
      await this.failJob(job, `No executor available for job type: ${job.type}`);
      await this.queue.acknowledge(jobId);
      return;
    }

    const runningJob = this.markRunning(job);
    await this.repository.save(runningJob);

    try {
      const result = await this.executor.execute(runningJob);
      const updatedJob = this.applyResult(runningJob, result);
      await this.repository.save(updatedJob);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.failJob(runningJob, message);
    } finally {
      await this.queue.acknowledge(jobId);
    }
  }

  private isTerminal(status: JobStatus): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }

  private markRunning(job: Job<Payload, Result>): Job<Payload, Result> {
    const now = this.now();
    return {
      ...job,
      status: 'running',
      attempts: job.attempts + 1,
      updatedAt: now,
      startedAt: job.startedAt ?? now,
    };
  }

  private applyResult(
    job: Job<Payload, Result>,
    result: JobResult<Result>,
  ): Job<Payload, Result> {
    const now = this.now();
    const next: Job<Payload, Result> = {
      ...job,
      status: result.status,
      updatedAt: now,
      result: result.result ?? job.result,
      error: result.error ?? job.error,
    };

    if (result.status === 'completed' || result.status === 'failed') {
      next.completedAt = now;
    }

    return next;
  }

  private async failJob(job: Job<Payload, Result>, error: string): Promise<void> {
    const now = this.now();
    const failed: Job<Payload, Result> = {
      ...job,
      status: 'failed',
      updatedAt: now,
      completedAt: now,
      error,
    };
    await this.repository.save(failed);
  }
}
