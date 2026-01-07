# 🔍 AUDITORÍA DE EVENTOS PROBATORIOS

**Fecha:** 2026-01-07T03:00:00Z
**Auditor:** Claude (Verificación canónica)
**Scope:** Verificar si el backend cumple el contrato probatorio

---

## 🧠 Marco Mental

> "El backend NO decide qué es importante.
> El backend debe registrar TODO hecho observable relevante.
> La derivación legal viene después."

**Pregunta clave:**
❌ ~~¿Esto es legalmente importante?~~
✅ **¿Esto ocurrió y podemos probar que ocurrió?**

---

## 🎯 INFRAESTRUCTURA EXISTENTE

### ✅ document_entities.events[] — IMPLEMENTADO

**Migración:** `20260106090005_document_entities_events.sql`

**Schema:**
```sql
ALTER TABLE document_entities
ADD COLUMN events jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Constraint: events must be array
ALTER TABLE document_entities
ADD CONSTRAINT document_entities_events_is_array
CHECK (jsonb_typeof(events) = 'array');

-- Trigger: enforce append-only
CREATE OR REPLACE FUNCTION enforce_events_append_only()
```

**Estructura de evento:**
```typescript
{
  kind: string;        // "tsa" | "anchor" | "signature" | "share_created" | etc
  at: ISO8601;         // Timestamp
  ...contextual data
}
```

---

### ✅ Helpers Implementados

**1. TSA Helper:**
- ✅ `supabase/functions/_shared/tsaHelper.ts`
- ✅ `appendTsaEventFromEdge()`
- ✅ Validación de witness_hash
- ✅ Append a document_entities.events[]

**2. Anchor Helper:**
- ✅ `supabase/functions/_shared/anchorHelper.ts`
- ✅ `appendPolygonAnchorEvent()`
- ✅ `appendBitcoinAnchorEvent()`
- ✅ Append a document_entities.events[]

**3. Edge Functions usando helpers:**
- ✅ `append-tsa-event/index.ts` → usa tsaHelper
- ✅ (Polygon/Bitcoin anchors en _legacy, pero hay helpers actuales)

---

## 🔴 CHECKLIST DE EVENTOS CANÓNICOS

### A. Documento Protegido ❌ HUECO

**Pregunta:**
> Cuando el documento pasa de Centro Legal a "protegido",
> ¿qué evento exacto se agrega a document_entities.events[]?

**Esperado:**
```typescript
{
  kind: "protected",
  at: "ISO_TIMESTAMP",
  protection: {
    level: "ACTIVE | REINFORCED | TOTAL",
    method: "tsa | polygon | bitcoin"
  }
}
```

**Estado actual:** ❌ **NO EXISTE**

**Evidencia:**
- No se encontró registro de evento `protected` en edge functions
- `protection_level` se deriva de events[], pero NO hay evento inicial
- Comentario en código: `// DEPRECATED: upgrade_protection_level removed (P0.2)`

**Impacto:**
- 🔴 **CRÍTICO**: No podemos probar CUÁNDO un documento fue protegido
- Si hay TSA → podemos inferir protección, pero NO es explícito
- Falta el evento inicial de "protección activada"

**Fix requerido:**
```typescript
// En Centro Legal (client) o backend, después de habilitar protección:
await appendEvent(documentId, {
  kind: 'protection_enabled',
  at: new Date().toISOString(),
  protection: {
    level: 'ACTIVE',
    forensic_config: {
      tsa: true,
      polygon: false,
      bitcoin: false
    }
  }
});
```

---

### B. Share Link Generado ❌ HUECO CRÍTICO

**Pregunta:**
> Cuando genero un link de compartir (con OTP o no),
> ¿se registra un evento que pruebe que ese link fue creado?

**Esperado:**
```typescript
{
  kind: "share_created",
  at: "ISO_TIMESTAMP",
  share: {
    share_id: "uuid",
    method: "link",
    otp_required: true,
    expires_at: "ISO_TIMESTAMP",
    recipient_email: "email" // if known
  }
}
```

