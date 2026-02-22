#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeGovernanceInput } from "./domain/types.mjs";
import { evaluateGovernance } from "./engine/index.mjs";

function parseArgs(argv) {
  const args = {
    inputPath: "",
    pretty: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];

    if (current === "--input") {
      args.inputPath = argv[i + 1] || "";
      i += 1;
      continue;
    }

    if (current === "--pretty") {
      args.pretty = true;
      continue;
    }

    if (current === "--help" || current === "-h") {
      args.help = true;
      continue;
    }
  }

  return args;
}

function printHelp() {
  console.log("Usage: node packages/governance-core/src/cli.mjs --input <file.json> [--pretty]");
}

try {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.inputPath) {
    console.error("Missing required --input argument.");
    printHelp();
    process.exit(2);
  }

  const absoluteInputPath = resolve(process.cwd(), args.inputPath);
  const rawText = readFileSync(absoluteInputPath, "utf8");

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("Input file is not valid JSON.");
    process.exit(2);
  }

  const normalized = normalizeGovernanceInput(parsed);
  if (normalized.errors) {
    console.error("Input schema validation failed:");
    for (const error of normalized.errors) {
      console.error(` - ${error}`);
    }
    process.exit(2);
  }

  const output = evaluateGovernance(normalized.input);
  const serialized = args.pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  console.log(serialized);

  process.exit(output.pass ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
