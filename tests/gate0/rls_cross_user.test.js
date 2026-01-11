const { execFile } = require('child_process');
const { test } = require('vitest');

// This test runs the existing scripts/rls_test_working.js which performs
// the owner vs attacker checks. It requires a local Supabase instance
// (recommended) with SUPABASE_URL, SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET set.

test('RLS cross-user script passes', (done) => {
  if (!process.env.SUPABASE_URL || !process.env.SERVICE_ROLE_KEY || !process.env.SUPABASE_JWT_SECRET) {
    throw new Error('Gate-0 RLS test requires SUPABASE_URL, SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET in the environment');
  }

  const p = execFile('node', ['scripts/rls_test_working.js'], { env: process.env }, (err, stdout, stderr) => {
    // forward output for CI logs
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (err) return done(err);
    done();
  });

  // safety: kill after 2 minutes
  setTimeout(() => p.kill('SIGKILL'), 2 * 60 * 1000);
});
