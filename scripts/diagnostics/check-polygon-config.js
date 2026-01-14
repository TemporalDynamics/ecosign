#!/usr/bin/env node

/**
 * Script de diagnóstico para configuración de Polygon
 * Verifica que las credenciales sean válidas y la wallet tenga fondos
 */

const { ethers } = require('ethers');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🔷 Diagnóstico de Configuración de Polygon\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // 1. Pedir Alchemy RPC URL
    const rpcUrl = await question('1. Ingresa tu ALCHEMY_RPC_URL: ');

    if (!rpcUrl || !rpcUrl.includes('alchemy.com')) {
      console.error('\n❌ La URL no parece ser de Alchemy');
      console.log('   Formato esperado: https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY\n');
      rl.close();
      return;
    }

    console.log('   Probando conexión...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      console.log('   ✅ Conexión exitosa');
      console.log(`   📡 Network: ${network.name} (chainId: ${network.chainId})`);
      console.log(`   📦 Block actual: ${blockNumber}\n`);
    } catch (error) {
      console.error('\n❌ Error conectando a Alchemy:');
      console.error(`   ${error.message}`);
      console.log('\n   Verifica que tu API key de Alchemy sea válida\n');
      rl.close();
      return;
    }

    // 2. Pedir Private Key
    const privateKey = await question('2. Ingresa tu SPONSOR_PRIVATE_KEY (se mantendrá oculta): ');

    if (!privateKey || (!privateKey.startsWith('0x') && privateKey.length !== 64)) {
      console.error('\n❌ Private key inválida');
      console.log('   Debe empezar con 0x y tener 66 caracteres (o 64 sin el 0x)\n');
      rl.close();
      return;
    }

    // Asegurar que tenga 0x
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

    let wallet;
    try {
      wallet = new ethers.Wallet(formattedKey, provider);
      const address = await wallet.getAddress();
      console.log(`   ✅ Wallet válida`);
      console.log(`   📍 Dirección: ${address}\n`);
    } catch (error) {
      console.error('\n❌ Error con la private key:');
      console.error(`   ${error.message}\n`);
      rl.close();
      return;
    }

    // 3. Verificar balance
    console.log('3. Verificando balance de POL...');
    const balance = await provider.getBalance(wallet.address);
    const balancePOL = ethers.formatEther(balance);

    console.log(`   💰 Balance: ${balancePOL} POL`);

    if (balance === 0n) {
      console.log('\n   ❌ La wallet NO tiene fondos');
      console.log(`   📍 Dirección para depositar: ${wallet.address}`);
      console.log('\n   Necesitas depositar al menos 0.5 POL para pagar gas\n');
      console.log('   Dónde conseguir POL:');
      console.log('   • Bridge desde Ethereum: https://wallet.polygon.technology/');
      console.log('   • Exchanges: Binance, Kraken, Coinbase');
      console.log('   • Polygon Faucet (testnet): https://faucet.polygon.technology/\n');
    } else {
      const balanceFloat = parseFloat(balancePOL);
      if (balanceFloat < 0.01) {
        console.log('\n   ⚠️  Balance muy bajo (recomendado: > 0.5 POL)');
        console.log('   Puede que no alcance para muchas transacciones\n');
      } else if (balanceFloat < 0.5) {
        console.log('\n   ⚠️  Balance bajo (recomendado: > 0.5 POL)\n');
      } else {
        console.log('\n   ✅ Balance suficiente para anclajes\n');
      }
    }

    // 4. Contract Address
    const contractAddress = await question('4. Ingresa tu POLYGON_CONTRACT_ADDRESS [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]: ');
    const finalContractAddress = contractAddress.trim() || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

    if (!ethers.isAddress(finalContractAddress)) {
      console.error('\n❌ Dirección de contrato inválida\n');
      rl.close();
      return;
    }

    console.log(`   ✅ Contrato: ${finalContractAddress}\n`);

    // 5. Resumen
    console.log('\n═══════════════════════════════════════════');
    console.log('📋 RESUMEN DE CONFIGURACIÓN\n');
    console.log(`ALCHEMY_RPC_URL=${rpcUrl}`);
    console.log(`SPONSOR_PRIVATE_KEY=${formattedKey.substring(0, 10)}...${formattedKey.substring(formattedKey.length - 4)}`);
    console.log(`POLYGON_CONTRACT_ADDRESS=${finalContractAddress}\n`);

    // 6. Generar comando de configuración
    console.log('═══════════════════════════════════════════');
    console.log('🚀 CONFIGURAR EN SUPABASE\n');
    console.log('Ejecuta estos comandos:\n');
    console.log(`supabase secrets set ALCHEMY_RPC_URL="${rpcUrl}"`);
    console.log(`supabase secrets set SPONSOR_PRIVATE_KEY="${formattedKey}"`);
    console.log(`supabase secrets set POLYGON_CONTRACT_ADDRESS="${finalContractAddress}"`);
    console.log('\n');

    // 7. Test de transacción (opcional)
    const testTx = await question('¿Deseas probar una transacción de anclaje? (s/n): ');

    if (testTx.toLowerCase() === 's') {
      if (balance === 0n) {
        console.log('\n❌ No se puede probar: wallet sin fondos\n');
      } else {
        console.log('\n🔄 Probando anclaje en Polygon...');

        try {
          const abi = ['function anchorDocument(bytes32 _docHash) external'];
          const contract = new ethers.Contract(finalContractAddress, abi, wallet);

          // Hash de prueba
          const testHash = '0x' + '0'.repeat(64);

          console.log('   Enviando transacción...');
          const tx = await contract.anchorDocument(testHash);
          console.log(`   📡 TX enviada: ${tx.hash}`);
          console.log('   Esperando confirmación...');

          const receipt = await tx.wait(1);
          console.log(`   ✅ Confirmado en bloque: ${receipt.blockNumber}`);
          console.log(`   🔗 Ver en Polygonscan: https://polygonscan.com/tx/${receipt.hash}\n`);

          const gasUsed = receipt.gasUsed;
          const gasPrice = tx.gasPrice;
          const costPOL = ethers.formatEther(gasUsed * gasPrice);
          console.log(`   💸 Costo de gas: ${costPOL} POL\n`);

        } catch (error) {
          console.error('\n❌ Error al anclar:');
          console.error(`   ${error.message}\n`);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Error inesperado:', error.message);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
