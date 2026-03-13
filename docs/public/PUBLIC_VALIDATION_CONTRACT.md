# EcoSign Public Validation Contract

**Status:** public-safe  
**Audience:** engineering, security, audit, integration teams  
**Last Updated:** 2026-03-11  
**Version:** 1.0

---

## Scope and Boundaries

### What This Document Guarantees

This document defines verifiable assertions about EcoSign's public technical surface. Each assertion can be independently validated by external reviewers without access to private internals.

**Guaranteed:**
- Deterministic file identity for protected evidence flows
- Evidence progression for finalized artifacts
- Verification reproducibility for complete `.eco` files
- Access enforcement at runtime layer
- Artifact portability for independent review

### What This Document Does Not Guarantee

**Not Guaranteed:**
- Draft/unprotected flows (may have different behavior)
- Incomplete artifacts (missing TSA/anchors)
- Third-party infrastructure availability (TSA providers, blockchain networks)
- Performance characteristics (latency, throughput)
- UI/UX behavior (may change without notice)

### What Requires Third-Party Validation

**Third-Party Dependencies:**
- **TSA token validation:** Requires RFC 3161 compliant TSA provider
- **Blockchain anchor verification:** Requires access to blockchain node (Polygon, Bitcoin)
- **Ed25519 signature validation:** Requires public key from trust store
- **Email delivery:** Depends on email provider (SendGrid, SES, etc.)

### What Requires Possession of the Artifact

**Full Verification Requires:**
- Complete `.eco` or `.ecox` file
- Access to public verification endpoint or verifier library
- (Optional) Access to third-party services (TSA, blockchain)

**Partial Verification Possible With:**
- Public metadata (hash, timestamps)
- Event logs (if exported)
- Platform access (for non-portable verification)

### .eco vs .ecox Differences

| Aspect | `.eco` | `.ecox` |
|--------|--------|---------|
| **Purpose** | Public verification | Extended verification |
| **Sensitive Data** | ❌ No | ⚠️ May contain encrypted custody data |
| **Portability** | ✅ Fully portable | ⚠️ Requires decryption keys |
| **Verification** | Independent | May require additional context |
| **Use Case** | External audit, peritos | Internal audit, extended evidence |

---

## Assertions and Verification Methods

### Assertion 1: Deterministic File Identity

**EcoSign Claims:**  
For protected evidence flows, the same file input produces the same identity output. A modified file input produces a different identity output.

**External Reviewer Can Test:**
1. Compute SHA-256 hash of file locally
2. Compare to platform's recorded hash
3. Modify file (even 1 byte)
4. Compute hash again
5. Verify hash is different

**Successful Validation Yields:**
- Matching SHA-256 hash for unmodified file
- Different SHA-256 hash for modified file
- Hash computation is reproducible independently

**Applies To:**
- All protected evidence flows
- All finalized artifacts

**Limitations:**
- Does not apply to draft/unprotected flows
- Hash is computed client-side before upload (for custody mode)
- Platform may recompute hash server-side for verification

**Technical Reference:**
```typescript
const sha256 = async (data: Uint8Array): Promise<string> => {
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(hashBuffer));
};
```

---

### Assertion 2: Evidence Progression Observability

**EcoSign Claims:**  
Evidence progression is append-only and timestamped. Events can be queried and their ordering verified.

**External Reviewer Can Test:**
1. Query events for a document entity
2. Verify events are ordered by timestamp
3. Verify no events are deleted (only appended)
4. Verify event structure matches public schema

**Successful Validation Yields:**
- Monotonic event sequence (timestamps increase)
- No gaps in event sequence (for finalized flows)
- Event structure matches public schema

**Applies To:**
- All finalized evidence artifacts
- All `document_entities` records

**Limitations:**
- Draft events may be reordered before finalization
- Event payloads may be redacted for privacy (e.g., PII)
- Some events are internal (not exposed publicly)

**Technical Reference:**
```typescript
type CanonicalEvent = {
  kind: string;
  at: string; // ISO timestamp
  witness_hash?: string;
  tsa?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  anchor?: Record<string, unknown>;
};
```

---

### Assertion 3: Verification Reproducibility

**EcoSign Claims:**  
Contract-level verification does not require platform access. The same `.eco` file produces the same verification result when checked by different reviewers.

**External Reviewer Can Test:**
1. Download `.eco` file
2. Run verification independently (using public verifier)
3. Compare result to platform's verification
4. Share `.eco` file with third party
5. Third party runs verification
6. Compare results

**Successful Validation Yields:**
- Same verification result across independent checks
- No platform access required for verification
- Result structure is stable and documented

**Applies To:**
- All complete `.eco` files
- Public verification endpoint

**Limitations:**
- Requires possession of `.eco` file
- Full verification may require third-party services (TSA, blockchain)
- `.ecox` files may require additional context for full verification

**Technical Reference:**
- [Verifier Source Code](../client/src/lib/verificationService.ts)
- [EPI Public Spec](./EPI_PUBLIC_SPEC.md)

---

### Assertion 4: Access Enforcement at Runtime

