/**
 * Deploy DigitalNotary contract to Polygon Mainnet
 */

import { ethers } from 'ethers';
import fs from 'fs';

// Load compiled contract
const compiled = JSON.parse(fs.readFileSync('/home/manu/ecosign/compiled-contract.json', 'utf8'));
const BYTECODE = compiled.bytecode;
const ABI = compiled.abi;

async function deployContract() {
  console.log('🚀 Deploying DigitalNotary to Polygon Mainnet\n');

  // Load config
  const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://polygon-rpc.com';
  const PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY;

  if (!PRIVATE_KEY) {
    throw new Error('SPONSOR_PRIVATE_KEY not set in environment');
  }

  // Connect to Polygon
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const deployer = new ethers.Wallet(PRIVATE_KEY, provider);
  const deployerAddress = await deployer.getAddress();

  console.log('📝 Deployer address:', deployerAddress);

  // Check balance
  const balance = await provider.getBalance(deployerAddress);
  const balancePOL = ethers.formatEther(balance);
  console.log('💰 Balance:', balancePOL, 'POL');

  if (balance === 0n) {
    throw new Error('Deployer has no POL for gas!');
  }

  // Get network info
  const network = await provider.getNetwork();
  console.log('🌐 Network:', network.name, '(chainId:', network.chainId.toString() + ')');

  if (network.chainId !== 137n) {
    throw new Error('Not connected to Polygon Mainnet! ChainId should be 137');
  }

  // Create contract factory
  console.log('\n📦 Preparing contract deployment...');
  const factory = new ethers.ContractFactory(ABI, BYTECODE, deployer);

  // Estimate gas
  const deployTransaction = factory.getDeployTransaction();
  const estimatedGas = await provider.estimateGas(deployTransaction);
  const feeData = await provider.getFeeData();
  const estimatedCost = estimatedGas * feeData.gasPrice;

  console.log('⛽ Estimated gas:', estimatedGas.toString());
  console.log('💸 Estimated cost:', ethers.formatEther(estimatedCost), 'POL');

  // Deploy
  console.log('\n🔨 Deploying contract...');
  const contract = await factory.deploy();

  console.log('⏳ Waiting for deployment transaction...');
  console.log('📤 TX Hash:', contract.deploymentTransaction().hash);

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log('\n✅ Contract deployed successfully!');
  console.log('━'.repeat(60));
  console.log('📍 Contract Address:', contractAddress);
  console.log('🔍 PolygonScan:', `https://polygonscan.com/address/${contractAddress}`);
  console.log('━'.repeat(60));

  // Save to file
  const deployment = {
    network: 'polygon-mainnet',
    chainId: 137,
    contractAddress: contractAddress,
    deployedBy: deployerAddress,
    deployedAt: new Date().toISOString(),
    txHash: contract.deploymentTransaction().hash,
    abi: ABI
  };

  fs.writeFileSync(
    '/home/manu/ecosign/contract-deployment.json',
    JSON.stringify(deployment, null, 2)
  );

  console.log('\n💾 Deployment info saved to contract-deployment.json');
  console.log('\n🎯 Next step: Update Supabase secret');
  console.log(`   supabase secrets set POLYGON_CONTRACT_ADDRESS="${contractAddress}" --project-ref uiyojopjbhooxrmamaiw`);

  return contractAddress;
}

// Run
deployContract().catch(console.error);
