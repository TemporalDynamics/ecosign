import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'

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
  documentEntityId?: string // Optional canonical document_entities.id
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

serve(withRateLimit('workflow', async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    console.log('🚀 START: start-signature-workflow invoked')

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Supabase client initialized')

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ Missing authorization header')
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }
    console.log('✅ Auth header present')

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      console.log('❌ User authentication failed:', userError)
      return jsonResponse({ error: 'Unauthorized', details: userError?.message }, 401)
    }
    console.log('✅ User authenticated:', user.email)

    // Parse request
    const body: StartWorkflowRequest = await req.json()
    console.log('📦 Request body received:', JSON.stringify(body, null, 2))

    const {
      documentUrl,
      documentHash,
      originalFilename,
      documentEntityId,
      signers,
      forensicConfig
    } = body

    console.log(`📄 Document: ${originalFilename}`)
    console.log(`👥 Signers count: ${signers?.length || 0}`)

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

    console.log(`🎯 Starting workflow for ${user.email} with ${signers.length} signers`)

    // 1. Crear workflow
    console.log('📝 Step 1: Creating workflow...')
    const workflowPayload = {
      owner_id: user.id,
      original_filename: originalFilename,
      original_file_url: documentUrl,
      status: 'active',
      forensic_config: forensicConfig,
      ...(documentEntityId ? { document_entity_id: documentEntityId } : {})
    }

    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .insert(workflowPayload)
      .select()
      .single()

    if (workflowError || !workflow) {
      console.error('❌ Error creating workflow:', workflowError)
      return jsonResponse({
        error: 'Failed to create workflow',
        details: workflowError?.message,
        code: workflowError?.code,
        hint: workflowError?.hint
      }, 500)
    }
    console.log('✅ Workflow created:', workflow.id)

    // 2. Crear versión inicial
    console.log('📝 Step 2: Creating version...')
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
      console.error('❌ Error creating version:', versionError)
      return jsonResponse({
        error: 'Failed to create workflow version',
        details: versionError?.message,
        code: versionError?.code,
        hint: versionError?.hint
      }, 500)
    }
    console.log('✅ Version created:', version.id)

    // 3. Crear firmantes con tokens de acceso
    const signersToInsert = []
    const accessTokens: Record<string, { token: string, tokenHash: string }> = {} // email -> tokens

    for (const signer of signers) {
      const token = await generateAccessToken()
      const tokenHash = await hashToken(token)

      // Aplicar seguridad por defecto si no se especifica
      const quickAccess = signer.quickAccess ?? false
      const requireLogin = quickAccess ? false : (signer.requireLogin ?? true)
      const requireNda = quickAccess ? false : (signer.requireNda ?? true)

      // IMPORTANTE: Crear objeto SOLO con campos que existen en la tabla
      // NO incluir campos adicionales que puedan venir del cliente
      const signerRecord = {
        workflow_id: workflow.id,
        signing_order: signer.signingOrder,
        email: signer.email,
        name: signer.name || null,
        require_login: requireLogin,
        require_nda: requireNda,
        quick_access: quickAccess,
        status: signer.signingOrder === 1 ? 'ready' : 'pending',
        access_token_hash: tokenHash
      }

      signersToInsert.push(signerRecord)
      accessTokens[signer.email] = { token, tokenHash }
    }

    console.log('📝 Step 3: Creating signers...')
    console.log('Signers to insert:', JSON.stringify(signersToInsert, null, 2))

    // Insertar signers usando .insert() normalmente
    const { error: signersError } = await supabase
      .from('workflow_signers')
      .insert(signersToInsert)

    if (signersError) {
      console.error('❌ Error creating signers:', signersError)
      return jsonResponse({
        error: 'Failed to create signers',
        details: signersError?.message,
        code: signersError?.code,
        hint: signersError?.hint
      }, 500)
    }
    console.log('✅ Signers created successfully')

    // 4. Crear notificación para Usuario A (workflow iniciado)
    const appUrl = Deno.env.get('APP_URL') || 'https://www.ecosign.app'

    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: workflow.id,
        recipient_email: user.email!,
        recipient_type: 'owner',
        notification_type: 'workflow_started',
        subject: `Tu flujo de firma fue creado — ${originalFilename}`,
        body_html: `
          <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 12px;">Flujo creado correctamente</h2>
          <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 8px;">El flujo de firma para <strong>${originalFilename}</strong> se creó con éxito.</p>
          <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 16px;">Los firmantes recibirán sus invitaciones en breve.</p>
          <p style="margin:16px 0;">
            <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;color:#ffffff;background:#0ea5e9;text-decoration:none;border-radius:10px;">Ver flujo en Dashboard</a>
          </p>
          <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:16px 0 4px;">EcoSign. Transparencia que acompaña.</p>
        `,
        delivery_status: 'pending'
      })

    console.log(`Workflow ${workflow.id} created successfully`)

    // Las notificaciones a los firmantes se crean automáticamente vía trigger notify_signer_link()
    // cuando se insertan los signers con status 'ready' o 'pending'
    const firstSigner = signers.find(s => s.signingOrder === 1)
    const firstSignerHash = firstSigner ? accessTokens[firstSigner.email]?.tokenHash : null
    const signUrl = firstSignerHash ? `${appUrl}/sign/${firstSignerHash}` : null

    return jsonResponse({
      success: true,
      workflowId: workflow.id,
      versionId: version.id,
      status: workflow.status,
      signersCount: signers.length,
      firstSignerUrl: signUrl,
      message: `Workflow started. ${signers.length} signer(s) added. First signer notified.`,
      // Para testing - NO enviar en producción
      _debug: (() => {
        return {
          accessTokens: Object.keys(accessTokens).reduce((acc, email) => {
            const { token, tokenHash } = accessTokens[email]
            acc[email] = {
              token,
              tokenHash,
              url: `${appUrl}/sign/${tokenHash}`
            }
            return acc
          }, {} as Record<string, { token: string, tokenHash: string, url: string }>)
        }
      })()
    })

  } catch (error) {
    console.error('Error in start-signature-workflow:', error)

    // Retornar información detallada del error
    const errorDetails: any = {
      error: error instanceof Error ? error.message : 'Internal server error',
      type: error?.constructor?.name || 'Unknown'
    }

    // Agregar stack trace solo en desarrollo
    if (error instanceof Error && error.stack) {
      errorDetails.stack = error.stack.split('\n').slice(0, 5).join('\n')
    }

    // Si es un error de Supabase, incluir detalles
    if (error && typeof error === 'object') {
      if ('code' in error) errorDetails.code = error.code
      if ('details' in error) errorDetails.details = error.details
      if ('hint' in error) errorDetails.hint = error.hint
      if ('message' in error) errorDetails.message = error.message
    }

    return jsonResponse(errorDetails, 500)
  }
}))
