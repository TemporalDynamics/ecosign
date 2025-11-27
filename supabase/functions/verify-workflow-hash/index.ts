import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { hash } = await req.json()

    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
      return new Response(
        JSON.stringify({ error: 'hash must be a 64-character hex string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find workflow by document_hash
    const { data: workflow, error: wfError } = await supabase
      .from('signature_workflows')
      .select(`
        id, title, status, document_hash, created_at, updated_at
      `)
      .eq('document_hash', hash)
      .maybeSingle()

    if (wfError) {
      console.error('Error fetching workflow:', wfError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch workflow' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!workflow) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch signers
    const { data: signers, error: signerError } = await supabase
      .from('workflow_signers')
      .select('id, email, name, status, signed_at')
      .eq('workflow_id', workflow.id)
      .order('signed_at', { ascending: true })

    if (signerError) {
      console.error('Error fetching signers:', signerError)
    }

    // Fetch audit trail (limited)
    const { data: audit, error: auditError } = await supabase
      .from('ecox_audit_trail')
      .select('id, event_type, created_at, signer_id, details')
      .eq('workflow_id', workflow.id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (auditError) {
      console.error('Error fetching audit trail:', auditError)
    }

    return new Response(
      JSON.stringify({
        found: true,
        workflow,
        signers: signers || [],
        auditTrail: audit || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
