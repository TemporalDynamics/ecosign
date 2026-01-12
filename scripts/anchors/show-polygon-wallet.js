#!/usr/bin/env node

/**
 * Muestra la dirección de la wallet configurada en SPONSOR_PRIVATE_KEY
 */

const { ethers } = require('ethers');
const { execSync } = require('child_process');

async function main() {
  try {
    console.log('\n🔍 Obteniendo dirección de wallet configurada en Supabase...\n');

    // Intentar obtener el secret de Supabase
    try {
      const output = execSync('supabase secrets list', { encoding: 'utf-8' });

      if (output.includes('SPONSOR_PRIVATE_KEY')) {
        console.log('✅ SPONSOR_PRIVATE_KEY está configurado en Supabase\n');
        console.log('❌ Por seguridad, Supabase NO permite leer el valor del secret');
        console.log('   Solo podemos ver el hash digest\n');
        console.log('Para ver la dirección, necesitas:');
        console.log('  1. Tener la private key localmente');
        console.log('  2. O verificar en MetaMask la dirección que usaste\n');
      } else {
        console.log('❌ SPONSOR_PRIVATE_KEY no está configurado\n');
      }
    } catch (error) {
      console.log('⚠️  No se pudo verificar con Supabase CLI\n');
    }

    // Opción manual
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('¿Querés ingresar la private key manualmente para ver la dirección? (s/n): ', async (answer) => {
      if (answer.toLowerCase() === 's') {
        rl.question('Ingresa la SPONSOR_PRIVATE_KEY: ', async (privateKey) => {
          try {
            const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
            const wallet = new ethers.Wallet(formattedKey);

            console.log('\n✅ Wallet válida\n');
            console.log('═══════════════════════════════════════════');
            console.log(`📍 Dirección: ${wallet.address}`);
            console.log('═══════════════════════════════════════════\n');
            console.log(`Verificá el balance en:`);
            console.log(`https://polygonscan.com/address/${wallet.address}\n`);

            // Conectar a Polygon y verificar balance
            try {
              const rpcUrl = process.env.ALCHEMY_RPC_URL || 'https://polygon-rpc.com';
              const provider = new ethers.JsonRpcProvider(rpcUrl);
              const balance = await provider.getBalance(wallet.address);
              const balancePOL = ethers.formatEther(balance);

              console.log(`💰 Balance actual: ${balancePOL} POL\n`);

              if (balance === 0n) {
                console.log('❌ Esta wallet NO tiene fondos');
                console.log(`   Deposita POL a: ${wallet.address}\n`);
              } else {
                console.log('✅ Wallet con fondos suficientes\n');
              }
            } catch (e) {
              console.log('⚠️  No se pudo verificar balance (verifica en Polygonscan)\n');
            }

          } catch (error) {
            console.log('\n❌ Private key inválida\n');
          }
          rl.close();
        });
      } else {
        console.log('\nPara verificar tu wallet:');
        console.log('  1. Abrí MetaMask');
        console.log('  2. Seleccioná la cuenta que usaste');
        console.log('  3. Copiá la dirección (0x...)');
        console.log('  4. Verificá el balance en https://polygonscan.com/\n');
        rl.close();
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
