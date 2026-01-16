import type { Executor, Job, JobResult } from '@temporaldynamics/orchestrator-core';

export type ExecuteHandler<Payload = unknown, Result = unknown> = (
  job: Job<Payload, Result>,
) => Promise<JobResult<Result>>;

export class MapExecutor<Payload = unknown, Result = unknown>
  implements Executor<Payload, Result>
{
  constructor(
    private readonly handlers: Record<string, ExecuteHandler<Payload, Result>>,
  ) {}

  canExecute(job: Job<Payload, Result>): boolean {
    return typeof this.handlers[job.type] === 'function';
  }

  execute(job: Job<Payload, Result>): Promise<JobResult<Result>> {
    const handler = this.handlers[job.type];
    if (!handler) {
      return Promise.resolve({
        status: 'failed',
        error: `No handler registered for job type: ${job.type}`,
      });
    }
    return handler(job);
  }
}
