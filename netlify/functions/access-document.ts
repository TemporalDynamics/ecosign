// netlify/functions/access-document.ts
import { supabase } from './utils/supabaseClient';
import { checkRateLimit } from './utils/rateLimitPersistent';
import { validateCSRFToken } from './utils/csrf';
import { decryptFormData } from './utils/encryption';

interface AccessDocumentRequest {
  token: string;
  formData?: {
    name: string;
    email: string;
    company: string;
    position?: string;
  };
  csrfToken: string;
}

export async function handler(event: any, context: any) {
  try {
    const requestData: AccessDocumentRequest = JSON.parse(event.body);

    // Verificar rate limiting
    const identifier = event.headers['x-forwarded-for'] || 'anonymous';
    const rateLimitResult = await checkRateLimit(identifier, 'access-document', {
      maxRequests: 20,
      windowMinutes: 5
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

    // Validar CSRF token
    if (requestData.csrfToken && !validateCSRFToken(requestData.csrfToken, identifier)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid CSRF token' })
      };
    }

    // Buscar el enlace usando el hash del token
    const tokenHash = await hashToken(requestData.token);
    
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select(`
        id,
        document_id,
        require_nda,
        revoked_at,
        expires_at,
        documents!inner (id, eco_hash, title, owner_id)
      `)
      .eq('token_hash', tokenHash)
      .is('revoked_at', null) // No debe estar revocado
      .select()
      .single();

    if (linkError || !link) {
      // Registrar intento fallido
      await supabase
        .from('security_logs')
        .insert({
          action: 'access_document',
          result: 'denied',
          ip_address: event.headers['x-forwarded-for'],
          user_agent: event.headers['user-agent'],
          metadata: { reason: 'invalid_token' }
        });

      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Link not found or expired' })
      };
    }

    // Verificar si el enlace ha expirado
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await supabase
        .from('security_logs')
        .insert({
          action: 'access_document',
          result: 'denied',
          ip_address: event.headers['x-forwarded-for'],
          user_agent: event.headers['user-agent'],
          metadata: { reason: 'expired_link' }
        });

      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Link has expired' })
      };
    }

    // Si el enlace requiere NDA, verificar que se hayan enviado los datos del formulario
    if (link.require_nda) {
      if (!requestData.formData || !isFormDataComplete(requestData.formData)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'NDA form data is required', 
            requires: ['name', 'email', 'company'] 
          })
        };
      }

      // Crear o actualizar el registro de aceptación de NDA
      const encryptedFormData = await decryptFormData(JSON.stringify(requestData.formData));
      
      const { error: ndaError } = await supabase
        .from('nda_acceptances')
        .upsert({
          link_id: link.id,
          form_data_encrypted: encryptedFormData,
          accepted_at: new Date().toISOString(),
          ip_address: event.headers['x-forwarded-for'],
          user_agent: event.headers['user-agent'],
          status: 'accepted'
        }, {
          onConflict: 'link_id' // Actualizar si ya existe
        });

      if (ndaError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to record NDA acceptance' })
        };
      }

      // Crear registro de destinatario
      const { data: recipient, error: recipientError } = await supabase
        .from('recipients')
        .insert({
          document_id: link.document_id,
          email: requestData.formData.email,
          name: requestData.formData.name,
          company: requestData.formData.company,
          position: requestData.formData.position
        })
        .select()
        .single();

      if (recipientError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to create recipient record' })
        };
      }
    }

    // Generar URL firmada para el archivo .ECO
    const ecoPath = `eco-files/${link.documents.owner_id}/${link.document_id}.eco`;
    
    const { data: signedUrlData, error: storageError } = await supabase.storage
      .from('eco-files')
      .createSignedUrl(ecoPath, 60 * 60); // 1 hora de expiración

    if (storageError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate download URL' })
      };
    }

    // Registrar evento de acceso
    await supabase
      .from('access_events')
      .insert({
        link_id: link.id,
        document_id: link.document_id,
        ip_address: event.headers['x-forwarded-for'],
        user_agent: event.headers['user-agent'],
        event_type: 'access',
        metadata: {
          accessType: link.require_nda ? 'nda_accepted' : 'direct_access'
        }
      });

    // Registrar en logs de seguridad
    await supabase
      .from('security_logs')
      .insert({
        action: 'access_document',
        resource_type: 'document',
        resource_id: link.document_id,
        result: 'success',
        ip_address: event.headers['x-forwarded-for'],
        user_agent: event.headers['user-agent'],
        metadata: {
          linkId: link.id,
          requireNDA: link.require_nda
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
        downloadUrl: signedUrlData.signedUrl,
        documentTitle: link.documents.title,
        requiresNDA: link.require_nda
      })
    };
  } catch (error: any) {
    console.error('Access document error:', error);

    // Registrar evento de error
    await supabase
      .from('security_logs')
      .insert({
        action: 'access_document',
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

function isFormDataComplete(formData: any): boolean {
  return formData.name && 
         formData.email && 
         formData.company;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}