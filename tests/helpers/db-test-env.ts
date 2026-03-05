type DbEnvOptions = {
  requireRunDbIntegration?: boolean;
};

export function assertDbTestEnv(options: DbEnvOptions = {}) {
  const missing: string[] = [];

  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (process.env.SUPABASE_LOCAL !== 'true') missing.push('SUPABASE_LOCAL=true');

  if (options.requireRunDbIntegration && process.env.RUN_DB_INTEGRATION !== '1') {
    missing.push('RUN_DB_INTEGRATION=1');
  }

  if (missing.length > 0) {
    throw new Error(
      `[DB_TEST_ENV_MISSING] Missing required env for DB tests: ${missing.join(', ')}`
    );
  }
}
