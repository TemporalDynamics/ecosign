/**
 * Polygon Anchoring Service
 * Cliente para anclar hashes en Polygon Mainnet via Edge Functions
 */

import { supabase } from './supabaseClient';

/**
 * Anclar un hash en Polygon Mainnet
 * @param {string} documentHash - Hash SHA-256 (hex string de 64 caracteres)
 * @param {Object} options - Opciones adicionales
 * @param {string} options.documentId - ID del documento en Supabase
 * @param {string} options.userId - ID del usuario
 * @param {string} options.userEmail - Email para notificación
 * @param {Object} options.metadata - Metadata adicional
 * @returns {Promise<Object>} Resultado del anchoring
 */
export async function anchorToPolygon(documentHash, options = {}) {
  try {
    console.log('🔗 Requesting Polygon anchor for hash:', documentHash);

    // Validar hash
    if (!documentHash || !/^[a-f0-9]{64}$/i.test(documentHash)) {
      throw new Error('Invalid document hash. Must be SHA-256 hex string.');
    }

    // Llamar a Edge Function
    const { data, error } = await supabase.functions.invoke('anchor-polygon', {
      body: {
        documentHash: documentHash.toLowerCase(),
        documentId: options.documentId || null,
        userId: options.userId || null,
        userEmail: options.userEmail || null,
        metadata: {
          ...options.metadata,
          requestedFrom: 'polygonAnchor.js',
          clientTimestamp: new Date().toISOString()
        }
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to anchor to Polygon');
    }

    if (!data) {
      throw new Error('No response from Polygon anchor service');
    }

    console.log('✅ Polygon anchor response:', data);

    return {
      success: true,
      anchorId: data.anchorId,
      status: data.status, // 'confirmed' | 'pending' | 'queued'
      txHash: data.txHash,
      blockNumber: data.blockNumber,
      timestamp: data.timestamp,
      explorerUrl: data.explorerUrl,
      estimatedTime: data.estimatedTime,
      proof: data.proof,
      message: data.message
    };

  } catch (error) {
    console.error('❌ Polygon anchoring error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during Polygon anchoring'
    };
  }
}

/**
 * Verificar si un hash está anclado en Polygon
 * @param {string} documentHash - Hash SHA-256 a verificar
 * @returns {Promise<Object>} Estado del anchor
 */
export async function verifyPolygonAnchor(documentHash) {
  try {
    // Consultar directamente la DB de anchors
    const { data, error } = await supabase
      .from('anchors')
      .select('*')
      .eq('document_hash', documentHash.toLowerCase())
      .eq('anchor_type', 'polygon')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        anchored: false,
        message: 'Hash not found in Polygon anchors'
      };
    }

    return {
      anchored: data.anchor_status === 'confirmed',
      status: data.anchor_status,
      anchorId: data.id,
      txHash: data.metadata?.txHash,
      blockNumber: data.metadata?.blockNumber,
      timestamp: data.confirmed_at || data.created_at,
      explorerUrl: data.metadata?.txHash
        ? `https://polygonscan.com/tx/${data.metadata.txHash}`
        : null,
      proof: {
        network: 'polygon-mainnet',
        contractAddress: data.metadata?.contractAddress,
        txHash: data.metadata?.txHash,
        blockNumber: data.metadata?.blockNumber,
        blockHash: data.metadata?.blockHash,
        timestamp: data.confirmed_at
      }
    };

  } catch (error) {
    console.error('Error verifying Polygon anchor:', error);
    return {
      anchored: false,
      error: error.message
    };
  }
}

/**
 * Obtener el estado de un anchor por su ID
 * @param {string} anchorId - UUID del anchor
 * @returns {Promise<Object>} Estado del anchor
 */
export async function getAnchorStatus(anchorId) {
  try {
    const { data, error } = await supabase
      .from('anchors')
      .select('*')
      .eq('id', anchorId)
      .single();

    if (error || !data) {
      throw new Error('Anchor not found');
    }

    return {
      id: data.id,
      status: data.anchor_status,
      type: data.anchor_type,
      documentHash: data.document_hash,
      txHash: data.metadata?.txHash,
      blockNumber: data.metadata?.blockNumber,
      confirmedAt: data.confirmed_at,
      createdAt: data.created_at,
      explorerUrl: data.metadata?.txHash
        ? `https://polygonscan.com/tx/${data.metadata.txHash}`
        : null
    };

  } catch (error) {
    console.error('Error getting anchor status:', error);
    throw error;
  }
}

/**
 * Listar todos los anchors de un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<Array>} Lista de anchors
 */
export async function listUserAnchors(userId, options = {}) {
  try {
    let query = supabase
      .from('anchors')
      .select('*')
      .eq('user_id', userId);

    if (options.type) {
      query = query.eq('anchor_type', options.type);
    }

    if (options.status) {
      query = query.eq('anchor_status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(anchor => ({
      id: anchor.id,
      documentHash: anchor.document_hash,
      status: anchor.anchor_status,
      type: anchor.anchor_type,
      txHash: anchor.metadata?.txHash,
      blockNumber: anchor.metadata?.blockNumber,
      confirmedAt: anchor.confirmed_at,
      createdAt: anchor.created_at,
      explorerUrl: anchor.metadata?.txHash && anchor.anchor_type === 'polygon'
        ? `https://polygonscan.com/tx/${anchor.metadata.txHash}`
        : null
    }));

  } catch (error) {
    console.error('Error listing anchors:', error);
    return [];
  }
}
