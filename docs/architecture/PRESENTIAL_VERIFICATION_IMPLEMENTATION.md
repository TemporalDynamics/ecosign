# Presential Verification Implementation
## Capa adicional sin tocar core. Paso a paso técnico.

**Versión**: 1.0
**Propósito**: Implementación de verificación presencial como evento append-only
**Audiencia**: Backend dev
**Constraint crítico**: NO toca Modelo B, EPI, trigger, ECO generation

---

## 🧠 Premisas Arquitectónicas

```
1. Firma digital es VÁLIDA por sí sola.
   → No necesita presencial.

2. Presencial es CAPA OPCIONAL.
   → Agrega confirmación, no validez.

3. Es un EVENTO append-only.
   → Sigue patrón existente de document_entities.events[]

4. No modifica ningún validador existente.
   → B1, B2, B3 intactos.

5. No afecta ECO generation.
   → ECO sigue siendo lo mismo.
   → Presential events se registran por separado.
```

---

## 📊 Modelo de Datos Nuevo

### Entidad: PresentialVerificationSession

```typescript
// NUEVA tabla en Supabase
presential_verification_sessions {
  id: UUID
  operation_id: UUID (foreign key → operations)
  session_id: TEXT (unique, corto)  // "PSV-XXXXX"
  qr_code: TEXT (base64 o URL)
  status: ENUM ('active', 'closed', 'expired')
  snapshot_hash: TEXT (SHA-256 del state)
  snapshot_data: JSONB {
    documents: [
      { document_id, name, current_hash, state }
    ]
    signers: [
      { signer_id, email/identifier, role }
    ]
    created_at
  }
  confirmations: JSONB {
    [signer_id]: {
      confirmed_at: timestamp
      method: 'otp' | 'selfie' | 'dni'
      identity_binding_id: UUID
      session_data: { ... }
    }
  }
  created_at: timestamp
  closed_at: timestamp (nullable)
  created_by: UUID (owner)
}
```

### Event: identity.session.presence.confirmed

Se agrega a `document_entities.events[]` como evento nuevo.

```typescript
{
  id: UUID
  kind: 'identity.session.presence.confirmed'
  at: ISO8601
  actor: 'signer' or 'owner'
  correlation_id: operation_id
  payload: {
    session_id: 'PSV-XXXXX'
    signer_id: UUID
    snapshot_hash: TEXT
    confirmation_method: 'otp' | 'selfie' | 'dni'
    identity_binding_id: UUID (vincula a la persona, no email)
    timestamp_confirmed: ISO8601
    geo_location: { lat, lon } (optional)
    device_fingerprint: TEXT (optional)
  }
}
```

---

## 🔄 Flujo de Implementación Paso a Paso

### PASO 1: Crear Tablas + Índices (Migration)

**File**: `supabase/migrations/20260301_presential_verification.sql`

```sql
BEGIN;

-- Nueva tabla
CREATE TABLE public.presential_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id),
  session_id TEXT NOT NULL UNIQUE,  -- "PSV-ABC123"
  qr_code TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'expired')),
  snapshot_hash TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  confirmations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_presential_operation_id ON presential_verification_sessions(operation_id);
CREATE INDEX idx_presential_session_id ON presential_verification_sessions(session_id);
CREATE INDEX idx_presential_status ON presential_verification_sessions(status)
  WHERE status = 'active';

-- Comentarios
COMMENT ON TABLE presential_verification_sessions IS
  'Presential verification sessions. Optional layer, does not affect digital signature validity.';

COMMIT;
```

**Acceptance**:
- [ ] Migration deploya sin errores
- [ ] Tablas existen en staging
- [ ] Índices creados

---

### PASO 2: Crear Endpoint: Iniciar Sesión Presencial

**Ubicación**: `supabase/functions/presential-verification/start-session/index.ts`

**Responsabilidad**:
- Owner inicia sesión
- Sistema captura snapshot de estado actual
- Genera QR único
- Retorna session_id + QR

**Código**:

