// Phase 2B round-trip experiment: Blueprint FILE → validator → runtime → behaviour → restore.
//   1. baseline  — the Blueprint as-is (guardSightRange 11)
//   2. changed   — the Blueprint FILE edited: guardSightRange 11 → 6 (one value, nothing else)
//   3. restored  — the original bytes written back (SHA-256 checked)
// Each measurement is a fresh process (probe.mts) that reads the file from disk.
// Run: (in prototype/phase-1) npx tsx ../phase-2b/experiment.mts
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const BP = resolve(here, "../phase-2a/research-facility.blueprint.json");
const EVIDENCE = resolve(here, "evidence");
const PARAM = "guardSightRange";
const NEW_VALUE = 6;

type Run = { outcome: string; time: number; alarms: number; chases: number; firstChase: number | null };
type Summary = { bot: string; wins: number; caught: number; totalChases: number; totalAlarms: number; avgFirstChase: number | null; runsWithoutChase: number; avgSurvival: number };
type Probe = { runtimeParams: Record<string, number>; blueprintParams: Record<string, number>; summaries: Summary[]; runs: Record<string, Run[]> };

const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
const probe = (label: string): Probe => {
  console.log(`· measuring ${label} (fresh process, reads the Blueprint file)…`);
  const out = execSync("npx tsx ../phase-2b/probe.mts", { cwd: resolve(here, "../phase-1"), encoding: "utf8", maxBuffer: 64 << 20 });
  const p = JSON.parse(out) as Probe;
  writeFileSync(resolve(EVIDENCE, `${label}.json`), `${JSON.stringify(p, null, 2)}\n`);
  return p;
};

const original = readFileSync(BP, "utf8");
const originalSha = sha(original);
const doc = JSON.parse(original) as { parameters: { id: string; value: number }[] };
if (`${JSON.stringify(doc, null, 2)}\n` !== original) throw new Error("Blueprint is not in canonical form; refusing to edit it.");
const param = doc.parameters.find((p) => p.id === PARAM);
if (!param) throw new Error(`${PARAM} missing from the Blueprint`);
const oldValue = param.value;
param.value = NEW_VALUE;
const changedText = `${JSON.stringify(doc, null, 2)}\n`;
const diff = original.split("\n").map((l, i) => [l, changedText.split("\n")[i]]).filter(([a, b]) => a !== b);

const restore = (): void => writeFileSync(BP, original);
process.on("SIGINT", () => { restore(); process.exit(130); });

const baseline = probe("baseline");
let changed: Probe;
writeFileSync(BP, changedText);
try {
  changed = probe("changed");
} finally {
  restore();
}
const restoredSha = sha(readFileSync(BP, "utf8"));
const restored = probe("restored");

// ---- comparisons ----
const phase2a = JSON.parse(readFileSync(resolve(EVIDENCE, "baseline-phase2a-hardcoded.json"), "utf8")) as Summary[];
const paired = Object.keys(baseline.runs).map((bot) => {
  const b = baseline.runs[bot], c = changed.runs[bot];
  return {
    bot,
    runsChanged: b.filter((r, i) => !isDeepStrictEqual(r, c[i])).length,
    outcomeChanged: b.filter((r, i) => r.outcome !== c[i].outcome).length,
    firstChaseLater: b.filter((r, i) => (c[i].firstChase ?? Infinity) > (r.firstChase ?? Infinity)).length,
    firstChaseEarlier: b.filter((r, i) => (c[i].firstChase ?? Infinity) < (r.firstChase ?? Infinity)).length,
    survivedLonger: b.filter((r, i) => c[i].time > r.time).length,
    survivedShorter: b.filter((r, i) => c[i].time < r.time).length,
  };
});
const checks = {
  fileEditTouchedOneLine: diff.length === 1,
  baselineRuntimeReceived11: baseline.runtimeParams[PARAM] === oldValue,
  changedRuntimeReceived6: changed.runtimeParams[PARAM] === NEW_VALUE,
  otherParamsUnchanged: Object.keys(baseline.runtimeParams).filter((k) => k !== PARAM).every((k) => baseline.runtimeParams[k] === changed.runtimeParams[k]),
  testA_baselineEqualsPhase2AHardcoded: isDeepStrictEqual(baseline.summaries, phase2a),
  behaviourChanged: !isDeepStrictEqual(baseline.runs, changed.runs),
  fileRestoredByteForByte: restoredSha === originalSha,
  restoredRuntimeReceived11: restored.runtimeParams[PARAM] === oldValue,
  restoredEqualsBaselineEveryRun: isDeepStrictEqual(restored.runs, baseline.runs),
  restoredEqualsBaselineSummaries: isDeepStrictEqual(restored.summaries, baseline.summaries),
};
const result = {
  parameter: PARAM, from: oldValue, to: NEW_VALUE, blueprint: "prototype/phase-2a/research-facility.blueprint.json",
  fileDiff: diff.map(([a, b]) => ({ before: a.trim(), after: b.trim() })), originalSha256: originalSha, restoredSha256: restoredSha,
  summaries: { baseline: baseline.summaries, changed: changed.summaries, restored: restored.summaries }, paired, checks,
};
writeFileSync(resolve(EVIDENCE, "experiment-result.json"), `${JSON.stringify(result, null, 2)}\n`);

const row = (s: Summary): string => `${s.bot.padEnd(8)} won ${String(s.wins).padStart(2)}/30  caught ${String(s.caught).padStart(2)}  chases ${String(s.totalChases).padStart(3)}  alarms ${String(s.totalAlarms).padStart(2)}  first chase ${s.avgFirstChase?.toFixed(1) ?? "—"}s  survival ${s.avgSurvival.toFixed(1)}s  no-chase runs ${s.runsWithoutChase}`;
for (const [k, p] of [["BASELINE (11)", baseline], [`CHANGED (${NEW_VALUE})`, changed], ["RESTORED (11)", restored]] as const) {
  console.log(`\n${k}  runtime received ${PARAM}=${p.runtimeParams[PARAM]}`);
  p.summaries.forEach((s) => console.log(`  ${row(s)}`));
}
console.log("\nPaired by seed+delay (changed vs baseline):");
paired.forEach((p) => console.log(`  ${JSON.stringify(p)}`));
console.log("\nChecks:");
for (const [k, v] of Object.entries(checks)) console.log(`  ${v ? "PASS" : "FAIL"}  ${k}`);
if (!Object.values(checks).every(Boolean)) process.exit(1);
