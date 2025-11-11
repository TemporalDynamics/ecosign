// api/integrations/signnow.js - Vercel API route for SignNow integration
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

  const { action, documentId, documentHash, userId, signers, payment_method } = req.body;

  // Validate required parameters
  if (!action || !documentId) {
    return res.status(400).json({ error: 'Action and documentId are required' });
  }

  try {
    let response;
    let amount;

    // Determine price based on action
    switch(action) {
      case 'esignature':
        amount = 499; // 4.99 in cents
        break;
      case 'workflow':
        amount = 999; // 9.99 in cents
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use: esignature or workflow' });
    }

    if (payment_method) {
      // If payment method is provided, create the payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        metadata: {
          service: 'signnow',
          action: action,
          document_id: documentId,
          user_id: userId || ''
        }
      });

      // Store the request in Supabase for tracking
      const { data: requestData, error: storageError } = await supabase
        .from('integration_requests')
        .insert([{
          service: 'signnow',
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
        service: 'signnow',
        action: action,
        documentId,
        status: 'payment_required',
        client_secret: paymentIntent.client_secret,
        amount: amount / 100, // Convert back to dollars for display
        currency: 'USD',
        description: action === 'esignature' 
          ? 'Advanced electronic signature workflow' 
          : 'Complete document workflow with advanced features',
        payment_options: {
          stripe: true
        },
        features: action === 'esignature' 
          ? [
              'Email notifications to signers',
              'Audit trail',
              'Automatic reminders',
              'Multiple signers support',
              'Legal compliance'
            ]
          : [
              'Complex signing workflows',
              'Conditional fields',
              'Custom branding',
              'API access',
              'Advanced reporting'
            ]
      };
    } else {
      // Just return the pricing information without creating payment intent
      response = {
        service: 'signnow',
        action: action,
        documentId,
        status: 'payment_required',
        amount: amount / 100, // Convert to dollars for display
        currency: 'USD',
        description: action === 'esignature' 
          ? 'Advanced electronic signature workflow' 
          : 'Complete document workflow with advanced features',
        payment_options: {
          stripe: true
        },
        features: action === 'esignature' 
          ? [
              'Email notifications to signers',
              'Audit trail',
              'Automatic reminders',
              'Multiple signers support',
              'Legal compliance'
            ]
          : [
              'Complex signing workflows',
              'Conditional fields',
              'Custom branding',
              'API access',
              'Advanced reporting'
            ]
      };
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in SignNow integration handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}