```typescript
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

export async function startPresentialSession(req: Request) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_KEY'));

  try {
    const { operationId } = await req.json();

    // 1. Validar que operation existe y user es owner
    const { data: operation, error: opError } = await supabase
      .from('operations')
      .select('id, created_by')
      .eq('id', operationId)
      .single();

    if (opError || !operation) {
      return new Response(JSON.stringify({ error: 'Operation not found' }), { status: 404 });
    }

    const authHeader = req.headers.get('Authorization');
    const userId = await verifyAuth(authHeader); // Helper function

    if (userId !== operation.created_by) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    // 2. Capturar snapshot actual
    const snapshot = await captureOperationSnapshot(supabase, operationId);

    // 3. Generar snapshot_hash
    const snapshotJson = JSON.stringify(snapshot);
    const snapshotHash = await hashData(snapshotJson);

    // 4. Generar session_id
    const sessionId = `PSV-${generateShortId()}`;  // PSV-ABC123

    // 5. Generar QR con session_id + payload
    const qrPayload = {
      sessionId: sessionId,
      operationId: operationId,
      snapshotHash: snapshotHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()  // 30 min
    };

    const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));

    // 6. Insertar en presential_verification_sessions
    const { data: session, error: insertError } = await supabase
      .from('presential_verification_sessions')
      .insert({
        operation_id: operationId,
        session_id: sessionId,
        qr_code: qrCode,
        status: 'active',
        snapshot_hash: snapshotHash,
        snapshot_data: snapshot,
        created_by: userId
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }

    // 7. Retornar
    return new Response(JSON.stringify({
      sessionId: session.session_id,
      qrCode: session.qr_code,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }), { status: 200 });

  } catch (error) {
    console.error('Error starting session:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}

// Helpers
async function captureOperationSnapshot(supabase, operationId) {
  // 1. Obtener documentos de la operación
  const { data: documents } = await supabase
    .from('user_documents')
    .select('id, name, document_entity_id')
    .eq('operation_id', operationId);

  // 2. Obtener entidades de documentos con eventos
  const documentSnapshots = await Promise.all(
    documents.map(async (doc) => {
      const { data: entity } = await supabase
        .from('document_entities')
        .select('id, events')
        .eq('id', doc.document_entity_id)
        .single();

      const lastEvent = entity.events[entity.events.length - 1];

      return {
        documentId: doc.id,
        name: doc.name,
        entityId: entity.id,
        currentHash: lastEvent?.payload?.witness_hash || 'unknown',
        state: lastEvent?.kind || 'unknown'
      };
    })
  );

  // 3. Obtener signers de la operación
  const { data: signers } = await supabase
    .from('operation_signers')  // o la tabla que uses
    .select('id, email, role')
    .eq('operation_id', operationId);

  return {
    operationId: operationId,
    documents: documentSnapshots,
    signers: signers.map(s => ({ signerId: s.id, email: s.email, role: s.role })),
    capturedAt: new Date().toISOString()
  };
}

async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function verifyAuth(authHeader: string): Promise<string> {
  // Implement JWT verification
  // Return user_id
}
```

**Acceptance**:
- [ ] POST /presential-verification/start-session funciona
- [ ] Genera QR válido
- [ ] Snapshot se captura correctamente
- [ ] Session expira en 30 min
- [ ] Retorna session_id + QR

---

### PASO 3: Crear Endpoint: Escanear QR (Firmante)

**Ubicación**: `supabase/functions/presential-verification/confirm-presence/index.ts`

**Responsabilidad**:
- Firmante escanea QR
- Se presenta a la sesión
- Valida identidad (OTP + básico)
- Genera evento de confirmación

**Código**:

