# How EcoSign Works

## What We Believe

EcoSign was built from a simple conviction:

> **Important digital work should not depend on trust in a platform's narrative. It should leave behind evidence that can be checked independently.**

We do not ask you to trust us.  
We ask you to verify us.

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

## Five Core Principles

### 1. Protect Without Exposing

**The Question:**  
If today we have cryptographic hashing like SHA-256, **why do so many platforms still need to read your documents to protect them?**

**The Answer:**  
A document can be represented by a unique fingerprint—a hash—that identifies it without revealing its content.

The same file always produces the same fingerprint.  
A modified file produces a different fingerprint.

That's all you need to build verifiable evidence without exposing what's inside.

**What This Means for You:**  
EcoSign protects your documents without reading them. The platform never needs to see your content to generate verifiable backup.

---

### 2. Evidence Without Dependency

**The Question:**  
If evidence lives only in a private database, **what happens when that database disappears?**

**The Answer:**  
Serious evidence systems don't trap truth inside their own walls.

EcoSign models evidence progression through explicit states and events that leave traceable outputs.

Events are append-only and timestamped.  
Each state transition is observable through public-facing outputs.

**What This Means for You:**  
Your evidence doesn't depend on EcoSign's internal state. It's recorded in a way that can be reviewed independently.

---

### 3. Verification Without Traps

**The Question:**  
If verification gives different results depending on who checks or when, **is it really verification?**

**The Answer:**  
Verification is only meaningful if the same artifact yields the same result when checked again.

Today: valid.  
Tomorrow: still valid.  
Checked by you: valid.  
Checked by a perito: valid.

**What This Means for You:**  
EcoSign treats reproducibility as part of the public contract. The same evidence always produces the same verification result.

---

### 4. Access With Real Limits

**The Question:**  
If access is just a UI state, **what happens when the UI is bypassed?**

**The Answer:**  
Access is not a button. It's a policy decision with real runtime consequences.

A link that expires should deny access.  
A revoked capability should deny access.  
Not "usually." Always.

**What This Means for You:**  
EcoSign enforces access at the runtime layer, not just the UI layer. Expired links deny access. Revoked capabilities deny access. Always.

---

### 5. Exit By Design

**The Question:**  
If a user cannot leave with their evidence and verify it elsewhere, **is that protection—or lock-in?**

**The Answer:**  
EcoSign is not designed to make you dependent on us forever.  
It's designed so you can take your evidence, verify it, and explain it even without us.

Because when a system forces the user to always return to the provider to prove what's theirs, it's not offering sovereignty. It's offering dependency.

**What This Means for You:**  
You can download your evidence artifacts (`.eco` / `.ecox`), verify them without platform access, and show them to a perito without calling us.

---

## What This Means in Practice

### You Don't Need to Trust Our Interface

You can verify:
- File identity (hash) independently
- Evidence progression through public outputs
- Verification results reproducibly
- Access enforcement at runtime
- Artifact portability outside EcoSign

### You Can Leave With Your Evidence

EcoSign artifacts contain:
- File identity (hash)
- Evidence progression (events)
- Verification contracts (schemas)
- Timestamps (TSA, anchoring references)

These artifacts can be transported and reviewed outside the original flow.

### You Can Verify Without Us

Verification flows are:
- Deterministic (same input → same result)
- Reproducible (checked by anyone, anytime)
- Independent (no platform access required)

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

## For Technical Readers

This document explains the philosophy and public model of EcoSign.

For detailed technical specifications, validation contracts, and code references, see:

- [Public Validation Contract](./PUBLIC_VALIDATION_CONTRACT.md) — Technical assertions and verification methods
- [EPI Public Spec](./EPI_PUBLIC_SPEC.md) — Evidence progression specification
- [Hash Model Contract](./EPI_HASH_MODEL_PUBLIC_CONTRACT.md) — File identity handling contract

---

**Last Updated:** 2026-03-11  
**Status:** public-safe  
**Contact:** support@email.ecosign.app
