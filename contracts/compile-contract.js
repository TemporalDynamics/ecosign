/**
 * Compile DigitalNotary.sol contract
 */

import solc from 'solc';
import fs from 'fs';
import path from 'path';

// Read contract source
const contractPath = '/home/manu/ecosign/DigitalNotary.sol';
const source = fs.readFileSync(contractPath, 'utf8');

// Prepare input for compiler
const input = {
  language: 'Solidity',
  sources: {
    'DigitalNotary.sol': {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
      }
    }
  }
};

console.log('🔨 Compiling DigitalNotary.sol...\n');

// Compile
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  output.errors.forEach(error => {
    if (error.severity === 'error') {
      console.error('❌', error.formattedMessage);
    } else {
      console.warn('⚠️ ', error.formattedMessage);
    }
  });

  if (output.errors.some(e => e.severity === 'error')) {
    process.exit(1);
  }
}

// Get compiled contract
const contract = output.contracts['DigitalNotary.sol']['DigitalNotary'];

const bytecode = '0x' + contract.evm.bytecode.object;
const abi = contract.abi;

console.log('✅ Contract compiled successfully!\n');
console.log('📦 Bytecode length:', bytecode.length, 'characters');
console.log('📝 ABI functions:', abi.filter(item => item.type === 'function').map(f => f.name));

// Save to file
const compiled = {
  contractName: 'DigitalNotary',
  compiler: {
    version: '0.8.20',
    optimizer: { enabled: true, runs: 200 }
  },
  bytecode: bytecode,
  abi: abi,
  compiledAt: new Date().toISOString()
};

fs.writeFileSync(
  '/home/manu/ecosign/compiled-contract.json',
  JSON.stringify(compiled, null, 2)
);

console.log('\n💾 Saved to compiled-contract.json');
console.log('\n✅ Ready to deploy!');
