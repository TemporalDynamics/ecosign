# @temporaldynamics/ecosign-orchestrator

EcoSign adapter package for `@temporaldynamics/orchestrator-core`.
It defines domain-facing job types and mapping utilities, while keeping the
execution model generic.

## Installation

```
npm install @temporaldynamics/ecosign-orchestrator
```

## Usage

```ts
import { ENTITY_JOB_TYPES, mapCtaToJobOptions, MapExecutor } from '@temporaldynamics/ecosign-orchestrator';
```

## Notes

- Job types are intentionally generic (`entity.*`) to avoid domain coupling.
- Execution wiring (Edge Functions, workers, etc.) lives outside this package.
