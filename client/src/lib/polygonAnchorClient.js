/**
 * Polygon Anchoring - Client Side (MetaMask)
 *
 * El usuario firma directamente con su wallet MetaMask
 * y paga el gas en POL. No se usa private key del servidor.
 */

import { ethers } from 'ethers';
import { supabase } from './supabaseClient';

// Configuración de Polygon Mainnet
const POLYGON_CHAIN_ID = '0x89'; // 137 en hexadecimal
const POLYGON_CHAIN_ID_DECIMAL = 137;
const POLYGON_RPC_URL = 'https://polygon-rpc.com'; // Fallback público

// ABI mínimo - Solo la función que necesitamos
const ANCHOR_CONTRACT_ABI = [
  'function anchorDocument(bytes32 _docHash) external',
  'event Anchored(bytes32 indexed docHash, address indexed signer, uint256 timestamp)'
];

/**
 * Verifica si el usuario tiene MetaMask instalado
 * @returns {boolean}
 */
export function hasMetaMask() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Conecta la wallet del usuario
 * @returns {Promise<string>} Dirección de la wallet conectada
 */
export async function connectWallet() {
  if (!hasMetaMask()) {
    throw new Error('MetaMask no está instalado. Por favor instalá MetaMask para continuar.');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    console.log('✅ Wallet conectada:', address);
    return address;
  } catch (error) {
    console.error('Error conectando wallet:', error);
    throw new Error('No se pudo conectar la wallet. El usuario rechazó la conexión.');
  }
}

/**
 * Cambia la red a Polygon Mainnet
 * @returns {Promise<boolean>} true si se cambió exitosamente
 */
export async function switchToPolygon() {
  if (!hasMetaMask()) {
    throw new Error('MetaMask no está instalado');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    // Ya está en Polygon
    if (network.chainId === BigInt(POLYGON_CHAIN_ID_DECIMAL)) {
      console.log('✅ Ya estás en Polygon Mainnet');
      return true;
    }

    // Intentar cambiar a Polygon
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID }],
      });
      console.log('✅ Cambiado a Polygon Mainnet');
      return true;
    } catch (switchError) {
      // Error 4902: la red no está agregada, intentar agregarla
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_CHAIN_ID,
              chainName: 'Polygon Mainnet',
              nativeCurrency: {
                name: 'POL',
                symbol: 'POL',
                decimals: 18
              },
              rpcUrls: [POLYGON_RPC_URL],
              blockExplorerUrls: ['https://polygonscan.com']
            }]
          });
          console.log('✅ Polygon Mainnet agregada y seleccionada');
          return true;
        } catch (addError) {
          console.error('Error agregando Polygon:', addError);
          throw new Error('No se pudo agregar Polygon Mainnet a MetaMask');
        }
      }
      throw switchError;
    }
  } catch (error) {
    console.error('Error cambiando a Polygon:', error);
    throw new Error('Por favor cambia manualmente a la red Polygon Mainnet en MetaMask');
  }
}

/**
 * Ancla un hash de documento en Polygon usando la wallet del usuario
 *
 * @param {string} documentHash - Hash SHA-256 del documento (hex de 64 caracteres)
 * @param {string} contractAddress - Dirección del smart contract en Polygon
 * @param {Object} options - Opciones adicionales
 * @param {string} options.documentId - ID del documento en Supabase
 * @param {string} options.userId - ID del usuario
 * @param {string} options.userEmail - Email para notificación
 * @param {Object} options.metadata - Metadata adicional
 * @returns {Promise<Object>} Resultado del anclaje
 */
