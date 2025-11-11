import asn1 from 'asn1.js';
import { Buffer } from 'buffer';

// --- ASN.1 definitions (minimal subset needed to reach TSTInfo) ---
const AlgorithmIdentifier = asn1.define('AlgorithmIdentifier', function () {
  this.seq().obj(
    this.key('algorithm').objid(),
    this.key('parameters').optional().any()
  );
});

const MessageImprint = asn1.define('MessageImprint', function () {
  this.seq().obj(
    this.key('hashAlgorithm').use(AlgorithmIdentifier),
    this.key('hashedMessage').octstr()
  );
});

const Accuracy = asn1.define('Accuracy', function () {
  this.seq().obj(
    this.key('seconds').optional().int(),
    this.key('millis').optional().int(),
    this.key('micros').optional().int()
  );
});

const TSTInfo = asn1.define('TSTInfo', function () {
  this.seq().obj(
    this.key('version').int(),
    this.key('policy').objid(),
    this.key('messageImprint').use(MessageImprint),
    this.key('serialNumber').int(),
    this.key('genTime').gentime(),
    this.key('accuracy').optional().use(Accuracy),
    this.key('ordering').optional().bool(),
    this.key('nonce').optional().int(),
    this.key('tsa').optional().explicit(0).any(),
    this.key('extensions').optional().explicit(1).any()
  );
});

const EncapsulatedContentInfo = asn1.define('EncapsulatedContentInfo', function () {
  this.seq().obj(
    this.key('eContentType').objid(),
    this.key('eContent').optional().explicit(0).octstr()
  );
});

const SignerInfo = asn1.define('SignerInfo', function () {
  this.seq().obj(
    this.key('version').int(),
    this.key('sid').any(),
    this.key('digestAlgorithm').use(AlgorithmIdentifier),
    this.key('signedAttrs').optional().implicit(0).any(),
    this.key('signatureAlgorithm').use(AlgorithmIdentifier),
    this.key('signature').octstr(),
    this.key('unsignedAttrs').optional().implicit(1).any()
  );
});

const ContentInfo = asn1.define('ContentInfo', function () {
  this.seq().obj(
    this.key('contentType').objid(),
    this.key('content').optional().explicit(0).any()
  );
});

const SignedData = asn1.define('SignedData', function () {
  this.seq().obj(
    this.key('version').int(),
    this.key('digestAlgorithms').setof(AlgorithmIdentifier),
    this.key('encapContentInfo').use(EncapsulatedContentInfo),
    this.key('certificates').optional().implicit(0).any(),
    this.key('crls').optional().implicit(1).any(),
    this.key('signerInfos').setof(SignerInfo)
  );
});

const PKIStatusInfo = asn1.define('PKIStatusInfo', function () {
  this.seq().obj(
    this.key('status').int(),
    this.key('statusString').optional().any(),
    this.key('failInfo').optional().bitstr()
  );
});

const TimeStampResp = asn1.define('TimeStampResp', function () {
  this.seq().obj(
    this.key('status').use(PKIStatusInfo),
    this.key('timeStampToken').optional().use(ContentInfo)
  );
});

const HASH_OIDS = {
  '1.3.14.3.2.26': 'SHA-1',
  '2.16.840.1.101.3.4.2.1': 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512'
};

const base64Cleanup = /\s+/g;

function normalizeHex(hex) {
  return hex ? hex.toLowerCase() : null;
}

function bufferFromBase64(base64) {
  if (!base64) throw new Error('TSR token vacío');
  return Buffer.from(base64.replace(base64Cleanup, ''), 'base64');
}

function bufferToHex(data) {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data.toString('hex');
  if (data instanceof Uint8Array) return Buffer.from(data).toString('hex');
  return Buffer.from(data).toString('hex');
}

function bnToString(value) {
  if (!value) return null;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value.toString === 'function') return value.toString();
  return null;
}

function parseJsonToken(base64) {
  try {
    const jsonString = Buffer.from(base64, 'base64').toString('utf8');
    const data = JSON.parse(jsonString);
    return data && data.hashedMessage ? data : null;
  } catch (error) {
    return null;
  }
}

function accuracyToObject(accuracy) {
  if (!accuracy) return null;
  return {
    seconds: accuracy.seconds ? Number(accuracy.seconds) : null,
    millis: accuracy.millis ? Number(accuracy.millis) : null,
    micros: accuracy.micros ? Number(accuracy.micros) : null
  };
}

function extractTSTInfoFromSignedData(signedData) {
  if (!signedData || !signedData.encapContentInfo) {
    throw new Error('SignedData sin EncapsulatedContentInfo');
  }

  const eContent = signedData.encapContentInfo.eContent;
  if (!eContent) {
    throw new Error('El SignedData no contiene TSTInfo');
  }

  const buffer = Buffer.isBuffer(eContent) ? eContent : Buffer.from(eContent);
  const tstInfo = TSTInfo.decode(buffer, 'der');
  return { tstInfo };
}

function extractTSTInfoFromContentInfo(contentInfo) {
  if (!contentInfo || !contentInfo.content) {
    throw new Error('ContentInfo vacío');
  }

  const contentBuffer = Buffer.isBuffer(contentInfo.content) ? contentInfo.content : Buffer.from(contentInfo.content);
  const signedData = SignedData.decode(contentBuffer, 'der');
  return { ...extractTSTInfoFromSignedData(signedData), signedData };
}

