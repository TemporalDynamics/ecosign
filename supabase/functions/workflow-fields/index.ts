/**
 * workflow-fields Edge Function
 *
 * CRUD para campos de workflow multi-firmante
 * Contrato: Sprint 6 Roadmap
 *
 * Endpoints:
 * - GET    /workflow-fields?document_entity_id=xxx  - Listar fields de un documento
 * - POST   /workflow-fields                         - Crear field
 * - PUT    /workflow-fields/:id                     - Actualizar field
 * - DELETE /workflow-fields/:id                     - Eliminar field
 *
 * Security:
 * - RLS enforced: Solo owner del documento puede CRUD
 * - Signer asignado puede leer y actualizar SOLO el value de su field
 *
 * Architecture:
 * - RESTful design: HTTP method determina acción
 * - Validación de position (coordenadas 0-1)
 * - Soporte para batch operations (batch_id)
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

// ========================================
// TYPES
// ========================================

interface WorkflowField {
  id?: string
  document_entity_id: string
  field_type: 'signature' | 'text' | 'date'
  label?: string
  placeholder?: string
  position: {
    page: number
    x: number
    y: number
    width: number
    height: number
  }
  assigned_to?: string
  required: boolean
  value?: string
  metadata?: Record<string, unknown>
  batch_id?: string
  apply_to_all_pages?: boolean
}

// ========================================
// VALIDATION
// ========================================

function validatePosition(position: unknown): boolean {
  if (!position || typeof position !== 'object') return false

  const pos = position as Record<string, unknown>

  if (typeof pos.page !== 'number' || pos.page < 1) return false
  if (typeof pos.x !== 'number' || pos.x < 0 || pos.x > 1) return false
  if (typeof pos.y !== 'number' || pos.y < 0 || pos.y > 1) return false
  if (typeof pos.width !== 'number' || pos.width < 0 || pos.width > 1) return false
  if (typeof pos.height !== 'number' || pos.height < 0 || pos.height > 1) return false

  return true
}

function validateFieldType(type: string): boolean {
  return ['signature', 'text', 'date'].includes(type)
}

function validateField(field: Partial<WorkflowField>): { valid: boolean; error?: string } {
  if (!field.document_entity_id) {
    return { valid: false, error: 'document_entity_id is required' }
  }

  if (!field.field_type || !validateFieldType(field.field_type)) {
    return { valid: false, error: 'Invalid field_type (must be signature, text, or date)' }
  }

  if (!field.position || !validatePosition(field.position)) {
    return {
      valid: false,
      error: 'Invalid position (must be {page, x, y, width, height} with coords 0-1)'
    }
  }

  if (typeof field.required !== 'boolean') {
    return { valid: false, error: 'required must be boolean' }
  }

  return { valid: true }
}

// ========================================
// HANDLERS
// ========================================

async function handleGetFields(req: Request, supabase: ReturnType<typeof createClient>) {
  const url = new URL(req.url)
  const documentEntityId = url.searchParams.get('document_entity_id')

  if (!documentEntityId) {
    return jsonResponse({ error: 'document_entity_id query parameter required' }, 400)
  }

  // RLS enforced: Solo owner o signer asignado pueden ver
  const { data, error } = await supabase
    .from('workflow_fields')
    .select('*')
    .eq('document_entity_id', documentEntityId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching workflow fields:', error)
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({
    success: true,
    fields: data,
    count: data.length
  })
}

async function handleCreateField(req: Request, supabase: ReturnType<typeof createClient>, userId: string) {
  const body: Partial<WorkflowField> = await req.json()

  // Validar input
  const validation = validateField(body)
  if (!validation.valid) {
    return jsonResponse({ error: validation.error }, 400)
  }

  // Preparar datos para insert
  const fieldData = {
    document_entity_id: body.document_entity_id,
    field_type: body.field_type,
    label: body.label || null,
    placeholder: body.placeholder || null,
    position: body.position,
    assigned_to: body.assigned_to || null,
    required: body.required,
    value: body.value || null,
    metadata: body.metadata || null,
    batch_id: body.batch_id || null,
    apply_to_all_pages: body.apply_to_all_pages || false,
    created_by: userId
  }

  // RLS enforced: Solo owner puede crear
  const { data, error } = await supabase
    .from('workflow_fields')
    .insert(fieldData)
    .select()
    .single()

  if (error) {
    console.error('Error creating workflow field:', error)
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({
    success: true,
    field: data,
    message: 'Workflow field created successfully'
  })
}

async function handleUpdateField(req: Request, supabase: ReturnType<typeof createClient>, fieldId: string) {
  const body: Partial<WorkflowField> = await req.json()

  // Preparar updates (solo campos permitidos)
  const updates: Record<string, unknown> = {}

  if (body.label !== undefined) updates.label = body.label
  if (body.placeholder !== undefined) updates.placeholder = body.placeholder
  if (body.position !== undefined) {
    if (!validatePosition(body.position)) {
      return jsonResponse({ error: 'Invalid position coordinates' }, 400)
    }
    updates.position = body.position
  }
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to
  if (body.required !== undefined) updates.required = body.required
  if (body.value !== undefined) updates.value = body.value
  if (body.metadata !== undefined) updates.metadata = body.metadata
  if (body.apply_to_all_pages !== undefined) updates.apply_to_all_pages = body.apply_to_all_pages

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ error: 'No fields to update' }, 400)
  }

  // RLS enforced: Owner puede actualizar todo, signer solo value
  const { data, error } = await supabase
    .from('workflow_fields')
    .update(updates)
    .eq('id', fieldId)
    .select()
    .single()

  if (error) {
    console.error('Error updating workflow field:', error)
    return jsonResponse({ error: error.message }, 500)
  }

  if (!data) {
    return jsonResponse({ error: 'Field not found or unauthorized' }, 404)
  }

  return jsonResponse({
    success: true,
    field: data,
    message: 'Workflow field updated successfully'
  })
}

async function handleDeleteField(req: Request, supabase: ReturnType<typeof createClient>, fieldId: string) {
  // RLS enforced: Solo owner puede eliminar
  const { error } = await supabase
    .from('workflow_fields')
    .delete()
    .eq('id', fieldId)

  if (error) {
    console.error('Error deleting workflow field:', error)
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({
    success: true,
    message: 'Workflow field deleted successfully'
  })
}

async function handleBatchCreate(req: Request, supabase: ReturnType<typeof createClient>, userId: string) {
  const body: { fields: Partial<WorkflowField>[] } = await req.json()

  if (!Array.isArray(body.fields) || body.fields.length === 0) {
    return jsonResponse({ error: 'fields array required and must not be empty' }, 400)
  }

  // Validar todos los campos
  for (const field of body.fields) {
    const validation = validateField(field)
    if (!validation.valid) {
      return jsonResponse({ error: `Invalid field: ${validation.error}` }, 400)
    }
  }

  // Generar batch_id para todos
  const batchId = crypto.randomUUID()

  // Preparar batch insert
  const fieldsData = body.fields.map(field => ({
    document_entity_id: field.document_entity_id,
    field_type: field.field_type,
    label: field.label || null,
    placeholder: field.placeholder || null,
    position: field.position,
    assigned_to: field.assigned_to || null,
    required: field.required,
    value: field.value || null,
    metadata: field.metadata || null,
    batch_id: batchId,
    apply_to_all_pages: field.apply_to_all_pages || false,
    created_by: userId
  }))

  // RLS enforced: Solo owner puede crear
  const { data, error } = await supabase
    .from('workflow_fields')
    .insert(fieldsData)
    .select()

  if (error) {
    console.error('Error batch creating workflow fields:', error)
    return jsonResponse({ error: error.message }, 500)
  }

  return jsonResponse({
    success: true,
    fields: data,
    batch_id: batchId,
    count: data.length,
    message: `${data.length} workflow fields created successfully`
  })
}

// ========================================
// MAIN HANDLER
// ========================================

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Autenticar usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Routing
    switch (req.method) {
      case 'GET':
        return await handleGetFields(req, supabase)

      case 'POST':
        // Check if batch operation
        if (url.pathname.endsWith('/batch')) {
          return await handleBatchCreate(req, supabase, user.id)
        }
        return await handleCreateField(req, supabase, user.id)

      case 'PUT': {
        // Extract field ID from path: /workflow-fields/{id}
        const fieldId = pathParts[pathParts.length - 1]
        if (!fieldId) {
          return jsonResponse({ error: 'Field ID required in path' }, 400)
        }
        return await handleUpdateField(req, supabase, fieldId)
      }

      case 'DELETE': {
        // Extract field ID from path: /workflow-fields/{id}
        const fieldId = pathParts[pathParts.length - 1]
        if (!fieldId) {
          return jsonResponse({ error: 'Field ID required in path' }, 400)
        }
        return await handleDeleteField(req, supabase, fieldId)
      }

      default:
        return jsonResponse({ error: 'Method not allowed' }, 405)
    }

  } catch (error) {
    console.error('Error in workflow-fields:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