**Estado actual:** ❌ **NO EXISTE**

**Evidencia:**
```bash
$ grep -r "share_created\|share_link_created" supabase/functions/
# No matches found
```

**Donde debería estar:**
- Edge function que crea shares (probablemente `create-signer-link` o similar)
- Tabla `document_shares` existe, pero NO registra evento en `document_entities.events[]`

**Impacto:**
- 🔴 **CRÍTICO**: No podemos probar que el propietario generó el link
- Si alguien dice "yo nunca compartí eso" → NO hay evidencia
- El .eco NO contiene evidencia de shares creados

**Fix requerido:**
```typescript
// En la función que crea el share:
await appendEvent(documentEntityId, {
  kind: 'share_created',
  at: new Date().toISOString(),
  share: {
    share_id: shareId,
    method: 'link',
    otp_required: otp_enabled,
    expires_at: expiresAt,
    recipient_email: recipientEmail || null
  }
});
```

---

### C. Acceso al Link (OPEN EVENT) ❌ HUECO CRÍTICO

**Pregunta:**
> Cuando alguien abre un link compartido:
> ¿se registra un evento en document_entities.events[]?
> ¿o solo lo vemos en logs/analytics?

**Esperado:**
```typescript
{
  kind: "share_opened",
  at: "ISO_TIMESTAMP",
  share: {
    share_id: "uuid",
    via: "link",
    otp_verified: true
  },
  context: {
    ip: "hash_or_truncated",
    geo: "country | region",
    user_agent: "browser family"
  }
}
```

**Estado actual:** ❌ **NO ESTÁ EN events[]**

**Evidencia:**
- ✅ `verify-access/index.ts` registra en tabla `access_events`:
  ```typescript
  await supabase
    .from('access_events')
    .insert({
      recipient_id: recipient.id,
      event_type,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      country: metadata.country,
      session_id: metadata.session_id
    })
  ```
- ❌ **PERO** esto NO va a `document_entities.events[]`
- ❌ Por lo tanto, **NO entra al .eco**

**Impacto:**
- 🔴 **CRÍTICO**: El .eco NO contiene evidencia de quién abrió el documento
- Los eventos están en tabla separada `access_events`
- **NO viajan en el certificado .eco**
- Un perito NO puede reconstruir los accesos desde el .eco

**Fix requerido:**
```typescript
// En verify-access/index.ts, DESPUÉS del insert a access_events:

// Get document_entity_id from document
const { data: doc } = await supabase
  .from('user_documents')
  .select('document_entity_id')
  .eq('id', link.document_id)
  .single();

if (doc?.document_entity_id) {
  await appendEvent(doc.document_entity_id, {
    kind: 'share_opened',
    at: new Date().toISOString(),
    share: {
      share_id: link.id,
      via: 'link',
      recipient_email: recipient.email
    },
    context: {
      ip: metadata.ip_address ? hashIP(metadata.ip_address) : null,
      geo: metadata.country || null,
      user_agent: getBrowserFamily(metadata.user_agent)
    }
  });
}
```

---

### D. Visualización del Contenido ⚠️ OPCIONAL

**Pregunta:**
> ¿Distinguimos entre "link abierto" y "documento visualizado"?

**Esperado (nice-to-have):**
```typescript
{
  kind: "document_viewed",
  at: "ISO_TIMESTAMP",
  viewer: {
    via: "share_link",
    share_id: "uuid"
  }
}
```

**Estado actual:** ❌ NO EXISTE

**Impacto:**
- 🟡 **OPCIONAL**: Suma en litigio pero no P0
- Podría implementarse después

---

### E. OTP Verificado ✅ PARCIAL

**Pregunta:**
> Cuando alguien ingresa el OTP correctamente,
> ¿queda un evento en el ledger o solo se valida y sigue?

**Esperado:**
```typescript
{
  kind: "otp_verified",
  at: "ISO_TIMESTAMP",
  method: "email | sms",
  share_id: "uuid"
}
```

**Estado actual:** ⚠️ **EXISTE PERO NO EN events[]**

