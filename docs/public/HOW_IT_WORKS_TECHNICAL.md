# EcoSign — How It Works

## A Public Explanation of the Philosophy, Technical Model, and Verifiable Guarantees Behind EcoSign

**Status:** public-safe  
**Audience:** engineering, security, audit, integration teams, and anyone who believes digital work deserves better  
**Last Updated:** 2026-03-11

---

## What We Believe

EcoSign was built from a simple conviction:

> **Important digital work should not depend on trust in a platform's narrative. It should leave behind evidence that can be checked independently.**

That principle shapes every public contract we expose.

We do not ask external reviewers to "trust our interface."  
We aim to produce artifacts, verification flows, and runtime behavior that can be tested outside EcoSign itself.

This document defines the technical surface that can be validated externally today.

---

## There Is Another Way

For too long, the digital world has accepted a false tradeoff:

- Either you use a platform and trust it completely.
- Or you stay offline and lose all the benefits of digital collaboration.

**This is a false choice.**

It is possible to build platforms that:
- Protect without exposing.
- Verify without trapping.
- Serve without demanding faith.

EcoSign is our answer to that possibility.

---

## Principle 1: Content Does Not Need to Be Exposed to Generate Verifiable Backup

### The Question

If today we have cryptographic hashing like SHA-256, **why do so many platforms still need to read your documents to protect them?**

### The Simple Explanation

A document can be represented by a unique fingerprint—a hash—that identifies it without revealing its content.

The same file always produces the same fingerprint.  
A modified file produces a different fingerprint.

That's all you need to build verifiable evidence without exposing what's inside.

### The Technical Explanation

EcoSign uses deterministic file identity handling at the byte level via SHA-256.

```typescript
const sha256 = async (data: Uint8Array): Promise<string> => {
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(hashBuffer));
};
```

This hash becomes the file's identity for all evidence progression and verification flows.

### Externally Verifiable Today

- Same file input → same identity output
- Modified file input → different identity output
- Hash computation can be reproduced independently

### Public Contract

- Identity is derived deterministically from the file input
- That identity becomes part of evidence progression and later verification flows
- Platform never needs to read content to generate backup

### Why This Matters

When a platform must read your document to protect it, you've already lost sovereignty.  
EcoSign protects without reading.

---

## Principle 2: The Same File Must Resolve to the Same Identity

### The Question

If the same file can mean two different things depending on a platform's internal interpretation, **is there really a shared technical truth?**

### The Simple Explanation

File identity should not change based on context, mood, or platform updates.

A PDF is a PDF. A contract is a contract.  
The platform's job is to reflect that reality, not reinterpret it.

### The Technical Explanation

EcoSign treats file identity as immutable once established.

The hash is computed client-side before upload.  
The platform receives the hash, not the content, for evidence tracking.

### Externally Verifiable Today

- Hash can be computed locally and compared to platform's record
- No server-side reinterpretation of file identity
- Evidence progression is tied to the hash, not mutable metadata

### Public Contract

- File identity is established at upload time
- Identity remains stable throughout the evidence lifecycle
- Verification flows use the same identity established at origin

### Why This Matters

When file identity can shift, evidence becomes fragile.  
EcoSign treats identity as immutable truth.

---

## Principle 3: Evidence Must Progress Through Explicit, Reviewable States

### The Question

If evidence behaves like a black box log, **how can anyone verify what actually happened?**

### The Simple Explanation

Serious evidence systems don't just say "success."  
They show you the steps: who did what, when, and how it can be checked.

### The Technical Explanation

EcoSign models evidence progression through explicit states and events that leave traceable outputs.

Events are append-only and timestamped.  
Each state transition is observable through public-facing outputs.

### Externally Verifiable Today

- Progression can be observed through artifacts and public-facing outputs
- Generated evidence preserves traceability across the flow
- Events are structured and queryable

### Public Contract

- Evidence progression is append-oriented
- State transitions are meant to be externally reviewable, not hidden behind opaque internal success flags
- Each event has a kind, timestamp, and observable payload

### Why This Matters

When evidence is a black box, you must trust the platform's story.  
EcoSign makes evidence reviewable.

---

## Principle 4: Verification Must Reproduce the Same Answer for the Same Evidence

### The Question

If verification gives different results depending on who checks or when, **is it really verification?**

### The Simple Explanation

Verification is only meaningful if the same artifact yields the same result when checked again.

Today: valid.  
Tomorrow: still valid.  
Checked by you: valid.  
Checked by a perito: valid.

### The Technical Explanation

EcoSign treats reproducibility as part of the public contract.

Verification flows are deterministic:
- Same `.eco` / `.ecox` + same reference input → same verification result
- Invalid or tampered evidence → explicit negative result

### Externally Verifiable Today

- Verification can be run independently with the same inputs
- Result structures are stable enough to support external review and audit automation
- Negative results are as explicit as positive ones

### Public Contract

- Verification outputs are deterministic at the result level
- Result structures are stable enough to support external review and audit automation
- Verification does not require private internal assembly knowledge

### Why This Matters

