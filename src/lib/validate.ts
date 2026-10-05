import type { Blueprint, Check } from "@/games/types";
import { getPath, isObject } from "./apply";

/**
 * Run a game's declared checks against a proposed blueprint.
 * Returns the first failure message, or null when the blueprint is valid.
 */
export function validate(bp: Blueprint, checks: Check[]): string | null {
  for (const check of checks) {
    if (check.kind === "ref") {
      const name = getPath(bp, check.from);
      const pool = getPath(bp, check.within);
      if (typeof name !== "string") continue;
      if (!isObject(pool) || !(name in pool)) return check.message;
    } else {
      const truthy = check.paths.filter((p) => {
        const v = getPath(bp, p);
        return v !== undefined && v !== false && v !== 0 && v !== "";
      });
      if (truthy.length > 1) return check.message;
    }
  }
  return null;
}