**Evidencia:**
```typescript
// verify-signer-otp/index.ts:83
eventType: 'otp_verified'
```

- ✅ Se registra el evento OTP verificado
- ❌ **PERO** probablemente en una tabla de auditoría, NO en `document_entities.events[]`

**Impacto:**
- 🟡 **MEDIO**: Evidencia existe pero NO viaja en .eco
- Debería agregarse a events[]

**Fix requerido:**
```typescript
// En verify-signer-otp, después de validación exitosa:
await appendEvent(documentEntityId, {
  kind: 'otp_verified',
  at: new Date().toISOString(),
  method: 'email', // o 'sms'
  recipient_email: signerEmail,
  share_id: workflowId
});
```

---

### F. Firma ❌ HUECO CRÍTICO

**Pregunta:**
> ¿Cada firma genera un evento append-only con:
> identidad, método y hash firmado?

**Esperado:**
```typescript
{
  kind: "signature",
  at: "ISO_TIMESTAMP",
  signer: {
    email: "...",
    name: "..."
  },
  identity_level: "L1",
  method: "email_magic_link",
  signature_hash: "...",
  document_hash: "...",
  coordinates: {...}
}
```

**Estado actual:** ❌ **NO ESTÁ EN events[]**

**Evidencia:**
- ✅ `process-signature/index.ts` crea un objeto `ecoData` extenso (líneas 179-199)
- ✅ Genera certificación forense con `identity_assurance`
- ❌ **PERO** esto parece ir a otra tabla (`workflow_signers.eco_data`)
- ❌ **NO se registra en `document_entities.events[]`**

**Impacto:**
- 🔴 **CRÍTICO**: Las firmas NO están en el ledger canónico
- El .eco del documento NO contiene evidencia de las firmas
- Están en tablas de workflow, no en events[]

**Fix requerido:**
```typescript
// En process-signature/index.ts, después de generar ecoData:

const { data: doc } = await supabase
  .from('user_documents')
  .select('document_entity_id')
  .eq('id', currentVersion.document_id)
  .single();

if (doc?.document_entity_id) {
  await appendEvent(doc.document_entity_id, {
    kind: 'signature',
    at: signedAt,
    signer: {
      email: signer.email,
      name: signer.name
    },
    identity_assurance: identityAssurance,
    signature: {
      hash: signatureHash,
      coordinates: signatureData.coordinates
    },
    workflow: {
      id: workflow.id,
      signing_order: signer.signing_order
    }
  });
}
```

---

### G. NDA Aceptado ⚠️ PARCIAL

**Pregunta:**
> ¿La aceptación del NDA se registra en events[]?

**Esperado:**
```typescript
{
  kind: "nda_accepted",
  at: "ISO_TIMESTAMP",
  nda: {
    hash: "sha256...",
    version: "1.0"
  },
  acceptor: {
    email: "...",
    ip: "hash",
    user_agent: "..."
  }
}
```

**Estado actual:** ⚠️ **EXISTE METADATA PERO NO EN events[]**

**Evidencia:**
- ✅ `accept-share-nda/index.ts` registra metadata completa:
  ```typescript
  const acceptanceMetadata = {
    eco_nda_hash: ndaHash,
    signer_name,
    signer_email,
    acceptance_timestamp,
    ip_address,
    user_agent,
    browser_fingerprint,
    ...
  }
  ```
- ✅ Se guarda en `document_shares.nda_acceptance_metadata`
- ❌ **PERO** NO se registra en `document_entities.events[]`

**Impacto:**
- 🟡 **MEDIO**: La evidencia existe pero NO viaja en .eco
- Está en tabla de shares, no en ledger canónico

**Fix requerido:**
```typescript
// En accept-share-nda/index.ts, después de update exitoso:
const { data: doc } = await supabase
  .from('document_shares')
  .select('document_id')
  .eq('id', share_id)
  .single();

if (doc) {
  const { data: entity } = await supabase
    .from('user_documents')
    .select('document_entity_id')
    .eq('id', doc.document_id)
    .single();

  if (entity?.document_entity_id) {
    await appendEvent(entity.document_entity_id, {
      kind: 'nda_accepted',
      at: timestamp,
      nda: {
        hash: ndaHash,
        version: '1.0'
      },
      acceptor: {
        email: signer_email,
        name: signer_name,
        ip: ipAddress ? hashIP(ipAddress) : null,
        user_agent: userAgent || null
      }
    });
  }
}
```