function decodeDerToken(buffer) {
  const attempts = [];

  const decoders = [
    () => {
      const resp = TimeStampResp.decode(buffer, 'der');
      if (!resp.timeStampToken) {
        throw new Error('La respuesta TSA no trae token');
      }
      const contentResult = extractTSTInfoFromContentInfo(resp.timeStampToken);
      return { format: 'TimeStampResp', status: resp.status?.status, ...contentResult };
    },
    () => {
      const contentInfo = ContentInfo.decode(buffer, 'der');
      const contentResult = extractTSTInfoFromContentInfo(contentInfo);
      return { format: 'ContentInfo', ...contentResult };
    },
    () => {
      const signedData = SignedData.decode(buffer, 'der');
      return { format: 'SignedData', ...extractTSTInfoFromSignedData(signedData) };
    },
    () => {
      const tstInfo = TSTInfo.decode(buffer, 'der');
      return { format: 'TSTInfo', tstInfo };
    }
  ];

  for (const decoder of decoders) {
    try {
      return { ...decoder(), errors: attempts };
    } catch (error) {
      attempts.push(error.message);
    }
  }

  throw new Error(`No se pudo parsear el token TSR (${attempts.join(' | ')})`);
}

function buildResultFromTST(tstInfo, meta, expectedHashHex) {
  if (!tstInfo || !tstInfo.messageImprint) {
    throw new Error('TSTInfo inválido');
  }

  const normalizedExpected = normalizeHex(expectedHashHex);
  const tokenHash = normalizeHex(bufferToHex(tstInfo.messageImprint.hashedMessage));
  const hashMatches = normalizedExpected && tokenHash
    ? tokenHash === normalizedExpected
    : null;

  const timestamp = tstInfo.genTime instanceof Date
    ? tstInfo.genTime.toISOString()
    : tstInfo.genTime;

  const algoOid = tstInfo.messageImprint.hashAlgorithm?.algorithm;
  const algorithmName = algoOid && HASH_OIDS[algoOid] ? HASH_OIDS[algoOid] : 'Desconocido';

  const success = hashMatches === null ? !!tokenHash : hashMatches;

  const message = hashMatches === true
    ? 'Hash sellado coincide con el manifiesto'
    : hashMatches === false
      ? 'Hash sellado NO coincide con el manifiesto'
      : 'Token decodificado (hash no comparado)';

  return {
    success,
    hashMatches,
    tokenHash,
    expectedHash: normalizedExpected,
    timestamp,
    policy: tstInfo.policy || null,
    serialNumber: bnToString(tstInfo.serialNumber),
    algorithmOid: algoOid,
    algorithmName,
    accuracy: accuracyToObject(tstInfo.accuracy),
    nonce: bnToString(tstInfo.nonce),
    meta
  };
}

/**
 * Verifica un token RFC 3161 (TSR) comparando el hash sellado con el esperado.
 * Maneja dos formatos: mocks JSON (MVP) y DER reales.
 */
export async function verifyTSRToken(tsrTokenB64, expectedHashHex) {
  if (!tsrTokenB64) {
    throw new Error('No se recibió token TSR para verificación');
  }

  // 1) Modo legacy (mock JSON usado por el MVP)
  const mockToken = parseJsonToken(tsrTokenB64);
  if (mockToken) {
    const normalizedExpected = normalizeHex(expectedHashHex);
    const tokenHash = normalizeHex(mockToken.hashedMessage);
    const hashMatches = normalizedExpected && tokenHash
      ? tokenHash === normalizedExpected
      : null;

    const message = hashMatches === true
      ? 'Hash sellado coincide con el manifiesto (mock TSA)'
      : hashMatches === false
        ? 'Hash sellado no coincide (mock TSA)'
        : 'Token mock decodificado (hash no comparado)';

    return {
      success: hashMatches === null ? !!tokenHash : hashMatches,
      hashMatches,
      tokenHash,
      expectedHash: normalizedExpected,
      timestamp: mockToken.genTime || null,
      policy: mockToken.policy || null,
      algorithmName: mockToken.hashAlgorithm || 'SHA-256',
      algorithmOid: null,
      serialNumber: mockToken.serialNumber ? String(mockToken.serialNumber) : null,
      format: 'JSON',
      message,
      accuracy: mockToken.accuracy || null,
      meta: {
        tsa: mockToken.tsa || null,
        simplified: true
      }
    };
  }

  // 2) Intentar parsear DER real
  const buffer = bufferFromBase64(tsrTokenB64);
  const decoded = decodeDerToken(buffer);

  const result = buildResultFromTST(decoded.tstInfo, {
    format: decoded.format,
    status: decoded.status,
    errors: decoded.errors || []
  }, expectedHashHex);

  return {
    ...result,
    format: decoded.format,
    message: result.hashMatches === false
      ? 'El hash dentro del TSR no coincide con el manifest'
      : result.hashMatches === true
        ? 'Token RFC 3161 válido'
        : 'Token RFC 3161 decodificado'
  };
}