When verification depends on the platform's current state, evidence is fragile.  
EcoSign makes verification reproducible.

---

## Principle 5: Access Must Behave as an Enforceable Capability

### The Question

If access is just a UI state, **what happens when the UI is bypassed?**

### The Simple Explanation

Access is not a button. It's a policy decision with real runtime consequences.

A link that expires should deny access.  
A revoked capability should deny access.  
Not "usually." Always.

### The Technical Explanation

EcoSign treats access links and capabilities as time- and policy-constrained controls.

Access tokens are hashed before storage.  
Expiration and revocation are enforced at the runtime layer, not just the UI layer.

```typescript
const tokenHash = await sha256(token);
const link = await db.links.findOne({ tokenHash });

if (!link || link.expiresAt < now || link.revokedAt) {
  return { allowed: false, reason: 'access_denied' };
}
```

### Externally Verifiable Today

- Expired capability → denied
- Revoked capability → denied
- Active capability → allowed according to policy

### Public Contract

- Access behavior follows explicit expiration and revocation semantics
- Runtime behavior can be tested independently through integration flows
- Token lookup is hash-based, not plain-text

### Why This Matters

When access is a UI illusion, security is theater.  
EcoSign enforces access at the runtime layer.

---

## Principle 6: Evidence Artifacts Must Remain Useful Outside EcoSign

### The Question

If evidence only works inside the platform that created it, **is it really evidence—or just dependency?**

### The Simple Explanation

A serious evidence platform should not trap truth inside its own walls.

You should be able to:
- Download your evidence.
- Verify it without us.
- Show it to a perito without calling us.

### The Technical Explanation

EcoSign artifacts are designed to support external review workflows.

`.eco` / `.ecox` files contain:
- File identity (hash)
- Evidence progression (events)
- Verification contracts (schemas)
- Timestamps (TSA, anchoring references)

These artifacts can be transported and reviewed outside the original flow.

### Externally Verifiable Today

- Evidence artifacts can be transported and reviewed outside the original flow
- Public verification behavior remains reproducible from those outputs
- Artifacts contain all necessary information for independent validation

### Public Contract

- `.eco` / `.ecox` are part of the external validation surface
- Public verification does not require private internal assembly knowledge to reproduce contract-level results
- Artifacts are self-contained and portable

### Why This Matters

When evidence dies with the platform, users are trapped.  
EcoSign designs artifacts to outlive the platform.

---

## Principle 7: The Platform Should Not Be a Cage

### The Question

If a user cannot leave with their evidence and verify it elsewhere, **is that protection—or lock-in?**

### The Simple Explanation

EcoSign is not designed to make you dependent on us forever.  
It's designed so you can take your evidence, verify it, and explain it even without us.

Because when a system forces the user to always return to the provider to prove what's theirs, it's not offering sovereignty. It's offering dependency.

### The Technical Explanation

EcoSign implements anti-lock-in by design:

- Artifacts are portable (`.eco` / `.ecox`)
- Verification is reproducible without platform access
- Evidence schemas are public and stable
- Integration contracts are documented

### Externally Verifiable Today

- Users can download their evidence artifacts
- Artifacts can be verified without platform access
- Schemas are public and versioned

### Public Contract

- Evidence belongs to the user, not the platform
- Verification should not require platform access
- Users should be able to leave with their evidence

### Why This Matters

When platforms trap evidence, users lose sovereignty.  
EcoSign designs for exit, not entrapment.

---

## What Is TSA and Why Does It Matter?

### The Simple Explanation

A TSA (Timestamp Authority) is a service that provides verifiable proof that a digital fingerprint existed at a specific moment in time.

Its job is not to say "the document is good" or "the signature is valid."  
Its job is to leave verifiable record that a certain hash existed at a certain time.

### Why This Matters

In the digital world, it's not enough to say "I already had it."  
You need to be able to back up when certain evidence existed without depending on memory, screenshots, or later stories.

### The Technical Explanation

EcoSign integrates with RFC 3161 compliant TSA providers.

```typescript
const tsaResponse = await fetch(TSA_PROVIDER_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/timestamp-query' },
  body: buildTimestampQuery(hash)
});
const tsaToken = await parseTimestampResponse(tsaResponse);
```

The TSA token is then embedded in the evidence artifact.

### Externally Verifiable Today

- TSA token can be validated against the TSA provider
- Timestamp is independent of EcoSign's internal clocks
- Token is embedded in `.eco` / `.ecox` artifacts

### Public Contract

- TSA integration uses RFC 3161 compliant providers
- Timestamps are verifiable independently
- TSA tokens are preserved in evidence artifacts

---

## What Is Anchoring and Why Does It Matter?

### The Simple Explanation

Anchoring is publishing or fixing a verifiable reference in an external, unalterable infrastructure so that evidence continuity doesn't depend only on a private database.

Think of it as notarizing a hash on a public ledger.

### Why This Matters

When evidence lives only in a private database, it can be changed, deleted, or lost.  
Anchoring makes evidence continuity independent of any single platform.

### The Technical Explanation

EcoSign supports anchoring to multiple external infrastructures:

