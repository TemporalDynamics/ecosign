/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import YAML from "yaml";

type EventContract = {
  sources?: string[];
  triggers?: string[];
  jobs?: string[];
  ui?: { status?: string };
  depends_on?: string[];
  allow_unemitted?: boolean;
  deprecated?: boolean;
};

type ContractFile = {
  version?: number;
  events?: Record<string, EventContract>;
};

type EventUsage = {
  emitted_in: string[];
  triggered_in: string[];
  ui_in: string[];
  declared: boolean;
  contract?: EventContract;
  status: string[];
};

const root = process.cwd();
const contractPath = path.join(root, "docs/canonical/event_graph.yaml");
const mdPath = path.join(root, "docs/canonical/EVENT_GRAPH.md");
const artifactsDir = path.join(root, "artifacts");

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : "local";
const compareArg = process.argv.find((arg) => arg.startsWith("--compare="));
const comparePath = compareArg ? compareArg.split("=")[1] : "";

function readText(p: string) {
  return fs.readFileSync(p, "utf8");
}

function walk(dir: string, exts: string[]) {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, exts));
    } else if (entry.isFile()) {
      if (exts.some((ext) => entry.name.endsWith(ext))) results.push(full);
    }
  }
  return results;
}

function scanEmitters(text: string) {
  const kinds = new Set<string>();
  const re = /(emitEvent|appendEvent)\s*\([\s\S]*?kind\s*:\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    kinds.add(m[2]);
  }
  return kinds;
}

function scanUi(text: string) {
  const kinds = new Set<string>();
  const re = /\b\w+\.kind\s*===\s*['"]([^'"]+)['"]/g;
  const re2 = /\b\w+\.kind\s*==\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) kinds.add(m[1]);
  while ((m = re2.exec(text))) kinds.add(m[1]);
  return kinds;
}

function scanTriggers(text: string) {
  const kinds = new Set<string>();
  const re = /->>\s*'kind'\s*=\s*'([^']+)'/g;
  const re2 = /@>\s*'\[\{\\"kind\\":\\"([^\\"]+)\\"\\}\]'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) kinds.add(m[1]);
  while ((m = re2.exec(text))) kinds.add(m[1]);
  return kinds;
}

function loadContract(): ContractFile {
  const raw = readText(contractPath);
  return YAML.parse(raw) as ContractFile;
}

function ensureArtifactsDir() {
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
}

function generateMarkdown(contract: ContractFile) {
  const events = contract.events || {};
  const lines: string[] = [];
  lines.push("# Event Graph (Canonical)");
  lines.push("");
  lines.push("This file is generated from `docs/canonical/event_graph.yaml`.");
  lines.push("Do not edit manually.");
  lines.push("");
  lines.push("## Events");
  lines.push("");
  lines.push("| Event | Sources | Triggers | Jobs | UI Status | Depends On | Notes |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");

  const sorted = Object.keys(events).sort();
  for (const kind of sorted) {
    const entry = events[kind] || {};
    const sources = entry.sources && entry.sources.length ? entry.sources.join(", ") : "—";
    const triggers = entry.triggers && entry.triggers.length ? entry.triggers.join(", ") : "—";
    const jobs = entry.jobs && entry.jobs.length ? entry.jobs.join(", ") : "—";
    const uiStatus = entry.ui?.status || "—";
    const depends = entry.depends_on && entry.depends_on.length ? entry.depends_on.join(", ") : "—";
    const notes = entry.deprecated ? "deprecated" : "";
    lines.push(
      `| ${kind} | ${sources} | ${triggers} | ${jobs} | ${uiStatus} | ${depends} | ${notes} |`
    );
  }

  fs.writeFileSync(mdPath, lines.join("\n") + "\n", "utf8");
}

