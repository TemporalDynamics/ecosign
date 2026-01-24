# Shadow Runs — D5 a D8 (Acumulación)

**Fecha:** 2026-01-23
**Entorno:** Local
**Método:** Script de acumulación de runs (sin UI, sin envío de mails)

## Comando usado

```bash
deno run --allow-net --allow-env scripts/accumulate-shadow-runs.ts \
  --runs 500 \
  --signers 3 \
  --emails manus1986@gmail.com,manuelsenorans3@gmail.com,guarderiarodantemexico@gmail.com
```

## Procedimiento (resumen)

1. Crear workflow nuevo (status `active`).
2. Crear N firmantes (status `invited`).
3. Transicionar firmantes: `invited` → `ready_to_sign` → `signed`.
4. Marcar workflow como `completed`.
5. Repetir X veces.

## Resultados

| Decisión | Runs | Divergencias | Match % |
|---|---:|---:|---:|
| D5_NOTIFY_SIGNER_LINK | 1517 | 0 | 100.00 |
| D6_NOTIFY_SIGNATURE_COMPLETED | 1505 | 0 | 100.00 |
| D7_NOTIFY_WORKFLOW_COMPLETED | 502 | 0 | 100.00 |
| D8_NOTIFY_CREATOR_DETAILED | 1501 | 0 | 100.00 |

## Evidencia (queries ejecutadas)

```sql
SELECT * FROM shadow_d5_summary;
SELECT * FROM shadow_d6_summary;
SELECT * FROM shadow_d7_summary;
SELECT * FROM shadow_d8_summary;
```

## Nota

- No se enviaron emails (cron inactivo).
- Las decisiones fueron evaluadas por triggers legacy con shadow mode.
- Resultado válido para aceptación cuantitativa (>= 500 runs, 0 divergencias).
