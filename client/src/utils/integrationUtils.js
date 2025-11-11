// client/src/utils/integrationUtils.js
/**
 * Integration utilities for Mifiel and SignNow services
 */

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
    return result;
  } catch (error) {
    console.error('Error requesting Mifiel integration:', error);
    throw error;
  }
}

// Function to request SignNow integration (e-signatures)
export async function requestSignNowIntegration(documentId, action = 'esignature', documentHash = null, userId = null, signers = []) {
  try {
    const response = await fetch('/api/integrations/signnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        documentId,
        documentHash,
        userId,
        signers
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    return result;
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