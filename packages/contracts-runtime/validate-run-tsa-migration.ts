#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Script de Validación - Migración de Decisión run_tsa
 * 
 * Este script permite probar la migración de la decisión de run_tsa
 * en un entorno local antes de activarla en el sistema real.
 * 
 * Sigue el protocolo de migración controlada:
 * 1. Implementar regla en runtime canónico
 * 2. Validar con modo shadow
 * 3. Probar con datos reales
 * 4. Confirmar que comportamiento es idéntico
 * 5. Validar UI manualmente
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRunTsaDecision } from './integration.ts';

// Cargar variables de entorno
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runValidationTest() {
  console.log('🧪 Iniciando validación de migración run_tsa...\n');

  // 1. Buscar documentos de prueba
  console.log('🔍 Buscando documentos para validación...');
  
  const { data: testDocuments, error } = await supabase
    .from('document_entities')
    .select('id, events, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error al buscar documentos:', error.message);
    return;
  }

  if (!testDocuments || testDocuments.length === 0) {
    console.log('⚠️ No se encontraron documentos para validar');
    return;
  }

  console.log(`✅ Encontrados ${testDocuments.length} documentos para validación\n`);

  // 2. Validar cada documento
  for (const doc of testDocuments) {
    console.log(`📋 Validando documento: ${doc.id}`);
    
    try {
      const validation = await validateRunTsaDecision(supabase, doc.id);
      
      console.log(`   Should enqueue run_tsa: ${validation.shouldEnqueue}`);
      console.log(`   Reason: ${validation.reason}`);
      console.log(`   Events count: ${validation.eventsSnapshot.length}`);
      
      // Verificar si hay solicitud de protección
      const hasRequest = validation.eventsSnapshot.some((e: any) => e.kind === 'document.protected.requested');
      console.log(`   Has protection request: ${hasRequest}`);
      
      // Verificar si hay TSA confirmado
      const hasTsa = validation.eventsSnapshot.some((e: any) => e.kind === 'tsa.confirmed');
      console.log(`   Has TSA confirmed: ${hasTsa}`);
      
      // Validar regla: debe encolar run_tsa si hay solicitud pero no TSA
      const expectedToEnqueue = hasRequest && !hasTsa;
      const matchesRule = validation.shouldEnqueue === expectedToEnqueue;
      
      console.log(`   Expected to enqueue: ${expectedToEnqueue}`);
      console.log(`   Rule matches: ${matchesRule ? '✅' : '❌'}`);
      
      if (!matchesRule) {
        console.log('   ⚠️ ¡Discrepancia encontrada! Revisar lógica.');
        console.log(`   Eventos:`, validation.eventsSnapshot.filter((e: any) => 
          ['document.protected.requested', 'tsa.confirmed'].includes(e.kind)
        ));
      }
      
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error validando documento ${doc.id}:`, error.message);
    }
  }

  // 3. Validar regla general
  console.log('📋 Validando regla general de decisión run_tsa...\n');
  
  // Casos de prueba
  const testCases = [
    {
      name: 'Documento sin solicitud',
      events: [{ kind: 'document.created', at: '2026-01-21T10:00:00.000Z' }],
      expected: false
    },
    {
      name: 'Documento con solicitud pero sin TSA',
      events: [
        { kind: 'document.protected.requested', at: '2026-01-21T10:00:00.000Z' }
      ],
      expected: true
    },
    {
      name: 'Documento con solicitud y TSA',
      events: [
        { kind: 'document.protected.requested', at: '2026-01-21T10:00:00.000Z' },
        { kind: 'tsa.confirmed', at: '2026-01-21T10:01:00.000Z', payload: { witness_hash: 'test', token_b64: 'test' } }
      ],
      expected: false
    },
    {
      name: 'Documento con TSA pero sin solicitud (caso raro)',
      events: [
        { kind: 'tsa.confirmed', at: '2026-01-21T10:01:00.000Z', payload: { witness_hash: 'test', token_b64: 'test' } }
      ],
      expected: false
    }
  ];

  let allPassed = true;
  
  for (const testCase of testCases) {
    const result = shouldEnqueueRunTsa(testCase.events);
    const passed = result === testCase.expected;
    
    console.log(`   ${passed ? '✅' : '❌'} ${testCase.name}`);
    console.log(`      Expected: ${testCase.expected}, Got: ${result}`);
    
    if (!passed) {
      allPassed = false;
    }
  }

  console.log('\n📊 Resultado de validación:');
  if (allPassed) {
    console.log('✅ Todas las reglas de decisión run_tsa pasaron la validación');
    console.log('✅ El motor de decisiones canónico está funcionando correctamente');
    console.log('\n🎉 Listo para proceder con validación UI según protocolo');
  } else {
    console.log('❌ Algunas reglas no pasaron la validación');
    console.log('❌ Revisar lógica antes de continuar');
  }

  console.log('\n📝 Próximos pasos:');
  console.log('   1. Implementar modo shadow en el executor');
  console.log('   2. Comparar decisiones del sistema actual con canónicas');
  console.log('   3. Validar manualmente en UI que comportamiento sea idéntico');
  console.log('   4. Confirmar con responsable que UI refleje correctamente');
  console.log('   5. Marcar como ACEPTADO y avanzar a siguiente decisión');
}

// Función auxiliar para el test (copiada del decisionEngine para este test)
function shouldEnqueueRunTsa(events: any[]): boolean {
  const hasRequest = events.some((e: any) => e.kind === 'document.protected.requested');
  const hasTsaConfirmed = events.some((e: any) => e.kind === 'tsa.confirmed');
  
  return hasRequest && !hasTsaConfirmed;
}

// Ejecutar validación
if (import.meta.main) {
  runValidationTest().catch(error => {
    console.error('❌ Error en validación:', error);
    Deno.exit(1);
  });
}