# Authority Baseline Snapshot

- Generated at (UTC): 2026-03-05T22:47:37Z
- DB URL: `postgresql://postgres:****@127.0.0.1:54322/postgres`

## verify_jwt=false allowlist (config.toml)

- presential-verification-get-acta
- signing-keys

## SECURITY DEFINER exposed to anon/authenticated

- public.create_document_folder(_name text)
- public.delete_document_folder(_folder_id uuid)
- public.move_documents_to_folder(_doc_ids uuid[], _folder_id uuid)
- public.rename_document_folder(_folder_id uuid, _name text)
- public.request_certificate_regeneration(_document_id uuid, _request_type text)

## Internal runtime tables grants + RLS matrix

| table | rls_enabled | anon_privs | auth_privs | service_role_privs |
|---|---|---|---|---|
| domain_outbox | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| executor_decision_logs | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| executor_job_runs | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| executor_jobs | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| rate_limit_blocks | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| rate_limits | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| shadow_decision_logs | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| system_workers | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| welcome_email_queue | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |

## Direct projection writers scan (supabase/functions)

### workflow_signers.status patterns
- none

### signature_workflows.status patterns
```text
supabase/functions/apply-signer-signature/index.ts:1654:    // NOTE: do not update signature_workflows.status here.
```
