import type { Blueprint, BpValue } from "@/games/types";
import { isObject } from "./apply";

export type DiffKind = "+" | "~" | "-";

export interface DiffLine {
  kind: DiffKind;
  path: string;
  before?: string;
  after?: string;
}

function isPoint(v: BpValue): boolean {
  return Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number");
}

/** One row for plain lists and point routes; one row per item for anything else. */
function isLeafArray(value: BpValue[]): boolean {
  if (value.every(isPoint)) return true;
  return value.every((v) => !isObject(v) && !Array.isArray(v));
}

export function formatValue(value: BpValue): string {
  if (typeof value === "boolean") return value ? "on" : "off";
  if (typeof value === "number") return String(Math.round(value * 100) / 100);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "none";
    if (value.every(isPoint)) {
      return value.map((v) => `(${formatValue(v)})`).join(" → ");
    }
    return value.map(formatValue).join(", ");
  }
  return "{…}";
}

/** Flatten a blueprint into ordered "path → display value" rows. */
export function flatten(bp: Blueprint): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (value: BpValue, path: string): void => {
    if (isObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        walk(child, path ? `${path}.${key}` : key);
      }
    } else if (Array.isArray(value) && !isLeafArray(value)) {
      value.forEach((child, i) => walk(child, `${path}.${i}`));
    } else {
      out.set(path, formatValue(value));
    }
  };
  walk(bp, "");
  return out;
}

export function diffBlueprints(before: Blueprint | null, after: Blueprint): DiffLine[] {
  if (!before) return [];
  const a = flatten(before);
  const b = flatten(after);
  const lines: DiffLine[] = [];
  for (const [path, value] of b) {
    const old = a.get(path);
    if (old === undefined) lines.push({ kind: "+", path, after: value });
    else if (old !== value) lines.push({ kind: "~", path, before: old, after: value });
  }
  for (const [path, value] of a) {
    // An empty list that gained items isn't "removed" — its items show as added.
    const becameContainer = [...b.keys()].some((k) => k.startsWith(`${path}.`));
    if (!b.has(path) && !becameContainer) lines.push({ kind: "-", path, before: value });
  }
  return lines;
}
