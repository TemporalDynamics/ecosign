# Tablas y columnas (listado real)

> Generado desde la BD local via Supabase CLI (docker).

## Listado de tablas

- _realtime.extensions
- _realtime.schema_migrations
- _realtime.tenants
- auth.audit_log_entries
- auth.flow_state
- auth.identities
- auth.instances
- auth.mfa_amr_claims
- auth.mfa_challenges
- auth.mfa_factors
- auth.oauth_authorizations
- auth.oauth_client_states
- auth.oauth_clients
- auth.oauth_consents
- auth.one_time_tokens
- auth.refresh_tokens
- auth.saml_providers
- auth.saml_relay_states
- auth.schema_migrations
- auth.sessions
- auth.sso_domains
- auth.sso_providers
- auth.users
- cron.job
- cron.job_run_details
- net._http_response
- net.http_request_queue
- public.access_events
- public.access_logs
- public.anchor_states
- public.anchors
- public.audit_logs
- public.batches
- public.bitcoin_ots_files
- public.certificate_regeneration_requests
- public.contact_leads
- public.conversion_events
- public.document_entities
- public.document_folders
- public.document_shares
- public.documents
- public.eco_records
- public.ecox_audit_trail
- public.events
- public.founder_badges
- public.invites
- public.links
- public.nda_acceptances
- public.nda_events
- public.nda_signatures
- public.nda_templates
- public.operation_documents
- public.operations
- public.operations_events
- public.product_events
- public.profiles
- public.rate_limit_blocks
- public.rate_limits
- public.recipients
- public.signature_application_events
- public.signature_instances
- public.signature_workflows
- public.signer_links
- public.signer_otps
- public.signer_receipts
- public.system_emails
- public.user_documents
- public.welcome_email_queue
- public.workflow_artifacts
- public.workflow_events
- public.workflow_fields
- public.workflow_notifications
- public.workflow_signatures
- public.workflow_signers
- public.workflow_versions
- realtime.messages
- realtime.messages_2026_01_15
- realtime.messages_2026_01_16
- realtime.messages_2026_01_17
- realtime.messages_2026_01_18
- realtime.messages_2026_01_19
- realtime.messages_2026_01_20
- realtime.messages_2026_01_21
- realtime.schema_migrations
- realtime.subscription
- storage.buckets
- storage.buckets_analytics
- storage.buckets_vectors
- storage.iceberg_namespaces
- storage.iceberg_tables
- storage.migrations
- storage.objects
- storage.prefixes
- storage.s3_multipart_uploads
- storage.s3_multipart_uploads_parts
- storage.vector_indexes
- supabase_functions.hooks
- supabase_functions.migrations
- supabase_migrations.schema_migrations
- vault.secrets

## _realtime.extensions

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| type | text | YES |  |
| settings | jsonb | YES |  |
| tenant_external_id | text | YES |  |
| inserted_at | timestamp without time zone | NO |  |
| updated_at | timestamp without time zone | NO |  |

## _realtime.schema_migrations

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| version | bigint | NO |  |
| inserted_at | timestamp without time zone | YES |  |

## _realtime.tenants

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| name | text | YES |  |
| external_id | text | YES |  |
| jwt_secret | character varying | YES |  |
| max_concurrent_users | integer | NO | 200 |
| inserted_at | timestamp without time zone | NO |  |
| updated_at | timestamp without time zone | NO |  |
| max_events_per_second | integer | NO | 100 |
| postgres_cdc_default | text | YES | 'postgres_cdc_rls'::text |
| max_bytes_per_second | integer | NO | 100000 |
| max_channels_per_client | integer | NO | 100 |
| max_joins_per_second | integer | NO | 500 |
| suspend | boolean | YES | false |
| jwt_jwks | jsonb | YES |  |
| notify_private_alpha | boolean | YES | false |
| private_only | boolean | NO | false |
| migrations_ran | integer | YES | 0 |
| broadcast_adapter | character varying | YES | 'gen_rpc'::character varying |
| max_presence_events_per_second | integer | YES | 1000 |
| max_payload_size_in_kb | integer | YES | 3000 |

## auth.audit_log_entries

Descripcion: Auth: Audit trail for user actions.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| instance_id | uuid | YES |  |
| id | uuid | NO |  |
| payload | json | YES |  |
| created_at | timestamp with time zone | YES |  |
| ip_address | character varying | NO | ''::character varying |

## auth.flow_state

Descripcion: stores metadata for pkce logins

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| user_id | uuid | YES |  |
| auth_code | text | NO |  |
| code_challenge_method | USER-DEFINED | NO |  |
| code_challenge | text | NO |  |
| provider_type | text | NO |  |
| provider_access_token | text | YES |  |
| provider_refresh_token | text | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| authentication_method | text | NO |  |
| auth_code_issued_at | timestamp with time zone | YES |  |

## auth.identities

Descripcion: Auth: Stores identities associated to a user.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| provider_id | text | NO |  |
| user_id | uuid | NO |  |
| identity_data | jsonb | NO |  |
| provider | text | NO |  |
| last_sign_in_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| email | text | YES |  |
| id | uuid | NO | gen_random_uuid() |

## auth.instances

Descripcion: Auth: Manages users across multiple sites.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| uuid | uuid | YES |  |
| raw_base_config | text | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |

## auth.mfa_amr_claims

