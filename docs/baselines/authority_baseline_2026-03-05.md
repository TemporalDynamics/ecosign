# Authority Baseline Snapshot

- Generated at (UTC): 2026-03-05T21:33:35Z
- DB URL: `postgresql://postgres:****@127.0.0.1:54322/postgres`

## verify_jwt=false allowlist (config.toml)

- presential-verification-confirm-presence
- presential-verification-get-acta
- record-evidence-download
- signing-keys

## SECURITY DEFINER exposed to anon/authenticated

- public.create_document_folder(_name text)
- public.delete_document_folder(_folder_id uuid)
- public.generate_ecox_certificate(p_workflow_id uuid)
- public.generate_invite_token()
- public.get_cron_runtime_status()
- public.get_cron_status(job_pattern text)
- public.guard_user_documents_writes()
- public.invoke_fase1_executor()
- public.invoke_process_bitcoin_anchors()
- public.invoke_process_polygon_anchors()
- public.move_documents_to_folder(_doc_ids uuid[], _folder_id uuid)
- public.project_events_to_user_document_trigger()
- public.rebuild_user_documents_projection(p_document_entity_id uuid)
- public.rename_document_folder(_folder_id uuid, _name text)
- public.request_certificate_regeneration(_document_id uuid, _request_type text)
- public.set_operation_document_added_by()

## Internal runtime tables grants + RLS matrix

| table | rls_enabled | anon_privs | auth_privs | service_role_privs |
|---|---|---|---|---|
| domain_outbox | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| executor_decision_logs | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| executor_job_runs | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| executor_jobs | true | - | - | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
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
