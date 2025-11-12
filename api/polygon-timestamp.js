import { ethers } from 'ethers';

// Contract ABI (copia del output de Hardhat)
const CONTRACT_ABI = [
  "function register(bytes32 documentHash) public",
  "function verify(bytes32 documentHash) public view returns (bool exists, uint256 timestamp, uint256 blockNumber)",
  "event Timestamped(bytes32 indexed documentHash, uint256 timestamp, uint256 blockNumber, address indexed submitter)"
];

const CONTRACT_ADDRESS = process.env.POLYGON_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, hash } = req.body;

    // Setup provider
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    if (action === 'register') {
      console.log('⛓️ Registering on Polygon:', hash);

      // Convert hex hash to bytes32
      const hashBytes = ethers.keccak256('0x' + hash);

      // Send transaction
      const tx = await contract.register(hashBytes);
      console.log('  TX sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Confirmed in block:', receipt.blockNumber);

      return res.json({
        success: true,
        blockchain: 'Polygon',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date().toISOString(),
        explorerUrl: `https://polygonscan.com/tx/${tx.hash}`
      });
    }

    if (action === 'verify') {
      console.log('🔍 Verifying on Polygon:', hash);

      const hashBytes = ethers.keccak256('0x' + hash);
      const result = await contract.verify(hashBytes);

      if (result.exists) {
        return res.json({
          valid: true,
          blockchain: 'Polygon',
          timestamp: new Date(Number(result.timestamp) * 1000).toISOString(),
          blockNumber: Number(result.blockNumber),
          explorerUrl: `https://polygonscan.com/block/${result.blockNumber}`
        });
      } else {
        return res.json({
          valid: false,
          message: 'Not registered on Polygon'
        });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('❌ Polygon error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}