Descripcion: auth: stores authenticator method reference claims for multi factor authentication

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| session_id | uuid | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| authentication_method | text | NO |  |
| id | uuid | NO |  |

## auth.mfa_challenges

Descripcion: auth: stores metadata about challenge requests made

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| factor_id | uuid | NO |  |
| created_at | timestamp with time zone | NO |  |
| verified_at | timestamp with time zone | YES |  |
| ip_address | inet | NO |  |
| otp_code | text | YES |  |
| web_authn_session_data | jsonb | YES |  |

## auth.mfa_factors

Descripcion: auth: stores metadata about factors

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| friendly_name | text | YES |  |
| factor_type | USER-DEFINED | NO |  |
| status | USER-DEFINED | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| secret | text | YES |  |
| phone | text | YES |  |
| last_challenged_at | timestamp with time zone | YES |  |
| web_authn_credential | jsonb | YES |  |
| web_authn_aaguid | uuid | YES |  |
| last_webauthn_challenge_data | jsonb | YES |  |

## auth.oauth_authorizations

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| authorization_id | text | NO |  |
| client_id | uuid | NO |  |
| user_id | uuid | YES |  |
| redirect_uri | text | NO |  |
| scope | text | NO |  |
| state | text | YES |  |
| resource | text | YES |  |
| code_challenge | text | YES |  |
| code_challenge_method | USER-DEFINED | YES |  |
| response_type | USER-DEFINED | NO | 'code'::auth.oauth_response_type |
| status | USER-DEFINED | NO | 'pending'::auth.oauth_authorization_status |
| authorization_code | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| expires_at | timestamp with time zone | NO | (now() + '00:03:00'::interval) |
| approved_at | timestamp with time zone | YES |  |
| nonce | text | YES |  |

## auth.oauth_client_states

Descripcion: Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| provider_type | text | NO |  |
| code_verifier | text | YES |  |
| created_at | timestamp with time zone | NO |  |

## auth.oauth_clients

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| client_secret_hash | text | YES |  |
| registration_type | USER-DEFINED | NO |  |
| redirect_uris | text | NO |  |
| grant_types | text | NO |  |
| client_name | text | YES |  |
| client_uri | text | YES |  |
| logo_uri | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| deleted_at | timestamp with time zone | YES |  |
| client_type | USER-DEFINED | NO | 'confidential'::auth.oauth_client_type |

## auth.oauth_consents

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| client_id | uuid | NO |  |
| scopes | text | NO |  |
| granted_at | timestamp with time zone | NO | now() |
| revoked_at | timestamp with time zone | YES |  |

## auth.one_time_tokens

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| token_type | USER-DEFINED | NO |  |
| token_hash | text | NO |  |
| relates_to | text | NO |  |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |

## auth.refresh_tokens

Descripcion: Auth: Store of tokens used to refresh JWT tokens once they expire.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| instance_id | uuid | YES |  |
| id | bigint | NO | nextval('auth.refresh_tokens_id_seq'::regclass) |
| token | character varying | YES |  |
| user_id | character varying | YES |  |
| revoked | boolean | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| parent | character varying | YES |  |
| session_id | uuid | YES |  |

## auth.saml_providers

Descripcion: Auth: Manages SAML Identity Provider connections.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| sso_provider_id | uuid | NO |  |
| entity_id | text | NO |  |
| metadata_xml | text | NO |  |
| metadata_url | text | YES |  |
| attribute_mapping | jsonb | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| name_id_format | text | YES |  |

## auth.saml_relay_states

Descripcion: Auth: Contains SAML Relay State information for each Service Provider initiated login.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| sso_provider_id | uuid | NO |  |
| request_id | text | NO |  |
| for_email | text | YES |  |
| redirect_to | text | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| flow_state_id | uuid | YES |  |

## auth.schema_migrations

Descripcion: Auth: Manages updates to the auth system.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| version | character varying | NO |  |

## auth.sessions

Descripcion: Auth: Stores session data associated to a user.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| factor_id | uuid | YES |  |
| aal | USER-DEFINED | YES |  |
| not_after | timestamp with time zone | YES |  |
| refreshed_at | timestamp without time zone | YES |  |
| user_agent | text | YES |  |
| ip | inet | YES |  |
| tag | text | YES |  |
| oauth_client_id | uuid | YES |  |
| refresh_token_hmac_key | text | YES |  |
| refresh_token_counter | bigint | YES |  |
| scopes | text | YES |  |

## auth.sso_domains

Descripcion: Auth: Manages SSO email address domain mapping to an SSO Identity Provider.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| sso_provider_id | uuid | NO |  |
| domain | text | NO |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |

## auth.sso_providers

Descripcion: Auth: Manages SSO identity provider information; see saml_providers for SAML.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO |  |
| resource_id | text | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| disabled | boolean | YES |  |

## auth.users

