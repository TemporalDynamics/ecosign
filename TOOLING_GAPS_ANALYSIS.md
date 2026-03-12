# Análisis de Herramientas: Gaps y Oportunidades

**Fecha**: 2026-03-11  
**Contexto**: Repo maduro con 88 edge functions, testing comprehensivo, pero oportunidades de mejora en tooling

---

## 🟢 HERRAMIENTAS QUE YA TENÉS (Bien Utilizadas)

### Testing
- ✅ **Vitest** - Test runner moderno, bien configurado
- ✅ **Playwright** - E2E visual testing (playwright.visual.config.ts)
- ✅ **@vitest/ui** - Test UI para debugging
- ✅ **@vitest/coverage-v8** - Coverage reporting

### Development
- ✅ **TypeScript** - Type safety en cliente
- ✅ **Supabase CLI** - Edge functions deployment
- ✅ **Knip** - Dead code detection
- ✅ **ts-node** - Script execution

### CI/CD
- ✅ **GitHub Actions** - 6 workflows activos
- ✅ **Vercel** - Client deployment

---

## 🔴 GAPS CRÍTICOS (Alta Prioridad)

### 1. **Caching / Queue System - REDIS**

**Problema Actual:**
- Edge functions hacen queries repetidas (workflow_signers, document_entities)
- No hay cache para datos frecuentemente accedidos
- Emails se envían síncronos (blocking)

**Uso Recomendado:**
```typescript
// Ejemplo: Cache de workflow signers
const cacheKey = `workflow:${workflowId}:signers`;
let signers = await redis.get(cacheKey);

if (!signers) {
  const { data } = await supabase.from('workflow_signers').select('*').eq('workflow_id', workflowId);
  await redis.setex(cacheKey, 3600, JSON.stringify(data)); // 1 hour TTL
  signers = data;
}
```

**Beneficios:**
- ⚡ Reduce latencia de edge functions (30-50%)
- 💰 Reduce costo de DB queries
- 🔄 Queue para emails asíncronos (presential OTPs)

**Implementación:**
- Upstash Redis (compatible con Supabase Edge)
- Bull/BullMQ para queues
- Cache invalidation con pub/sub

**Prioridad**: ALTA (resuelve error 500 post-email?)

---

### 2. **API Mocking - MSW (Mock Service Worker)**

**Problema Actual:**
- Tests integration golpean DB real (supabase db reset requerido)
- No hay mocks para edge functions en tests E2E
- Dificulta testing de error paths

**Uso Recomendado:**
```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/functions/v1/presential-verification-start-session', () => {
    return HttpResponse.json({ sessionId: 'mock-123', status: 'active' });
  }),
];
```

**Beneficios:**
- 🚀 Tests más rápidos (no hit DB)
- 🧪 Test error scenarios fácilmente
- 🔄 Replay producciones issues en local

**Implementación:**
- MSW para edge functions
- Mockear Supabase client en tests
- Setup/Teardown automático

**Prioridad**: ALTA

---

### 3. **Database Testing - Testcontainers**

**Problema Actual:**
- `supabase db reset` es manual y lento
- Tests integration comparten DB state (flaky)
- No hay isolation entre test suites

**Uso Recomendado:**
```typescript
// tests/setup/testcontainers.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: PostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionString();
  await runMigrations();
});

afterAll(async () => {
  await container.stop();
});
```

**Beneficios:**
- 🏃 Parallel test execution
- 🔒 Test isolation (cada suite su DB)
- 🎯 Reproducible failures

**Implementación:**
- @testcontainers/postgresql
- Supabase migrations runner
- CI matrix para parallelization

**Prioridad**: MEDIA (mejora velocity)

---

### 4. **Observability - OpenTelemetry**

**Problema Actual:**
- Edge function errors son opaque (error 500 sin stacktrace)
- No hay tracing de requests cross-functions
- Logging manual con console.log

**Uso Recomendado:**
```typescript
// supabase/functions/_shared/telemetry.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('ecosign-edge');

export async function traced<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}

// Uso
await traced('captureOperationSnapshot', async () => {
  const documents = await fetchDocuments();
  const signers = await fetchSigners();
  return buildSnapshot(documents, signers);
});
```

