# Tests - EcoSign

## Objetivo
Separar claramente:
- `test:fast`: feedback rápido sin dependencia DB local.
- `test:db`: gate real de seguridad/integración contra Supabase local del repo.

`verde` en `test:fast` **no** reemplaza `test:db` para release.

## Comandos

### Flujo diario (rápido)
```bash
npm test
```
Alias de `npm run test:fast`.

### Gate DB (obligatorio para release/tag)
```bash
npm run test:db
```

Este comando:
- valida estado de Supabase local (`supabase status --output json`),
- inyecta `SUPABASE_URL`, `DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
- fuerza `SUPABASE_LOCAL=true` y `RUN_DB_INTEGRATION=1`,
- ejecuta:
  - `tests/security/rls.test.ts`
  - `tests/security/storage.test.ts`
  - `tests/security/workflowCanvasAtomicity.test.ts`
  - `tests/integration/tsaEvents.test.ts`
  - `tests/canonical-only/complete-pipeline-proof.test.ts`

## Supabase local del repo

Scripts estándar:
```bash
npm run sb:start
npm run sb:status
npm run sb:stop
```

## Política de release

Antes de `tag`/deploy:
1. `npm test`
2. `npm run test:db`

Si falla `test:db`, no hay release.

## Troubleshooting

### Error de entorno DB tests
Si ves `[DB_TEST_ENV_MISSING]`:
1. Levanta stack local del repo: `npm run sb:start`
2. Verifica estado: `npm run sb:status`
3. Reintenta: `npm run test:db`

### Dos repos activos (WITH + EcoSign)
Es válido si usan puertos distintos por proyecto.
`test:db` usa los valores del `supabase status` del repo actual, evitando hardcode manual.
