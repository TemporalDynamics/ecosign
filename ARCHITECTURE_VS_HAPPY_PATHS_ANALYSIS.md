# Análisis de Arquitectura vs Happy Paths — EcoSign

**Fecha:** 2026-03-17  
**Objetivo:** Comparar arquitectura implementada vs beneficios prometidos en happy paths  
**Evaluación Billing Automático:** Viabilidad y complejidad

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Happy Paths Documentados](#happy-paths-documentados)
3. [Arquitectura Implementada](#arquitectura-implementada)
4. [Gap Analysis](#gap-analysis)
5. [Evaluación Billing Automático](#evaluación-billing-automático)
6. [Recomendaciones](#recomendaciones)

---

## 🎯 RESUMEN EJECUTIVO

### Puntaje General: **8.5/10** ✅

| Dimensión | Puntaje | Estado |
|-----------|---------|--------|
| **Protección de Documentos** | 9.5/10 | ✅ Excelente |
| **Evidencia Verificable** | 9/10 | ✅ Excelente |
| **Flujo de Firmas** | 8.5/10 | ✅ Muy Bien |
| **Custodia Zero-Knowledge** | 9/10 | ✅ Excelente |
| **Anchoring Blockchain** | 8/10 | ✅ Muy Bien |
| **Billing/Trials** | 6/10 | ⚠️ Funcional pero manual |
| **Dashboard de Supervisión** | 8/10 | ✅ Muy Bien |

### Conclusión Principal

**La arquitectura implementada SÍ respalda los beneficios prometidos en los happy paths.**

Los 3 pilares fundamentales están sólidos:
1. ✅ **Protección sin exponer** → Zero-knowledge real (client-side encryption)
2. ✅ **Evidencia verificable** → ECO + TSA + Blockchain (independiente de EcoSign)
3. ✅ **Trazabilidad completa** → Event sourcing + canonical events

**Única debilidad:** Billing/trials es manual (admin functions), no automático.

---

## 📖 HAPPY PATHS DOCUMENTADOS

### Happy Path #1: Protección de Documento (Owner)

**Beneficio prometido:** "Protegé tu trabajo en minutos sin exponer contenido"

**Flujo esperado:**
1. Owner sube documento → cifrado client-side
2. Sistema genera huella (hash) → sin leer contenido
3. Owner configura protección (TSA, blockchain)
4. Sistema registra evidencia → documento queda protegido

**Implementación real:**

```typescript
// client/src/lib/custodyStorageService.ts
✅ encryptFileClientSide() — Cifrado AES-GCM 256-bit en navegador
✅ createCustodyUploadUrl() — URL firmada, expira en 15 min
✅ storeEncryptedCustody() — Edge Function nunca ve clave

// client/src/lib/encryptionService.ts
✅ generateWrappedKey() — Clave envuelta con RSA-2048
✅ unwrapKey() — Solo owner puede desencriptar

// supabase/functions/record-protection-event/index.ts
✅ Registra evento canónico document.protected.requested
✅ No accede al contenido, solo metadata
```

**Veredicto:** ✅ **9.5/10** — Zero-knowledge real, contenido nunca sale del cliente

---

### Happy Path #2: Flujo de Firmas (Multi-participante)

**Beneficio prometido:** "Firma en cascada con evidencia verificable por cualquiera"

**Flujo esperado:**
1. Owner crea workflow → define orden de firmantes
2. Sistema envía emails → cada firmante recibe link único
3. Firmante firma → OTP + NDA (opcional)
4. Sistema registra evidencia → hash + timestamp + blockchain
5. Cualquiera puede verificar → sin necesidad de cuenta

**Implementación real:**

```typescript
// client/src/lib/signatureWorkflowService.ts
✅ startSignatureWorkflow() — Edge Function 'start-signature-workflow'
✅ Soporta secuencial (orden) y paralelo (simultáneo)
✅ NDA habilitable por workflow
✅ Canvas fields (firmas, nombres, fechas)

// supabase/functions/apply-signer-signature/index.ts
✅ apply-signer-signature — Registra firma de participante
✅ generateSignatureEvidence() — Genera evidencia criptográfica
✅ Soporta rechazo de firma (reject-signature)

// supabase/functions/send-signer-otp/index.ts
✅ OTP por email — Código de 6 dígitos
✅ Verificación en dos pasos (email + código)

// client/src/lib/verificationService.ts
✅ verifyECOX() — Verificación offline sin depender de EcoSign
✅ validateDocumentIntegrity() — Compara hash del documento
```

**Veredicto:** ✅ **8.5/10** — Funcional, pero verificación offline podría ser más simple

---

### Happy Path #3: Evidencia Verificable (Perito/Auditor)

**Beneficio prometido:** "Cualquiera puede verificar sin depender de EcoSign"

**Flujo esperado:**
1. Perito descarga archivo .ECO/.ECOX
2. Perito ejecuta verificador → valida integridad
3. Sistema muestra: hash, timestamps, anchoring
4. Perito confirma: documento no fue alterado

**Implementación real:**

```typescript
// client/src/lib/verificationService.ts
✅ verifyECOX() — Valida estructura .ecox
✅ validateDocumentIntegrity() — Compara hash SHA-256
✅ verifyTSA() — Valida timestamp RFC 3161
✅ verifyBlockchainAnchor() — Valida anchor en Polygon/Bitcoin

// supabase/functions/verify-ecox/index.ts
✅ Verificación server-side (para quienes no quieren descargar)
✅ Retorna estructura completa de evidencia

// packages/eco-packer/ (propietario)
✅ Formato .ECO/.ECOX — Autocontenido con metadata
✅ Incluye: hash, timestamps, anchors, attestations
```

**Veredicto:** ✅ **9/10** — Verificación independiente real, formato portable

---

### Happy Path #4: Sesión Probatoria Reforzada (Presencial)

**Beneficio prometido:** "Atribución de firma presencial con acta verificable"

**Flujo esperado:**
1. Owner inicia sesión → genera OTP para participantes
2. Participantes confirman presencia → OTP + link
3. Owner cierra sesión → genera acta con timestamps
4. Sistema registra: TSA + trenza de attestations
5. Owner verifica acta → puede mostrar a perito

**Implementación real:**

```typescript
// client/src/lib/presentialVerificationService.ts
✅ startPresentialVerificationSession() — Genera session ID + snapshot hash
✅ confirmPresentialPresence() — Participante confirma con OTP
✅ closePresentialSession() — Genera acta con attestations

// supabase/functions/presential-verification-*-session/index.ts
✅ 4 funciones Edge (start, confirm, close, get-acta)
✅ JWT verification habilitado
✅ Genera acta con hash + timestamps + X/Y confirmaciones

// client/src/pages/DocumentsPage.tsx
✅ UI completa con modales de sesión
✅ Timeline de timestamps registrados
✅ Botón "Ver Acta" → /verify?acta_hash=XXX
```

**Veredicto:** ✅ **9/10** — Implementación completa, funcional en producción

---

### Happy Path #5: Dashboard de Supervisión (Admin/Supervisor)

**Beneficio prometido:** "Control total de operaciones y miembros del workspace"

**Flujo esperado:**
1. Supervisor accede al dashboard → ve resumen de workspace
2. Ve miembros activos/invitados → puede invitar/remover
3. Ve operaciones activas → puede cancelar/pausar
4. Ve límites del plan → operaciones usadas vs límite

**Implementación real:**

```typescript
// supabase/functions/supervision/index.ts (CONSOLIDADA 2026-03-17)
✅ get_dashboard — Resumen completo del workspace
✅ invite_member — Invita miembro con control de límites
✅ member_action — Suspende, activa, remueve, cambia rol

// client/src/pages/SupervisionCenterPage.tsx
✅ UI completa con tabs (Members, Operations, Settings)
✅ Límites de seats visibles (used/limit)
✅ Acciones por miembro (dropdown de acciones)

// supabase/functions/admin-trials/index.ts (CONSOLIDADA 2026-03-17)
✅ grant_trial — Otorga trial de 1-60 días
✅ issue_offer — Emite oferta con descuento
✅ invite_member — Invita a workspace con trial
✅ expire_trials — Expira trials vencidos (cron)
```

**Veredicto:** ✅ **8/10** — Funcional, pero límites no se enforcean estrictamente

---

## 🏗️ ARQUITECTURA IMPLEMENTADA

### Capas de la Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React/Vite)                   │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐   │
│  │  Services  │  │   Pages    │  │   Components    │   │
│  │  (12 libs) │  │  (44 pages)│  │  (50+ components)│  │
│  └────────────┘  └────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓ JWT Auth
┌─────────────────────────────────────────────────────────┐
│              EDGE FUNCTIONS (Supabase, 100 funcs)        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Signature   │  │   Custody    │  │  Anchoring   │  │
│  │  Workflow    │  │   Storage    │  │  Blockchain  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Supervision │  │   Billing    │  │ Verification │  │
│  │  Admin       │  │   Trials     │  │  Public      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ RLS + Service Role
┌─────────────────────────────────────────────────────────┐
│              DATABASE (Supabase Postgres)                │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐   │
│  │  document_ │  │  signature │  │   workspace_    │   │
│  │  entities  │  │  workflows │  │   plans         │   │
│  └────────────┘  └────────────┘  └─────────────────┘   │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐   │
│  │  anchors   │  │  ecox_     │  │   operations_   │   │
│  │            │  │  events    │  │   events        │   │
│  └────────────┘  └────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓ RPC Calls
┌─────────────────────────────────────────────────────────┐
│              BLOCKCHAIN (Polygon + Bitcoin)              │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐   │
│  │  Polygon   │  │   Bitcoin  │  │  OpenTimestamps │   │
│  │  Anchor    │  │   Anchor   │  │  (Free tier)    │   │
│  └────────────┘  └────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Componentes Críticos

| Componente | Estado | Complejidad | Criticalidad |
|------------|--------|-------------|--------------|
| **Client-side Encryption** | ✅ Producción | Alta | 🔴 Crítico |
| **Signature Workflow** | ✅ Producción | Media | 🔴 Crítico |
| **ECOX Format** | ✅ Producción | Alta | 🔴 Crítico |
| **TSA Integration** | ✅ Producción | Media | 🟡 Importante |
| **Blockchain Anchoring** | ✅ Producción | Alta | 🟡 Importante |
| **Supervision Dashboard** | ✅ Producción | Media | 🟡 Importante |
| **Billing/Trials** | ⚠️ Manual | Baja | 🟢 Nice-to-have |
| **Verification Public** | ✅ Producción | Baja | 🟡 Importante |

---

## 🔍 GAP ANALYSIS

### ✅ Lo que SÍ está implementado (y funciona bien)

| Happy Path | Beneficio | Implementación | Gap |
|------------|-----------|----------------|-----|
| **Protección** | Zero-knowledge | ✅ Client-side encryption | 0% |
| **Evidencia** | Verificable offline | ✅ Formato .ECO + verificador | 5% (podría ser más simple) |
| **Firmas** | Multi-participante | ✅ Workflow secuencial/paralelo | 10% (UI podría ser más clara) |
| **Sesión Probatoria** | Atribución presencial | ✅ 4 funciones Edge + UI | 5% (falta documentación) |
| **Supervisión** | Control de workspace | ✅ Dashboard consolidado | 15% (límites no se enforcean) |

### ⚠️ Lo que está implementado pero es manual

| Feature | Estado Actual | Gap | Complejidad Automatizar |
|---------|---------------|-----|-------------------------|
| **Trials** | Admin functions (cURL) | 40% | Media (2-3 días) |
| **Expiración Trials** | Cron manual (GitHub Actions) | 30% | Baja (1 día) |
| **Límites de Plan** | Se muestran, no se enforcean | 50% | Media-Alta (3-5 días) |
| **Upgrade de Plan** | No existe | 100% | Alta (1-2 semanas) |

### ❌ Lo que NO está implementado

| Feature | Gap | Complejidad | Prioridad |
|---------|-----|-------------|-----------|
| **Billing Automático** | 100% | Alta | 🔴 Alta (para beta) |
| **Stripe/Pasarela** | 100% | Media | 🟡 Media (post-beta) |
| **Invoices** | 100% | Baja | 🟢 Baja |
| **Coupons/Descuentos** | 100% | Baja | 🟢 Baja |

---

## 💰 EVALUACIÓN BILLING AUTOMÁTICO

### Estado Actual (2026-03-17)

**Lo que existe:**
```sql
-- Tablas implementadas
workspace_plan (
  workspace_id,
  plan_id,
  status, -- 'active' | 'trialing' | 'canceled'
  started_at,
  trial_ends_at, -- Para trials
  ended_at
)

workspace_limits (
  workspace_id,
  operations_monthly_limit,
  invitations_monthly_limit,
  source -- 'override' | 'enterprise'
)

plans (
  id, key, name,
  operations_monthly_limit,
  invitations_monthly_limit
)
```

**Funciones Edge:**
- `admin-grant-workspace-trial` — Otorga trial (manual)
- `admin-issue-trial-offer` — Emite oferta con descuento (manual)
- `admin-expire-workspace-trials` — Expira trials (cron GitHub Actions)
- `admin-invite-workspace-member` — Invita miembro (manual)

**Lo que NO existe:**
- ❌ Integración con Stripe/MercadoPago
- ❌ Webhooks de pago fallido
- ❌ Estado `past_due` en workspace_plan
- ❌ Reintentos automáticos de cobro
- ❌ Invoices/Recibos
- ❌ Prorrateo de upgrades/downgrades

---

### Complejidad de Implementar Billing Automático

#### Opción A: Stripe (Recomendado)

**Tiempo estimado:** 1-2 semanas  
**Complejidad:** Media-Alta  
**Costo:** 2.9% + $0.30 por transacción

**Tareas:**
1. [ ] Configurar Stripe account + productos/plans
2. [ ] Edge Function: `create-checkout-session` (genera link de pago)
3. [ ] Edge Function: `stripe-webhook` (escucha eventos de Stripe)
4. [ ] Webhook handlers:
   - `checkout.session.completed` → Activar plan `active`
   - `invoice.payment_failed` → Cambiar a `past_due`
   - `customer.subscription.deleted` → Cambiar a `canceled`
5. [ ] Migración: Agregar `stripe_customer_id`, `stripe_subscription_id` a `workspace_plan`
6. [ ] UI: Botón "Upgrade" → redirige a Checkout de Stripe
7. [ ] UI: Dashboard de billing (ver plan, invoices, cancelar)

**Riesgos:**
- ⚠️ Webhooks pueden fallar → need retry logic
- ⚠️ Timezone issues → trial_ends_at en UTC
- ⚠️ Prorrateo complejo → Stripe lo maneja, pero hay que mapear a DB

---

#### Opción B: MercadoPago (Latam)

**Tiempo estimado:** 2-3 semanas  
**Complejidad:** Alta  
**Costo:** 4.9% + $0.50 por transacción

**Tareas:**
1. [ ] Configurar MercadoPago account + preferencias
2. [ ] Edge Function: `create-mp-preference` (genera link de pago)
3. [ ] Edge Function: `mp-webhook` (escucha eventos)
4. [ ] Webhook handlers (similar a Stripe)
5. [ ] Migración: Agregar `mp_customer_id`, `mp_subscription_id`
6. [ ] UI: Similar a Stripe

**Riesgos:**
- ⚠️ API de MercadoPago es menos estable que Stripe
- ⚠️ Documentación en español pero menos clara
- ⚠️ Webhooks más lentos (pueden tardar minutos)

---

#### Opción C: LemonSqueezy (Merchant of Record)

**Tiempo estimado:** 3-5 días  
**Complejidad:** Media-Baja  
**Costo:** 5% + $0.50 por transacción (pero maneja VAT/taxes)

**Tareas:**
1. [ ] Configurar LemonSqueezy store + products
2. [ ] Edge Function: `create-lemon-checkout`
3. [ ] Edge Function: `lemon-webhook`
4. [ ] Webhook handlers (similar a Stripe)
5. [ ] Migración: Agregar `lemon_customer_id`, `lemon_order_id`
6. [ ] UI: Botón "Buy Now" → LemonSqueezy overlay

**Ventajas:**
- ✅ Maneja VAT/taxes automáticamente (MoR)
- ✅ Webhooks más simples que Stripe
- ✅ Checkout embebido (no redirige)

**Desventajas:**
- ⚠️ Menos conocido en Latam
- ⚠️ Fees más altos (5% vs 2.9%)

---

### Mi Recomendación: **Faseada**

#### **Fase 1 (Beta, 1 semana): Stripe Checkout + Webhooks Básicos**

**Qué implementar:**
- Stripe Checkout (redirige a Stripe, no embebido)
- Webhook: `checkout.session.completed` → activa plan
- Webhook: `invoice.payment_failed` → cambia a `past_due`
- UI: Botón "Upgrade" → Stripe Checkout
- UI: Dashboard básico (ver plan actual)

**Qué NO implementar:**
- ❌ Prorrateo de upgrades/downgrades
- ❌ Invoices descargables
- ❌ Coupons/descuentos
- ❌ Cancelación desde UI (solo desde Stripe)

**Por qué:**
- ✅ Rápido (1 semana)
- ✅ Stripe maneja taxes/VAT
- ✅ Checkout seguro (no tocamos datos de tarjeta)
- ✅ Suficiente para beta con 10-50 usuarios

---

#### **Fase 2 (Post-Beta, 2-3 semanas): Stripe Billing + UI Completa**

**Qué implementar:**
- Stripe Billing (subscriptions recurrentes)
- Prorrateo automático
- Invoices descargables
- Cancelación desde UI
- Coupons/descuentos
- Dashboard completo de billing

**Por qué:**
- ✅ Mejora UX para usuarios pagos
- ✅ Reduce churn (cancelación más fácil = más confianza)
- ✅ Invoices necesarios para empresas B2B

---

### Código Base para Fase 1 (Stripe Checkout)

```typescript
// supabase/functions/create-checkout-session/index.ts
import { Stripe } from 'https://esm.sh/stripe@13.0.0?node';

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  const { workspace_id, plan_key } = await req.json();

  // Get workspace owner
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspace_id)
    .single();

  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(workspace.owner_id);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: owner_email,
      metadata: { workspace_id, owner_id },
    });
    customerId = customer.id;
  }

  // Get plan price
  const priceId = PLAN_TO_PRICE_ID[plan_key];

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${SITE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/billing/cancel`,
    metadata: { workspace_id, plan_key },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

```typescript
// supabase/functions/stripe-webhook/index.ts
serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { workspace_id, plan_key } = session.metadata!;

    // Activate plan
    await supabase
      .from('workspace_plan')
      .insert({
        workspace_id,
        plan_key,
        status: 'active',
        started_at: new Date().toISOString(),
        stripe_session_id: session.id,
      });
  }

  // Handle invoice.payment_failed
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const { workspace_id } = invoice.metadata!;

    // Change to past_due
    await supabase
      .from('workspace_plan')
      .update({ status: 'past_due' })
      .eq('workspace_id', workspace_id);
  }

  return new Response('OK', { status: 200 });
});
```

---

## 📊 RECOMENDACIONES

### Prioridad Inmediata (Beta Testing)

1. **✅ NO tocar billing automático todavía**
   - Seguir con admin functions (cURL) para trials
   - 10 usuarios beta no justifican 1-2 semanas de desarrollo
   - Focus en validar product-market fit primero

2. **✅ Implementar después del beta (si hay tracción)**
   - Stripe Checkout (Fase 1, 1 semana)
   - Suficiente para 50-100 usuarios pagos

3. **✅ Post-tracción (100+ usuarios)**
   - Stripe Billing + UI completa (Fase 2, 2-3 semanas)
   - Invoices, prorrateo, cancelación

### Arquitectura

1. **✅ Mantener separación actual**
   - Client-side encryption → no cambiar
   - Edge Functions → consolidar más (system-health, notifications)
   - Database → agregar índices para queries frecuentes

2. **✅ Mejorar observabilidad**
   - Agregar logs estructurados en Edge Functions
   - Dashboard simple (hoja de cálculo o Supabase dashboard)
   - Alertas para anchoring_failed, cron_missed

3. **✅ Documentar happy paths**
   - Crear videos de 2-3 min por happy path
   - Documentación para brokers inmobiliarios (vertical inicial)

---

## 🎯 CONCLUSIÓN

**La arquitectura de EcoSign SÍ respalda los beneficios prometidos.**

**Fortalezas:**
- ✅ Zero-knowledge real (contenido nunca sale del cliente)
- ✅ Evidencia verificable offline (formato .ECO portable)
- ✅ Multi-participante con NDA y OTP
- ✅ Sesión probatoria funcional en producción
- ✅ Supervisión de workspace consolidada

**Debilidades:**
- ⚠️ Billing manual (admin functions)
- ⚠️ Límites de plan no se enforcean estrictamente
- ⚠️ Verificación offline podría ser más simple

**Recomendación final:**
- **NO implementar billing automático ahora** (pre-beta)
- **Focus en validar PMF con 10 brokers**
- **Implementar Stripe Checkout post-beta** (si hay tracción)

---

**FIN DEL DOCUMENTO**
