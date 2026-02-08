import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      path?: string
      workflowId?: string
      signerId?: string
    }

    const path = String(body.path || '')
    const workflowId = String(body.workflowId || '')
    const signerId = String(body.signerId || '')

    if (!path || !workflowId || !signerId) {
      return jsonResponse({ error: 'path, workflowId and signerId required' }, 400)
    }

    const expectedPrefix = `evidence/${workflowId}/${signerId}/`
    if (!path.startsWith(expectedPrefix)) {
      return jsonResponse({ error: 'invalid_path' }, 403)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRole) as any

    const { data, error } = await supabase.storage
      .from('artifacts')
      .createSignedUrl(path, 60 * 60)

    if (error || !data?.signedUrl) {
      return jsonResponse({ error: error?.message || 'signed_url_failed' }, 500)
    }

    return jsonResponse({ success: true, signed_url: data.signedUrl })
  } catch (err: any) {
    console.error('get-eco-url error', err)
    return jsonResponse({ error: err?.message || 'Unexpected error' }, 500)
  }
})
