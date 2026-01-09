# VerifySign API Reference

The current VerifySign stack exposes two integration surfaces:
1. **Supabase Edge Functions** (TypeScript/Deno) reachable through `https://<project-ref>.functions.supabase.co/<function>`.
2. **Supabase PostgREST endpoints** under `https://<project-ref>.supabase.co/rest/v1/` protected by Row Level Security.

All requests must include a Supabase JWT (`apikey` header with the anon or service key, plus `Authorization: Bearer <token>`). Client-side calls use the anon key; server-side automation can use the service-role key where RLS requires elevated access.

---

## Edge Functions

### 1. `POST /generate-cert`
Creates a signed `.eco` certificate from an uploaded file hash.

**URL**
```
https://<project-ref>.functions.supabase.co/generate-cert
```

**Headers**
```
Authorization: Bearer <service-role JWT>
apikey: <service-role key>
Content-Type: application/json
```

**Body**
```json
{
  "ownerEmail": "user@example.com",
  "sha256": "abc123...",
  "filename": "contract.pdf",
  "metadata": {
    "size": 1048576,
    "mimeType": "application/pdf",
    "anchorChain": "opentimestamps"  // optional
  }
}
```

**Response 200**
```json
{
  "success": true,
  "certificateId": "uuid",
  "ecoObjectPath": "eco-files/certificates/uuid.eco",
  "downloadUrl": "https://.../storage/v1/object/sign/...",
  "anchored": true,
  "anchoredAt": "2025-11-10T12:21:00Z"
}
```

### 2. `POST /verify-cert`
Validates a provided `.eco`/`.ecox` artifact and returns the verification report.

**Body**
```json
{
  "eco": "base64-encoded-eco",
  "sha256": "abc123..."  // optional; if omitted the function hashes the payload
}
```

**Response 200**
```json
{
  "valid": true,
  "sha256": "abc123...",
  "signature": "ed25519...",
  "timestamp": "2025-11-10T12:21:00Z",
  "anchor": {
    "chain": "opentimestamps",
    "txId": "..."
  }
}
```
If verification fails the function returns `400` with `{ "valid": false, "error": "signature mismatch" }`.

### 3. `POST /nda-signature`
Logs NDA acceptance events and issues scoped access tokens.

**Body**
```json
{
  "ndaId": "uuid",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "organization": "Analytical Engines Inc",
  "signature": "data:image/png;base64,...",
  "ip": "203.0.113.24",
  "userAgent": "Mozilla/5.0",
  "docHash": "abc123..."
}
```

**Response 200**
```json
{
  "logged": true,
  "accessToken": "nda_7c0e...",
  "expiresAt": "2025-11-10T14:21:00Z"
}
```
Use the returned token when gating document downloads or verifications.

---

## PostgREST Tables & Views

All endpoints live under `https://<project-ref>.supabase.co/rest/v1/` and respect RLS.

### `eco_certificates`
- `GET /eco_certificates?select=certificate_id,filename,sha256,created_at`
  - Returns the current user’s certificates. Requires `Authorization` with their Supabase session.
- `POST /eco_certificates`
  - Only allowed by service-role (edge function) to insert canonical records.

### `signatures`
- `GET /signatures?case_id=eq.<uuid>`
  - Lists NDA events tied to a case; accessible to owners via RLS.

### `cases`
- `POST /cases`
  - Create NDA flows. Validated by RLS so that only the authenticated owner inserts rows with `owner_id = auth.uid()`.

### Storage signed URLs
Use the Supabase Storage API rather than expose bucket URLs directly. Example via `supabase-js`:
```ts
const { data, error } = supabase
  .storage
  .from('eco-files')
  .createSignedUrl('certificates/<id>.eco', 60);
```

---

## Errors
- Edge functions return JSON with `{ "error": { "code": "string", "message": "string" } }` on failure.
- PostgREST errors follow the RFC 7807 problem details format.
- Common HTTP statuses: `400` (validation), `401` (missing/invalid JWT), `403` (RLS rejection), `404` (record not found), `429` (rate limited by Vercel/Supabase), `500` (unexpected).

Keep this document updated whenever you add new Supabase functions or tables so integrators have a single canonical contract.
