import type { GameParameters } from "../blueprint/parameters";
import type { Vec2 } from "../level/map";
import type { Grid } from "../world/grid";
import { angleDiff, dist, yawTo, type Noise, type PlayerState } from "../world/types";

/** What a guard (or camera) can know about the world this frame. */
export interface Senses {
  grid: Grid;
  player: PlayerState;
  power: boolean;
  alarm: boolean;
  noises: Noise[];
  rand: () => number;
  /** Blueprint-controlled parameters (Phase 2B). */
  params: GameParameters;
}

export const GUARD_FOV = (100 * Math.PI) / 180;
/** Inside this distance a standing player is noticed even from the side. */
export const PERIPHERAL = 1.8;
/** Guard sight multipliers and the dark range. The lit range is Blueprint-controlled (params.guardSightRange). */
export const SIGHT = { dark: 5.5, crouch: 0.65, shadow: 0.5, alarm: 1.35 };
/** Sound carries this fraction as far through walls. */
export const WALL_SOUND_FACTOR = 0.5;

/** How far a guard can see the player right now. */
export function guardSightRange(s: Senses): number {
  let r = s.power ? s.params.guardSightRange : SIGHT.dark; // lit range from the Blueprint; the dark range is fixed
  if (s.player.crouching) r *= SIGHT.crouch;
  // Crouched and still in the dark: you're a shadow.
  if (!s.power && s.player.crouching && !s.player.moving) r *= SIGHT.shadow;
  if (s.alarm) r *= SIGHT.alarm; // alerted guards look harder
  return r;
}

export interface Sighting {
  seen: boolean;
  /** 0..1: closer = stronger = suspicion builds faster. */
  strength: number;
  distance: number;
}

export function guardSees(pos: Vec2, yaw: number, s: Senses): Sighting {
  const p = s.player.pos;
  const d = dist(pos, p);
  const range = guardSightRange(s);
  const none = { seen: false, strength: 0, distance: d };
  if (d > range) return none;
  const inCone = Math.abs(angleDiff(yawTo(pos, p), yaw)) <= GUARD_FOV / 2;
  const peripheral = d < PERIPHERAL && !s.player.crouching;
  if (!inCone && !peripheral) return none;
  if (!s.grid.lineOfSight(pos, p)) return none;
  return { seen: true, strength: Math.max(0.15, 1 - d / range), distance: d };
}

/** Loudest noise this guard can hear. Walls halve how far a sound carries. */
export function hears(pos: Vec2, s: Senses): Noise | null {
  let best: Noise | null = null;
  let bestScore = 0;
  for (const n of s.noises) {
    const reach = s.grid.lineOfSight(pos, n.pos) ? n.radius : n.radius * WALL_SOUND_FACTOR;
    const d = dist(pos, n.pos);
    if (d <= reach && reach - d > bestScore) {
      best = n;
      bestScore = reach - d;
    }
  }
  return best;
}