Descripcion: Auth: Stores user login data within a secure schema.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| instance_id | uuid | YES |  |
| id | uuid | NO |  |
| aud | character varying | YES |  |
| role | character varying | YES |  |
| email | character varying | YES |  |
| encrypted_password | character varying | YES |  |
| email_confirmed_at | timestamp with time zone | YES |  |
| invited_at | timestamp with time zone | YES |  |
| confirmation_token | character varying | YES |  |
| confirmation_sent_at | timestamp with time zone | YES |  |
| recovery_token | character varying | YES |  |
| recovery_sent_at | timestamp with time zone | YES |  |
| email_change_token_new | character varying | YES |  |
| email_change | character varying | YES |  |
| email_change_sent_at | timestamp with time zone | YES |  |
| last_sign_in_at | timestamp with time zone | YES |  |
| raw_app_meta_data | jsonb | YES |  |
| raw_user_meta_data | jsonb | YES |  |
| is_super_admin | boolean | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| phone | text | YES | NULL::character varying |
| phone_confirmed_at | timestamp with time zone | YES |  |
| phone_change | text | YES | ''::character varying |
| phone_change_token | character varying | YES | ''::character varying |
| phone_change_sent_at | timestamp with time zone | YES |  |
| confirmed_at | timestamp with time zone | YES |  |
| email_change_token_current | character varying | YES | ''::character varying |
| email_change_confirm_status | smallint | YES | 0 |
| banned_until | timestamp with time zone | YES |  |
| reauthentication_token | character varying | YES | ''::character varying |
| reauthentication_sent_at | timestamp with time zone | YES |  |
| is_sso_user | boolean | NO | false |
| deleted_at | timestamp with time zone | YES |  |
| is_anonymous | boolean | NO | false |

## cron.job

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| jobid | bigint | NO | nextval('cron.jobid_seq'::regclass) |
| schedule | text | NO |  |
| command | text | NO |  |
| nodename | text | NO | 'localhost'::text |
| nodeport | integer | NO | inet_server_port() |
| database | text | NO | current_database() |
| username | text | NO | CURRENT_USER |
| active | boolean | NO | true |
| jobname | text | YES |  |

## cron.job_run_details

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| jobid | bigint | YES |  |
| runid | bigint | NO | nextval('cron.runid_seq'::regclass) |
| job_pid | integer | YES |  |
| database | text | YES |  |
| username | text | YES |  |
| command | text | YES |  |
| status | text | YES |  |
| return_message | text | YES |  |
| start_time | timestamp with time zone | YES |  |
| end_time | timestamp with time zone | YES |  |

## net._http_response

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | bigint | YES |  |
| status_code | integer | YES |  |
| content_type | text | YES |  |
| headers | jsonb | YES |  |
| content | text | YES |  |
| timed_out | boolean | YES |  |
| error_msg | text | YES |  |
| created | timestamp with time zone | NO | now() |

## net.http_request_queue

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | bigint | NO | nextval('net.http_request_queue_id_seq'::regclass) |
| method | text | NO |  |
| url | text | NO |  |
| headers | jsonb | YES |  |
| body | bytea | YES |  |
| timeout_milliseconds | integer | NO |  |

## public.access_events

Descripcion: Log de accesos para auditoría y trazabilidad

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| recipient_id | uuid | NO |  |
| event_type | text | NO |  |
| timestamp | timestamp with time zone | NO | now() |
| ip_address | inet | YES |  |
| user_agent | text | YES |  |
| country | text | YES |  |
| session_id | text | YES |  |

## public.access_logs

Descripcion: Log append-only de accesos y acciones para auditoría inmutable

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| document_id | text | NO |  |
| user_email | text | NO |  |
| action | text | NO |  |
| ip_address | text | YES |  |
| user_agent | text | YES |  |
| metadata | jsonb | YES |  |

## public.anchor_states

Descripcion: Aggregated probative state per project_id (one row per project).

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| project_id | text | NO |  |
| anchor_requested_at | timestamp with time zone | YES |  |
| polygon_confirmed_at | timestamp with time zone | YES |  |
| bitcoin_confirmed_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | NO | now() |

## public.anchors

Descripcion: Blockchain anchoring requests and proofs (OpenTimestamps, Polygon, etc.)

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | YES |  |
| user_id | uuid | YES |  |
| document_hash | text | NO |  |
| anchor_type | text | NO | 'opentimestamps'::text |
| anchor_status | text | NO | 'queued'::text |
| ots_proof | text | YES |  |
| ots_calendar_url | text | YES |  |
| bitcoin_tx_id | text | YES |  |
| bitcoin_block_height | integer | YES |  |
| user_email | text | YES |  |
| notification_sent | boolean | YES | false |
| notification_sent_at | timestamp with time zone | YES |  |
| metadata | jsonb | YES |  |
| error_message | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| confirmed_at | timestamp with time zone | YES |  |
| user_document_id | uuid | YES |  |
| polygon_tx_hash | text | YES |  |
| polygon_status | text | YES | 'pending'::text |
| polygon_block_number | bigint | YES |  |
| polygon_block_hash | text | YES |  |
| polygon_confirmed_at | timestamp with time zone | YES |  |
| polygon_attempts | integer | YES | 0 |
| polygon_error_message | text | YES |  |
| bitcoin_attempts | integer | YES | 0 |
| bitcoin_error_message | text | YES |  |

## public.audit_logs

Descripcion: Audit trail for significant user/backend actions

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES |  |
| action | text | NO |  |
| metadata | jsonb | YES |  |
| ip_address | text | YES |  |
| user_agent | text | YES |  |
| created_at | timestamp with time zone | NO | now() |

## public.batches

Descripcion: P2.1 — Backfill completed. All workflow_fields now have batch_id.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_entity_id | uuid | NO |  |
| label | text | YES |  |
| order | integer | YES | 0 |
| assigned_signer_id | uuid | YES |  |
| origin | text | YES | 'user_created'::text |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## public.bitcoin_ots_files

