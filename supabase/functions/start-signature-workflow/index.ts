import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface Signer {
  email: string
  name?: string
  signingOrder: number
  // Seguridad por defecto: Login + NDA activados
  // Solo se desactivan si quickAccess = true
  requireLogin?: boolean  // Default: true
  requireNda?: boolean    // Default: true
  quickAccess?: boolean   // Default: false
}

interface StartWorkflowRequest {
  documentUrl: string       // URL del documento en Storage
  documentHash: string      // SHA-256 del documento
  originalFilename: string
  signers: Signer[]
  forensicConfig: {
    rfc3161: boolean
    polygon: boolean
    bitcoin: boolean
  }
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

async function generateAccessToken(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // Parse request
    const body: StartWorkflowRequest = await req.json()
    const {
      documentUrl,
      documentHash,
      originalFilename,
      signers,
      forensicConfig
    } = body

    // Validations
    if (!documentUrl || !documentHash || !originalFilename) {
      return jsonResponse({
        error: 'Missing required fields: documentUrl, documentHash, originalFilename'
      }, 400)
    }

    if (!signers || signers.length === 0) {
      return jsonResponse({
        error: 'At least one signer is required'
      }, 400)
    }

    // Validar que signing orders sean consecutivos
    const orders = signers.map(s => s.signingOrder).sort((a, b) => a - b)
    const expectedOrders = Array.from({ length: signers.length }, (_, i) => i + 1)
    if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
      return jsonResponse({
        error: 'Signing orders must be consecutive starting from 1'
      }, 400)
    }

    console.log(`Starting workflow for ${user.email} with ${signers.length} signers`)

    // 1. Crear workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .insert({
        owner_id: user.id,
        original_filename: originalFilename,
        original_file_url: documentUrl,
        status: 'active',
        forensic_config: forensicConfig
      })
      .select()
      .single()

    if (workflowError || !workflow) {
      console.error('Error creating workflow:', workflowError)
      return jsonResponse({ error: 'Failed to create workflow' }, 500)
    }

    // 2. Crear versión inicial
    const { data: version, error: versionError } = await supabase
      .from('workflow_versions')
      .insert({
        workflow_id: workflow.id,
        version_number: 1,
        document_url: documentUrl,
        document_hash: documentHash,
        change_reason: 'initial',
        status: 'active'
      })
      .select()
      .single()

    if (versionError || !version) {
      console.error('Error creating version:', versionError)
      return jsonResponse({ error: 'Failed to create workflow version' }, 500)
    }

    // 3. Crear firmantes con tokens de acceso
    const signersToInsert = []
    const accessTokens: Record<string, string> = {} // email -> token

    for (const signer of signers) {
      const token = await generateAccessToken()
      const tokenHash = await hashToken(token)

      // Aplicar seguridad por defecto si no se especifica
      const quickAccess = signer.quickAccess ?? false
      const requireLogin = quickAccess ? false : (signer.requireLogin ?? true)
      const requireNda = quickAccess ? false : (signer.requireNda ?? true)

      signersToInsert.push({
        workflow_id: workflow.id,
        signing_order: signer.signingOrder,
        email: signer.email,
        name: signer.name || null,
        require_login: requireLogin,
        require_nda: requireNda,
        quick_access: quickAccess,
        status: signer.signingOrder === 1 ? 'ready' : 'pending',
        access_token_hash: tokenHash
      })

      accessTokens[signer.email] = token
    }

    const { error: signersError } = await supabase
      .from('workflow_signers')
      .insert(signersToInsert)

    if (signersError) {
      console.error('Error creating signers:', signersError)
      return jsonResponse({ error: 'Failed to create signers' }, 500)
    }

    // 4. Crear notificación para Usuario A (workflow iniciado)
    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: workflow.id,
        recipient_email: user.email!,
        recipient_type: 'owner',
        notification_type: 'workflow_started',
        subject: `Flujo de Firmas Iniciado: ${originalFilename}`,
        body_html: `
          <h2>Flujo de firmas iniciado</h2>
          <p>Has iniciado un flujo de firmas para: <strong>${originalFilename}</strong></p>
          <p>Firmantes (${signers.length}):</p>
          <ul>
            ${signers.map(s => `<li>${s.name || s.email} (orden ${s.signingOrder})</li>`).join('')}
          </ul>
          <p>El primer firmante (${signers[0].email}) recibirá un email en breve.</p>
          <p>Podrás ver el progreso en tu dashboard con VerifyTracker.</p>
        `,
        delivery_status: 'pending'
      })

    // 5. Crear notificación para primer firmante
    const firstSigner = signers.find(s => s.signingOrder === 1)!
    const firstSignerToken = accessTokens[firstSigner.email]
    const appUrl = Deno.env.get('APP_URL') || 'https://app.verifysign.pro'
    const signUrl = `${appUrl}/sign/${firstSignerToken}`

    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: workflow.id,
        recipient_email: firstSigner.email,
        recipient_type: 'signer',
        notification_type: 'your_turn_to_sign',
        subject: `Firma requerida: ${originalFilename}`,
        body_html: `
          <h2>Firma Requerida</h2>
          <p>Hola ${firstSigner.name || firstSigner.email},</p>
          <p>Se te ha solicitado firmar el siguiente documento:</p>
          <p><strong>${originalFilename}</strong></p>
          <p>Este documento cuenta con <strong>certificación forense</strong> que registra matemáticamente:
            <ul>
              <li>El día y hora exacta de la firma</li>
              <li>Quién firmó (tu identidad verificada)</li>
              <li>Qué se firmó (hash criptográfico del documento)</li>
            </ul>
          </p>
          <p>Una vez que completes tu firma, recibirás automáticamente tu certificado ECO.</p>
          <p><a href="${signUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;">Ver y Firmar Documento</a></p>
          <p style="color:#666;font-size:12px;">Este enlace es personal e intransferible. Todas las acciones quedan registradas para fines de auditoría.</p>
        `,
        delivery_status: 'pending'
      })

    console.log(`Workflow ${workflow.id} created successfully`)

    // TODO: Enviar emails reales usando Resend
    // Por ahora los emails quedan en DB con status 'pending'

    return jsonResponse({
      success: true,
      workflowId: workflow.id,
      versionId: version.id,
      status: workflow.status,
      signersCount: signers.length,
      firstSignerUrl: signUrl,
      message: `Workflow started. ${signers.length} signer(s) added. First signer notified.`,
      // Para testing - NO enviar en producción
      _debug: {
        accessTokens: Object.keys(accessTokens).reduce((acc, email) => {
          acc[email] = {
            token: accessTokens[email],
            url: `${appUrl}/sign/${accessTokens[email]}`
          }
          return acc
        }, {} as Record<string, { token: string, url: string }>)
      }
    })

  } catch (error) {
    console.error('Error in start-signature-workflow:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