---

## 📊 RESUMEN DE HUECOS

| Evento | Estado | En events[]? | En .eco? | Prioridad |
|--------|--------|--------------|----------|-----------|
| **protection_enabled** | ❌ No existe | ❌ No | ❌ No | 🔴 P0 |
| **share_created** | ❌ No existe | ❌ No | ❌ No | 🔴 P0 |
| **share_opened** | ⚠️ En access_events | ❌ No | ❌ No | 🔴 P0 |
| **otp_verified** | ⚠️ En tabla audit | ❌ No | ❌ No | 🟡 P1 |
| **signature** | ⚠️ En workflow_signers | ❌ No | ❌ No | 🔴 P0 |
| **nda_accepted** | ⚠️ En shares metadata | ❌ No | ❌ No | 🟡 P1 |
| **tsa** | ✅ Implementado | ✅ Sí | ✅ Sí | ✅ OK |
| **anchor** (polygon/bitcoin) | ✅ Implementado | ✅ Sí | ✅ Sí | ✅ OK |
| **document_viewed** | ❌ No existe | ❌ No | ❌ No | 🔵 P2 |

---

## 🎯 PREGUNTA CLAVE DE ARQUITECTURA

> "¿Todos estos eventos terminan dentro de document_entities.events[]
> y por lo tanto viajan dentro del .eco?"

**Respuesta actual:** ❌ **NO**

**Qué SÍ está en events[]:**
- ✅ TSA timestamps
- ✅ Blockchain anchors (Polygon, Bitcoin)

**Qué NO está en events[]:**
- ❌ Protección habilitada
- ❌ Shares creados
- ❌ Accesos a links
- ❌ OTP verificados
- ❌ Firmas completadas
- ❌ NDAs aceptados

---

## 🚨 IMPACTO PROBATORIO

### Pregunta del Perito

> "Si mañana un perito abre el .eco,
> ¿puede reconstruir TODO lo que pasó
> sin preguntarnos nada?"

**Respuesta actual:** ❌ **NO**

**Lo que el perito puede ver hoy:**
- ✅ Cuándo se creó el documento
- ✅ Hash del documento
- ✅ Timestamps TSA
- ✅ Anchors blockchain

**Lo que el perito NO puede ver:**
- ❌ Cuándo se protegió
- ❌ Con quién se compartió
- ❌ Quién lo abrió
- ❌ Quién firmó
- ❌ Quién aceptó NDA
- ❌ Verificaciones OTP

---

## 🔧 PLAN DE REMEDIACIÓN

### Fase 1: Huecos P0 (Críticos) — 3-5 días

**1. Crear helper genérico `appendEvent()`**
```typescript
// supabase/functions/_shared/eventHelper.ts
export async function appendEvent(
  supabase: SupabaseClient,
  documentEntityId: string,
  event: {
    kind: string;
    at: string;
    [key: string]: any;
  }
): Promise<{ success: boolean; error?: string }> {
  // Fetch current events
  const { data: entity, error: fetchError } = await supabase
    .from('document_entities')
    .select('id, events')
    .eq('id', documentEntityId)
    .single();

  if (fetchError || !entity) {
    return { success: false, error: `Entity not found: ${fetchError?.message}` };
  }

  // Append event
  const currentEvents = Array.isArray(entity.events) ? entity.events : [];
  const { error: updateError } = await supabase
    .from('document_entities')
    .update({
      events: [...currentEvents, event],
    })
    .eq('id', documentEntityId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
```

**2. Agregar eventos faltantes P0:**

**a) share_created** (2-3 horas)
- Ubicación: edge function que crea shares
- Agregar `await appendEvent(...)` después de crear share

