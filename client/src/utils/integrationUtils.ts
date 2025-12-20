// client/src/utils/integrationUtils.js
/**
 * Integration utilities for Mifiel and SignNow services
 */

import { getSupabase } from '../lib/supabaseClient';

type IntegrationService = 'mifiel' | 'signnow';
type IntegrationAction = 'nom-151' | 'certificate' | 'esignature' | 'workflow';

const normalizeResponse = <T>(result: { data?: T } | T): T => (result && typeof result === 'object' && 'data' in result && result.data !== undefined ? result.data : result) as T;

// Function to request Mifiel integration (NOM-151 certificate)
export async function requestMifielIntegration(
  documentId: string,
  action: 'nom-151' | 'certificate' = 'nom-151',
  documentHash: string | null = null,
  userId: string | null = null
): Promise<any> { // Return type to be refined later
  try {
    const response = await fetch('/api/integrations/mifiel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        documentId,
        documentHash,
        userId
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    return normalizeResponse(result);
  } catch (error: unknown) { // Explicitly type error as unknown
    console.error('Error requesting Mifiel integration:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unknown error occurred requesting Mifiel integration.');
    }
  }
}

interface Signer {
  email: string;
  name?: string;
  role?: string; // e.g., 'signer', 'viewer'
}

interface SignNowOptions {
  documentId: string;
  action: 'esignature' | 'workflow';
  documentHash: string | null;
  userId: string | null;
  signers: Signer[];
  signature?: {
    image: string; // base64 image data
    placement: {
      x: number;
      y: number;
      width: number;
      height: number;
      page: number;
    };
  };
  documentName?: string;
  userEmail?: string;
  userName?: string;
  message?: string;
  subject?: string;
  requireNdaEmbed?: boolean;
  metadata?: { [key: string]: any };
}

// Function to request SignNow integration (e-signatures)
export async function requestSignNowIntegration(
  documentId: string,
  action: 'esignature' | 'workflow' = 'esignature',
  documentHash: string | null = null,
  userId: string | null = null,
  signers: Signer[] = [],
  options: SignNowOptions | {} = {} // Using empty object as default for options, but its content will be spread.
): Promise<any> { // Return type to be refined later
  const supabase = getSupabase();
  try {
    const payload = {
      action,
      documentId,
      documentHash,
      userId,
      signers,
      ...options
    };

    console.log('📤 Sending to SignNow function:', {
      documentId,
      action,
      signerCount: signers.length,
      hasSignature: (options as SignNowOptions).signature !== undefined // Type assertion for options
    });

    const { data, error } = await supabase.functions.invoke('signnow', {
      body: payload
    });

    console.log('📥 SignNow response:', { data, error });

    if (error) {
      let errorMessage = error.message || 'Error invoking SignNow integration';

      if (error.context && error.context instanceof Response) {
        try {
          const responseText = await error.context.text();
          console.error('❌ Error response body:', responseText);

          try {
            const errorData = JSON.parse(responseText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
            console.error('❌ Parsed error data:', errorData);
          } catch (jsonError: unknown) {
            errorMessage = responseText || errorMessage;
          }
        } catch (readError: unknown) {
          console.error('Could not read error response:', readError);
        }
      }

      if (data && data.error) {
        errorMessage = data.error;
        console.error('Error in data:', data);
      }

      console.error('SignNow function error:', errorMessage, error, data);
      throw new Error(errorMessage);
    }

    if (data && data.error) {
      console.error('SignNow returned error in data:', data.error, data);
      throw new Error(data.error);
    }

    console.log('✅ SignNow success:', data);
    return data;
  } catch (error: unknown) { // Explicitly type error as unknown
    console.error('Error requesting SignNow integration:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unknown error occurred requesting SignNow integration.');
    }
  }
}

interface PaymentIntegrationData {
  amount: number;
  currency: string;
  description: string;
  service: IntegrationService;
  action: IntegrationAction;
  documentId: string;
}

// Function to initiate payment for integration
export async function initiatePayment(integrationData: PaymentIntegrationData): Promise<{
  paymentRequired: boolean;
  amount: number;
  currency: string;
  description: string;
  service: IntegrationService;
  action: IntegrationAction;
  documentId: string;
}> {
  // In a real implementation, this would connect to Stripe or another payment processor
  // For now, we'll simulate the payment process
  
  return {
    paymentRequired: true,
    amount: integrationData.amount,
    currency: integrationData.currency,
    description: integrationData.description,
    service: integrationData.service,
    action: integrationData.action,
    documentId: integrationData.documentId
  };
}

interface PricingDetails {
  amount: number;
  currency: string;
  description: string;
}

interface PricingConfig {
  mifiel: {
    'nom-151': PricingDetails;
    'certificate': PricingDetails;
  };
  signnow: {
    'esignature': PricingDetails;
    'workflow': PricingDetails;
  };
}

// Get pricing information for display
export function getIntegrationPricing(service: IntegrationService, action: IntegrationAction): PricingDetails | { amount: 0, currency: string, description: string } {
  const pricing: PricingConfig = {
    mifiel: {
      'nom-151': { amount: 29.90, currency: 'USD', description: 'Certificado NOM-151 para cumplimiento legal' },
      'certificate': { amount: 19.90, currency: 'USD', description: 'Certificado digital con sello de tiempo' }
    },
    signnow: {
      'esignature': { amount: 4.99, currency: 'USD', description: 'Advanced electronic signature' },
      'workflow': { amount: 9.99, currency: 'USD', description: 'Complete document workflow' }
    }
  };

  return (pricing[service] as Record<IntegrationAction, PricingDetails>)?.[action] || { amount: 0, currency: 'USD', description: 'Service not found' };
}