// client/src/utils/integrationUtils.js
/**
 * Integration utilities for Mifiel and SignNow services
 */

import { supabase } from '../lib/supabaseClient';

const normalizeResponse = (result) => (result && typeof result === 'object' && 'data' in result ? result.data : result);

// Function to request Mifiel integration (NOM-151 certificate)
export async function requestMifielIntegration(documentId, action = 'nom-151', documentHash = null, userId = null) {
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
  } catch (error) {
    console.error('Error requesting Mifiel integration:', error);
    throw error;
  }
}

// Function to request SignNow integration (e-signatures)
export async function requestSignNowIntegration(
  documentId,
  action = 'esignature',
  documentHash = null,
  userId = null,
  signers = [],
  options = {}
) {
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
      hasSignature: !!options.signature
    });

    const { data, error } = await supabase.functions.invoke('signnow', {
      body: payload
    });

    console.log('📥 SignNow response:', { data, error });

    if (error) {
      // Try to extract the actual error message from the response
      let errorMessage = error.message || 'Error invoking SignNow integration';

      // The error context might have the response body
      if (error.context && error.context instanceof Response) {
        try {
          const responseText = await error.context.text();
          console.error('❌ Error response body:', responseText);

          // Try to parse as JSON
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
            console.error('❌ Parsed error data:', errorData);
          } catch (jsonError) {
            // Not JSON, use the text as-is
            errorMessage = responseText || errorMessage;
          }
        } catch (readError) {
          console.error('Could not read error response:', readError);
        }
      }

      // If data contains an error field, use that instead
      if (data && data.error) {
        errorMessage = data.error;
        console.error('Error in data:', data);
      }

      console.error('SignNow function error:', errorMessage, error, data);
      throw new Error(errorMessage);
    }

    // Even if no error, check if data contains an error field
    if (data && data.error) {
      console.error('SignNow returned error in data:', data.error, data);
      throw new Error(data.error);
    }

    console.log('✅ SignNow success:', data);
    return data;
  } catch (error) {
    console.error('Error requesting SignNow integration:', error);
    throw error;
  }
}

// Function to initiate payment for integration
export async function initiatePayment(integrationData) {
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

// Get pricing information for display
export function getIntegrationPricing(service, action) {
  const pricing = {
    mifiel: {
      'nom-151': { amount: 29.90, currency: 'USD', description: 'Certificado NOM-151 para cumplimiento legal' },
      'certificate': { amount: 19.90, currency: 'USD', description: 'Certificado digital con sello de tiempo' }
    },
    signnow: {
      'esignature': { amount: 4.99, currency: 'USD', description: 'Advanced electronic signature' },
      'workflow': { amount: 9.99, currency: 'USD', description: 'Complete document workflow' }
    }
  };

  return pricing[service]?.[action] || { amount: 0, currency: 'USD', description: 'Service not found' };
}
