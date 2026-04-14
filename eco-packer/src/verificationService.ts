// Verification utilities for CLI / Node.js environments
// Provides full RFC 3161 verification (PKCS#7 parsing + hash comparison)

export interface TSRVerificationOptions {
  /** Optional trust anchors (PEM) to validate the TSA certificate chain. */
  trustedRootsPem?: string[];
}

export interface TSRVerificationResult {
  ok: boolean;
  statusCode?: number;
  statusDescription?: string;
  hashMatches: boolean | null;
  signatureVerified: boolean;
  trustChainVerified: boolean;
  timestamp?: string;
  policy?: string;
  serialNumber?: string;
  tokenHash?: string;
  expectedHash?: string | null;
  hashAlgorithmOid?: string;
  accuracy?: {
    seconds?: number | null;
    millis?: number | null;
    micros?: number | null;
  } | null;
  tsaSubject?: string;
  warnings: string[];
  errors: string[];
}

type ForgeModule = any;

interface SignatureCheckResult {
  signatureVerified: boolean;
  trustChainVerified: boolean;
  tsaSubject?: string;
  warnings: string[];
  errors: string[];
}

let forgePromise: Promise<ForgeModule> | null = null;

async function loadForge(): Promise<ForgeModule> {
  if (!forgePromise) {
    forgePromise = import('node-forge')
      .then(module => (module as unknown as { default?: ForgeModule }).default ?? (module as unknown as ForgeModule))
      .catch(error => {
        forgePromise = null;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `node-forge is required for verifyTSRWithForge but could not be loaded (${message}).\n` +
          'Run `cd eco-packer && npm install node-forge` before executing the CLI verification.'
        );
      });
  }
  return forgePromise;
}

function normalizeHex(value?: string | null): string | null {
  return value ? value.toLowerCase() : null;
}