**Beneficios:**
- 🔍 Debugging rápido de errores 500
- 📊 Performance bottleneck identification
- 🎯 Distributed tracing (edge → DB → TSA)

**Implementación:**
- OpenTelemetry JS SDK
- Honeycomb / Jaeger backend
- Auto-instrumentation para Supabase client

**Prioridad**: ALTA (resuelve problema de error 500)

---

### 5. **Load Testing - k6**

**Problema Actual:**
- No hay tests de carga
- No sabés cuántas sesiones probatorias simultáneas aguanta
- Potencial rate limiting issues no detectados

**Uso Recomendado:**
```javascript
// tests/load/presential-session.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp-up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.01'],    // <1% failure rate
  },
};

export default function() {
  const res = http.post(
    'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/presential-verification-start-session',
    JSON.stringify({ operationId: __ENV.OPERATION_ID }),
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${__ENV.TOKEN}` } }
  );
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'session created': (r) => JSON.parse(r.body).sessionId !== undefined,
  });
}
```

**Beneficios:**
- 💪 Confidence en capacity planning
- 🚨 Early detection de bottlenecks
- 📈 Performance regression detection

**Implementación:**
- k6 CLI
- k6 Cloud para distributed load testing
- CI integration para pre-deploy checks

**Prioridad**: MEDIA

---

## 🟡 GAPS MEDIANOS (Mejoras Incrementales)

### 6. **Contract Testing - Pact**

**Problema:** Edge functions cambian schema sin avisar al cliente

**Solución:**
```typescript
// tests/contracts/presential-session.pact.ts
import { Pact } from '@pact-foundation/pact';

const provider = new Pact({
  consumer: 'EcoSign Client',
  provider: 'Presential Verification API',
});

describe('Start Session Contract', () => {
  it('returns session with expected schema', async () => {
    await provider
      .given('a valid operation exists')
      .uponReceiving('a request to start session')
      .withRequest({
        method: 'POST',
        path: '/functions/v1/presential-verification-start-session',
        body: { operationId: Matchers.uuid() },
      })
      .willRespondWith({
        status: 200,
        body: {
          sessionId: Matchers.string(),
          status: Matchers.term({ matcher: /active|closed/ }),
          participantsCount: Matchers.integer(),
        },
      });
  });
});
```

**Prioridad**: BAJA (nice to have)

---

### 7. **Chaos Engineering - Chaos Mesh**

**Problema:** No se testea resilience a failures

**Solución:**
- Inject latency en DB queries
- Simulate TSA service down
- Test recovery de email delivery failures

**Prioridad**: BAJA (producción madura)

---

### 8. **Feature Flags - LaunchDarkly**

**Problema Actual:**
- `FASE` flag es hard-coded
- No hay gradual rollout
- A/B testing manual

**Uso Recomendado:**
```typescript
import { LDClient } from 'launchdarkly-node-server-sdk';

const client = LDClient.init(process.env.LAUNCHDARKLY_KEY);

const useCustodyEncryption = await client.variation(
  'custody-encryption',
  { key: user.id, email: user.email },
  false // default
);

if (useCustodyEncryption) {
  // Nueva lógica
} else {
  // Fallback
}
```

**Prioridad**: BAJA (FASE ya funciona)

---

## 🟢 HERRAMIENTAS MAL UTILIZADAS (Optimizar)

### 9. **Playwright - Underutilized**

**Problema Actual:**
- Solo hay visual regression tests
- No hay E2E de flujos críticos
- No se corre en CI regularmente

**Mejoras:**
```typescript
// tests/e2e/presential-flow.spec.ts
test('complete presential verification flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'owner@test.com');
  await page.fill('[name="password"]', 'test123');
  await page.click('button[type="submit"]');
  
  // Start session
  await page.goto('/documents');
  await page.click('[data-testid="operation-actions"]');
  await page.click('text=Sesión probatoria reforzada');
  
  // Verify modal
  await expect(page.locator('[data-testid="presential-modal"]')).toBeVisible();
  const sessionId = await page.locator('[data-testid="session-id"]').textContent();
  expect(sessionId).toMatch(/PSV-\w+/);
  
  // Close session (in new context as signer)
  const signerPage = await context.newPage();
  await signerPage.goto(`/presential/${sessionId}`);
  // ... continúa
});
```

**Acción**: Agregar E2E críticos + CI integration

**Prioridad**: ALTA

---

### 10. **GitHub Actions - No Hay Deployment Preview**

**Problema:** No hay preview environments para PRs

**Solución:**
```yaml
# .github/workflows/deploy-preview.yml
name: Deploy Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Comment PR with preview URL
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview: ${{ steps.deploy.outputs.preview-url }}'
            })
