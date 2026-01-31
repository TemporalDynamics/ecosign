# EcoSign API Endpoints for Surface v0 Compliance

## Objective
Define minimal public API endpoints that comply with ecosign_surface_v0 contract
without EcoSign knowing about CustodyArt.

## Scope
- EcoSign exposes 4 new public endpoints
- Each endpoint implements its corresponding contract
- No business logic changes in EcoSign
- No UI changes required
- No knowledge of CustodyArt in EcoSign

## Endpoints Specification

### 1. Identity Endpoint
**Path:** `POST /identity`
**Contract:** Identity Contract (EcoSign Surface)

**Request:**
```json
{
  "binaryFile"?: "<base64_encoded_file>",
  "sourceHash"?: "<sha256_hash>"
}
```

**Response:**
```json
{
  "source_hash": "<sha256_hash>",
  "document_entity_id": "<uuid>"
}
```

**Rules:**
- source_hash defines identity
- identity is independent of storage location
- same source_hash MUST map to same document_entity_id per owner
- If binaryFile is provided, calculate source_hash
- If sourceHash is provided, find or create document_entity_id

### 2. Custody Endpoint
**Path:** `POST /custody`
**Contract:** Custody Contract (EcoSign Surface)

**Request:**
```json
{
  "source_hash": "<sha256_hash>",
  "custody_mode": "hash_only" | "encrypted_custody"
}
```

**Response:**
```json
{
  "custody_mode": "hash_only" | "encrypted_custody",
  "storage_status": "success" | "error"
}
```

**Rules:**
- source is immutable
- encrypted_custody is E2E encrypted
- platform cannot read content
- storage provider cannot read content
- custody_mode is irreversible once selected

### 3. Witness Endpoint
**Path:** `POST /witness`
**Contract:** Witness Contract (EcoSign Surface)

**Request:**
```json
{
  "document_entity_id": "<uuid>"
}
```

**Response:**
```json
{
  "witness_hash": "<sha256_hash>",
  "witness_artifact": "<base64_encoded_pdf>",
  "evidence_refs": ["<evidence_reference>"]
}
```

**Rules:**
- witness proves existence without revealing source
- witness_hash derives from source_hash
- public evidence MUST reference witness_hash
- witness_artifact MUST be reproducible from canonical state

### 4. Resolver Endpoint
**Path:** `POST /resolver`
**Contract:** Resolver Contract (EcoSign Surface)

**Request:**
```json
{
  "document_entity_id"?: "<uuid>",
  "source_hash"?: "<sha256_hash>",
  "requester_context": {
    "user_id": "<uuid>",
    "permissions": ["<permission>"],
    "timestamp": "<ISO_date>"
  }
}
```

**Response:**
```json
{
  "signed_url"?: "<url>",
  "access_denied": true | false
}
```

**Rules:**
- access is explicit and auditable
- access is time-limited
- denial returns 403 (never leaks existence)
- resolver MUST NOT leak existence through timing or error messages

## Implementation Notes

1. These endpoints should be added to EcoSign's existing API infrastructure
2. Authentication and authorization should follow existing patterns
3. Rate limiting and monitoring should be consistent with other endpoints
4. These endpoints should be versioned appropriately (e.g., /api/v1/identity)
5. Error responses should be consistent with existing API patterns
6. All endpoints should have appropriate CORS policies for cross-origin requests

## Stability Guarantees

These endpoints form the EcoSign Surface v0 contract and must:
- Remain backward compatible within the same major version
- Follow append-only modification policy
- Maintain the same input/output contracts
- Not expose internal implementation details