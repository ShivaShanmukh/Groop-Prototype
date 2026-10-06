// One measurement: the three deterministic bots, 30 runs each, against whatever the Blueprint FILE
// currently says. Runs in its own process (spawned by experiment.mts), so the Blueprint JSON is
// read fresh from disk: nothing is passed in, and no value is injected by the experiment.
// Run directly: (in prototype/phase-1) npx tsx ../phase-2b/probe.mts
import { summarise, sweepRuns, type BotKind } from "../phase-1/tests/bots";
import { defaultParameters } from "../phase-1/src/blueprint/parameters";
import { Facility } from "../phase-1/src/world/facility";

const kinds: BotKind[] = ["planned", "naive", "careful"];
const runs = Object.fromEntries(kinds.map((k) => [k, sweepRuns(k)])) as Record<BotKind, ReturnType<typeof sweepRuns>>;
console.log(
  JSON.stringify({
    // What the runtime actually received (read back from a live Facility, not from the file).
    runtimeParams: { ...new Facility(1).params },
    blueprintParams: { ...defaultParameters() },
    summaries: kinds.map((k) => summarise(k, runs[k])),
    runs,
  }),
);
