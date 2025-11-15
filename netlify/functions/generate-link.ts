// netlify/functions/generate-link.ts
import { supabase } from './utils/supabaseClient';
import { checkRateLimit } from './utils/rateLimitPersistent';
import { generateCSRFToken, validateCSRFToken } from './utils/csrf';
import { validateFile } from './utils/fileValidation';
import { encryptFormData } from './utils/encryption';

interface GenerateLinkRequest {
  documentId: string;
  requireNDA: boolean;
  formData: {
    name: string;
    email: string;
    company: string;
    position?: string;
  };
  csrfToken: string;
}

export async function handler(event: any, context: any) {
  try {
    // Verificar rate limiting
    const identifier = context.clientContext?.identity?.sub || 'anonymous';
    const rateLimitResult = await checkRateLimit(identifier, 'generate-link', {
      maxRequests: 10,
      windowMinutes: 60
    });

    if (!rateLimitResult.allowed) {
      return {
        statusCode: 429,
        body: JSON.stringify({ 
          error: 'Too many requests', 
          resetAt: rateLimitResult.resetAt 
        })
      };
    }

    // Parsear request
    const requestData: GenerateLinkRequest = JSON.parse(event.body);

    // Validar CSRF token
    if (!validateCSRFToken(requestData.csrfToken, identifier)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid CSRF token' })
      };
    }

    // Verificar autenticación y permisos
    const user = context.clientContext?.user;
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Verificar que el usuario es el dueño del documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', requestData.documentId)
      .eq('owner_id', user.id)
      .single();

    if (docError || !document) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Document not found or access denied' })
      };
    }

    // Generar token único para el enlace
    const token = generateSecureToken();

    // Crear registro de enlace
    const { data: link, error: linkError } = await supabase
      .from('links')
      .insert({
        document_id: requestData.documentId,
        token_hash: await hashToken(token), // Guardar hash, no el token en texto plano
        require_nda: requestData.requireNDA,
        owner_id: user.id,
        expires_at: requestData.requireNDA ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días si no requiere NDA
      })
      .select()
      .single();

    if (linkError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create link' })
      };
    }

    // Si requiere NDA, crear el registro de aceptación pendiente
    if (requestData.requireNDA) {
      const encryptedFormData = await encryptFormData(requestData.formData);
      
      const { error: ndaError } = await supabase
        .from('nda_acceptances')
        .insert({
          link_id: link.id,
          form_data_encrypted: encryptedFormData,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (ndaError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to create NDA acceptance record' })
        };
      }
    }

    // Generar URL de acceso
    const accessUrl = `${process.env.SITE_URL}/access/${token}`;

    // Registrar evento de seguridad
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        action: 'generate_link',
        resource_type: 'document',
        resource_id: requestData.documentId,
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
        user_agent: event.headers['user-agent'],
        result: 'success',
        metadata: {
          requireNDA: requestData.requireNDA,
          linkId: link.id
        }
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        success: true,
        accessUrl,
        linkId: link.id,
        expiresAt: link.expires_at
      })
    };
  } catch (error: any) {
    console.error('Generate link error:', error);

    // Registrar evento de error
    await supabase
      .from('security_logs')
      .insert({
        user_id: context.clientContext?.user?.id || null,
        action: 'generate_link',
        result: 'error',
        error_message: error.message,
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip']
      });

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function hashToken(token: string): Promise<string> {
  // En una implementación real, usarías una función de hash segura
  // como SHA-256 para calcular el hash del token
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}