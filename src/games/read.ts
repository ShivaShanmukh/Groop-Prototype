import type { BpObject, BpValue } from "./types";

/**
 * Tiny readers so runtimes can turn untyped blueprint data into typed
 * config without casts. Missing or wrong-typed values fall back safely.
 */
export function obj(o: BpObject, key: string): BpObject {
  const v = o[key];
  return typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
}

export function num(o: BpObject, key: string, fallback: number): number {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function str(o: BpObject, key: string, fallback: string): string {
  const v = o[key];
  return typeof v === "string" ? v : fallback;
}

export function bool(o: BpObject, key: string, fallback: boolean): boolean {
  const v = o[key];
  return typeof v === "boolean" ? v : fallback;
}

function toNumbers(v: BpValue): number[] {
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : [];
}

/** Reads [[x, y], ...] point lists. */
export function points(o: BpObject, key: string): { x: number; y: number }[] {
  const v = o[key];
  if (!Array.isArray(v)) return [];
  return v.map(toNumbers).filter((p) => p.length >= 2).map(([x, y]) => ({ x, y }));
}

/** Reads [[x, y, w, h], ...] rectangle lists. */
export function rects(o: BpObject, key: string): Rect[] {
  const v = o[key];
  if (!Array.isArray(v)) return [];
  return v
    .map(toNumbers)
    .filter((r) => r.length >= 4)
    .map(([x, y, w, h]) => ({ x, y, w, h }));
}

/** Entities of a given `type`, keyed by name, in blueprint order. */
export function entitiesOfType(entities: BpObject, type: string): [string, BpObject][] {
  return Object.entries(entities).flatMap(([name, value]) =>
    typeof value === "object" && !Array.isArray(value) && value.type === type
      ? [[name, value] as [string, BpObject]]
      : [],
  );
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