Descripcion: Raw OTS files associated to anchors (bytea)

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| anchor_id | uuid | NO |  |
| ots_content | bytea | NO |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## public.certificate_regeneration_requests

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES |  |
| document_id | uuid | YES |  |
| request_type | text | NO |  |
| status | text | NO | 'pending'::text |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| error_message | text | YES |  |

## public.contact_leads

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| email | text | NO |  |
| name | text | YES |  |
| company | text | YES |  |
| message | text | YES |  |
| source | text | YES | 'contact_form'::text |
| variant | text | YES |  |
| status | text | YES | 'new'::text |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

## public.conversion_events

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| variant | text | NO |  |
| action | text | NO |  |
| page | text | YES |  |
| session_id | text | NO |  |
| metadata | jsonb | YES | '{}'::jsonb |
| timestamp | timestamp with time zone | NO |  |
| created_at | timestamp with time zone | YES | now() |

## public.document_entities

Descripcion: Canonical document entities with probative event ledger. events[] is append-only JSONB array with DB-enforced invariants: 1. Must be array (not object/null) 2. Append-only (no shrink) 3. Max 1 anchor per network 4. TSA witness_hash consistency (enforced) 5. Anchor witness_hash consistency (enforced) ✅ NEW Contracts: ANCHOR_EVENT_RULES.md, PROTECTION_LEVEL_RULES.md, TSA_EVENT_RULES.md

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| owner_id | uuid | NO |  |
| source_name | text | NO |  |
| source_mime | text | NO |  |
| source_size | bigint | NO |  |
| source_hash | text | NO |  |
| source_captured_at | timestamp with time zone | NO | now() |
| source_storage_path | text | YES |  |
| custody_mode | text | NO |  |
| lifecycle_status | text | NO |  |
| witness_current_hash | text | YES |  |
| witness_current_mime | text | YES |  |
| witness_current_status | text | YES |  |
| witness_current_storage_path | text | YES |  |
| witness_current_generated_at | timestamp with time zone | YES |  |
| witness_history | jsonb | NO | '[]'::jsonb |
| witness_hash | text | YES |  |
| signed_hash | text | YES |  |
| composite_hash | text | YES |  |
| hash_chain | jsonb | NO | '{}'::jsonb |
| transform_log | jsonb | NO | '[]'::jsonb |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| signed_authority | text | YES |  |
| signed_authority_ref | jsonb | YES |  |
| events | jsonb | NO | '[]'::jsonb |
| tsa_latest | jsonb | YES |  |

## public.document_folders

Descripcion: User-defined folders to organize documents

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO |  |
| name | text | NO |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## public.document_shares

Descripcion: OTP-based document sharing for E2E encrypted documents

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO |  |
| recipient_email | text | NO |  |
| wrapped_key | text | NO |  |
| wrap_iv | text | NO |  |
| recipient_salt | text | NO |  |
| otp_hash | text | NO |  |
| status | text | YES | 'pending'::text |
| expires_at | timestamp with time zone | NO |  |
| accessed_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | YES | now() |
| created_by | uuid | YES |  |
| nda_enabled | boolean | YES | false |
| nda_text | text | YES |  |
| nda_accepted_at | timestamp with time zone | YES |  |
| nda_acceptance_metadata | jsonb | YES |  |

## public.documents

Descripcion: Documentos certificados por EcoSign

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| owner_id | uuid | NO |  |
| title | text | NO |  |
| original_filename | text | YES |  |
| eco_hash | text | NO |  |
| ecox_hash | text | YES |  |
| status | text | YES | 'active'::text |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| encrypted | boolean | YES | false |
| encrypted_path | text | YES |  |
| wrapped_key | text | YES |  |
| wrap_iv | text | YES |  |

## public.eco_records

Descripcion: Registro principal de certificados .ECO con trazabilidad forense completa

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| document_id | text | NO |  |
| user_email | text | NO |  |
| file_name | text | NO |  |
| file_type | text | YES |  |
| file_size | bigint | YES |  |
| sha256_hash | text | NO |  |
| eco_metadata | jsonb | NO |  |
| blockchain_tx_id | text | YES |  |
| blockchain_network | text | YES | 'ecosign-testnet'::text |
| status | text | NO | 'pending'::text |
| ip_address | text | YES |  |
| user_agent | text | YES |  |

## public.ecox_audit_trail

Descripcion: Registro forense completo de cada acción del firmante - Base del certificado ECOX

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | bigint | NO |  |
| workflow_id | uuid | NO |  |
| signer_id | uuid | NO |  |
| event_timestamp | timestamp with time zone | NO | timezone('utc'::text, now()) |
| event_type | text | NO |  |
| source_ip | inet | YES |  |
| user_agent | text | YES |  |
| geolocation | jsonb | YES |  |
| details | jsonb | YES |  |
| document_hash_snapshot | text | YES |  |
| created_at | timestamp with time zone | NO | timezone('utc'::text, now()) |

## public.events

Descripcion: ChainLog - Registro completo de eventos del documento

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO |  |
| user_id | uuid | YES |  |
| signer_link_id | uuid | YES |  |
| event_type | text | NO |  |
| timestamp | timestamp with time zone | NO | now() |
| ip_address | inet | YES |  |
| user_agent | text | YES |  |
| metadata | jsonb | YES | '{}'::jsonb |
| actor_email | text | YES |  |
| actor_name | text | YES |  |
| created_at | timestamp with time zone | NO | now() |

