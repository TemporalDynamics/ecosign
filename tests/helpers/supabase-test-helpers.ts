import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a test user using GoTrue Admin API
 * @returns userId and authenticated client
 */
export async function createTestUser(
  email: string, 
  password: string
): Promise<{ userId: string; client: SupabaseClient }> {
  
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { test_user: true }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create user: ${error}`);
  }

  const userData = await response.json();
  const userId = userData.id;

  // Create authenticated client for this user
  const userClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { error: signInError } = await userClient.auth.signInWithPassword({ 
    email, 
    password 
  });

  if (signInError) {
    throw new Error(`Failed to sign in user: ${signInError.message}`);
  }

  return { userId, client: userClient };
}

/**
 * Deletes a test user using GoTrue Admin API
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
    }
  });

  if (!response.ok && response.status !== 404) {
    console.warn(`Failed to delete user ${userId}:`, await response.text());
  }
}

/**
 * Gets an admin Supabase client (service role)
 */
export function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Cleans up test data from a table
 */
export async function cleanupTestData(
  tableName: string, 
  filterKey: string, 
  filterValue: string
): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from(tableName)
    .delete()
    .like(filterKey, `${filterValue}%`);
}