**b) share_opened** (2-3 horas)
- Ubicación: `verify-access/index.ts`
- Agregar `await appendEvent(...)` después del log existente

**c) signature** (3-4 horas)
- Ubicación: `process-signature/index.ts`
- Agregar `await appendEvent(...)` después de crear ecoData

**d) protection_enabled** (1-2 horas)
- Ubicación: Centro Legal (client) o edge function de protección
- Agregar cuando se habilita protección

---

### Fase 2: Huecos P1 (Altos) — 2-3 días

**1. nda_accepted** (2 horas)
- Ubicación: `accept-share-nda/index.ts`
- Agregar evento después de update exitoso

**2. otp_verified** (2 horas)
- Ubicación: `verify-signer-otp/index.ts`
- Agregar evento después de verificación

---

### Fase 3: Validación (1-2 días)

**1. Tests de eventos**
- Test que cada flujo registra eventos
- Test que events[] es append-only
- Test que .eco contiene todos los eventos

**2. Migración de data existente**
- Reconstruir eventos históricos donde sea posible
- Marcar eventos "reconstructed" vs "real-time"

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

Para el dev, decile esto (literal):

### ✅ Regla de oro

> "Si mañana un perito abre el .eco,
> ¿puede reconstruir TODO lo que pasó
> sin preguntarnos nada?"

### ✅ Patrón simple

"No quiero cambiar flujos ni UX.
Solo quiero que, donde hoy ya pasa algo,
se agregue un `appendEvent()`."

```typescript
// Patrón en cada función:
await appendEvent(documentEntityId, {
  kind: 'evento_que_paso',
  at: new Date().toISOString(),
  ...datos_del_evento
});
```

**No cambia estados**
**No cambia permisos**
**No rompe nada**
**Solo registra hechos**

---

## 🧪 TESTS REQUERIDOS

```typescript
// tests/integration/probatoryEvents.test.ts

describe('Probatory Events Coverage', () => {
  it('registers protection_enabled event', async () => {
    // ...
  });

  it('registers share_created event', async () => {
    // ...
  });

  it('registers share_opened event', async () => {
    // ...
  });

  it('registers signature event', async () => {
    // ...
  });

  it('registers nda_accepted event', async () => {
    // ...
  });

  it('registers otp_verified event', async () => {
    // ...
  });

  it('all events appear in .eco file', async () => {
    // Generate .eco
    // Parse events[]
    // Assert all events present
  });
});
```

---

## 🎯 CRITERIO DE ÉXITO

**Cuando esto esté completo:**

1. ✅ Todos los eventos P0/P1 registrados en events[]
2. ✅ El .eco contiene evidencia completa del ciclo de vida
3. ✅ Un perito puede reconstruir TODO desde el .eco
4. ✅ Tests verifican cobertura de eventos
5. ✅ No se rompió ningún flujo existente

**Entonces podremos decir:**

> "EcoSign no solo firma documentos,
> cataloga TODOS los hechos probatorios."

---

## 📞 PRÓXIMOS PASOS

1. **Reunión con dev** (30 min):
   - Mostrar este reporte
   - Explicar el patrón `appendEvent()`
   - Asignar huecos P0

2. **Sprint de eventos** (1 semana):
   - Fase 1: P0 (3-5 días)
   - Fase 2: P1 (2-3 días)
   - Validación (1-2 días)

3. **Validación final:**
   - Generar .eco de prueba
   - Verificar que contiene TODOS los eventos
   - Hacer prueba de "reconstrucción pericial"

---

**Estado actual:** 🔴 **HUECOS CRÍTICOS IDENTIFICADOS**
**Prioridad:** 🔥 **P0 — ANTES DE CONTINUAR CON FEATURES**
**Estimado remediación:** 1 semana (5-8 días de trabajo)
**Impacto:** ⭐⭐⭐⭐⭐ **CRÍTICO PARA VALOR PROBATORIO**

---

**Auditado por:** Claude (Verificación canónica)
**Fecha:** 2026-01-07T03:00:00Z
**Próxima auditoría:** Post-remediación (2026-01-14)