function parseGeneralizedTime(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.endsWith('Z') ? raw.slice(0, -1) : raw;
  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\.\d+)?$/);
  if (!match) {
    return raw;
  }
  const [, year, month, day, hour, minute, second, fraction] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${fraction ?? ''}Z`;
}

function bigIntToDecimal(forge: ForgeModule, node: any | undefined): string | undefined {
  if (!node || !node.value) {
    return undefined;
  }
  const hex = forge.util.bytesToHex(node.value as string);
  if (!hex) {
    return undefined;
  }
  const bigInt = new forge.jsbn.BigInteger(hex, 16);
  return bigInt.toString();
}

function parseAccuracyNode(node: any | undefined): TSRVerificationResult['accuracy'] {
  if (!node || !Array.isArray(node.value)) {
    return null;
  }
  const [secondsNode, millisNode, microsNode] = node.value;
  const seconds = secondsNode?.value ? Number(secondsNode.value) : null;
  const millis = millisNode?.value ? Number(millisNode.value) : null;
  const micros = microsNode?.value ? Number(microsNode.value) : null;
  if (seconds === null && millis === null && micros === null) {
    return null;
  }
  return { seconds, millis, micros };
}

function parsePolicyOid(forge: ForgeModule, node: any | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  return forge.asn1.derToOid(node.value);
}

function parseStatusInfo(
  forge: ForgeModule,
  asn1Obj: any
): { contentInfo: any; statusInfo?: any } {
  if (!asn1Obj || asn1Obj.type !== forge.asn1.Type.SEQUENCE) {
    throw new Error('Invalid TSR structure: expected ASN.1 SEQUENCE');
  }

  const [first, second] = asn1Obj.value;
  const isTimeStampResp = first && first.type === forge.asn1.Type.SEQUENCE;

  if (isTimeStampResp) {
    if (!second) {
      throw new Error('TSA responded without a timeStampToken payload.');
    }
    return { contentInfo: second, statusInfo: first };
  }

  return { contentInfo: asn1Obj };
}

function extractTstInfo(forge: ForgeModule, contentInfo: any): { tstInfo: any; signedData: any } {
  if (!contentInfo || contentInfo.type !== forge.asn1.Type.SEQUENCE) {
    throw new Error('Invalid ContentInfo structure in TSR');
  }

  const explicitContent = contentInfo.value?.[1];
  if (!explicitContent || !Array.isArray(explicitContent.value) || explicitContent.value.length === 0) {
    throw new Error('ContentInfo missing SignedData payload');
  }

  const signedData = explicitContent.value[0];
  const encapContentInfo = signedData.value?.[2];
  if (!encapContentInfo) {
    throw new Error('SignedData missing encapContentInfo');
  }

  const eContentWrapper = encapContentInfo.value?.[1];
  if (!eContentWrapper || !eContentWrapper.value || eContentWrapper.value.length === 0) {
    throw new Error('encapContentInfo missing eContent');
  }

  const eContentOctet = eContentWrapper.value[0];
  const tstDer = forge.asn1.toDer(eContentOctet).getBytes();
  const tstInfo = forge.asn1.fromDer(tstDer);

  return { tstInfo, signedData };
}

function parseStatusCode(forge: ForgeModule, statusInfo: any): number | undefined {
  const statusNode = statusInfo?.value?.[0];
  if (!statusNode) {
    return undefined;
  }
  const hex = forge.util.bytesToHex(statusNode.value as string);
  if (!hex) {
    return undefined;
  }
  return parseInt(new forge.jsbn.BigInteger(hex, 16).toString(), 10);
}

function parseStatusDescription(statusInfo: any): string | undefined {
  const textNode = statusInfo?.value?.[1];
  if (!textNode || !Array.isArray(textNode.value)) {
    return undefined;
  }
  return textNode.value
    .map((inner: any) => inner.value)
    .filter(Boolean)
    .join(' ');
}

function bytesToHex(forge: ForgeModule, node: any | undefined): string | undefined {
  if (!node || typeof node.value !== 'string') {
    return undefined;
  }
  return forge.util.bytesToHex(node.value);
}

function createHashMismatchErrors(hashMatches: boolean | null): string[] {
  if (hashMatches === false) {
    return ['Hash sellado por la TSA no coincide con el hash del manifiesto'];
  }
  return [];
}

function parseMockToken(tsrTokenB64: string): Record<string, any> | null {
  try {
    const json = Buffer.from(tsrTokenB64, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && parsed.hashedMessage ? parsed : null;
  } catch {
    return null;
  }
}

function decodeCertificates(forge: ForgeModule, node: any | undefined): any[] {
  if (!node || !Array.isArray(node.value)) {
    return [];
  }
  return node.value.map((asn1Cert: any) => forge.pki.certificateFromAsn1(asn1Cert));
}

function normalizeSerial(serial?: string | null): string | undefined {
  if (!serial) {
    return undefined;
  }
  return serial.replace(/^0+/, '').toLowerCase();
}

function findSignerCertificate(forge: ForgeModule, certificates: any[], signerInfo: any): any | undefined {
  const sid = signerInfo.value?.[1];
  if (!sid) {
    return undefined;
  }
  const serialNode = sid.value?.[1];
  if (!serialNode) {
    return undefined;
  }
  const signerSerial = normalizeSerial(forge.util.bytesToHex(serialNode.value as string));
  if (!signerSerial) {
    return undefined;
  }
  return certificates.find(cert => normalizeSerial(cert.serialNumber) === signerSerial);
}

function buildMessageDigest(forge: ForgeModule, digestAlgorithmNode: any): any {
  const oidNode = digestAlgorithmNode?.value?.[0];
  if (!oidNode) {
    throw new Error('SignerInfo missing digest algorithm identifier');
  }
  const oid = forge.asn1.derToOid(oidNode.value);
  const hashName = forge.pki.oids[oid];
  const mdFactory = hashName ? forge.md[hashName] : undefined;
  if (!mdFactory) {
    throw new Error(`Unsupported digest algorithm OID: ${oid}`);
  }
  return mdFactory.create();
}

function buildChainForVerification(leaf: any, others: any[]): any[] {
  const rest = others.filter(cert => cert !== leaf);
  return [leaf, ...rest];
}

function describeSubject(cert: any): string | undefined {
  if (!cert?.subject?.attributes) {
    return undefined;
  }
  return cert.subject.attributes
    .map((attr: any) => {
      const name = attr.shortName || attr.name || 'attr';
      return `${name}=${attr.value}`;
    })
    .join(', ');
}

function verifyPkcs7Signature(
  forge: ForgeModule,
  signedData: any,
  options: TSRVerificationOptions
): SignatureCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const children = signedData.value ?? [];
  let pointer = 3; // version, digestAlgorithms, encapContentInfo already consumed

  let certificatesNode: any | undefined;
  let signerInfosNode: any | undefined;

  const possibleCertificates = children[pointer];
  if (
    possibleCertificates &&
    possibleCertificates.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC &&
    possibleCertificates.type === 0
  ) {
    certificatesNode = possibleCertificates;
    pointer += 1;
  }

  const possibleCrls = children[pointer];
  if (
    possibleCrls &&
    possibleCrls.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC &&
    possibleCrls.type === 1
  ) {
    pointer += 1; // skip CRLs if present
  }

  signerInfosNode = children[pointer];
  if (!signerInfosNode || !Array.isArray(signerInfosNode.value) || signerInfosNode.value.length === 0) {
    warnings.push('El token no incluye signerInfos válidos.');
    return { signatureVerified: false, trustChainVerified: false, warnings, errors };
  }

  const signerInfo = signerInfosNode.value[0];
  const certificates = decodeCertificates(forge, certificatesNode);
  const signerCert = findSignerCertificate(forge, certificates, signerInfo);

  if (!signerCert) {
    warnings.push('No se encontró el certificado del TSA dentro del token.');
    return { signatureVerified: false, trustChainVerified: false, warnings, errors };
  }

  const signedAttrsNode = signerInfo.value?.[3];
  if (!signedAttrsNode) {
    warnings.push('El signerInfo no contiene atributos firmados.');
    return { signatureVerified: false, trustChainVerified: false, warnings, errors };
  }

  const digestAlgorithmNode = signerInfo.value?.[2];
  let signatureVerified = false;

  try {
    const md = buildMessageDigest(forge, digestAlgorithmNode);
    const signedAttrsDer = forge.asn1.toDer(signedAttrsNode).getBytes();
    md.update(signedAttrsDer);
    const signatureNode = signerInfo.value?.[5];
    if (!signatureNode) {
      throw new Error('El signerInfo no contiene firma.');
    }
    signatureVerified = signerCert.publicKey.verify(md.digest().bytes(), signatureNode.value as string);
  } catch (error) {
    warnings.push(`Fallo al verificar la firma PKCS#7: ${error instanceof Error ? error.message : String(error)}`);
    signatureVerified = false;
  }

  let trustChainVerified = false;
  if (signatureVerified && options.trustedRootsPem?.length) {
    try {
      const caStore = forge.pki.createCaStore(options.trustedRootsPem);
      const chain = buildChainForVerification(signerCert, certificates);
      forge.pki.verifyCertificateChain(caStore, chain);
      trustChainVerified = true;
    } catch (error) {
      warnings.push(`No se pudo verificar la cadena del TSA: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    signatureVerified,
    trustChainVerified,
    tsaSubject: describeSubject(signerCert),
    warnings,
    errors
  };
}

export class VerificationService {
  /**
   * Verifies a RFC 3161 Time Stamp Token (TSR) inside the CLI/Node.js context.
   */
  static async verifyTSRWithForge(
    tsrTokenB64: string,
    expectedHashHex: string,
    options: TSRVerificationOptions = {}
  ): Promise<TSRVerificationResult> {
    if (!tsrTokenB64) {
      throw new Error('TSR token is required');
    }

    const normalizedExpected = normalizeHex(expectedHashHex);
    const mockToken = parseMockToken(tsrTokenB64);

    if (mockToken) {
      const tokenHashNormalized = normalizeHex(mockToken.hashedMessage);
      const hashMatches = normalizedExpected && tokenHashNormalized
        ? tokenHashNormalized === normalizedExpected
        : null;

      const warnings = ['Token simplificado (modo browser) – no contiene firma PKCS#7.'];
      const errors = hashMatches === false
        ? ['Hash sellado por el mock no coincide con el hash del manifiesto']
        : [];

      return {
        ok: hashMatches !== false,
        statusCode: 0,
        statusDescription: 'Mock timestamp (sin TSA real)',
        hashMatches,
        signatureVerified: hashMatches !== false,
        trustChainVerified: false,
        timestamp: mockToken.genTime,
        policy: mockToken.policy,
        serialNumber: mockToken.serialNumber ? String(mockToken.serialNumber) : undefined,
        tokenHash: mockToken.hashedMessage,
        expectedHash: normalizedExpected,
        hashAlgorithmOid: undefined,
        accuracy: mockToken.accuracy ?? null,
        tsaSubject: mockToken.tsa,
        warnings,
        errors
      };
    }

    const forge = await loadForge();
    const warnings: string[] = [];
    const errors: string[] = [];

    const asn1Response = forge.asn1.fromDer(forge.util.decode64(tsrTokenB64));
    const { contentInfo, statusInfo } = parseStatusInfo(forge, asn1Response);

    const statusCode = parseStatusCode(forge, statusInfo);
    const statusDescription = parseStatusDescription(statusInfo);

    const { tstInfo, signedData } = extractTstInfo(forge, contentInfo);

    const messageImprint = tstInfo.value?.[2];
    if (!messageImprint) {
      throw new Error('TSTInfo missing messageImprint block');
    }

    const hashAlgorithmNode = messageImprint.value?.[0]?.value?.[0];
    const hashAlgorithmOid = hashAlgorithmNode
      ? forge.asn1.derToOid(hashAlgorithmNode.value)
      : undefined;

    const tokenHashHex = bytesToHex(forge, messageImprint.value?.[1]);

    const hashMatches = normalizedExpected && tokenHashHex
      ? tokenHashHex === normalizedExpected
      : null;

    const timestamp = parseGeneralizedTime(tstInfo.value?.[4]?.value);
    const serialNumber = bigIntToDecimal(forge, tstInfo.value?.[3]);
    const accuracy = parseAccuracyNode(tstInfo.value?.[5]);
    const policy = parsePolicyOid(forge, tstInfo.value?.[1]);

    const signatureReport = verifyPkcs7Signature(forge, signedData, options);
    warnings.push(...signatureReport.warnings);
    errors.push(...signatureReport.errors);

    const okStatus = statusCode === undefined || statusCode === 0 || statusCode === 1;
    errors.push(...createHashMismatchErrors(hashMatches));

    if (!signatureReport.signatureVerified) {
      errors.push('No se pudo validar la firma del TSA.');
    }
    if (!okStatus) {
      errors.push('La TSA respondió con un estado de error.');
    }

    const success = okStatus && signatureReport.signatureVerified && hashMatches !== false;

    return {
      ok: success,
      statusCode,
      statusDescription,
      hashMatches,
      signatureVerified: signatureReport.signatureVerified,
      trustChainVerified: signatureReport.trustChainVerified,
      timestamp,
      policy,
      serialNumber,
      tokenHash: tokenHashHex,
      expectedHash: normalizedExpected,
      hashAlgorithmOid,
      accuracy,
      tsaSubject: signatureReport.tsaSubject,
      warnings,
      errors
    };
  }
}

export type VerificationReport = TSRVerificationResult;
export type VerificationOptions = TSRVerificationOptions;
