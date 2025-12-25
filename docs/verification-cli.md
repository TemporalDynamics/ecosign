# Verification CLI (minimal)

This CLI performs structural checks on a `.ECO` JSON and optionally verifies
that an original file matches the stored hash.

## Usage

```
node scripts/verify-eco.mjs docs/examples/sample.eco.json
node scripts/verify-eco.mjs docs/examples/sample.eco.json /path/to/original.pdf
```

## Output

- Displays the declared hash from the `.ECO`.
- If an original file is provided, recalculates SHA-256 and compares.
- Signature verification is intentionally omitted in this minimal CLI.