```typescript
export async function confirmPresence(req: Request) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_KEY'));

  try {
    const {
      sessionId,
      snapshotHash,
      signerId,
      email,
      confirmationMethod = 'otp'  // otp | selfie | dni
    } = await req.json();

    // 1. Validar sesión
    const { data: session, error: sessionError } = await supabase
      .from('presential_verification_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }

    // 2. Validar sesión está activa
    if (session.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Session not active' }), { status: 400 });
    }

    // 3. Validar snapshot_hash coincide
    if (session.snapshot_hash !== snapshotHash) {
      return new Response(JSON.stringify({ error: 'Snapshot mismatch' }), { status: 400 });
    }

    // 4. Validar que signer está en la operación
    const snapshotSigners = session.snapshot_data.signers;
    const signerInSnapshot = snapshotSigners.find(s => s.signerId === signerId || s.email === email);

    if (!signerInSnapshot) {
      return new Response(JSON.stringify({ error: 'Signer not in operation' }), { status: 403 });
    }

    // 5. Verificar identidad según método
    let identityBindingId = null;

    if (confirmationMethod === 'otp') {
      const { otp } = await req.json();
      const isOtpValid = await verifyOTP(email, otp);
      if (!isOtpValid) {
        return new Response(JSON.stringify({ error: 'Invalid OTP' }), { status: 401 });
      }
      identityBindingId = await getOrCreateIdentityBinding(supabase, email);
    }

    // 6. Crear evento en document_entities (append-only)
    const event = {
      kind: 'identity.session.presence.confirmed',
      at: new Date().toISOString(),
      actor: 'signer',
      correlation_id: session.operation_id,
      payload: {
        sessionId: session.session_id,
        signerId: signerId,
        snapshotHash: session.snapshot_hash,
        confirmationMethod: confirmationMethod,
        identityBindingId: identityBindingId,
        timestampConfirmed: new Date().toISOString(),
        geoLocation: null,  // Optional
        deviceFingerprint: req.headers.get('user-agent')
      }
    };

    // Agregar a la operación (o a documento raíz si existe)
    const { error: eventError } = await supabase.rpc('append_document_entity_event', {
      p_document_entity_id: session.operation_id,  // o el principal
      p_event: event,
      p_source: 'presential-verification'
    });

    if (eventError) {
      return new Response(JSON.stringify({ error: eventError.message }), { status: 500 });
    }

    // 7. Actualizar confirmations en la sesión
    const updatedConfirmations = {
      ...session.confirmations,
      [signerId]: {
        confirmedAt: new Date().toISOString(),
        method: confirmationMethod,
        identityBindingId: identityBindingId
      }
    };

    await supabase
      .from('presential_verification_sessions')
      .update({ confirmations: updatedConfirmations })
      .eq('id', session.id);

    // 8. Retornar confirmación
    return new Response(JSON.stringify({
      status: 'confirmed',
      signerId: signerId,
      sessionId: sessionId,
      confirmedAt: new Date().toISOString()
    }), { status: 200 });

  } catch (error) {
    console.error('Error confirming presence:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}

async function verifyOTP(email: string, otp: string): Promise<boolean> {
  // Implement OTP verification (Redis, Supabase auth, etc.)
  // Return true if valid
}

async function getOrCreateIdentityBinding(supabase, email: string): Promise<string> {
  // Get or create identity_binding record
  // This ties the email to a persistent ID even if email changes later
  let { data: binding } = await supabase
    .from('identity_bindings')
    .select('id')
    .eq('email', email)
    .single();

  if (!binding) {
    const { data: newBinding } = await supabase
      .from('identity_bindings')
      .insert({ email: email })
      .select('id')
      .single();
    binding = newBinding;
  }

  return binding.id;
}
```

**Acceptance**:
- [ ] Signer escanea QR → llega a endpoint
- [ ] OTP se valida
- [ ] Evento se crea en events[]
- [ ] Confirmations se actualizan
- [ ] Retorna status confirmed

---

### PASO 4: Crear Endpoint: Cerrar Sesión (Owner)

**Ubicación**: `supabase/functions/presential-verification/close-session/index.ts`

**Responsabilidad**:
- Owner cierra sesión
- Genera acta digital
- Marca sesión como closed

**Código**:

```typescript
export async function closeSession(req: Request) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_KEY'));

  try {
    const { sessionId } = await req.json();

    // 1. Validar sesión
    const { data: session } = await supabase
      .from('presential_verification_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // 2. Verificar permisos (owner solo)
    const authHeader = req.headers.get('Authorization');
    const userId = await verifyAuth(authHeader);

    if (userId !== session.created_by) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    // 3. Generar acta digital
    const acta = generatePresentialAct(session);

    // 4. Generar TSA para acta (optional pero recomendado)
    const actaHash = await hashData(JSON.stringify(acta));

    // 5. Crear evento de cierre en document_entities
    const closeEvent = {
      kind: 'identity.session.presence.closed',
      at: new Date().toISOString(),
      actor: 'owner',
      correlation_id: session.operation_id,
      payload: {
        sessionId: session.session_id,
        actaHash: actaHash,
        confirmationsCount: Object.keys(session.confirmations).length,
        closedBy: userId,
        closedAt: new Date().toISOString()
      }
    };

    await supabase.rpc('append_document_entity_event', {
      p_document_entity_id: session.operation_id,
      p_event: closeEvent,
      p_source: 'presential-verification'
    });

    // 6. Actualizar sesión como closed
    await supabase
      .from('presential_verification_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', session.id);

    // 7. Retornar acta
    return new Response(JSON.stringify({
      status: 'closed',
      actaHash: actaHash,
      acta: acta
    }), { status: 200 });

  } catch (error) {
    console.error('Error closing session:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}

function generatePresentialAct(session) {
  return {
    actId: `ACT-${session.session_id}`,
    sessionId: session.session_id,
    operationId: session.operation_id,
    createdAt: session.created_at,
    closedAt: new Date().toISOString(),
    snapshot: {
      documentsConfirmed: session.snapshot_data.documents.map(d => ({
        name: d.name,
        hash: d.currentHash,
        state: d.state
      })),
      signersConfirmed: Object.keys(session.confirmations).map(signerId => ({
        signerId: signerId,
        confirmedAt: session.confirmations[signerId].confirmedAt,
        method: session.confirmations[signerId].method
      }))
    },
    legalNotice: 'Presential verification session. Does not modify digital signature validity.'
  };
}
```

