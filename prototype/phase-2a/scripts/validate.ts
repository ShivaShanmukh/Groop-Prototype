import { readFileSync } from "node:fs";
import { validate } from "../src/validate";

const file = process.argv[2] ?? "research-facility.blueprint.json";
const bp = JSON.parse(readFileSync(file, "utf8"));
const errs = validate(bp);
if (!errs.length) console.log(`VALID — ${file}`);
for (const e of errs) console.log(`${e.code}\n  ${e.path}\n  ${e.message}`);
console.log(`entities ${bp.entities?.length} · rules ${bp.rules?.length} · state machines ${bp.stateMachines?.length} · relationships ${bp.relationships?.length} · events ${bp.events?.length} · objectives ${bp.objectives?.length}`);
process.exit(errs.length ? 1 : 0);