```

**Prioridad**: MEDIA

---

## 📊 PRIORIZACIÓN

### Sprint 1 (Semana 1-2): Critical Path
1. **OpenTelemetry** → Debuggear error 500 ✅
2. **MSW** → Fast, reliable tests ✅
3. **Playwright E2E** → Cobertura de flujos críticos ✅

### Sprint 2 (Semana 3-4): Performance
4. **Redis/Upstash** → Cache + async queues ✅
5. **k6 Load Testing** → Capacity planning ✅

### Sprint 3 (Mes 2): Infrastructure
6. **Testcontainers** → Test isolation ✅
7. **GitHub Actions Preview** → PR workflow ✅

### Backlog (Nice to Have)
8. **Pact** - Contract testing
9. **Chaos Mesh** - Resilience testing
10. **LaunchDarkly** - Feature flags refinement

---

## 🎯 QUICK WINS (Esta Semana)

### 1. Agregar OpenTelemetry Basic (2 horas)
```bash
npm install @opentelemetry/api @opentelemetry/sdk-trace-base
# Agregar wrapper en _shared/telemetry.ts
# Instrumentar presential-verification-start-session
```

### 2. Setup MSW para Tests (1 hora)
```bash
npm install -D msw
# Crear tests/mocks/handlers.ts
# Actualizar vitest.config.ts con setupFiles
```

### 3. Playwright E2E del Flujo Presencial (3 horas)
```bash
# Ya tenés Playwright configurado
# Crear tests/e2e/presential-flow.spec.ts
# Agregar a CI workflow
```

---

## 🔗 RECURSOS

### OpenTelemetry
- [Deno OpenTelemetry](https://deno.land/x/opentelemetry)
- [Honeycomb + Supabase](https://www.honeycomb.io/blog/observability-edge-functions)

### Redis/Upstash
- [Upstash Redis for Supabase Edge](https://upstash.com/docs/redis/features/edgefunction)
- [Bull Queue](https://github.com/OptimalBits/bull)

### MSW
- [MSW Setup with Vitest](https://mswjs.io/docs/integrations/node)
- [Mocking Supabase](https://supabase.com/docs/guides/testing)

### k6
- [k6 Docs](https://k6.io/docs/)
- [k6 Cloud](https://k6.io/cloud/)

---

## 💰 COSTOS ESTIMADOS

| Herramienta | Plan | Costo/Mes | Prioridad |
|------------|------|-----------|-----------|
| Upstash Redis | Free tier | $0 (10K requests/day) | ALTA |
| OpenTelemetry + Honeycomb | Free tier | $0 (20M events/month) | ALTA |
| k6 Cloud | Developer | $49 | MEDIA |
| LaunchDarkly | Starter | $0 (1K MAU) | BAJA |
| Testcontainers | Self-hosted | $0 | MEDIA |

**Total**: $0-49/mes dependiendo de prioridad

---

## ✅ RECOMENDACIÓN INMEDIATA

**Esta Semana:**
1. Agregar OpenTelemetry → Debuggear error 500 presential
2. Setup MSW → Custody tests más rápidos
3. Playwright E2E → Flujo presential completo

**Próxima Semana:**
4. Upstash Redis → Cache + email queue
5. k6 → Load test de presential sessions

**ROI Esperado:**
- 🐛 Debugging time: -80% (traces claros)
- ⚡ Test speed: -60% (mocks + testcontainers)
- 🚀 Deploy confidence: +90% (E2E + load tests)

---

**Conclusión**: El repo tiene buena base de testing, pero le faltan herramientas de observability y performance testing. Prioridad #1 es OpenTelemetry para debuggear el error 500.