- **Polygon:** Fast, low-cost blockchain anchoring
- **Bitcoin:** Slow, high-assurance blockchain anchoring
- **OpenTimestamps:** Free, calendar-based anchoring

```typescript
const anchorRequest = {
  documentHash: hash,
  network: 'polygon' | 'bitcoin' | 'opentimestamps'
};
```

Anchoring is queued and processed asynchronously.  
Anchor proofs are then embedded in evidence artifacts.

### Externally Verifiable Today

- Anchor transactions can be verified on the respective blockchain
- Anchor proofs are embedded in evidence artifacts
- Anchoring is independent of EcoSign's internal state

### Public Contract

- Anchoring uses public, auditable infrastructures
- Anchor proofs are verifiable independently
- Anchoring is queued and processed with explicit status tracking

---

## What Is Client-Side Encryption and Why Does It Matter?

### The Simple Explanation

Client-side encryption means your document is encrypted in your browser before it ever reaches our servers.

We never see the unencrypted document.  
We can't decrypt it even if we wanted to.

### Why This Matters

When encryption happens server-side, the platform holds the keys.  
When encryption happens client-side, you hold the keys.

### The Technical Explanation

EcoSign uses Web Crypto API for client-side encryption.

```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  documentBytes
);
```

The encryption key never leaves the client.  
Encrypted documents are stored in custody storage.

### Externally Verifiable Today

- Encryption happens before upload
- Platform stores only ciphertext
- Decryption requires client-held keys

### Public Contract

- Client-side encryption is enforced before upload
- Platform cannot decrypt stored documents
- Decryption requires explicit user action on client side

---

## What We Publish and What We Don't

### What We Publish

We believe in transparency where it matters:

- **File identity handling:** SHA-256, deterministic, reproducible
- **Evidence progression:** Append-only, timestamped, queryable
- **Verification contracts:** Public schemas, stable result structures
- **Access semantics:** Expiration, revocation, runtime enforcement
- **Artifact structure:** `.eco` / `.ecox` specifications
- **Integration points:** Public APIs, webhooks, event contracts

### What We Don't Publish

We believe in safety where it matters:

- **Internal heuristics:** Private decision parameters that could be gameably exploited
- **Security-sensitive internals:** Details whose disclosure would reduce operational safety
- **Private scoring:** Internal risk assessment that could be reverse-engineered

### Why We Draw This Line

> We publish the public technical surface required for external audit, integration, and independent validation because verifiable systems should be explainable at the contract level, portable at the artifact level, and testable at the behavior level.

Some components are currently under intellectual-rights registration. During this phase, we publish the maximum public surface that preserves both external auditability and operational safety.

---

## External Validation Checklist

A reviewer can validate the following without access to private internals:

- [ ] Deterministic file identity behavior
- [ ] Evidence progression consistency across outputs
- [ ] Verification reproducibility
- [ ] Access expiration and revocation enforcement
- [ ] Artifact portability for independent review flows
- [ ] TSA token validation against provider
- [ ] Anchor transaction verification on blockchain
- [ ] Client-side encryption before upload

---

## Public References

- [docs/public/README.md](https://github.com/TemporalDynamics/ecosign/tree/main/docs/public)
- [docs/public/EPI_PUBLIC_SPEC.md](https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/EPI_PUBLIC_SPEC.md)
- [docs/public/EPI_HASH_MODEL_PUBLIC_CONTRACT.md](https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/EPI_HASH_MODEL_PUBLIC_CONTRACT.md)
- [docs/public/EPI_FALSE_NEGATIVE_PUBLIC_MODEL.md](https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/EPI_FALSE_NEGATIVE_PUBLIC_MODEL.md)
- [packages/eco-packer-public/README.md](https://github.com/TemporalDynamics/ecosign/tree/main/packages/eco-packer-public)
- [HOW_IT_WORKS_TECHNICAL.md](https://github.com/TemporalDynamics/ecosign/blob/main/docs/public/HOW_IT_WORKS_TECHNICAL.md) (this document)

---

## Why We Publish This

EcoSign does not believe that "security" should mean opacity, and it does not believe that "verification" should mean trusting a vendor's story.

We publish the public technical surface required for external audit, integration, and independent validation because:

- **Verifiable systems should be explainable at the contract level.**
- **Evidence should be portable at the artifact level.**
- **Behavior should be testable at the runtime level.**

Some components are currently under intellectual-rights registration. During this phase, we publish the maximum public surface that preserves both external auditability and operational safety.

---

## A Final Word

> We do not ask you to trust us.  
> We ask you to verify us.

If this document raises questions, good.  
Ask them. Test them. Break them.

If the code doesn't match the contracts, tell us.  
If the contracts don't match the behavior, tell us.  
If the behavior doesn't match the principles, tell us.

EcoSign is not built to be believed.  
It's built to be checked.

And if it passes your check, it won't be because we asked you to trust.  
It'll be because the evidence speaks for itself.

---

**Last Updated:** 2026-03-11  
**Status:** public-safe  
**Contact:** support@email.ecosign.app
