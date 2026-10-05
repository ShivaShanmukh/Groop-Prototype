import { angleDiff, dist, lineBlocked, moveCircle, type Vec } from "../geometry";
import type { Rect } from "../read";
import type { GuardCfg, RulesCfg } from "./config";

export type GuardMode = "patrol" | "chase" | "track" | "investigate" | "search" | "return";

export interface Guard {
  cfg: GuardCfg;
  pos: Vec;
  facing: number;
  mode: GuardMode;
  target: number;
  lastSeen: Vec | null;
  timer: number;
  stuck: number;
}

export const GUARD_RADIUS = 9;

export function makeGuard(cfg: GuardCfg): Guard {
  const start = cfg.patrol[0] ?? { x: 320, y: 200 };
  const next = cfg.patrol[1] ?? start;
  return {
    cfg,
    pos: { ...start },
    facing: Math.atan2(next.y - start.y, next.x - start.x),
    mode: "patrol",
    target: cfg.patrol.length > 1 ? 1 : 0,
    lastSeen: null,
    timer: 0,
    stuck: 0,
  };
}

export function canSee(g: Guard, p: Vec, walls: Rect[]): boolean {
  const d = dist(g.pos, p);
  if (d > g.cfg.visionRange) return false;
  const a = Math.atan2(p.y - g.pos.y, p.x - g.pos.x);
  if (Math.abs(angleDiff(a, g.facing)) > g.cfg.visionAngle / 2) return false;
  return !lineBlocked(g.pos, p, walls);
}

function turnToward(g: Guard, angle: number, rate: number, dt: number): void {
  const d = angleDiff(angle, g.facing);
  const step = rate * dt;
  g.facing += Math.abs(d) <= step ? d : Math.sign(d) * step;
}

/** Walk toward a point. Returns true on arrival or when stuck on a wall. */
function walkTo(g: Guard, to: Vec, speed: number, dt: number, walls: Rect[]): boolean {
  const d = dist(g.pos, to);
  if (d < 4) return true;
  const step = Math.min(d, speed * dt);
  const dx = ((to.x - g.pos.x) / d) * step;
  const dy = ((to.y - g.pos.y) / d) * step;
  const next = moveCircle(g.pos, GUARD_RADIUS, dx, dy, walls);
  const moved = dist(g.pos, next);
  g.stuck = moved < step * 0.2 ? g.stuck + dt : 0;
  g.pos = next;
  turnToward(g, Math.atan2(dy, dx), 6, dt);
  return g.stuck > 0.8;
}

function startReturn(g: Guard, walls: Rect[]): void {
  const pts = g.cfg.patrol;
  const order = pts
    .map((p, i) => ({ i, d: dist(g.pos, p) + (lineBlocked(g.pos, p, walls) ? 1000 : 0) }))
    .sort((a, b) => a.d - b.d);
  g.target = order[0]?.i ?? 0;
  g.mode = "return";
  g.stuck = 0;
}

function loseTrack(g: Guard, rules: RulesCfg, walls: Rect[]): void {
  if (rules.onLostSight === "investigateLastSeen" && g.lastSeen) {
    g.mode = "investigate";
    g.stuck = 0;
  } else {
    startReturn(g, walls);
  }
}

export function updateGuard(g: Guard, dt: number, player: Vec, walls: Rect[], rules: RulesCfg): void {
  if (canSee(g, player, walls)) {
    g.mode = "chase";
    g.lastSeen = { ...player };
    g.timer = rules.memorySeconds;
  } else if (g.mode === "chase") {
    if (rules.memorySeconds > 0) g.mode = "track";
    else loseTrack(g, rules, walls);
  } else if (g.mode === "track") {
    // Memory: the guard still "knows" where you are for a while.
    g.timer -= dt;
    g.lastSeen = { ...player };
    if (g.timer <= 0) loseTrack(g, rules, walls);
  }

  const pts = g.cfg.patrol;
  switch (g.mode) {
    case "chase":
    case "track":
      walkTo(g, player, g.cfg.chaseSpeed, dt, walls);
      break;
    case "investigate":
      if (!g.lastSeen || walkTo(g, g.lastSeen, g.cfg.speed * 1.3, dt, walls)) {
        g.mode = "search";
        g.timer = rules.investigateSeconds;
      }
      break;
    case "search":
      g.facing += 2.4 * dt;
      g.timer -= dt;
      if (g.timer <= 0) startReturn(g, walls);
      break;
    case "return":
    case "patrol": {
      const to = pts[g.target];
      if (!to) break;
      if (walkTo(g, to, g.cfg.speed, dt, walls)) {
        if (g.mode === "patrol") g.target = (g.target + 1) % pts.length;
        g.mode = "patrol";
        g.stuck = 0;
      }
      break;
    }
  }
}