**Acceptance**:
- [ ] Owner cierra sesión
- [ ] Acta se genera
- [ ] Evento se crea
- [ ] Session marked as closed

---

### PASO 5: Visualizar en Ver Detalle / Historial

**Ubicación**: Componentes existentes (actualizar, no crear nuevo)

**Cambios**:
- Ver Detalle debe mostrar si hay sesiones presenciales
- Historial debe mostrar eventos de presencia

**Código en componente**:

```tsx
// En VerDetalle.tsx
function PresentialSessionInfo({ operationId }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    supabase
      .from('presential_verification_sessions')
      .select('*')
      .eq('operation_id', operationId)
      .then(({ data }) => setSessions(data));
  }, [operationId]);

  if (!sessions.length) return null;

  return (
    <div className="presential-info">
      <h3>Confirmaciones Presenciales</h3>
      {sessions.map(session => (
        <div key={session.id} className="session-item">
          <div className="session-header">
            Sesión: {session.session_id}
            <span className="status">{session.status}</span>
          </div>

          <div className="confirmations">
            {Object.entries(session.confirmations).map(([signerId, conf]) => (
              <div key={signerId}>
                ✓ Confirmado: {conf.confirmedAt}
                Método: {conf.method}
              </div>
            ))}
          </div>

          {session.status === 'closed' && (
            <a href={`/presential-act/${session.session_id}`}>
              Ver acta de verificación
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Acceptance**:
- [ ] Sessions aparecen en Ver Detalle
- [ ] Status visible
- [ ] Confirmations listadas

---

## 🧪 Testing

### Test 1: Iniciar sesión
```bash
curl -X POST http://localhost:54321/functions/v1/presential-verification/start-session \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"operationId": "abc-123"}'
```

Expected:
```json
{
  "sessionId": "PSV-ABC123",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2026-03-01T15:30:00Z"
}
```

### Test 2: Confirmar presencia
```bash
curl -X POST http://localhost:54321/functions/v1/presential-verification/confirm-presence \
  -H "Authorization: Bearer $SIGNER_TOKEN" \
  -d '{
    "sessionId": "PSV-ABC123",
    "snapshotHash": "...",
    "signerId": "signer-1",
    "email": "juan@example.com",
    "otp": "123456"
  }'
```

Expected:
```json
{
  "status": "confirmed",
  "signerId": "signer-1",
  "confirmedAt": "2026-03-01T15:25:00Z"
}
```

### Test 3: Cerrar sesión
```bash
curl -X POST http://localhost:54321/functions/v1/presential-verification/close-session \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{"sessionId": "PSV-ABC123"}'
```

Expected:
```json
{
  "status": "closed",
  "actaHash": "abc123...",
  "acta": { ... }
}
```

---

## 🔒 Líneas Rojas (NO tocar)

```
❌ NO modificar document_entities.events[] structure
❌ NO tocar validadores B1, B2, B3
❌ NO cambiar cómo se genera ECO
❌ NO modificar trigger canónico
❌ NO mezclar presential con niveles de identidad 2/2.5/5
❌ NO hacer presential obligatorio
```

---

## ✅ Checklist de Implementación

- [ ] Migration deployana sin errores
- [ ] 3 endpoints funcionan
- [ ] Eventos se crean en events[] correctamente
- [ ] Session persiste en presential_verification_sessions
- [ ] QR es válido y escaneable
- [ ] Ver Detalle muestra sesiones
- [ ] No hay regresiones en E2E existentes
- [ ] TypeScript sin errores
- [ ] Tests pasan

---

## 📊 Impacto en Código Existente

```
Core (Modelo B):     ✅ Sin cambios
Triggers:            ✅ Sin cambios
ECO Generation:      ✅ Sin cambios
Validators B1-B3:    ✅ Sin cambios
Events:              ✅ Agrega 2 nuevos tipos (confirm + close)
UI:                  ⚠️ Agrega visualización en Ver Detalle
Tests:               ✅ Agrega nuevos tests, sin regresiones
```

---

**Estado**: Ready for implementation
**Depende de**: Nada (completamente desacoplado)
**Bloqueado por**: Nada
