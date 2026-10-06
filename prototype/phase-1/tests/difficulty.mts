// Difficulty probe: the three deterministic bots (tests/bots.ts), 30 runs each.
// Run: npx tsx tests/difficulty.mts        (add --json for machine-readable output)
import { BOT_LABEL, sweep, type BotKind } from "./bots";

const kinds: BotKind[] = ["planned", "naive", "careful"];
const results = kinds.map((k) => sweep(k));
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(results));
} else {
  for (const r of results) {
    console.log(
      `${BOT_LABEL[r.bot]}: won ${r.wins}/${r.runs}` +
        (r.avgWinTime !== null ? ` (avg ${r.avgWinTime.toFixed(0)}s)` : "") +
        `, caught ${r.caught}, timed out ${r.timeouts} · chases ${r.totalChases}, alarms ${r.totalAlarms}, ` +
        `first chase avg ${r.avgFirstChase?.toFixed(1) ?? "—"}s, avg survival ${r.avgSurvival.toFixed(1)}s`,
    );
  }
}
