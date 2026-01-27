/**
 * Script de prueba para verificar que el orchestrator se ejecute correctamente
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Si no están definidas, usar valores por defecto o salir
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testOrchestrator() {
  console.log('🔍 Probando el orchestrator...');

  try {
    // Llamar directamente al endpoint del orchestrator
    const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}'
    });

    const result = await response.json().catch(() => ({}));
    
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', result);

    if (!response.ok) {
      console.error('❌ Error en la llamada al orchestrator:', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error al llamar al orchestrator:', error);
    return false;
  }
}

// Ejecutar prueba
if (import.meta.main) {
  testOrchestrator()
    .then(success => {
      if (success) {
        console.log('🎉 ¡El orchestrator respondió correctamente!');
        Deno.exit(0);
      } else {
        console.log('💥 Error al comunicarse con el orchestrator');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error en la prueba:', error);
      Deno.exit(1);
    });
}

export { testOrchestrator };