export type ExecutorJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'retry_scheduled'
  | 'dead';

export interface ExecutorJob<Payload = unknown> {
  id: string;
  type: string;
  payload: Payload;
  status: ExecutorJobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  dedupeKey: string;
  lockedAt?: string | null;
  lockedBy?: string | null;
  lastError?: string | null;
}

export type FailureKind = 'retryable' | 'fatal';

export type JobHandlerResult =
  | { status: 'succeeded' }
  | { status: 'retry'; retryAfterMs: number; error?: string }
  | { status: 'failed'; error?: string; failureKind?: FailureKind };

export type ExecutorJobRunStatus = 'started' | 'succeeded' | 'failed' | 'retry';

export interface JobHandler<Payload = unknown> {
  type: string;
  handle(job: ExecutorJob<Payload>): Promise<JobHandlerResult>;
}

export interface ExecutorJobStore {
  claimJobs(limit: number, workerId: string): Promise<Array<ExecutorJob>>;
  markSucceeded(jobId: string): Promise<void>;
  scheduleRetry(jobId: string, runAt: Date, error?: string): Promise<void>;
  markFailed(jobId: string, error?: string, dead?: boolean): Promise<void>;
}

export interface ExecutorRunnerOptions {
  workerId: string;
  limit?: number;
  observer?: ExecutorRunnerObserver;
}

export interface ExecutorRunnerObserver {
  onJobStart?(job: ExecutorJob, startedAt: Date): Promise<void> | void;
  onJobFinish?(
    job: ExecutorJob,
    result: JobHandlerResult | { status: 'error'; error: string },
    finishedAt: Date,
    durationMs: number,
  ): Promise<void> | void;
}

export interface ExecutorJobRunStore {
  onJobStart(run: {
    jobId: string;
    jobType: string;
    workerId: string;
    startedAt: Date;
    status: ExecutorJobRunStatus;
  }): Promise<void>;
  onJobFinish(run: {
    jobId: string;
    jobType: string;
    workerId: string;
    startedAt: Date;
    finishedAt: Date;
    status: ExecutorJobRunStatus;
    error?: string;
  }): Promise<void>;
}

export async function runExecutorOnce(
  store: ExecutorJobStore,
  handlers: Array<JobHandler>,
  options: ExecutorRunnerOptions,
  runStore?: ExecutorJobRunStore,
): Promise<void> {
  const limit = options.limit ?? 10;
  const handlerMap = new Map(handlers.map((handler) => [handler.type, handler]));

  const jobs = await store.claimJobs(limit, options.workerId);
  for (const job of jobs) {
    const startedAt = new Date();
    if (runStore) {
      await runStore.onJobStart({
        jobId: job.id,
        jobType: job.type,
        workerId: options.workerId,
        startedAt,
        status: 'started',
      });
    }
    await options.observer?.onJobStart?.(job, startedAt);

    if (!job.dedupeKey) {
      await store.markFailed(job.id, 'Missing dedupe_key for executor job', true);
      const finishedAt = new Date();
      if (runStore) {
        await runStore.onJobFinish({
          jobId: job.id,
          jobType: job.type,
          workerId: options.workerId,
          startedAt,
          finishedAt,
          status: 'failed',
          error: 'Missing dedupe_key for executor job',
        });
      }
      await options.observer?.onJobFinish?.(
        job,
        { status: 'failed', error: 'Missing dedupe_key for executor job', failureKind: 'fatal' },
        finishedAt,
        finishedAt.getTime() - startedAt.getTime(),
      );
      continue;
    }

    const handler = handlerMap.get(job.type);
    if (!handler) {
      await store.markFailed(job.id, `No handler registered for job type: ${job.type}`, true);
      const finishedAt = new Date();
      if (runStore) {
        await runStore.onJobFinish({
          jobId: job.id,
          jobType: job.type,
          workerId: options.workerId,
          startedAt,
          finishedAt,
          status: 'failed',
          error: `No handler registered for job type: ${job.type}`,
        });
      }
      await options.observer?.onJobFinish?.(
        job,
        { status: 'failed', error: `No handler registered for job type: ${job.type}`, failureKind: 'fatal' },
        finishedAt,
        finishedAt.getTime() - startedAt.getTime(),
      );
      continue;
    }

    try {
      const result = await handler.handle(job);
      if (result.status === 'succeeded') {
        await store.markSucceeded(job.id);
        const finishedAt = new Date();
        if (runStore) {
          await runStore.onJobFinish({
            jobId: job.id,
            jobType: job.type,
            workerId: options.workerId,
            startedAt,
            finishedAt,
            status: 'succeeded',
          });
        }
        await options.observer?.onJobFinish?.(
          job,
          result,
          finishedAt,
          finishedAt.getTime() - startedAt.getTime(),
        );
        continue;
      }

      if (result.status === 'retry') {
        const runAt = new Date(Date.now() + result.retryAfterMs);
        await store.scheduleRetry(job.id, runAt, result.error);
        const finishedAt = new Date();
        if (runStore) {
          await runStore.onJobFinish({
            jobId: job.id,
            jobType: job.type,
            workerId: options.workerId,
            startedAt,
            finishedAt,
            status: 'retry',
            error: result.error,
          });
        }
        await options.observer?.onJobFinish?.(
          job,
          result,
          finishedAt,
          finishedAt.getTime() - startedAt.getTime(),
        );
        continue;
      }

      if (result.status === 'failed') {
        const dead = result.failureKind === 'fatal';
        await store.markFailed(job.id, result.error, dead);
        const finishedAt = new Date();
        if (runStore) {
          await runStore.onJobFinish({
            jobId: job.id,
            jobType: job.type,
            workerId: options.workerId,
            startedAt,
            finishedAt,
            status: 'failed',
            error: result.error,
          });
        }
        await options.observer?.onJobFinish?.(
          job,
          result,
          finishedAt,
          finishedAt.getTime() - startedAt.getTime(),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await store.scheduleRetry(job.id, new Date(Date.now() + 30_000), message);
      const finishedAt = new Date();
      if (runStore) {
        await runStore.onJobFinish({
          jobId: job.id,
          jobType: job.type,
          workerId: options.workerId,
          startedAt,
          finishedAt,
          status: 'retry',
          error: message,
        });
      }
      await options.observer?.onJobFinish?.(
        job,
        { status: 'error', error: message },
        finishedAt,
        finishedAt.getTime() - startedAt.getTime(),
      );
    }
  }
}
