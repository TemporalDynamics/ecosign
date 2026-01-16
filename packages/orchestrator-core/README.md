# @temporaldynamics/orchestrator-core

Agnostic orchestration core focused on contracts only. This package defines the
base types and execution interfaces for building orchestrators and adapters.

## Installation

```
npm install @temporaldynamics/orchestrator-core
```

## Usage

```ts
import type { Job, JobResult, Executor } from '@temporaldynamics/orchestrator-core';
```

## Notes

- The core is executor-agnostic by design.
- Includes a minimal reconciliation loop (`DefaultOrchestrator`) as a reference implementation.
- No domain-specific naming or logic should live here.
