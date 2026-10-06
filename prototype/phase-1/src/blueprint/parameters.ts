import blueprintJson from "../../../phase-2a/research-facility.blueprint.json";
import type { Blueprint } from "../../../phase-2a/src/schema";
import { validate } from "../../../phase-2a/src/validate";
import { checkParameters } from "../../../phase-2a/src/validate-params";

/**
 * Blueprint-controlled gameplay parameters (Phase 2B).
 * The Blueprint file is the ONLY source of these values: the runtime has no copy of them.
 */
export const PARAMETER_IDS = ["guardSightRange", "guardChaseSpeed", "sprintNoiseRadius", "alarmDuration", "cameraRange"] as const;
export type ParameterId = (typeof PARAMETER_IDS)[number];
export type GameParameters = Readonly<Record<ParameterId, number>>;

export const BLUEPRINT_FILE = "prototype/phase-2a/research-facility.blueprint.json";

export interface Provenance {
  id: ParameterId;
  value: number;
  /** "blueprint" = the file's value; "override" = a temporary in-memory change (e.g. from the inspector). */
  source: "blueprint" | "override";
  file: string;
  /** JSON pointer to the value inside the Blueprint file. */
  pointer: string;
  blueprintValue: number;
  validated: true;
  consumers: { system: string; reads: string; file: string }[];
}

/** Thrown when the Blueprint (or an override) is invalid. The game must not start. */
export class BlueprintError extends Error {
  constructor(readonly problems: string[]) {
    super(`Blueprint invalid:\n${problems.join("\n")}`);
  }
}

/**
 * Load → validate the whole Blueprint → validate parameters (type + range, no clamping) → values.
 * `overrides` change values in an in-memory copy only; the file is never modified.
 */
export function loadParameters(
  overrides: Record<string, unknown> = {},
  source: unknown = blueprintJson,
): { params: GameParameters; provenance: Provenance[] } {
  const bp = structuredClone(source) as Blueprint;
  const problems: string[] = [];
  for (const [id, value] of Object.entries(overrides)) {
    const p = bp.parameters?.find((x) => x.id === id);
    if (!p) problems.push(`${id}: not a Blueprint parameter (known: ${PARAMETER_IDS.join(", ")}).`);
    else (p as { value: unknown }).value = value;
  }
  problems.push(...validate(bp).map((e) => `${e.code} at ${e.path}: ${e.message}`));
  problems.push(...checkParameters(bp, [...PARAMETER_IDS]).filter((e) => e.code === "MISSING_PARAMETER").map((e) => `${e.code}: ${e.message}`));
  if (problems.length) throw new BlueprintError(problems);

  const original = blueprintJson as unknown as Blueprint;
  const params = {} as Record<ParameterId, number>;
  const provenance: Provenance[] = [];
  for (const id of PARAMETER_IDS) {
    const i = bp.parameters.findIndex((x) => x.id === id);
    const p = bp.parameters[i];
    params[id] = p.value;
    provenance.push({
      id, value: p.value, source: id in overrides ? "override" : "blueprint", file: BLUEPRINT_FILE, pointer: `/parameters/${i}/value`,
      blueprintValue: original.parameters?.find((x) => x.id === id)?.value ?? p.value, validated: true,
      consumers: p.consumers.map((c) => ({ system: c.system, reads: c.reads, file: c.source.file })),
    });
  }
  return { params: Object.freeze(params), provenance };
}

let cached: GameParameters | null = null;

/** The Blueprint's own values (validated once). Used when a Facility is created without explicit parameters. */
export function defaultParameters(): GameParameters {
  cached ??= loadParameters().params;
  return cached;
}