**EcoSign Claims:**  
Access behavior follows explicit expiration and revocation semantics. Runtime behavior can be tested independently through integration flows.

**External Reviewer Can Test:**
1. Create access link with expiration
2. Wait for expiration
3. Attempt to access
4. Verify access is denied
5. Revoke active link
6. Attempt to access
7. Verify access is denied

**Successful Validation Yields:**
- Expired capability → denied
- Revoked capability → denied
- Active capability → allowed according to policy

**Applies To:**
- All access links (`links` table)
- All capability-based access flows

**Limitations:**
- Access enforcement depends on platform runtime
- Cached responses may bypass enforcement (CDN, browser)
- Token lookup is hash-based (not plain-text)

**Technical Reference:**
```typescript
const tokenHash = await sha256(token);
const link = await db.links.findOne({ tokenHash });

if (!link || link.expiresAt < now || link.revokedAt) {
  return { allowed: false, reason: 'access_denied' };
}
```

---

### Assertion 5: Artifact Portability

**EcoSign Claims:**  
Artifacts contain all information necessary for independent verification of claims in this contract. `.eco` files can be transported and reviewed outside the original flow.

**External Reviewer Can Test:**
1. Download `.eco` file
2. Extract contents (ZIP structure)
3. Verify structure matches public specification
4. Verify all required fields are present
5. Run verification without platform access

**Successful Validation Yields:**
- `.eco` file is valid ZIP archive
- Structure matches public specification
- All required fields are present
- Verification succeeds without platform access

**Applies To:**
- All finalized `.eco` files
- All `.ecox` files (with decryption keys)

**Limitations:**
- `.ecox` files may contain encrypted custody data
- Some metadata may be redacted for privacy
- Third-party validation (TSA, blockchain) requires external services

**Technical Reference:**
- [ECO Structure Spec](./EPI_PUBLIC_SPEC.md#eco-structure)
- [ECO Packer Public](../packages/eco-packer-public/README.md)

---

## External Validation Checklist

A reviewer can validate the following without access to private internals:

### File Identity
- [ ] Compute SHA-256 hash locally
- [ ] Compare to platform's recorded hash
- [ ] Modify file, verify hash changes

### Evidence Progression
- [ ] Query events for a document entity
- [ ] Verify events are ordered by timestamp
- [ ] Verify event structure matches schema

### Verification Reproducibility
- [ ] Download `.eco` file
- [ ] Run verification independently
- [ ] Compare result to platform's verification
- [ ] Share with third party, compare results

### Access Enforcement
- [ ] Create access link with expiration
- [ ] Wait for expiration, verify denial
- [ ] Revoke active link, verify denial

### Artifact Portability
- [ ] Download `.eco` file
- [ ] Extract contents (ZIP structure)
- [ ] Verify structure matches specification
- [ ] Run verification without platform access

### Third-Party Validation
- [ ] Validate TSA token against provider
- [ ] Verify anchor transaction on blockchain
- [ ] Validate Ed25519 signature with public key

---

## Third-Party Dependencies

### TSA Providers

**Dependency:** RFC 3161 compliant TSA providers  
**Availability:** Public (FreeTSA, etc.)  
**Verification:** TSA token can be validated against provider  
**Limitations:** Provider availability not guaranteed

### Blockchain Networks

**Dependency:** Polygon, Bitcoin networks  
**Availability:** Public networks  
**Verification:** Anchor transactions can be verified on-chain  
**Limitations:** Network congestion, fees, confirmation times

### Email Providers

**Dependency:** SendGrid, AWS SES, etc.  
**Availability:** Commercial services  
**Verification:** Email delivery can be tested  
**Limitations:** Delivery not guaranteed (spam filters, etc.)

---

## Known Limitations

### Technical Limitations

- **Client-side hashing:** Depends on browser's Web Crypto API
- **Timestamp accuracy:** Depends on TSA provider's clock
- **Blockchain anchoring:** Confirmation times vary (Polygon: ~2s, Bitcoin: ~10min)
- **Email delivery:** Not guaranteed (spam filters, invalid addresses)

### Operational Limitations

- **Platform uptime:** Not guaranteed (SLA applies for paid plans)
- **Storage retention:** Subject to plan limits
- **API rate limits:** Applied to prevent abuse

### Scope Limitations

- **Draft flows:** Not covered by this contract
- **Incomplete artifacts:** May not verify correctly
- **Legacy flows:** May have different behavior

---

## Version and Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-11 | Initial release |

---

## References

- [How EcoSign Works](./HOW_IT_WORKS.md) — Philosophy and public model
- [EPI Public Spec](./EPI_PUBLIC_SPEC.md) — Evidence progression specification
- [Hash Model Contract](./EPI_HASH_MODEL_PUBLIC_CONTRACT.md) — File identity handling contract
- [False Negative Model](./EPI_FALSE_NEGATIVE_PUBLIC_MODEL.md) — False positive/negative handling
- [ECO Packer Public](../packages/eco-packer-public/README.md) — Artifact packaging library

---

**Contact:** support@email.ecosign.app  
**Security Reports:** security@email.ecosign.app  
**GitHub:** https://github.com/TemporalDynamics/ecosign
