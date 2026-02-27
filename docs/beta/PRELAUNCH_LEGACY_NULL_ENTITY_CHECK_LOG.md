# Prelaunch Legacy Null-Entity Check Log

Registro versionado de verificaciones previas a release para validar que no
existen filas legacy sin `document_entity_id` en tablas públicas críticas.

## 2026-02-27

- UTC: `2026-02-27 15:55:24 UTC`
- Local: `2026-02-27 09:55:24 CST`
- Target DB: `postgresql://postgres@127.0.0.1:54322/postgres` (local)
- Command:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  -P pager=off \
  -f scripts/diagnostics/check_prelaunch_legacy_null_entities.sql
```

- Result:

```text
document_shares_without_entity | t | 0
invites_without_entity         | t | 0
signer_links_without_entity    | t | 0
```