## public.founder_badges

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| user_id | uuid | NO |  |
| badge_number | integer | NO | nextval('founder_badges_seq'::regclass) |
| issued_at | timestamp with time zone | NO | now() |

## public.invites

Descripcion: Document invitations with NDA acceptance tracking

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO |  |
| email | text | NO |  |
| role | text | NO |  |
| token | text | NO |  |
| nda_accepted_at | timestamp with time zone | YES |  |
| nda_ip_address | text | YES |  |
| nda_user_agent | text | YES |  |
| accepted_at | timestamp with time zone | YES |  |
| accessed_at | timestamp with time zone | YES |  |
| expires_at | timestamp with time zone | NO |  |
| revoked_at | timestamp with time zone | YES |  |
| revoked_by | uuid | YES |  |
| revocation_reason | text | YES |  |
| invited_by | uuid | NO |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## public.links

Descripcion: Enlaces seguros para compartir documentos

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO |  |
| token_hash | text | NO |  |
| expires_at | timestamp with time zone | YES |  |
| revoked_at | timestamp with time zone | YES |  |
| require_nda | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| recipient_id | uuid | YES |  |
| nda_text | text | YES |  |

## public.nda_acceptances

Descripcion: Registro de aceptaciones de NDA (no-repudiación)

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| recipient_id | uuid | NO |  |
| eco_nda_hash | text | NO |  |
| accepted_at | timestamp with time zone | NO | now() |
| ip_address | inet | YES |  |
| user_agent | text | YES |  |
| signature_data | jsonb | YES |  |

## public.nda_events

Descripcion: Audit trail for NDA actions and acceptances

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | YES |  |
| nda_template_id | uuid | YES |  |
| nda_hash | text | YES |  |
| document_hash | text | YES |  |
| action | text | NO |  |
| metadata | jsonb | YES |  |
| created_at | timestamp with time zone | NO | now() |

## public.nda_signatures

Descripcion: Registro de firmas digitales bajo NDA con control de acceso temporal

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| document_id | text | NO |  |
| signer_name | text | NO |  |
| signer_email | text | NO |  |
| signature_data | text | NO |  |
| nda_accepted | boolean | NO | false |
| access_token | text | NO |  |
| expires_at | timestamp with time zone | NO |  |
| ip_address | text | YES |  |
| user_agent | text | YES |  |
| verified_at | timestamp with time zone | YES |  |

## public.nda_templates

Descripcion: Reusable NDA templates with editable sections

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO |  |
| name | text | NO |  |
| config | jsonb | NO | '{}'::jsonb |
| template_version | integer | NO | 1 |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## public.operation_documents

Descripcion: Relación many-to-many: documentos en operaciones

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| operation_id | uuid | NO |  |
| document_entity_id | uuid | YES |  |
| added_at | timestamp with time zone | NO | now() |
| added_by | uuid | YES |  |
| draft_file_ref | text | YES |  |
| draft_metadata | jsonb | YES | '{}'::jsonb |

## public.operations

Descripcion: Carpetas lógicas para agrupar documentos relacionados

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| owner_id | uuid | NO |  |
| name | text | NO |  |
| description | text | YES |  |
| status | text | NO | 'active'::text |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## public.operations_events

Descripcion: Append-only audit log for operation-level events

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| operation_id | uuid | NO |  |
| document_entity_id | uuid | YES |  |
| kind | text | NO |  |
| at | timestamp with time zone | NO | now() |
| actor | jsonb | NO |  |
| reason | text | YES |  |
| metadata | jsonb | NO | '{}'::jsonb |
| created_at | timestamp with time zone | NO | now() |

## public.product_events

Descripcion: Product analytics events for tracking user interactions and feature usage

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES |  |
| session_id | text | NO |  |
| event_name | text | NO |  |
| event_data | jsonb | NO | '{}'::jsonb |
| page_path | text | YES |  |
| user_agent | text | YES |  |
| created_at | timestamp with time zone | NO | now() |

## public.profiles

Descripcion: User profile metadata for E2E encryption and preferences

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| user_id | uuid | NO |  |
| wrap_salt | text | NO |  |
| created_at | timestamp with time zone | YES | now() |

## public.rate_limit_blocks

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| key | text | NO |  |
| blocked_until | timestamp with time zone | NO |  |
| created_at | timestamp with time zone | NO | now() |

## public.rate_limits

Descripcion: Table for tracking rate limiting requests - used in tests

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| key | text | NO |  |
| timestamp | timestamp with time zone | NO | now() |
| created_at | timestamp with time zone | YES | now() |

## public.recipients

Descripcion: Receptores de documentos compartidos

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO |  |
| email | text | NO |  |
| recipient_id | text | NO |  |
| created_at | timestamp with time zone | NO | now() |

## public.signature_application_events

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| signature_instance_id | uuid | NO |  |
| field_id | uuid | NO |  |
| applied_at | timestamp with time zone | NO | now() |

## public.signature_instances

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| document_entity_id | uuid | NO |  |
| batch_id | uuid | NO |  |
| signer_id | uuid | NO |  |
| signature_payload | jsonb | NO |  |
| created_at | timestamp with time zone | NO | now() |

## public.signature_workflows

