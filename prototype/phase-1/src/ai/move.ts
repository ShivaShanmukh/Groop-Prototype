import type { Vec2 } from "../level/map";
import type { Grid } from "../world/grid";
import { findPath } from "../world/path";
import { angleDiff, dist, yawTo } from "../world/types";

export const GUARD_RADIUS = 0.35;

/** Anything that walks the facility on A* paths. */
export interface Mover {
  pos: Vec2;
  yaw: number;
  path: Vec2[];
  pathGoal: Vec2 | null;
  repathIn: number;
  stuck: number;
  moving: boolean;
}

export function faceToward(m: Mover, target: Vec2, rate: number, dt: number): void {
  if (dist(m.pos, target) < 0.05) return;
  const d = angleDiff(yawTo(m.pos, target), m.yaw);
  m.yaw += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
}

/**
 * Walk toward `target` along an A* path, re-planning every `repath` seconds
 * or when the target moves. Returns true on arrival (or when no path exists).
 */
export function goTo(m: Mover, target: Vec2, speed: number, dt: number, grid: Grid, repath: number): boolean {
  m.repathIn -= dt;
  const goalMoved = !m.pathGoal || dist(m.pathGoal, target) > 0.75;
  if (goalMoved || m.repathIn <= 0) {
    m.path = findPath(grid, m.pos, target) ?? [];
    m.pathGoal = { ...target };
    m.repathIn = repath;
  }
  // Drop waypoints we've reached.
  while (m.path.length && dist(m.pos, m.path[0]) < 0.3) m.path.shift();
  const next = m.path[0];
  if (!next) {
    m.moving = false;
    return true;
  }
  const d = dist(m.pos, next);
  const step = Math.min(d, speed * dt);
  const dx = ((next.x - m.pos.x) / d) * step;
  const dz = ((next.z - m.pos.z) / d) * step;
  const before = m.pos;
  m.pos = grid.move(m.pos, GUARD_RADIUS, dx, dz);
  const moved = dist(before, m.pos);
  m.moving = moved > 0.001;
  m.stuck = moved < step * 0.25 ? m.stuck + dt : 0;
  if (m.stuck > 0.8) m.repathIn = 0;
  if (m.stuck > 3) {
    // Wedged for good (e.g. a door that won't open): give up on this target.
    m.stuck = 0;
    m.path = [];
    return true;
  }
  faceToward(m, next, 7, dt);
  return false;
}

/** Move straight at a target with wall sliding (no path). Returns true when touching it. */
export function steer(m: Mover, target: Vec2, speed: number, dt: number, grid: Grid): boolean {
  const d = dist(m.pos, target);
  if (d < 0.7) return true;
  const step = Math.min(d, speed * dt);
  const before = m.pos;
  m.pos = grid.move(m.pos, GUARD_RADIUS, ((target.x - m.pos.x) / d) * step, ((target.z - m.pos.z) / d) * step);
  m.moving = dist(before, m.pos) > 0.001;
  m.pathGoal = null; // re-plan if we drop back to path following
  faceToward(m, target, 9, dt);
  return false;
}
