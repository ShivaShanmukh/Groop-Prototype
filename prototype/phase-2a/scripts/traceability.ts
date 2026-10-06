// Generates TRACEABILITY.md from the blueprint, so the mapping can't drift or contain typos.
import { readFileSync, writeFileSync } from "node:fs";
import type { Blueprint, SourceRef } from "../src/schema";

const bp = JSON.parse(readFileSync("research-facility.blueprint.json", "utf8")) as Blueprint;
const s = (refs: SourceRef[]): string => refs.map((r) => `\`${r.file}\` → \`${r.symbol.replace(/\|/g, "\|")}\``).join("<br>");
const fid = (f: string): string => f.toUpperCase();
const lines: string[] = [
  "# Traceability: Blueprint → runtime → source",
  "",
  "Generated from `research-facility.blueprint.json` by `scripts/traceability.ts`. **Do not edit by hand.**",
  "",
  "Every source path is relative to `prototype/phase-1/`. The test `tests/blueprint.test.ts` checks that each file exists and contains the cited symbol.",
  "",
  "## Entities",
  "",
  "| Blueprint entity | Kind | Runtime object | Source |",
  "|---|---|---|---|",
  ...bp.entities.filter((e) => e.kind !== "prop").map((e) => `| \`${e.id}\` | ${e.kind} | \`${e.runtime.object}\` | ${s(e.runtime.source)} |`),
  `| \`prop_01\` … \`prop_${bp.entities.filter((e) => e.kind === "prop").length}\` | prop | \`PROPS[0…${bp.entities.filter((e) => e.kind === "prop").length - 1}]\` | \`src/level/props.ts\` → \`export const PROPS\`<br>\`src/world/grid.ts\` → \`addProp\` |`,
  "",
  "## Rules",
  "",
  "| Rule | What it says | Fidelity | Source |",
  "|---|---|---|---|",
  ...bp.rules.map((r) => `| \`${r.id}\` | ${r.title} | ${fid(r.fidelity)} | ${s(r.source)} |`),
  "",
  "## State machines and transitions",
  "",
  ...bp.stateMachines.flatMap((m) => [
    `### ${m.name} (\`${m.id}\`): ${fid(m.fidelity)}`,
    "",
    `Applies to ${m.appliesTo.join(", ")} · state in \`${m.stateRef}\` · source ${s(m.source)}`,
    "",
    "| Transition | From → To | Logged reason | Fidelity | Source |",
    "|---|---|---|---|---|",
    ...m.transitions.map((t) => `| \`${t.id}\` | ${t.from} → ${t.to} | ${t.reason ? `"${t.reason}"` : "—"} | ${fid(t.fidelity)} | ${s(t.source)} |`),
    "",
  ]),
  "## Events",
  "",
  "| Event | Runtime | Source |",
  "|---|---|---|",
  ...bp.events.map((e) => `| \`${e.id}\` | ${e.runtimeType ? `GameEvent \`"${e.runtimeType}"\`` : "internal (not a GameEvent)"} | ${s(e.source)} |`),
  "",
  "## Objectives and outcomes",
  "",
  ...bp.objectives.map((o) => `- **${o.order}.** "${o.text}": ${s(o.source)}`),
  ...bp.outcomes.map((o) => `- **${o.result}:** "${o.reason}": ${s(o.source)}`),
  "",
];
writeFileSync("TRACEABILITY.md", lines.join("\n"));
console.log(`TRACEABILITY.md written (${lines.length} lines)`);
