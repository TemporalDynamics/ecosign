/**
 * Send Share OTP Edge Function
 * 
 * Sends an OTP to a recipient for accessing a shared encrypted document.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SendShareOTPRequest {
  recipientEmail: string;
  otp: string;
  shareUrl: string;
  documentName: string;
  senderName?: string;
  message?: string;
}

Deno.serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const body: SendShareOTPRequest = await req.json();
    const {
      recipientEmail,
      otp,
      shareUrl,
      documentName,
      senderName = 'EcoSign User',
      message,
    } = body;

    // Validate required fields
    if (!recipientEmail || !otp || !shareUrl || !documentName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Document Share</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔒 Secure Document Shared</h1>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${senderName}</strong> has shared an encrypted document with you:
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
      <p style="margin: 0; font-weight: bold; color: #667eea;">📄 ${documentName}</p>
    </div>
    
    ${message ? `
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; color: #1976d2;">
        <strong>Message:</strong><br>
        ${message}
      </p>
    </div>
    ` : ''}
    
    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #856404;">Your one-time access code:</p>
      <div style="background: white; padding: 15px; border-radius: 6px; border: 2px dashed #ffc107;">
        <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: 'Courier New', monospace; color: #333;">
          ${otp}
        </p>
      </div>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #856404;">
        ⚠️ This code expires in 7 days
      </p>
    </div>
    
    <div style="text-align: center; margin-bottom: 25px;">
      <a href="${shareUrl}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Access Document
      </a>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #667eea;">
        🔐 Security Features:
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #666;">
        <li style="margin-bottom: 8px;">Document is encrypted end-to-end</li>
        <li style="margin-bottom: 8px;">Only you can decrypt it with your OTP</li>
        <li style="margin-bottom: 8px;">One-time access (code becomes invalid after use)</li>
        <li>Server cannot read the document content</li>
      </ul>
    </div>
    
    <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #6c757d;">
      <p style="margin: 0 0 10px 0;">
        This is an automated email from <strong>EcoSign</strong>
      </p>
      <p style="margin: 0;">
        <a href="https://ecosign.app" style="color: #667eea; text-decoration: none;">ecosign.app</a> | 
        <a href="${shareUrl}" style="color: #667eea; text-decoration: none;">View Document</a>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
        If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  </div>
  
</body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'EcoSign <notifications@mail.ecosign.app>',
        to: recipientEmail,
        subject: `🔒 ${senderName} shared "${documentName}" with you`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        message: 'OTP email sent successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-share-otp:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
