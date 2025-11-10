import { EcoGenerationInput, EcoGenerationResult } from '../services/ecoGenerator';

/** AUTH MODULE **/
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupPayload extends AuthCredentials {
  fullName: string;
  organization?: string;
  agreeToTerms: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthIdentity;
}

export interface AuthIdentity {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthModule {
  signup(payload: SignupPayload): Promise<AuthSession>;
  login(credentials: AuthCredentials): Promise<AuthSession>;
  logout(userId: string): Promise<void>;
  getSession(token: string): Promise<AuthSession | null>;
}

/** NDA LINK GENERATION **/
export type NdaStatus = 'draft' | 'pending' | 'signed' | 'expired' | 'revoked';

export interface NdaLinkInput {
  caseId: string;
  documentId: string;
  ownerId: string;
  signerName: string;
  signerEmail: string;
  expiresAt: string;
  requireOtp?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NdaLinkRecord {
  id: string;
  token: string;
  shortUrl: string;
  status: NdaStatus;
  createdAt: string;
  expiresAt: string;
}

export interface NdaSignaturePayload {
  token: string;
  signerIp: string;
  userAgent: string;
  otpCode?: string;
  acceptedAt: string;
}

export interface NdaLinkService {
  createLink(input: NdaLinkInput): Promise<NdaLinkRecord>;
  getStatus(token: string): Promise<NdaLinkRecord | null>;
  acknowledgeSignature(payload: NdaSignaturePayload): Promise<NdaStatus>;
}

/** ECO GENERATION PORT **/
export interface EcoGeneratorPort {
  generate(input: EcoGenerationInput): Promise<EcoGenerationResult>;
}
