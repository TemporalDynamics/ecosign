# EPI Hash Model Public Contract

Status: public-safe
Updated: 2026-02-24

## Public guarantees
1. `source_hash` identifies source state.
2. `witness_hash` binds attestable witness state.
3. `signed_hash` binds signed witness state.
4. Hash links are append-only and immutable after emission.
5. Equal canonical inputs produce equal outputs.

## Prohibitions
1. Replacing prior hash links.
2. Reusing hash fields for non-hash semantics.
3. Accepting proofs not bound to canonical witness identity.
