# Beta Release Ritual (Functions + Config + Credential Rotation)

Fecha: 2026-02-24  
Owner: Engineering

Objetivo: release repetible sin sorpresas para abrir/cuidar beta de 10 usuarios.

## 1) Freeze del release

1. Confirmar branch/commit objetivo.
2. Confirmar que incluye archivos shared críticos:
   - `supabase/functions/_shared/internalAuth.ts`
   - `supabase/functions/_shared/signerAccessToken.ts`
3. Confirmar workspace sin artefactos temporales.

## 2) Gate técnico obligatorio

```bash
bash scripts/diagnostics/prebeta_fire_drill.sh
```

Comportamiento de `deno check`:

```bash
# default: DENO_CHECK=auto (corre solo si hay resolución DNS a registry.npmjs.org)
bash scripts/diagnostics/prebeta_fire_drill.sh

# estricto: obliga deno check y falla si no pasa
DENO_CHECK=true bash scripts/diagnostics/prebeta_fire_drill.sh

# desactivado explícito
DENO_CHECK=false bash scripts/diagnostics/prebeta_fire_drill.sh
```

## 3) Deploy conjunto (db + functions)

Dry-run del ritual:

```bash
bash scripts/diagnostics/release_beta_ritual.sh --project-ref <project-ref>
```

Ejecución real:

```bash
export SUPABASE_ACCESS_TOKEN="<token>"
export ROTATION_TICKET="SEC-YYYYMMDD-01"
bash scripts/diagnostics/release_beta_ritual.sh --project-ref <project-ref> --execute
```

Este ritual falla si detecta `verify_jwt=false` en funciones/config.
El bundle de funciones se toma de:

- `scripts/diagnostics/release_beta_functions.txt`

Además valida que estos shared files existan y estén trackeados por git:

- `supabase/functions/_shared/internalAuth.ts`
- `supabase/functions/_shared/signerAccessToken.ts`

Antes/después del deploy, confirmar secretos runtime requeridos por el stack:

- `CRON_SECRET`
- `INTERNAL_SECRET`
- `TOKEN_SECRET`

## 4) Rotación de credencial (obligatoria)

Después del deploy conjunto:

1. Rotar password DB en Supabase Dashboard (`Project Settings -> Database`).
2. Actualizar el nuevo credential en:
   - CI/CD secrets
   - secret manager operativo
   - `.env` local/ops (si aplica)
3. Verificar conectividad con el credential nuevo (consulta simple).
4. Registrar evidencia en `docs/beta/BETA_RELEASE_ROTATION_LOG.md`.

## 5) Smoke manual de release

Antes de abrir beta:

1. Ejecutar FD-01 (happy path).
2. Ejecutar FD-05 (OTP resend flood).
3. Ejecutar FD-07 (suplantación por signerId).

Si falla cualquiera: no-go hasta corrección.
