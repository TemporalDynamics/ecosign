// api/integrations/mifiel.js - Vercel API route for Mifiel integration
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, documentId, documentHash, userId, payment_method } = req.body;

  // Validate required parameters
  if (!action || !documentId) {
    return res.status(400).json({ error: 'Action and documentId are required' });
  }

  try {
    let response;
    let amount;

    // Determine price based on action
    switch(action) {
      case 'nom-151':
        amount = 2990; // 29.90 in cents
        break;
      case 'certificate':
        amount = 1990; // 19.90 in cents
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use: nom-151 or certificate' });
    }

    if (payment_method) {
      // If payment method is provided, create the payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        metadata: {
          service: 'mifiel',
          action: action,
          document_id: documentId,
          user_id: userId || ''
        }
      });

      // Store the request in Supabase for tracking
      const { data: requestData, error: storageError } = await supabase
        .from('integration_requests')
        .insert([{
          service: 'mifiel',
          action: action,
          document_id: documentId,
          user_id: userId,
          document_hash: documentHash,
          status: 'payment_created',
          payment_intent_id: paymentIntent.id,
          created_at: new Date().toISOString()
        }]);

      if (storageError) {
        console.error('Error storing integration request:', storageError);
      }

      // Return client secret for frontend payment processing
      response = {
        service: 'mifiel',
        action: action,
        documentId,
        status: 'payment_required',
        client_secret: paymentIntent.client_secret,
        amount: amount / 100, // Convert back to dollars for display
        currency: 'USD',
        description: action === 'nom-151' 
          ? 'Certificado NOM-151 para cumplimiento legal' 
          : 'Certificado digital con sello de tiempo',
        payment_options: {
          stripe: true
        },
        requirements: action === 'nom-151' 
          ? [
              'Documento debe estar en formato PDF',
              'Se requiere información del firmante',
              'La empresa debe estar registrada en México'
            ]
          : [
              'Documento debe estar en formato PDF',
              'Se requiere información del firmante'
            ]
      };
    } else {
      // Just return the pricing information without creating payment intent
      response = {
        service: 'mifiel',
        action: action,
        documentId,
        status: 'payment_required',
        amount: amount / 100, // Convert to dollars for display
        currency: 'USD',
        description: action === 'nom-151' 
          ? 'Certificado NOM-151 para cumplimiento legal' 
          : 'Certificado digital con sello de tiempo',
        payment_options: {
          stripe: true
        },
        requirements: action === 'nom-151' 
          ? [
              'Documento debe estar en formato PDF',
              'Se requiere información del firmante',
              'La empresa debe estar registrada en México'
            ]
          : [
              'Documento debe estar en formato PDF',
              'Se requiere información del firmante'
            ]
      };
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in Mifiel integration handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}