export async function anchorDocumentWithWallet(documentHash, contractAddress, options = {}) {
  try {
    console.log('🔗 Iniciando anclaje en Polygon con MetaMask...');
    console.log('📄 Document hash:', documentHash);
    console.log('📝 Contract:', contractAddress);

    // 1. Verificar MetaMask
    if (!hasMetaMask()) {
      throw new Error('MetaMask no está instalado. Instalá MetaMask para anclar en blockchain.');
    }

    // 2. Validar hash
    if (!documentHash || !/^[a-f0-9]{64}$/i.test(documentHash)) {
      throw new Error('Hash inválido. Debe ser un hash SHA-256 en hexadecimal.');
    }

    // 3. Validar dirección del contrato
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error('Dirección de contrato inválida');
    }

    // 4. Conectar wallet
    const walletAddress = await connectWallet();

    // 5. Asegurar que estamos en Polygon
    await switchToPolygon();

    // 6. Preparar provider y signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 7. Instanciar contrato
    const contract = new ethers.Contract(contractAddress, ANCHOR_CONTRACT_ABI, signer);

    // 8. Convertir hash a bytes32
    const hashBytes32 = '0x' + documentHash;

    // 9. Guardar en DB como "pending" antes de enviar tx
    const { data: anchorRecord, error: dbError } = await supabase
      .from('anchors')
      .insert({
        document_hash: documentHash.toLowerCase(),
        document_id: options.documentId || null,
        user_id: options.userId || null,
        user_email: options.userEmail || null,
        anchor_type: 'polygon',
        anchor_status: 'pending',
        metadata: {
          ...options.metadata,
          requestedAt: new Date().toISOString(),
          source: 'wallet-client',
          network: 'polygon-mainnet',
          contractAddress: contractAddress,
          signerAddress: walletAddress
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error guardando anchor en DB:', dbError);
      throw new Error('Error guardando registro del anchor');
    }

    const anchorId = anchorRecord.id;
    console.log('✅ Anchor guardado en DB:', anchorId);

    // 10. Enviar transacción (MetaMask pedirá confirmación al usuario)
    console.log('📤 Enviando transacción a Polygon...');
    const tx = await contract.anchorDocument(hashBytes32);

    console.log('🔄 Transacción enviada:', tx.hash);
    console.log('⏳ Esperando confirmación en blockchain...');

    // 11. Actualizar DB con hash de transacción
    await supabase
      .from('anchors')
      .update({
        anchor_status: 'processing',
        metadata: {
          ...anchorRecord.metadata,
          txHash: tx.hash,
          txSentAt: new Date().toISOString()
        }
      })
      .eq('id', anchorId);

    // 12. Esperar confirmación (1 confirmación)
    const receipt = await tx.wait(1);

    console.log('✅ Transacción confirmada!');
    console.log('📦 Block:', receipt.blockNumber);
    console.log('⛽ Gas usado:', receipt.gasUsed.toString());

    // 13. Actualizar DB con estado "confirmed"
    const { data: updatedAnchor, error: updateError } = await supabase
      .from('anchors')
      .update({
        anchor_status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        metadata: {
          ...anchorRecord.metadata,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString(),
          confirmedAt: new Date().toISOString(),
          contractAddress: contractAddress,
          signerAddress: walletAddress
        }
      })
      .eq('id', anchorId)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando anchor:', updateError);
    }

    const explorerUrl = `https://polygonscan.com/tx/${receipt.hash}`;

    return {
      success: true,
      anchorId: anchorId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: explorerUrl,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      message: 'Documento anclado exitosamente en Polygon',
      proof: {
        network: 'polygon-mainnet',
        chainId: POLYGON_CHAIN_ID_DECIMAL,
        contractAddress: contractAddress,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        signer: walletAddress,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Error anclando en Polygon:', error);

    // Mensajes de error amigables
    let errorMessage = 'Error al anclar en Polygon';

    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      errorMessage = 'Transacción cancelada por el usuario';
    } else if (error.message?.includes('insufficient funds')) {
      errorMessage = 'Fondos insuficientes para pagar el gas. Necesitás POL en tu wallet.';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Error de red. Verificá tu conexión a Polygon.';
    } else {
      errorMessage = error.message || errorMessage;
    }

    return {
      success: false,
      error: errorMessage,
      details: error.message
    };
  }
}

/**
 * Obtiene el balance de POL de la wallet conectada
 * @returns {Promise<string>} Balance en POL
 */
export async function getPolBalance() {
  if (!hasMetaMask()) {
    throw new Error('MetaMask no está instalado');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);

  return ethers.formatEther(balance);
}

/**
 * Estima el costo de gas para anclar un documento
 * @param {string} documentHash - Hash del documento
 * @param {string} contractAddress - Dirección del contrato
 * @returns {Promise<Object>} Estimación de gas
 */
export async function estimateAnchorCost(documentHash, contractAddress) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, ANCHOR_CONTRACT_ABI, signer);

    const hashBytes32 = '0x' + documentHash;
    const gasEstimate = await contract.anchorDocument.estimateGas(hashBytes32);
    const feeData = await provider.getFeeData();

    const gasCost = gasEstimate * feeData.gasPrice;
    const gasCostInPol = ethers.formatEther(gasCost);

    return {
      gasLimit: gasEstimate.toString(),
      gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
      estimatedCost: gasCostInPol,
      currency: 'POL'
    };
  } catch (error) {
    console.error('Error estimando costo:', error);
    return {
      gasLimit: 'unknown',
      gasPrice: 'unknown',
      estimatedCost: '~0.001',
      currency: 'POL'
    };
  }
}
