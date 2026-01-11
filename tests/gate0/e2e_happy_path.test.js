const { execFile } = require('child_process');
const { test } = require('vitest');

// E2E happy-path scaffold. Requires local Supabase env as .env.test or via scripts/load-supabase-env.sh
// This currently reuses the rls test as a conservative smoke test for the canonical flow.

test('E2E happy path (smoke) runs', (done) => {
  if (!process.env.SUPABASE_URL || (!process.env.SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('E2E happy-path requires Supabase local env (SUPABASE_URL and SERVICE_ROLE_KEY)');
  }

  const key = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const env = { ...process.env, SERVICE_ROLE_KEY: key };

  const p = execFile('node', ['scripts/rls_test_working.js'], { env }, (err, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (err) return done(err);
    done();
  });

  setTimeout(() => p.kill('SIGKILL'), 2 * 60 * 1000);
});
