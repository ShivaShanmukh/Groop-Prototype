import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Facility } from "../../phase-1/src/world/facility";
import { SCHEMA_VERSION, type Blueprint } from "./schema";
import { actorEntities } from "./extract/actors";
import { COMPONENT_TYPES } from "./extract/components";
import { events } from "./extract/events";
import { levelEntities } from "./extract/level";
import { GUARD_MACHINE } from "./extract/machine-guard";
import { OTHER_MACHINES } from "./extract/machines";
import { NOT_REPRESENTED, objectiveTexts, objectives, outcomes } from "./extract/objectives";
import { relationships } from "./extract/relationships";
import { GAMEPLAY_RULES } from "./extract/rules-gameplay";
import { PRESENTATION_RULES } from "./extract/rules-presentation";

const here = dirname(fileURLToPath(import.meta.url));
export const BLUEPRINT_PATH = resolve(here, "../research-facility.blueprint.json");

/**
 * Builds the blueprint FROM THE RUNTIME: a fresh Facility supplies the entities'
 * initial state, and runtime modules supply every constant. Nothing numeric is retyped.
 */
export function buildBlueprint(): Blueprint {
  // Phase 2B: `parameters` is AUTHORED in the Blueprint file and is the runtime's source for those
  // values. It is carried over verbatim, never regenerated from code.
  const existing = JSON.parse(readFileSync(BLUEPRINT_PATH, "utf8")) as Partial<Blueprint>;
  if (!Array.isArray(existing.parameters)) throw new Error("research-facility.blueprint.json has no `parameters` section. It is authoritative and must be authored, not generated.");
  const f = new Facility();
  const runtimeVersion = (JSON.parse(readFileSync(resolve(here, "../../phase-1/package.json"), "utf8")) as { version: string }).version;
  const entities = [...levelEntities(f), ...actorEntities(f)];
  const doorIds = entities.filter((e) => e.kind === "door").map((e) => e.id);
  const machines = [GUARD_MACHINE, ...OTHER_MACHINES.map((m) => (m.id === "sm_door" ? { ...m, appliesTo: doorIds } : m))];
  return {
    schemaVersion: SCHEMA_VERSION,
    game: {
      id: "research-facility",
      name: "The Research Facility",
      runtimeVersion,
      authority: { structure: "runtime", parameters: "blueprint" },
      units: "metres, seconds; angles in degrees unless a property says rad",
      generatedFrom: "prototype/phase-1/src (npm run build in prototype/phase-2a); `parameters` is authored and authoritative",
    },
    componentTypes: COMPONENT_TYPES,
    entities,
    events: events(doorIds),
    rules: [...GAMEPLAY_RULES, ...PRESENTATION_RULES],
    stateMachines: machines,
    relationships: relationships(f, entities),
    objectives: objectives(objectiveTexts(() => new Facility())),
    outcomes: outcomes(),
    notRepresented: NOT_REPRESENTED,
    parameters: existing.parameters,
  };
}

export const serialise = (b: Blueprint): string => `${JSON.stringify(b, null, 2)}\n`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = serialise(buildBlueprint());
  if (process.argv.includes("--check")) {
    const onDisk = readFileSync(BLUEPRINT_PATH, "utf8");
    if (onDisk !== text) {
      console.error("research-facility.blueprint.json is OUT OF DATE with the runtime. Run: npm run build");
      process.exit(1);
    }
    console.log("Blueprint matches the runtime.");
  } else {
    writeFileSync(BLUEPRINT_PATH, text);
    console.log(`Wrote ${BLUEPRINT_PATH}`);
  }
}