Descripcion: Flujos de firma multi-parte con versionado

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| owner_id | uuid | NO |  |
| original_filename | text | NO |  |
| original_file_url | text | YES |  |
| current_version | integer | NO | 1 |
| status | text | NO | 'draft'::text |
| forensic_config | jsonb | YES | '{"bitcoin": false, "polygon": true, "rfc3161": true}'::jsonb |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| completed_at | timestamp with time zone | YES |  |
| cancelled_at | timestamp with time zone | YES |  |
| document_path | text | YES |  |
| document_hash | text | YES |  |
| encryption_key | text | YES |  |
| title | text | YES |  |
| require_sequential | boolean | YES | false |
| expires_at | timestamp with time zone | YES |  |
| signature_type | text | NO | 'ECOSIGN'::text |
| signnow_embed_url | text | YES |  |
| signnow_document_id | text | YES |  |
| signnow_status | text | YES | 'pending'::text |
| document_entity_id | uuid | YES |  |
| delivery_mode | text | NO | 'email'::text |

## public.signer_links

Descripcion: Tokens únicos para firmantes invitados (GuestSign)

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_id | uuid | NO |  |
| owner_id | uuid | NO |  |
| signer_email | text | NO |  |
| signer_name | text | YES |  |
| signer_company | text | YES |  |
| signer_job_title | text | YES |  |
| token | text | NO |  |
| expires_at | timestamp with time zone | NO | (now() + '30 days'::interval) |
| status | text | NO | 'pending'::text |
| opened_at | timestamp with time zone | YES |  |
| opened_ip | inet | YES |  |
| opened_user_agent | text | YES |  |
| signed_at | timestamp with time zone | YES |  |
| signed_ip | inet | YES |  |
| signed_user_agent | text | YES |  |
| signature_data_url | text | YES |  |
| nda_accepted | boolean | YES | false |
| nda_accepted_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## public.signer_otps

Descripcion: OTP por documento para firmantes externos

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| signer_id | uuid | NO |  |
| workflow_id | uuid | YES |  |
| otp_hash | text | NO |  |
| expires_at | timestamp with time zone | NO |  |
| attempts | integer | NO | 0 |
| last_sent_at | timestamp with time zone | NO | now() |
| verified_at | timestamp with time zone | YES |  |

## public.signer_receipts

Descripcion: Recepción e identidad previa al OTP

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| signer_id | uuid | YES |  |
| workflow_id | uuid | YES |  |
| email | text | NO |  |
| signer_name | text | YES |  |
| doc_id | text | YES |  |
| doc_id_type | text | YES |  |
| phone | text | YES |  |
| metadata | jsonb | NO | '{}'::jsonb |
| ip | text | YES |  |
| user_agent | text | YES |  |
| received_at | timestamp with time zone | NO | now() |

## public.system_emails

Descripcion: System emails (welcome, alerts, etc) - independent from workflows

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| recipient_email | text | NO |  |
| email_type | text | NO |  |
| subject | text | NO |  |
| body_html | text | YES |  |
| delivery_status | text | NO | 'pending'::text |
| error_message | text | YES |  |
| attempts | integer | NO | 0 |
| sent_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | NO | now() |
| metadata | jsonb | YES |  |

## public.user_documents

Descripcion: User documents (legacy table).

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES |  |
| document_name | text | NO |  |
| document_hash | text | NO |  |
| document_size | bigint | NO |  |
| mime_type | text | NO | 'application/pdf'::text |
| pdf_storage_path | text | YES |  |
| eco_data | jsonb | NO |  |
| signnow_document_id | text | YES |  |
| signnow_status | text | YES |  |
| signed_at | timestamp with time zone | YES |  |
| certified_at | timestamp with time zone | NO | now() |
| has_legal_timestamp | boolean | YES | false |
| has_bitcoin_anchor | boolean | YES | false |
| bitcoin_anchor_id | uuid | YES |  |
| verification_count | integer | YES | 0 |
| last_verified_at | timestamp with time zone | YES |  |
| tags | ARRAY | YES | '{}'::text[] |
| notes | text | YES |  |
| is_archived | boolean | YES | false |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| status | text | YES | 'draft'::text |
| file_type | text | YES | 'pdf'::text |
| last_event_at | timestamp with time zone | YES | now() |
| bitcoin_status | text | YES |  |
| bitcoin_confirmed_at | timestamp with time zone | YES |  |
| overall_status | text | YES | 'draft'::text |
| eco_file_data | jsonb | YES |  |
| download_enabled | boolean | YES | true |
| eco_hash | text | YES |  |
| has_polygon_anchor | boolean | YES | false |
| polygon_anchor_id | uuid | YES |  |
| folder_id | uuid | YES |  |
| eco_storage_path | text | YES |  |
| ecox_storage_path | text | YES |  |
| zero_knowledge_opt_out | boolean | NO | false |
| protection_level | text | YES | 'ACTIVE'::text |
| polygon_status | text | YES |  |
| polygon_confirmed_at | timestamp with time zone | YES |  |
| encrypted | boolean | YES | false |
| encrypted_path | text | YES |  |
| wrapped_key | text | YES |  |
| wrap_iv | text | YES |  |
| document_entity_id | uuid | YES |  |

## public.welcome_email_queue

Descripcion: Queue for welcome emails sent to users after email confirmation. Processed by cron job every 1 minute.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO |  |
| user_email | text | NO |  |
| user_name | text | YES |  |
| status | text | NO | 'pending'::text |
| error_message | text | YES |  |
| attempts | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| sent_at | timestamp with time zone | YES |  |

## public.workflow_artifacts