function buildUsageMap(contract: ContractFile) {
  const emitted: Record<string, string[]> = {};
  const triggered: Record<string, string[]> = {};
  const ui: Record<string, string[]> = {};

  const fnFiles = walk(path.join(root, "supabase/functions"), [".ts"]);
  for (const file of fnFiles) {
    const text = readText(file);
    for (const kind of scanEmitters(text)) {
      emitted[kind] = emitted[kind] || [];
      emitted[kind].push(path.relative(root, file));
    }
  }

  const sqlFiles = walk(path.join(root, "supabase/migrations"), [".sql"]);
  for (const file of sqlFiles) {
    const text = readText(file);
    for (const kind of scanTriggers(text)) {
      triggered[kind] = triggered[kind] || [];
      triggered[kind].push(path.relative(root, file));
    }
  }

  const uiFiles = walk(path.join(root, "client/src"), [".ts", ".tsx"]);
  for (const file of uiFiles) {
    const text = readText(file);
    for (const kind of scanUi(text)) {
      ui[kind] = ui[kind] || [];
      ui[kind].push(path.relative(root, file));
    }
  }

  const contractEvents = contract.events || {};
  const kinds = new Set<string>([
    ...Object.keys(contractEvents),
    ...Object.keys(emitted),
    ...Object.keys(triggered),
    ...Object.keys(ui),
  ]);

  const usage: Record<string, EventUsage> = {};

  for (const kind of Array.from(kinds).sort()) {
    const declared = Boolean(contractEvents[kind]);
    const status: string[] = [];
    const contractEntry = contractEvents[kind];

    if (!declared) {
      status.push("ERROR_UNDECLARED_EVENT");
    }

    const hasEmit = Boolean(emitted[kind]?.length);
    if (declared && !hasEmit && !contractEntry?.allow_unemitted) {
      status.push("ERROR_DECLARED_BUT_NOT_EMITTED");
    }

    if (!declared && (triggered[kind]?.length || ui[kind]?.length)) {
      status.push("ERROR_REFERENCED_BUT_UNDECLARED");
    }

    usage[kind] = {
      emitted_in: emitted[kind] || [],
      triggered_in: triggered[kind] || [],
      ui_in: ui[kind] || [],
      declared,
      contract: contractEntry,
      status,
    };
  }

  return usage;
}

function main() {
  if (!fs.existsSync(contractPath)) {
    console.error(`Missing contract: ${contractPath}`);
    process.exit(1);
  }

  const contract = loadContract();
  generateMarkdown(contract);

  const usage = buildUsageMap(contract);
  ensureArtifactsDir();

  const mapPath = path.join(artifactsDir, `event_map.${mode}.json`);
  fs.writeFileSync(mapPath, JSON.stringify(usage, null, 2) + "\n", "utf8");

  const errors = Object.entries(usage)
    .filter(([, v]) => v.status.length > 0)
    .map(([k, v]) => ({ event: k, status: v.status }));

  const auditPath = path.join(artifactsDir, "event_audit.json");
  fs.writeFileSync(auditPath, JSON.stringify({ mode, errors, usage }, null, 2) + "\n", "utf8");

  if (comparePath) {
    const compareFull = path.isAbsolute(comparePath)
      ? comparePath
      : path.join(root, comparePath);
    if (!fs.existsSync(compareFull)) {
      console.error(`Compare file not found: ${compareFull}`);
      process.exit(3);
    }
    const other = JSON.parse(readText(compareFull)) as Record<string, EventUsage>;
    const all = new Set<string>([...Object.keys(usage), ...Object.keys(other)]);
    const diff: Record<string, unknown> = {};
    for (const kind of Array.from(all).sort()) {
      const a = usage[kind];
      const b = other[kind];
      diff[kind] = {
        local: a ? { emitted: !!a.emitted_in.length, triggered: !!a.triggered_in.length, ui: !!a.ui_in.length, declared: a.declared } : null,
        compare: b ? { emitted: !!b.emitted_in.length, triggered: !!b.triggered_in.length, ui: !!b.ui_in.length, declared: b.declared } : null,
      };
    }
    const diffPath = path.join(artifactsDir, "event_diff.json");
    fs.writeFileSync(diffPath, JSON.stringify(diff, null, 2) + "\n", "utf8");
  }

  if (errors.length > 0) {
    console.error(`Event audit failed with ${errors.length} error(s).`);
    for (const err of errors) {
      console.error(`- ${err.event}: ${err.status.join(", ")}`);
    }
    process.exit(2);
  }

  console.log(`Event audit OK. Wrote ${path.relative(root, mapPath)} and ${path.relative(root, auditPath)}`);
}

main();
