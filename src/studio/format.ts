import type { BpValue } from "@/games/types";
import { isObject } from "@/lib/apply";

function humanize(segment: string): string {
  if (/^\d+$/.test(segment)) return `#${Number(segment) + 1}`;
  if (segment.includes("_")) return segment;
  return segment.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

/** "rules.onLostSight" → { section: "rules", label: "on lost sight" } */
export function splitPath(path: string): { section: string; label: string } {
  const [section = "", ...rest] = path.split(".");
  return { section: humanize(section), label: rest.map(humanize).join(" · ") || humanize(section) };
}

export function pathLabel(path: string): string {
  return path.split(".").map(humanize).join(" · ");
}

/** JSON with leaf arrays kept on one line, so coordinates stay readable. */
export function toJson(value: BpValue, indent = ""): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.every((v) => !isObject(v) && !Array.isArray(v))) return `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
    if (value.every((v) => Array.isArray(v))) return `[${value.map((v) => toJson(v)).join(", ")}]`;
    return `[\n${value.map((v) => inner + toJson(v, inner)).join(",\n")}\n${indent}]`;
  }
  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return `{\n${entries.map(([k, v]) => `${inner}"${k}": ${toJson(v, inner)}`).join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}
