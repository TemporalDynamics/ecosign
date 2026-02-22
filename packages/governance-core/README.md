# governance-core

Deterministic governance engine (domain-agnostic).

## Scope
This module only evaluates normalized governance state.

It does **not**:
- parse `INVARIANT_MATRIX.md`
- run shell commands
- execute SQL
- run domain checks

Parsing/adaptation happens outside this module.

## Input Contract
```json
{
  "invariants": [
    {
      "id": "I-001",
      "status": "mapped",
      "blocking_severity": "release-blocking",
      "owner": "backend"
    }
  ],
  "critical_invariants": ["I-001", "I-002", "I-005", "I-007"],
  "target_level": "L3",
  "strict_matrix": false,
  "release_mode": false,
  "metadata": {
    "protocol_version": "1.8.0",
    "protocol_version_changed": true,
    "decision_log_changed": true,
    "invariants_changed": true
  }
}
```

## Output Contract
```json
{
  "current_level": "L3",
  "mapped_count": 6,
  "total_count": 8,
  "ratio": 75,
  "critical_mapped": 4,
  "critical_total": 4,
  "critical_missing": [],
  "gaps": ["I-006", "I-008"],
  "freeze_violation": false,
  "protocol_version_ok": true,
  "decision_log_ok": true,
  "pass": true
}
```

## Exit codes
- `0`: pass
- `1`: policy fail
- `2`: config/schema error

## CLI
```bash
node packages/governance-core/src/cli.mjs --input packages/governance-core/examples/input-pass.json --pretty
```

## Notes
- L3 gate: `ratio >= 75` AND `critical_mapped == critical_total`
- L4 gate: strict mode + 100% mapped + no gaps + critical complete
- Freeze violation: `invariants_changed == true` AND `protocol_version_changed == false`
