/**
 * Sincroniza los feature flags desde Deno (variables de entorno) hacia PostgreSQL
 *
 * Esta función se llama al inicio del executor para mantener la sincronización
 * unidireccional: Deno Env → SQL Table
 */
export async function syncFlagsToDatabase(supabase: any): Promise<void> {
  // Mapear variables de entorno a flag names
  const flagMappings = [
    { envVar: 'ENABLE_D1_CANONICAL', flagName: 'D1_RUN_TSA_ENABLED' },
    { envVar: 'ENABLE_D3_CANONICAL', flagName: 'D3_BUILD_ARTIFACT_ENABLED' },
    { envVar: 'ENABLE_D4_CANONICAL', flagName: 'D4_ANCHORS_ENABLED' },
    { envVar: 'ENABLE_D5_CANONICAL', flagName: 'D5_NOTIFICATIONS_ENABLED' },
  ];

  // Recoger valores de las variables de entorno
  const updates = flagMappings.map(mapping => {
    const envValue = Deno.env.get(mapping.envVar);
    const enabled = envValue === 'true';
    return {
      flag_name: mapping.flagName,
      enabled: enabled
    };
  });

  // Actualizar la tabla de flags en la base de datos
  for (const update of updates) {
    const { error } = await supabase
      .from('feature_flags')
      .upsert({
        flag_name: update.flag_name,
        enabled: update.enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'flag_name' });

    if (error) {
      console.error(`[fase1-executor] Error sincronizando flag ${update.flag_name}:`, error.message);
      throw error;
    }
  }

  console.log('[fase1-executor] Flags sincronizados a la base de datos:', 
    updates.map(u => `${u.flag_name}=${u.enabled}`).join(', '));
}