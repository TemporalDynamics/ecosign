/**
 * MÓDULO FLUJO DE FIRMAS — REGLAS
 * 
 * Contrato: docs/centro-legal/MODULE_CONTRACTS.md
 * 
 * Propósito:
 * Definir quién firma, en qué orden y bajo qué condiciones.
 * 
 * Reglas:
 * R1: Requiere documento
 * R2: Puede coexistir con NDA/Protección/Mi Firma
 * R3: Cada firmante recibe: NDA (si aplica) → OTP → Invitación
 * R4: Orden secuencial (no se puede saltar)
 * 
 * No-responsabilidades:
 * - NO envía emails (eso lo hace backend)
 * - NO valida emails en tiempo real
 * - NO crea signature_workflows (eso lo hace handleCertify)
 * 
 * Aclaración:
 * Este módulo solo CONFIGURA el flujo, no lo ejecuta.
 */

export interface SignerInput {
  email: string;
  name?: string;
  signingOrder: number;
  requireLogin: boolean;
  requireNda: boolean;
  quickAccess: boolean;
}

export interface SignatureFlowModuleState {
  flowConfigured: boolean;
  signers: SignerInput[];
  sequentialOrder: boolean;
}

export const FLOW_RULES = {
  requiresDocument: true,
  coexistsWithOthers: true,
  sequentialOrder: true,
  noSendEmails: true,
  noValidateRealTime: true,
  noCreateWorkflows: true,
} as const;

export const DEFAULT_FLOW_STATE: SignatureFlowModuleState = {
  flowConfigured: false,
  signers: [
    {
      email: '',
      name: '',
      signingOrder: 1,
      requireLogin: true,
      requireNda: true,
      quickAccess: false,
    },
  ],
  sequentialOrder: true,
};

export const DEFAULT_SIGNER: SignerInput = {
  email: '',
  name: '',
  signingOrder: 1,
  requireLogin: true,
  requireNda: true,
  quickAccess: false,
};
