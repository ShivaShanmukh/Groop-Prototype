import { CELL, type Vec2 } from "../level/map";
import type { Door, Grid } from "./grid";
import { dist, type GameEvent } from "./types";

export interface Body {
  pos: Vec2;
  kind: "player" | "guard";
}

export function doorCentre(d: Door): Vec2 {
  return { x: d.col * CELL + CELL / 2, z: d.row * CELL + CELL / 2 };
}

export const OPEN_RADIUS = 2.4;
/** Opening/closing speed: fraction of fully open per second. */
export const SPEED = 3.5;

/** Sliding doors open for anyone allowed through and close once nobody is near. */
export function updateDoors(grid: Grid, bodies: Body[], dt: number, events: GameEvent[]): void {
  for (const d of grid.doors) {
    const c = doorCentre(d);
    const want = bodies.some((b) => {
      if (dist(b.pos, c) > OPEN_RADIUS) return false;
      if (d.locked) return false;
      return b.kind === "player" || d.kind !== "exit";
    });
    const before = d.open;
    d.open = Math.max(0, Math.min(1, d.open + (want ? SPEED : -SPEED) * dt));
    if (before === 0 && d.open > 0) events.push({ type: "door", open: true });
  }
}
