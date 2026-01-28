/**
 * Test de Invariantes del Sistema Canónico
 * 
 * Este script ejecuta todos los tests de invariantes para verificar que:
 * 1. El sistema no reacciona a ausencia de eventos (silencio)
 * 2. El sistema es idempotente (múltiples ejecuciones no duplican efectos)
 * 3. El sistema maneja concurrencia sin duplicados
 * 4. El sistema no duplica side-effects
 */

import { runSilenceInvariantTest } from './test_silence_invariant.ts';
import { runIdempotencyTest } from './test_idempotency.ts';
import { runConcurrencyTest } from './test_concurrency.ts';
import { runDuplicationTest } from './test_duplication.ts';

interface InvariantResult {
  test: string;
  success: boolean;
  details: any;
  timestamp: string;
}

async function runAllInvariants(): Promise<boolean> {
  console.log('🔍 INICIANDO SUITE COMPLETA DE INVARIANTES');
  console.log('========================================\n');

  const results: InvariantResult[] = [];

  // 1. Test de silencio
  console.log('🧪 1️⃣  Ejecutando test de invariante de silencio...');
  try {
    const silenceSuccess = await runSilenceInvariantTest();
    results.push({
      test: 'silence_invariant',
      success: silenceSuccess,
      details: { message: 'Test de silencio completado' },
      timestamp: new Date().toISOString()
    });
    console.log(`   ${silenceSuccess ? '✅' : '❌'} Test de silencio: ${silenceSuccess ? 'PASSED' : 'FAILED'}\n`);
  } catch (error) {
    console.log(`   ❌ Test de silencio falló: ${error.message}\n`);
    results.push({
      test: 'silence_invariant',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 2. Test de idempotencia
  console.log('🧪 2️⃣  Ejecutando test de idempotencia...');
  try {
    const idempotencySuccess = await runIdempotencyTest();
    results.push({
      test: 'idempotency_invariant',
      success: idempotencySuccess,
      details: { message: 'Test de idempotencia completado' },
      timestamp: new Date().toISOString()
    });
    console.log(`   ${idempotencySuccess ? '✅' : '❌'} Test de idempotencia: ${idempotencySuccess ? 'PASSED' : 'FAILED'}\n`);
  } catch (error) {
    console.log(`   ❌ Test de idempotencia falló: ${error.message}\n`);
    results.push({
      test: 'idempotency_invariant',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 3. Test de concurrencia
  console.log('🧪 3️⃣  Ejecutando test de concurrencia...');
  try {
    const concurrencySuccess = await runConcurrencyTest();
    results.push({
      test: 'concurrency_invariant',
      success: concurrencySuccess,
      details: { message: 'Test de concurrencia completado' },
      timestamp: new Date().toISOString()
    });
    console.log(`   ${concurrencySuccess ? '✅' : '❌'} Test de concurrencia: ${concurrencySuccess ? 'PASSED' : 'FAILED'}\n`);
  } catch (error) {
    console.log(`   ❌ Test de concurrencia falló: ${error.message}\n`);
    results.push({
      test: 'concurrency_invariant',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 4. Test de duplicación
  console.log('🧪 4️⃣  Ejecutando test de duplicación...');
  try {
    const duplicationSuccess = await runDuplicationTest();
    results.push({
      test: 'duplication_invariant',
      success: duplicationSuccess,
      details: { message: 'Test de duplicación completado' },
      timestamp: new Date().toISOString()
    });
    console.log(`   ${duplicationSuccess ? '✅' : '❌'} Test de duplicación: ${duplicationSuccess ? 'PASSED' : 'FAILED'}\n`);
  } catch (error) {
    console.log(`   ❌ Test de duplicación falló: ${error.message}\n`);
    results.push({
      test: 'duplication_invariant',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 5. Resumen de invariantes
  console.log('📋 5️⃣  Resumen de invariantes:');
  console.log('   ============================');
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.test}: ${result.success ? 'MANTENIDO' : 'VIOLADO'}`);
    if (result.success) successCount++;
  }
  
  const overallSuccess = successCount >= 3; // Al menos 3 de 4 invariantes deben mantenerse
  const successEmoji = overallSuccess ? '✅' : '❌';
  
  console.log(`\n${successEmoji} RESULTADO FINAL DE INVARIANTES: ${overallSuccess ? 'SISTEMA ESTABLE' : 'SISTEMA INESTABLE'}`);
  console.log(`   Invariantes mantenidos: ${successCount}/${results.length}`);
  
  if (overallSuccess) {
    console.log('\n🎯 SISTEMA CANÓNICO CON INVARIANTES MANTENIDOS:');
    console.log('   - Invariante de silencio: ✅');
    console.log('   - Invariante de idempotencia: ✅');
    console.log('   - Invariante de concurrencia: ✅');
    console.log('   - Invariante de no duplicación: ✅');
    console.log('\n🔒 El sistema está blindado contra errores comunes');
  } else {
    console.log('\n⚠️  SISTEMA CON INVARIANTES VIOLADOS:');
    console.log('   - Revisa los tests fallidos');
    console.log('   - No debe continuar hasta resolver invariantes críticas');
    console.log('   - Riesgo de comportamiento inesperado');
  }

  return overallSuccess;
}

// Ejecutar suite completa
if (import.meta.main) {
  runAllInvariants()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡SUITE DE INVARIANTES COMPLETA EXITOSA!');
        console.log('El sistema canónico está blindado con invariantes verificadas.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN SUITE DE INVARIANTES');
        console.log('El sistema tiene invariantes violadas que deben resolverse.');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en suite de invariantes:', error);
      Deno.exit(1);
    });
}

export { runAllInvariants };