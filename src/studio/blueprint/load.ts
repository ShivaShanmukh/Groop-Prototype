import raw from "../../../prototype/phase-2a/research-facility.blueprint.json";
import type { Blueprint } from "../../../prototype/phase-2a/src/schema";
import { validate, type ValidationError } from "../../../prototype/phase-2a/src/validate";

export type { Blueprint } from "../../../prototype/phase-2a/src/schema";
export type { ValidationError } from "../../../prototype/phase-2a/src/validate";

/** Blueprints the studio can inspect, by game id. Structure is generated from the runtime; `parameters` are authored here and read by the game. */
const BLUEPRINTS: Record<string, Blueprint> = {
  "research-facility": raw as unknown as Blueprint,
};

export function loadBlueprint(gameId: string): { blueprint: Blueprint; errors: ValidationError[] } | null {
  const blueprint = BLUEPRINTS[gameId];
  return blueprint ? { blueprint, errors: validate(blueprint) } : null;
}
