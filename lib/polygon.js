// lib/polygon.js
import { ethers } from 'ethers';

// Contract ABI (copia del output de Hardhat)
const CONTRACT_ABI = [
  "function register(bytes32 documentHash) public",
  "function verify(bytes32 documentHash) public view returns (bool exists, uint256 timestamp, uint256 blockNumber)",
  "event Timestamped(bytes32 indexed documentHash, uint256 timestamp, uint256 blockNumber, address indexed submitter)"
];

const CONTRACT_ADDRESS = process.env.POLYGON_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;

export async function register(hash) {
  // Setup provider
  const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  console.log('⛓️ Registering on Polygon:', hash);

  // Convert hex hash to bytes32
  const hashBytes = ethers.keccak256('0x' + hash);

  // Send transaction
  const tx = await contract.register(hashBytes);
  console.log('  TX sent:', tx.hash);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log('✅ Confirmed in block:', receipt.blockNumber);

  return {
    success: true,
    blockchain: 'Polygon',
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date().toISOString(),
    explorerUrl: `https://polygonscan.com/tx/${tx.hash}`
  };
}
