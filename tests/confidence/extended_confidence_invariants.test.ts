import { describe, expect, test } from 'vitest';

import { decideProtectDocumentV2Pipeline } from '../../supabase/functions/_shared/protectDocumentV2PipelineDecision';
import { validateEventAppend } from '../../supabase/functions/_shared/validateEventAppend';
import {
  runExecutorOnce,
  type ExecutorJob,
  type ExecutorJobStore,
  type JobHandler,
} from '../../packages/ecosign-orchestrator/src/runner';

describe('Confidence Suite - Extended Invariants', () => {
  test('replay determinism: same event replay yields identical decision sequence', () => {
    const stream = [
      {
        kind: 'document.protected.requested',
        at: '2026-02-14T10:00:00.000Z',
        payload: { required_evidence: ['polygon', 'bitcoin'] },
      },
      { kind: 'tsa.confirmed', at: '2026-02-14T10:01:00.000Z' },
      {
        kind: 'anchor.confirmed',
        at: '2026-02-14T10:02:00.000Z',
        payload: { network: 'polygon', confirmed_at: '2026-02-14T10:02:00.000Z' },
      },
      {
        kind: 'anchor.confirmed',
        at: '2026-02-14T10:03:00.000Z',
        payload: { network: 'bitcoin', confirmed_at: '2026-02-14T10:03:00.000Z' },
      },
      { kind: 'artifact.finalized', at: '2026-02-14T10:04:00.000Z' },
    ];

    const replay = (events: any[]) => {
      const snapshots: Array<{ jobs: string[]; reason?: string }> = [];
      for (let i = 1; i <= events.length; i += 1) {
        const decision = decideProtectDocumentV2Pipeline(events.slice(0, i));
        snapshots.push({ jobs: [...decision.jobs], reason: decision.reason });
      }
      return snapshots;
    };

    const runA = replay(stream);
    const runB = replay(stream);

    expect(runA).toEqual(runB);
  });

  test('append-only/event authority guard: runtime rejects non-canonical append and duplicate TSA hash', () => {
    const current = {
      events: [
        {
          kind: 'tsa.confirmed',
          at: '2026-02-14T10:01:00.000Z',
          witness_hash: 'abc123',
          tsa: { token_b64: 'tokA' },
        },
      ],
    };

    const invalidKind = validateEventAppend(current, {
      kind: 'anchor.confirmed',
      at: '2026-02-14T10:02:00.000Z',
    });
    expect(invalidKind.ok).toBe(false);
    expect(invalidKind.reason).toBe('event_kind_not_allowed');

    const duplicateHash = validateEventAppend(current, {
      kind: 'tsa.confirmed',
      at: '2026-02-14T10:03:00.000Z',
      witness_hash: 'abc123',
      tsa: { token_b64: 'tokB' },
    });
    expect(duplicateHash.ok).toBe(false);
    expect(duplicateHash.reason).toBe('event_witness_hash_duplicate');
  });

  test('dead-job recovery simulation: retryable failure is re-queued and later succeeds', async () => {
    type Job = ExecutorJob<Record<string, unknown>>;

    const jobs: Job[] = [
      {
        id: 'job-1',
        type: 'run_tsa',
        payload: { document_entity_id: 'de-1' },
        status: 'queued',
        attempts: 0,
        maxAttempts: 3,
        runAt: new Date(Date.now() - 1000).toISOString(),
        dedupeKey: 'de-1:run_tsa',
      },
    ];

    class MemoryStore implements ExecutorJobStore {
      async claimJobs(limit: number): Promise<Job[]> {
        const now = Date.now();
        const claimable = jobs
          .filter((job) => ['queued', 'retry_scheduled'].includes(job.status))
          .filter((job) => new Date(job.runAt).getTime() <= now)
          .slice(0, limit);

        for (const job of claimable) {
          job.status = 'running';
          job.attempts += 1;
        }
        return claimable;
      }

      async markSucceeded(jobId: string): Promise<void> {
        const job = jobs.find((item) => item.id === jobId);
        if (!job) return;
        job.status = 'succeeded';
        job.lastError = null;
      }

      async scheduleRetry(jobId: string, runAt: Date, error?: string): Promise<void> {
        const job = jobs.find((item) => item.id === jobId);
        if (!job) return;
        job.status = 'retry_scheduled';
        job.runAt = runAt.toISOString();
        job.lastError = error ?? null;
      }

      async markFailed(jobId: string, error?: string, dead?: boolean): Promise<void> {
        const job = jobs.find((item) => item.id === jobId);
        if (!job) return;
        job.status = dead ? 'dead' : 'failed';
        job.lastError = error ?? null;
      }
    }

    let calls = 0;
    const handlers: Array<JobHandler> = [
      {
        type: 'run_tsa',
        async handle() {
          calls += 1;
          if (calls === 1) {
            return { status: 'retry', retryAfterMs: 1, error: 'temporary provider timeout' };
          }
          return { status: 'succeeded' };
        },
      },
    ];

    const store = new MemoryStore();

    await runExecutorOnce(store, handlers, { workerId: 'worker-1', limit: 10 });
    expect(jobs[0].status).toBe('retry_scheduled');
    expect(jobs[0].attempts).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 5));
    await runExecutorOnce(store, handlers, { workerId: 'worker-1', limit: 10 });

    expect(jobs[0].status).toBe('succeeded');
    expect(jobs[0].attempts).toBe(2);
    expect(calls).toBe(2);
  });
});
