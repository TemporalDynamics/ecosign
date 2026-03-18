import { assertEquals } from 'https://deno.land/std@0.204.0/assert/mod.ts';
import {
  checkRateLimit,
  deriveRateLimitIdentity,
  resolveRateLimitIdentity,
  withRateLimit,
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

Deno.test('checkRateLimit record type allows 20 then blocks', async () => {
  const req = new Request('https://example.com', {
    headers: { 'x-forwarded-for': '12.0.0.1' },
  });

  for (let i = 0; i < 20; i += 1) {
    const result = await checkRateLimit(req, 'record');
    assertEquals(result.success, true, `request ${i + 1} should pass`);
  }

  const blocked = await checkRateLimit(req, 'record');
  assertEquals(blocked.success, false, 'request 21 should be blocked');
});

Deno.test('withRateLimit passes OPTIONS preflight without consuming quota', async () => {
  const handler = withRateLimit('record', async (req) => {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  });

  const req = new Request('https://example.com', {
    method: 'OPTIONS',
    headers: { origin: 'http://localhost:5173' },
  });

  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.text();
  assertEquals(body, 'ok');
});

Deno.test('withRateLimit returns 429 with CORS headers when exceeded', async () => {
  const handler = withRateLimit('invite', async () => {
    return new Response('ok');
  });

  // Use a unique IP to avoid interference with other tests
  const headers = { 'x-forwarded-for': '13.0.0.1', origin: 'http://localhost:5173' };

  // Exhaust the 5-per-minute limit
  for (let i = 0; i < 5; i += 1) {
    const res = await handler(new Request('https://example.com', { headers }));
    assertEquals(res.status, 200);
  }

  // 6th request should be 429
  const blocked = await handler(new Request('https://example.com', { headers }));
  assertEquals(blocked.status, 429);

  // Verify CORS headers are present on 429 response
  const allowOrigin = blocked.headers.get('Access-Control-Allow-Origin');
  assertEquals(typeof allowOrigin, 'string', '429 response must include CORS origin header');

  // Verify rate limit headers
  const retryAfter = blocked.headers.get('Retry-After');
  assertEquals(typeof retryAfter, 'string', '429 response must include Retry-After header');
});
