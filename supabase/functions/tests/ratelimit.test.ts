import { assertEquals } from 'https://deno.land/std@0.204.0/assert/mod.ts';
import {
  checkRateLimit,
  deriveRateLimitIdentity,
  resolveRateLimitIdentity,
} from '../_shared/ratelimit.ts';

Deno.test('deriveRateLimitIdentity prefers workspace over user/ip', () => {
  const identity = deriveRateLimitIdentity({
    workspaceId: 'ws-1',
    userId: 'user-1',
    ip: '1.2.3.4',
  });
  assertEquals(identity.kind, 'workspace');
  assertEquals(identity.key, 'workspace:ws-1');
});

Deno.test('deriveRateLimitIdentity falls back to user when no workspace', () => {
  const identity = deriveRateLimitIdentity({
    userId: 'user-2',
    ip: '5.6.7.8',
  });
  assertEquals(identity.kind, 'user');
  assertEquals(identity.key, 'user:user-2');
});

Deno.test('deriveRateLimitIdentity falls back to ip when no auth', () => {
  const identity = deriveRateLimitIdentity({ ip: '9.9.9.9' });
  assertEquals(identity.kind, 'ip');
  assertEquals(identity.key, 'ip:9.9.9.9');
});

Deno.test('resolveRateLimitIdentity uses workspace from auth resolver', async () => {
  const req = new Request('https://example.com', {
    headers: { Authorization: 'Bearer test-token' },
  });

  const identity = await resolveRateLimitIdentity(req, {
    resolveUser: async () => ({
      id: 'user-3',
      app_metadata: { workspace_id: 'ws-2' },
    }),
  });

  assertEquals(identity.kind, 'workspace');
  assertEquals(identity.key, 'workspace:ws-2');
});

Deno.test('resolveRateLimitIdentity falls back to ip when no auth', async () => {
  const req = new Request('https://example.com', {
    headers: { 'x-forwarded-for': '10.0.0.1' },
  });

  const identity = await resolveRateLimitIdentity(req);
  assertEquals(identity.kind, 'ip');
  assertEquals(identity.key, 'ip:10.0.0.1');
});

Deno.test('checkRateLimit blocks after limit (memory fallback)', async () => {
  const req = new Request('https://example.com', {
    headers: { 'x-forwarded-for': '11.0.0.1' },
  });

  const limit = 5; // invite: 5 per minute
  for (let i = 0; i < limit; i += 1) {
    const result = await checkRateLimit(req, 'invite');
    assertEquals(result.success, true);
  }

  const blocked = await checkRateLimit(req, 'invite');
  assertEquals(blocked.success, false);
});
