// Test básico de eco-packer
import { generateEd25519KeyPair, sha256Hex } from '@temporaldynamics/eco-packer/eco-utils';

console.log('🧪 Testing eco-packer installation...\n');

try {
  // Test 1: Generar claves
  console.log('Test 1: Generating Ed25519 key pair...');
  const { privateKey, publicKey } = generateEd25519KeyPair();
  console.log('✅ Keys generated successfully!');
  console.log('  Private key length:', privateKey.length, 'bytes');
  console.log('  Public key length:', publicKey.length, 'bytes');
  console.log('  Public key (base64):', publicKey.toString('base64').substring(0, 32) + '...\n');

  // Test 2: Hash SHA-256
  console.log('Test 2: Computing SHA-256 hash...');
  const testData = 'Hello, EcoSign!';
  const hash = sha256Hex(Buffer.from(testData));
  console.log('✅ Hash computed successfully!');
  console.log('  Input:', testData);
  console.log('  SHA-256:', hash, '\n');

  console.log('🎉 All tests passed! eco-packer is working correctly.\n');
  console.log('Next steps:');
  console.log('  1. Integrate KeyManagementService');
  console.log('  2. Implement document certification');
  console.log('  3. Add verification functionality');

} catch (error) {
  console.error('❌ Error testing eco-packer:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}
