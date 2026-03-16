# Billing Trials (Workspace Plans)

Este documento describe la implementación de **trials (pruebas gratuitas)** a nivel **workspace** en EcoSign, sin integrar pasarelas de pago todavía.

## Objetivo

- Poder habilitar **1–60+ días de trial** a un workspace (ej. plan `business`) para una beta controlada.
- Mantener un estado declarativo en base de datos (`workspace_plan`) y una fecha de expiración clara.
- Automatizar el “cierre” del trial cuando vence (pasando a `free` por defecto).
- Mantener compatibilidad con el front actual que lee `user.user_metadata.plan`.

## Diseño (en una frase)

El trial es un `workspace_plan` con `status = 'trialing'` y una fecha `trial_ends_at`. Cuando vence, se cancela y se activa un plan `free` (o el que definamos) como `status = 'active'`.

## Cambios en Base de Datos

### Migración

- `supabase/migrations/20260316140000_add_trial_ends_at_to_workspace_plan.sql`

Agrega:

- Columna `public.workspace_plan.trial_ends_at TIMESTAMPTZ`
  - Separada de `ended_at` (que representa cancelación/fin administrativo).
- Backfill best-effort:
  - Si existían filas `trialing` que usaban `ended_at` como fin de trial, se copia a `trial_ends_at`.
- Índice parcial:
  - `idx_workspace_plan_trial_ends_at` filtrado por `status = 'trialing'`.

### Lectura del plan efectivo

`compute_workspace_effective_limits(p_workspace_id)` ya considera `workspace_plan.status IN ('active','trialing')`, así que un trial funciona igual que un plan activo para capacidades/limits.

## Edge Functions (Admin)

Estas funciones están pensadas para uso interno (service role o cron secret), no para exponerlas al público.

### 1) Otorgar trial

- Ruta: `supabase/functions/admin-grant-workspace-trial/index.ts`
- Nombre: `admin-grant-workspace-trial`
- Método: `POST`
- Auth: **solo internal**
  - Válido con `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (o `apikey: <...>`)

#### Payload

Se puede identificar el target por:

- `workspace_id`, o
- `owner_id`, o
- `owner_email` (best-effort; busca en `listUsers` paginando)

Campos:

```json
{
  "workspace_id": "uuid (opcional)",
  "owner_id": "uuid (opcional)",
  "owner_email": "string (opcional)",
  "plan_key": "business (default) | pro | enterprise | free",
  "trial_days": 30
}
```

#### Comportamiento

- Resuelve o crea workspace para el owner (si falta).
- Cancela el plan vigente del workspace (si hay `active|trialing|past_due`).
- Inserta un nuevo `workspace_plan` con:
  - `status = 'trialing'`
  - `trial_ends_at = now() + trial_days`
- Actualiza `auth.user_metadata` del owner (compatibilidad UI):
  - `plan`, `plan_status`, `trial_ends_at`, `workspace_id`

#### Ejemplo (cURL)

```bash
curl -sS -X POST "https://<PROJECT>.supabase.co/functions/v1/admin-grant-workspace-trial" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"owner_email":"demo@ecosign.app","plan_key":"business","trial_days":60}'
```

### 2) Expirar trials vencidos (cron/manual)

- Ruta: `supabase/functions/admin-expire-workspace-trials/index.ts`
- Nombre: `admin-expire-workspace-trials`
- Método: `POST`
- Auth: internal
  - Acepta service role (`Authorization/apikey`) o `CRON_SECRET` (headers `x-cron-secret` / `x-internal-secret`).

#### Payload

```json
{
  "limit": 50,
  "dry_run": false,
  "next_plan_key": "free"
}
```

#### Comportamiento

- Busca `workspace_plan` con:
  - `status = 'trialing'`
  - `trial_ends_at <= now()`
- Por cada uno:
  - Marca la fila de trial como `canceled` + `ended_at = now()`
  - Inserta un nuevo `workspace_plan` `active` en `next_plan_key` (default `free`)
  - Actualiza `auth.user_metadata` del owner (best-effort):
    - `plan = next_plan_key`, `plan_status = active`, `trial_ends_at = null`

#### Ejemplos

Dry run:

```bash
curl -sS -X POST "https://<PROJECT>.supabase.co/functions/v1/admin-expire-workspace-trials" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"dry_run":true,"limit":100}'
```

Ejecución real:

```bash
curl -sS -X POST "https://<PROJECT>.supabase.co/functions/v1/admin-expire-workspace-trials" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data '{"dry_run":false,"limit":100,"next_plan_key":"free"}'
```

## Seguridad

- `admin-grant-workspace-trial` requiere internal auth y **no** acepta `CRON_SECRET` (solo service role).
- `admin-expire-workspace-trials` acepta service role o cron secret (para poder programarlo).

## Deploy / Operación

1) Aplicar migración:

```bash
supabase db push
```

2) Deploy de funciones:

```bash
supabase functions deploy admin-grant-workspace-trial
supabase functions deploy admin-expire-workspace-trials
```

3) (Opcional) Programar cron externo (GitHub Actions, Cloud Scheduler, etc.) para llamar:

- `admin-expire-workspace-trials` cada 5–15 minutos.

## Limitaciones / Próximos pasos

- `owner_email` se resuelve paginando `listUsers`. Para producción a escala conviene:
  - pasar `owner_id` desde un panel interno, o
  - tener una tabla índice propia (email → user_id).
- Todavía no hay “billing real”: no hay Stripe/PayPal/MercadoPago ni `past_due` por cobro fallido.
- Ideal a futuro:
  - Trigger para crear `workspace + free plan` al registrar usuario nuevo.
  - Panel de administración / supervisión para asignar trials/seats sin usar cURL.

