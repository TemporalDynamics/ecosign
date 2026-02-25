/**
 * Script de prueba para Polygon Gasless Anchoring via Biconomy
 *
 * Uso: node test-polygon-gasless.js
 */

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uiyojopjbhooxrmamaiw.supabase.co';
const INTERNAL_API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/anchor-polygon`;

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (INTERNAL_API_KEY) {
    headers.Authorization = `Bearer ${INTERNAL_API_KEY}`;
    headers.apikey = INTERNAL_API_KEY;
  }
  return headers;
}

// Generar hash de prueba (SHA-256 de un string aleatorio)
function generateTestHash() {
  const randomData = `test-document-${Date.now()}-${Math.random()}`;
  return crypto.createHash('sha256').update(randomData).digest('hex');
}

async function testPolygonGasless() {
  console.log('🚀 Testing Polygon Gasless Anchoring with Biconomy\n');

  // Test 1: Hash simple
  const testHash1 = generateTestHash();
  console.log('📄 Test Hash 1:', testHash1);

  try {
    console.log('\n📡 Sending to Biconomy Bundler...');

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        documentHash: testHash1,
        documentId: null,
        userId: null,
        userEmail: 'test@ecosign.app',
        metadata: {
          test: true,
          description: 'Prueba Biconomy Gasless #1'
        }
      })
    });

    console.log('📥 Response status:', response.status);

    const result = await response.json();

    if (!response.ok) {
      console.error('\n❌ Error:', result);
      return;
    }

    console.log('\n✅ Success!');
    console.log('━'.repeat(60));
    console.log('Anchor ID:', result.anchorId);
    console.log('Status:', result.status);
    console.log('Transaction Hash:', result.txHash);
    console.log('Block Number:', result.blockNumber);
    console.log('Block Timestamp:', result.blockTimestamp);
    console.log('UserOp Hash:', result.userOpHash);
    console.log('Gas Paid By:', result.gasPaidBy);
    console.log('Explorer:', result.explorerUrl);
    console.log('━'.repeat(60));

    if (result.status === 'confirmed') {
      console.log('\n🎉 Anchoring confirmado en Polygon!');
      console.log('🔍 Ver en PolygonScan:', result.explorerUrl);
    } else if (result.status === 'pending') {
      console.log('\n⏳ Anchoring pendiente. Espera 30-60 segundos y consulta el estado.');
      console.log('UserOp Hash para consultar:', result.userOpHash);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test 2 y 3: Dos hashes más (opcional)
async function runMultipleTests() {
  console.log('🔬 Running 3 tests with different hashes\n');

  for (let i = 1; i <= 3; i++) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST ${i}/3`);
    console.log('='.repeat(70));

    const testHash = generateTestHash();
    console.log('📄 Hash:', testHash);

    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          documentHash: testHash,
          userEmail: 'test@ecosign.app',
          metadata: {
            testNumber: i,
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Test ${i} SUCCESS`);
        console.log('   TX:', result.txHash);
        console.log('   Block:', result.blockNumber);
        console.log('   Status:', result.status);
      } else {
        console.log(`❌ Test ${i} FAILED`);
        console.log('   Error:', result.error);
      }

    } catch (error) {
      console.log(`❌ Test ${i} ERROR:`, error.message);
    }

    // Esperar 2 segundos entre tests
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Tests completados');
  console.log('='.repeat(70));
}

// Ejecutar
const args = process.argv.slice(2);
if (args.includes('--multiple')) {
  runMultipleTests();
} else {
  testPolygonGasless();
}