Descripcion: Control plane para artefacto final del workflow. No almacena el artefacto, solo controla su proceso de construcción y referencia.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| status | text | NO | 'pending'::text |
| artifact_id | uuid | YES |  |
| artifact_hash | text | YES |  |
| artifact_url | text | YES |  |
| build_attempts | integer | NO | 0 |
| last_error | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| finalized_at | timestamp with time zone | YES |  |

## public.workflow_events

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| signer_id | uuid | YES |  |
| event_type | text | NO |  |
| payload | jsonb | YES | '{}'::jsonb |
| actor_id | uuid | YES |  |
| created_at | timestamp with time zone | NO | now() |

## public.workflow_fields

Descripcion: Sprint 6: Campos configurables para workflow multi-firmante. Owner configura campos que los signers completarán durante el flujo.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| document_entity_id | uuid | NO |  |
| field_type | text | NO |  |
| label | text | YES |  |
| placeholder | text | YES |  |
| position | jsonb | NO |  |
| assigned_to | text | YES |  |
| required | boolean | NO | false |
| value | text | YES |  |
| metadata | jsonb | YES |  |
| batch_id | uuid | NO |  |
| apply_to_all_pages | boolean | YES | false |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| created_by | uuid | YES |  |

## public.workflow_notifications

Descripcion: Tabla de notificaciones de workflows. Cada fila representa un envío único de email.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| recipient_email | text | NO |  |
| recipient_type | text | NO |  |
| signer_id | uuid | YES |  |
| notification_type | text | NO |  |
| subject | text | NO |  |
| body_html | text | NO |  |
| sent_at | timestamp with time zone | YES |  |
| delivery_status | text | YES | 'pending'::text |
| error_message | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| resend_email_id | text | YES |  |
| retry_count | integer | NO | 0 |
| step | text | NO | 'primary'::text |

## public.workflow_signatures

Descripcion: Registro inmutable de firmas con certificación forense

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| version_id | uuid | NO |  |
| signer_id | uuid | NO |  |
| signature_image_url | text | YES |  |
| signature_coordinates | jsonb | YES |  |
| signature_hash | text | NO |  |
| certification_data | jsonb | NO |  |
| eco_file_url | text | YES |  |
| ecox_file_url | text | YES |  |
| rfc3161_token | text | YES |  |
| polygon_tx_hash | text | YES |  |
| bitcoin_anchor_id | uuid | YES |  |
| ip_address | text | YES |  |
| user_agent | text | YES |  |
| geo_location | jsonb | YES |  |
| signed_at | timestamp with time zone | NO | now() |
| nda_accepted | boolean | YES | false |
| nda_accepted_at | timestamp with time zone | YES |  |
| nda_ip_address | text | YES |  |
| nda_fingerprint | jsonb | YES |  |

## public.workflow_signers

Descripcion: Firmantes de workflows - Schema verificado sin display_name

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| signing_order | integer | NO |  |
| email | text | NO |  |
| name | text | YES |  |
| require_login | boolean | NO | true |
| require_nda | boolean | NO | true |
| quick_access | boolean | NO | false |
| status | text | NO | 'invited'::text |
| access_token_hash | text | YES |  |
| first_accessed_at | timestamp with time zone | YES |  |
| signed_at | timestamp with time zone | YES |  |
| signature_data | jsonb | YES |  |
| signature_hash | text | YES |  |
| change_request_data | jsonb | YES |  |
| change_request_at | timestamp with time zone | YES |  |
| change_request_status | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| nda_accepted | boolean | YES | false |
| nda_accepted_at | timestamp with time zone | YES |  |
| signnow_embed_url | text | YES |  |
| signnow_embed_created_at | timestamp with time zone | YES |  |
| token_expires_at | timestamp with time zone | NO |  |
| token_revoked_at | timestamp with time zone | YES |  |
| access_token_ciphertext | text | NO |  |
| access_token_nonce | text | NO |  |

## public.workflow_versions

Descripcion: Versiones del documento en el flujo de firma

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workflow_id | uuid | NO |  |
| version_number | integer | NO |  |
| document_url | text | NO |  |
| document_hash | text | NO |  |
| change_reason | text | YES |  |
| requested_by | uuid | YES |  |
| modification_notes | jsonb | YES |  |
| status | text | NO | 'active'::text |
| created_at | timestamp with time zone | NO | now() |

## realtime.messages

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.messages_2026_01_15

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.messages_2026_01_16

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.messages_2026_01_17

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.messages_2026_01_18

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.messages_2026_01_19

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.messages_2026_01_20

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.messages_2026_01_21

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| topic | text | NO |  |
| extension | text | NO |  |
| payload | jsonb | YES |  |
| event | text | YES |  |
| private | boolean | YES | false |
| updated_at | timestamp without time zone | NO | now() |
| inserted_at | timestamp without time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |

## realtime.schema_migrations

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| version | bigint | NO |  |
| inserted_at | timestamp without time zone | YES |  |

## realtime.subscription

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | bigint | NO |  |
| subscription_id | uuid | NO |  |
| entity | regclass | NO |  |
| filters | ARRAY | NO | '{}'::realtime.user_defined_filter[] |
| claims | jsonb | NO |  |
| claims_role | regrole | NO |  |
| created_at | timestamp without time zone | NO | timezone('utc'::text, now()) |

