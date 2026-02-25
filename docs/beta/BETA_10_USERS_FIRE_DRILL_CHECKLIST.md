# Beta 10 Users - Fire Drill Checklist

Fecha: 2026-02-24
Owner: Engineering

Objetivo: detectar fallos previsibles antes de abrir a 10 beta testers en flujo de firma.

## 1) Gate técnico previo (obligatorio)

Ejecutar:

```bash
bash scripts/diagnostics/prebeta_fire_drill.sh
```

Comportamiento de `deno check`:

```bash
# default: DENO_CHECK=auto (corre solo si hay resolución DNS a registry.npmjs.org)
bash scripts/diagnostics/prebeta_fire_drill.sh

# estricto: obliga deno check
DENO_CHECK=true bash scripts/diagnostics/prebeta_fire_drill.sh

# desactivado explícito
DENO_CHECK=false bash scripts/diagnostics/prebeta_fire_drill.sh
```

Resultado esperado:
- `typecheck` pasa
- `lint` pasa
- smoke client pasa
- pruebas canónicas/autoridad pasan
- `phase1:gate` pasa (14/14)
- build client pasa

## 1b) Ritual de release (obligatorio antes de abrir beta)

```bash
# Dry-run
bash scripts/diagnostics/release_beta_ritual.sh --project-ref <project-ref>

# Ejecución real
export SUPABASE_ACCESS_TOKEN="<token>"
export ROTATION_TICKET="SEC-YYYYMMDD-01"
bash scripts/diagnostics/release_beta_ritual.sh --project-ref <project-ref> --execute
```

Verificar secretos runtime requeridos por el stack:

- `CRON_SECRET`
- `INTERNAL_SECRET`
- `TOKEN_SECRET`

Además, registrar rotación de credencial en:

- `docs/beta/BETA_RELEASE_ROTATION_LOG.md`

## 2) Fire drills funcionales (manuales)

### FD-01 Happy path signer completo
- Setup: workflow con `require_nda=true`, OTP activo, firma secuencial.
- Flujo: link -> preaccess -> NDA -> OTP -> firma -> completado.
- Esperado:
  - `signer.identity_confirmed`
  - `nda.accepted`
  - `otp.verified`
  - `signer.signed`
  - avance al siguiente firmante o cierre de workflow.

### FD-02 Link expirado
- Setup: expirar `token_expires_at`.
- Flujo: abrir link.
- Esperado:
  - `signer-access` bloquea con mensaje de enlace inválido/expirado.
  - No se genera OTP.

### FD-03 Link revocado
- Setup: set `token_revoked_at`.
- Flujo: abrir link y/o intentar OTP.
- Esperado: rechazo consistente en acceso, OTP y firma.

### FD-04 OTP incorrecto + lockout
- Flujo: ingresar OTP inválido 5 veces.
- Esperado:
  - incrementa `attempts`;
  - responde `OTP_TOO_MANY_ATTEMPTS` al exceder límite;
  - no permite continuar.

### FD-05 OTP resend flood
- Flujo: pedir OTP varias veces en <30s.
- Esperado:
  - throttling `429` con `retry_after_seconds`;
  - no spam de emails.

### FD-06 Firma fuera de turno
- Setup: signer de orden 2 intenta acceder antes de orden 1.
- Esperado:
  - bloqueo `SIGNER_NOT_READY_TO_SIGN`;
  - no escritura de firma/eventos de completado.

### FD-07 Intento de suplantación por `signerId`
- Flujo: usar `signerId` válido con `accessToken` inválido para OTP o firma.
- Esperado:
  - rechazo `403`;
  - no mutaciones en `workflow_signers`, `workflow_events`, `document_entities`.

### FD-08 Rechazo explícito del firmante
- Flujo: firmante usa “rechazar”.
- Esperado:
  - `signer.rejected`;
  - workflow transiciona a `rejected` (si estaba `active`);
  - resto de links no deben firmar.

### FD-09 Reinicio de link por owner
- Setup: owner usa `resume-signer-link`.
- Esperado:
  - sólo owner autorizado;
  - link reactivado para signer correcto;
  - no altera orden de firma.

### FD-10 Post-firma evidencia mínima
- Flujo: completar firma final.
- Esperado:
  - se encola/procesa protección canónica;
  - eventos TSA/anchor/artifact según policy;
  - owner recibe notificación final.

## 3) Métricas mínimas a monitorear (beta week 1)

- `workflow_signers`:
  - ratio de `expired`, `rejected`, `ready_to_sign`.
- `signer_otps`:
  - intentos promedio por signer;
  - distribución de `429` resend throttle.
- `executor_jobs`:
  - cola `retry_scheduled` y `dead`.
- `workflow_notifications`:
  - tasa de `delivery_status != sent`.

## 4) Criterio de go/no-go

Go si:
- 10/10 fire drills pasan;
- no hay bypass por `signerId` sin token;
- no hay endpoint interno público sin auth;
- sin errores P0/P1 en `phase1:gate` y suite crítica.

No-go si:
- cualquier bypass de token;
- cualquier endpoint interno responde 200 sin auth;
- cualquier workflow puede firmarse fuera de turno;
- falla de artifact/TSA en happy path.
