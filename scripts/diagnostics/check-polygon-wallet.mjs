import { ethers } from 'ethers';

// Get private key from Supabase (already verified it exists)
const privateKey = process.env.POLYGON_PRIVATE_KEY;
const rpcUrl = process.env.POLYGON_RPC_URL;

if (!privateKey || !rpcUrl) {
  console.error('❌ Missing POLYGON_PRIVATE_KEY or POLYGON_RPC_URL');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const address = await wallet.getAddress();

console.log('🔑 Wallet Address:', address);

const balance = await provider.getBalance(address);
const balanceInPol = ethers.formatEther(balance);

console.log('💰 Balance:', balanceInPol, 'POL');
console.log('💰 Balance (wei):', balance.toString());

if (balance === 0n) {
  console.log('❌ Wallet has ZERO balance - needs funding!');
  process.exit(1);
} else {
  console.log('✅ Wallet has funds');
  
  // Estimate gas for a transaction
  const gasPrice = await provider.getFeeData();
  console.log('⛽ Current gas price:', ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei'), 'gwei');
  
  // Rough estimate: 50,000 gas for anchorDocument call
  const estimatedGas = 50000n;
  const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0n);
  const estimatedCostPol = ethers.formatEther(estimatedCost);
  
  console.log('⛽ Estimated cost per transaction:', estimatedCostPol, 'POL');
  
  const possibleTxs = balance / estimatedCost;
  console.log('📊 Estimated transactions possible:', possibleTxs.toString());
}