## storage.buckets

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | text | NO |  |
| name | text | NO |  |
| owner | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| public | boolean | YES | false |
| avif_autodetection | boolean | YES | false |
| file_size_limit | bigint | YES |  |
| allowed_mime_types | ARRAY | YES |  |
| owner_id | text | YES |  |
| type | USER-DEFINED | NO | 'STANDARD'::storage.buckettype |

## storage.buckets_analytics

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| name | text | NO |  |
| type | USER-DEFINED | NO | 'ANALYTICS'::storage.buckettype |
| format | text | NO | 'ICEBERG'::text |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| id | uuid | NO | gen_random_uuid() |
| deleted_at | timestamp with time zone | YES |  |

## storage.buckets_vectors

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | text | NO |  |
| type | USER-DEFINED | NO | 'VECTOR'::storage.buckettype |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## storage.iceberg_namespaces

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| bucket_name | text | NO |  |
| name | text | NO |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| metadata | jsonb | NO | '{}'::jsonb |
| catalog_id | uuid | NO |  |

## storage.iceberg_tables

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| namespace_id | uuid | NO |  |
| bucket_name | text | NO |  |
| name | text | NO |  |
| location | text | NO |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| remote_table_id | text | YES |  |
| shard_key | text | YES |  |
| shard_id | text | YES |  |
| catalog_id | uuid | NO |  |

## storage.migrations

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | integer | NO |  |
| name | character varying | NO |  |
| hash | character varying | NO |  |
| executed_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

## storage.objects

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| bucket_id | text | YES |  |
| name | text | YES |  |
| owner | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| last_accessed_at | timestamp with time zone | YES | now() |
| metadata | jsonb | YES |  |
| path_tokens | ARRAY | YES |  |
| version | text | YES |  |
| owner_id | text | YES |  |
| user_metadata | jsonb | YES |  |
| level | integer | YES |  |

## storage.prefixes

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| bucket_id | text | NO |  |
| name | text | NO |  |
| level | integer | NO |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

## storage.s3_multipart_uploads

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | text | NO |  |
| in_progress_size | bigint | NO | 0 |
| upload_signature | text | NO |  |
| bucket_id | text | NO |  |
| key | text | NO |  |
| version | text | NO |  |
| owner_id | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| user_metadata | jsonb | YES |  |

## storage.s3_multipart_uploads_parts

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| upload_id | text | NO |  |
| size | bigint | NO | 0 |
| part_number | integer | NO |  |
| bucket_id | text | NO |  |
| key | text | NO |  |
| etag | text | NO |  |
| owner_id | text | YES |  |
| version | text | NO |  |
| created_at | timestamp with time zone | NO | now() |

## storage.vector_indexes

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | text | NO | gen_random_uuid() |
| name | text | NO |  |
| bucket_id | text | NO |  |
| data_type | text | NO |  |
| dimension | integer | NO |  |
| distance_metric | text | NO |  |
| metadata_configuration | jsonb | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

## supabase_functions.hooks

Descripcion: Supabase Functions Hooks: Audit trail for triggered hooks.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | bigint | NO | nextval('supabase_functions.hooks_id_seq'::regclass) |
| hook_table_id | integer | NO |  |
| hook_name | text | NO |  |
| created_at | timestamp with time zone | NO | now() |
| request_id | bigint | YES |  |

## supabase_functions.migrations

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| version | text | NO |  |
| inserted_at | timestamp with time zone | NO | now() |

## supabase_migrations.schema_migrations

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| version | text | NO |  |
| statements | ARRAY | YES |  |
| name | text | YES |  |

## vault.secrets

Descripcion: Table with encrypted `secret` column for storing sensitive information on disk.

| Columna | Tipo | Nulo | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| name | text | YES |  |
| description | text | NO | ''::text |
| secret | text | NO |  |
| key_id | uuid | YES |  |
| nonce | bytea | YES | vault._crypto_aead_det_noncegen() |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |


---

# Plan de aislamiento (anexado)

Concatenado: 2026-01-18T14:33:04.592Z

Respuesta corta (para bajar la ansiedad)

- NO eliminar tablas ahora.
- Apagar todo lo que las haga "vivir" (crons, workers, triggers).

Orden correcto de acciones (no se discute):
1. Desactivar triggers / crons / workers
2. Bloquear ejecución lógica (RLS / privilegios / flags)
3. (Opcional) Mover tablas fuera de public
4. NO eliminar tablas ahora

Acciones inmediatas recomendadas

1) Desactivar ejecución
- Deshabilitar crons legacy (DROP CRON o return early con FASE guard).
- Añadir guard clause `if (Deno.env.get('FASE') !== '1') return new Response('disabled', { status: 204 })` en workers OFF.
- `ALTER TABLE ... DISABLE TRIGGER ALL` en tablas legacy que generan ruido.

2) Blindaje (segunda línea de defensa)
- Aplicar RLS deny-all en tablas workflow/signature/nda (temporal).
- Quitar permisos write a anon/service_role donde no corresponda.

3) Validar local/staging
- UI no refresca sola.
- Crear documento → aparece en document_entities.
- Proteger → evento único `document.protected`.
- Executor procesa 1 job (executor_jobs → claimed → executor_job_runs).

No hacer ahora:
- ❌ No borrar tablas
- ❌ No migraciones masivas
- ❌ No refactors grandes

Notas:
- Este procedimiento es reversible y no destructivo.
- Prioridad absoluta: desactivar triggers/crons/workers primero para recuperar causalidad.

---

