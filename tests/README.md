# 🧪 Tests - EcoSign

Este directorio contiene la suite de tests del proyecto EcoSign.

## 📋 Estructura

```
tests/
├── integration/           # Tests de integración (mocks de servicios externos)
│   └── certification-flow.test.ts
├── security/             # Tests de seguridad (requieren Supabase local)
│   ├── rls.test.ts       # Row Level Security
│   ├── storage.test.ts   # Storage policies
│   └── sanitization.test.ts
├── unit/                 # Tests unitarios
│   └── [varios]
└── helpers/              # Test helpers y utilidades
    └── supabase-test-helpers.ts
```

---

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Tests específicos
```bash
# Solo integration
npm test -- tests/integration/

# Solo security (necesita Supabase local)
npm test -- tests/security/

# Un archivo específico
npm test -- tests/integration/certification-flow.test.ts
```

---

## 🔒 Tests de Seguridad (RLS y Storage)

### Requisitos

Los tests de seguridad **requieren Supabase local corriendo**:

1. **Levantar Supabase local:**
   ```bash
   supabase start
   ```

2. **Configurar variables de entorno:**
   ```bash
   export SUPABASE_LOCAL=true
   ```

   Las otras variables se cargan automáticamente de `.env.test`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Ejecutar tests de seguridad:**
   ```bash
   npm test -- tests/security/rls.test.ts
   npm test -- tests/security/storage.test.ts
   ```

### Comportamiento de Skip

**Sin `SUPABASE_LOCAL=true`:**
- Los tests se skippean automáticamente
- Se muestra mensaje: `⚠️  Skipping RLS tests: set SUPABASE_LOCAL=true...`
- **No fallan**, solo se omiten
- Perfecto para CI sin Supabase

**Con `SUPABASE_LOCAL=true` pero sin Supabase corriendo:**
- Los tests intentan conectarse
- Si falla la conexión inicial, se skippean con warning
- No rompen la suite completa

---

## 🧪 Tests de Integración

Los tests de `integration/` **NO requieren Supabase**:

```bash
npm test -- tests/integration/certification-flow.test.ts
```

**Características:**
- Mockean servicios externos (TSA)
- No tocan bases de datos reales
- No requieren configuración especial
- Siempre corren en CI

---

## 📊 Coverage

```bash
npm run test:coverage
```

**Estado actual:**
- Integration tests: ✅ 100% passing
- Security tests: ✅ Pass con Supabase local
- Unit tests: ✅ Mayoría passing

---

## 🔍 Debugging Tests

### Ver logs detallados
```bash
npm test -- --reporter=verbose
```

### Correr un test en watch mode
```bash
npm test -- tests/integration/certification-flow.test.ts --watch
```

### Ver coverage de un archivo específico
```bash
npm test -- tests/integration/certification-flow.test.ts --coverage
```

---

## 📝 Escribir Nuevos Tests

### Test de Integración (sin Supabase)
```typescript
// tests/integration/my-feature.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock external services
vi.mock('../../client/src/lib/externalService', () => ({
  callExternal: vi.fn().mockResolvedValue({ success: true })
}));

describe('My Feature', () => {
  it('should work correctly', async () => {
    // Test code
    expect(result).toBe(expected);
  });
});
```

### Test de Seguridad (con Supabase)
```typescript
// tests/security/my-security.test.ts
import { describe, test, expect, beforeAll } from 'vitest';
import { getAdminClient } from '../helpers/supabase-test-helpers';

const supabaseEnvReady = Boolean(
  process.env.SUPABASE_LOCAL === 'true' &&
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_ANON_KEY
);
const describeIfSupabase = supabaseEnvReady ? describe : describe.skip;

if (!supabaseEnvReady) {
  console.warn('⚠️  Skipping tests: set SUPABASE_LOCAL=true');
}

describeIfSupabase('My Security Feature', () => {
  let skipTests = false;
  
  beforeAll(async () => {
    // Check connectivity
    try {
      const client = getAdminClient();
      const { error } = await client.from('documents').select('id').limit(1);
      if (error) {
        skipTests = true;
        return;
      }
    } catch (err) {
      console.warn('⚠️  Supabase not available');
      skipTests = true;
      return;
    }
  });
  
  test('my security test', async () => {
    if (skipTests) {
      console.log('⚠️  Skipping: Supabase no disponible');
      return;
    }
    
    // Test code
  });
});
```

---

## 🎯 CI/CD

### GitHub Actions

Los tests se ejecutan automáticamente en CI:

- ✅ Integration tests: **siempre corren**
- ⏭️ Security tests: **se skippean** (sin `SUPABASE_LOCAL=true`)
- ✅ Unit tests: **siempre corren**

### Local Development

Para desarrollo local:

1. **Desarrollo rápido** (sin Supabase):
   ```bash
   npm test
   ```
   - Security tests se skippean automáticamente
   - Integration y unit tests corren normales

2. **Testing completo** (con Supabase):
   ```bash
   supabase start
   export SUPABASE_LOCAL=true
   npm test
   ```
   - Todos los tests corren, incluyendo security

---

## ⚠️ Notas Importantes

### Tests de Certificación

- **Archivos vacíos**: El sistema acepta archivos vacíos (0 bytes) y genera certificados válidos con `fileSize: 0`
- **Validación de bytes**: Los tests validan que `ecoxBuffer` sea `Uint8Array` o `ArrayBuffer` sin asumir tipo concreto
- **TSA mockeado**: Los tests de integración mockean el servicio TSA para evitar llamadas reales

### Tests de RLS/Storage

- **Auto-skip inteligente**: Si Supabase no está disponible, los tests se skippean sin fallar
- **Cleanup automático**: Los tests limpian usuarios y archivos de prueba al finalizar
- **Timeouts generosos**: 15 segundos por test para operaciones de red

---

## 🐛 Troubleshooting

### "Skipping RLS tests: Supabase no disponible"

**Causa**: Supabase local no está corriendo o no responde

**Solución**:
```bash
# Verificar status
supabase status

# Si no está corriendo
supabase start

# Verificar logs
supabase logs
```

### "TypeError: Cannot read property 'from' of undefined"

**Causa**: Variables de entorno de Supabase no están configuradas

**Solución**:
```bash
# Verificar que existan en .env.test
cat .env.test | grep SUPABASE

# O crear .env.test:
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

### Tests timeout

**Causa**: Supabase local lento o migraciones pendientes

**Solución**:
```bash
# Reiniciar Supabase
supabase stop
supabase start

# Aplicar migraciones
supabase db reset
```

---

## 📚 Referencias

- [Vitest Documentation](https://vitest.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/cli/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Última actualización**: 2025-12-20
