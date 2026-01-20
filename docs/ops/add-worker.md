# Add a New Worker

Goal: add a worker that reads a job, does a technical task, emits canonical events.

## Step 1: Create the function
Create `supabase/functions/<worker-name>/index.ts`.

Template:
```ts
import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { appendEvent } from '../_shared/eventHelper.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const documentEntityId = String(body?.document_entity_id ?? '');

  if (!documentEntityId) {
    return new Response('document_entity_id required', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  await appendEvent(supabase, documentEntityId, {
    kind: '<event.kind>',
    at: new Date().toISOString(),
  }, '<worker-name>');

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Step 2: Keep payloads canonical
- Emit only events defined in contract.
- Do not add extra fields.

## Step 3: Deploy or serve locally
Local:
```bash
supabase functions serve --no-verify-jwt
```

Deploy:
```bash
supabase functions deploy <worker-name>
```
