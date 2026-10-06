// Deterministic bots that play the full level (moved verbatim from difficulty.mts so the
// Phase 2B experiment can reuse them). Every guard and camera is live.
//   A planned — the intended stealth plan (sneak past the reception camera, cut the generator,
//               hide while guards investigate, crouch-walk the route, back off when faced).
//   B naive   — walks the route, never reacts.
//   C careful — waits for guards to look away; sprints to a hiding spot when noticed.
import { Facility } from "../src/world/facility";
import { findPath } from "../src/world/path";
import { angleDiff, dist, yawTo, type PlayerInput } from "../src/world/types";
import type { Vec2 } from "../src/level/map";

export type BotKind = "planned" | "naive" | "careful";
export const BOT_LABEL: Record<BotKind, string> = { planned: "Bot A (planned)", naive: "Bot B (naive)", careful: "Bot C (careful)" };

export interface RunResult {
  outcome: "won" | "caught" | "timeout";
  /** Game seconds when the run ended. */
  time: number;
  alarms: number;
  /** Total number of times any guard entered CHASE. */
  chases: number;
  /** Game seconds until the first guard entered CHASE, or null if never. */
  firstChase: number | null;
}

const DT = 1 / 60;
const idle: PlayerInput = { forward: 0, strafe: 0, sprint: false, toggleCrouch: false, interact: false, turn: 0, pitch: 0 };
const ROUTE: { to: Vec2; use?: Vec2 }[] = [
  { to: { x: 12.5, z: 25.2 } },
  { to: { x: 37, z: 4.2 }, use: { x: 37, z: 2.6 } },
  { to: { x: 39, z: 19 } },
  { to: { x: 55, z: 11.6 }, use: { x: 55, z: 13 } },
  { to: { x: 1.2, z: 19 } },
];
const HIDES: Vec2[] = [{ x: 3, z: 35 }, { x: 26, z: 29 }, { x: 22, z: 9 }, { x: 3, z: 7 }, { x: 44, z: 3 }, { x: 9, z: 41 }];
const PLAN: { to: Vec2; use?: Vec2; wait?: number; crouch?: boolean }[] = [
  { to: { x: 6, z: 35 }, crouch: true },
  { to: { x: 19, z: 34.5 }, crouch: true },
  { to: { x: 26.5, z: 33 }, crouch: true },
  { to: { x: 37.6, z: 31.4 }, use: { x: 37.6, z: 32.8 } },
  { to: { x: 26.5, z: 33 } },
  { to: { x: 4, z: 31 }, wait: 22, crouch: true },
  { to: { x: 12.5, z: 25.2 } },
  { to: { x: 29, z: 15 } },
  { to: { x: 37, z: 4.2 }, use: { x: 37, z: 2.6 } },
  { to: { x: 29, z: 15 } },
  { to: { x: 39, z: 19 } },
  { to: { x: 49, z: 15 } },
  { to: { x: 55, z: 11.6 }, use: { x: 55, z: 13 } },
  { to: { x: 49, z: 15 } },
  { to: { x: 39, z: 19 } },
  { to: { x: 1.2, z: 19 } },
];

const pathCache = new WeakMap<Facility, { to: Vec2; at: number; path: Vec2[] }>();
function step(f: Facility, to: Vec2, input: Partial<PlayerInput>): void {
  const p = f.player.pos;
  let c = pathCache.get(f);
  if (!c || dist(c.to, to) > 0.01 || f.time - c.at > 0.25) {
    c = { to, at: f.time, path: findPath(f.grid, p, to) ?? [] };
    pathCache.set(f, c);
  }
  const next = c.path.find((q) => dist(q, p) > 0.3) ?? to;
  f.player.yaw = Math.atan2(-(next.x - p.x), -(next.z - p.z));
  f.update(DT, { ...idle, forward: 1, ...input });
}

function exposed(f: Facility): boolean {
  return f.guards.some((g) => dist(g.pos, f.player.pos) < 12 && Math.abs(angleDiff(yawTo(g.pos, f.player.pos), g.yaw)) < 1.1 && f.grid.lineOfSight(g.pos, f.player.pos));
}

function result(f: Facility): RunResult {
  for (let t = 0; t < 3 && !f.outcome; t += DT) f.update(DT, { ...idle, forward: 1 });
  const chaseTimes = f.guards.flatMap((g) => g.history.filter((h) => h.to === "CHASE").map((h) => h.t));
  return {
    outcome: f.outcome?.result === "won" ? "won" : f.outcome ? "caught" : "timeout",
    time: f.time,
    alarms: f.stats.alarms,
    chases: chaseTimes.length,
    firstChase: chaseTimes.length ? Math.min(...chaseTimes) : null,
  };
}

function planned(f: Facility, delay: number): RunResult {
  for (let t = 0; t < delay; t += DT) f.update(DT, idle);
  let i = 0;
  let waitLeft = 0;
  for (let t = 0; t < 400 && !f.outcome && i < PLAN.length; t += DT) {
    const leg = PLAN[i];
    const chased = f.guards.some((g) => g.mode === "CHASE");
    const crouchWanted = !chased && (!f.power || !!leg.crouch);
    if (!chased && f.player.crouching !== crouchWanted) {
      f.update(DT, { ...idle, toggleCrouch: true });
      continue;
    }
    if (dist(f.player.pos, leg.to) < 0.6) {
      if (leg.use) {
        f.player.yaw = Math.atan2(-(leg.use.x - f.player.pos.x), -(leg.use.z - f.player.pos.z));
        f.update(DT, { ...idle, interact: true });
      }
      if (leg.wait && waitLeft <= 0) waitLeft = leg.wait;
      if (waitLeft > 0) {
        waitLeft -= DT;
        f.update(DT, idle);
        if (waitLeft > 0) continue;
      }
      i++;
      continue;
    }
    const back = i > 0 ? PLAN[i - 1].to : { x: 11, z: 41 };
    const chaser = f.guards.find((g) => g.mode === "CHASE");
    if (chaser) {
      const options = [{ x: 11, z: 41 }, ...PLAN.slice(0, i).map((l) => l.to), ...HIDES];
      const flee = options.reduce((a, b) => (dist(b, chaser.pos) > dist(a, chaser.pos) ? b : a));
      step(f, flee, { sprint: true });
      continue;
    }
    if (exposed(f)) {
      if (dist(f.player.pos, back) > 0.6) step(f, back, {});
      else f.update(DT, idle);
      continue;
    }
    step(f, leg.to, {});
  }
  return result(f);
}

function routeBot(f: Facility, careful: boolean, delay: number): RunResult {
  for (let t = 0; t < delay; t += DT) f.update(DT, idle);
  let leg = 0;
  let hideUntil = 0;
  let hide: Vec2 | null = null;
  for (let t = 0; t < 300 && !f.outcome; t += DT) {
    const alerted = f.guards.filter((g) => g.mode === "CHASE" || (g.seesPlayer && g.suspicion > 0.2));
    if (careful && alerted.length) {
      const threat = alerted[0].pos;
      hide = HIDES.reduce((a, b) => (dist(b, threat) - dist(b, f.player.pos) * 0.5 > dist(a, threat) - dist(a, f.player.pos) * 0.5 ? b : a));
      hideUntil = t + 6;
    }
    if (careful && hide && t < hideUntil) {
      if (dist(f.player.pos, hide) > 0.8) step(f, hide, { sprint: true });
      else f.update(DT, { ...idle, toggleCrouch: !f.player.crouching });
      continue;
    }
    hide = null;
    const l = ROUTE[leg];
    if (!l) break;
    if (dist(f.player.pos, l.to) < 0.6) {
      if (l.use) {
        f.player.yaw = Math.atan2(-(l.use.x - f.player.pos.x), -(l.use.z - f.player.pos.z));
        f.update(DT, { ...idle, interact: true });
      }
      leg++;
      continue;
    }
    if (careful && exposed(f)) {
      f.update(DT, idle);
      continue;
    }
    step(f, l.to, {});
  }
  return result(f);
}

/** One run. `make` builds the Facility for a seed (lets callers choose the game parameters). */
export function runBot(kind: BotKind, seed: number, delay: number, make: (seed: number) => Facility = (s) => new Facility(s)): RunResult {
  const f = make(seed);
  return kind === "planned" ? planned(f, delay) : routeBot(f, kind === "careful", delay);
}

export interface BotSummary {
  bot: BotKind;
  runs: number;
  wins: number;
  caught: number;
  timeouts: number;
  avgWinTime: number | null;
  totalChases: number;
  totalAlarms: number;
  /** Mean time to first chase over runs that had one. */
  avgFirstChase: number | null;
  runsWithoutChase: number;
  avgSurvival: number;
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** The standard 30-run sweep: seeds 1–10 × start delays 0, 4, 8 s. */
/** The standard 30 runs: seeds 1–10 × start delays 0/4/8 s, in a fixed order. */
export function sweepRuns(kind: BotKind, make?: (seed: number) => Facility): RunResult[] {
  const rs: RunResult[] = [];
  for (let seed = 1; seed <= 10; seed++) for (const delay of [0, 4, 8]) rs.push(runBot(kind, seed, delay, make));
  return rs;
}

export function sweep(kind: BotKind, make?: (seed: number) => Facility): BotSummary {
  return summarise(kind, sweepRuns(kind, make));
}

export function summarise(kind: BotKind, rs: RunResult[]): BotSummary {
  const firsts = rs.map((r) => r.firstChase).filter((x): x is number => x !== null);
  return {
    bot: kind,
    runs: rs.length,
    wins: rs.filter((r) => r.outcome === "won").length,
    caught: rs.filter((r) => r.outcome === "caught").length,
    timeouts: rs.filter((r) => r.outcome === "timeout").length,
    avgWinTime: mean(rs.filter((r) => r.outcome === "won").map((r) => r.time)),
    totalChases: rs.reduce((n, r) => n + r.chases, 0),
    totalAlarms: rs.reduce((n, r) => n + r.alarms, 0),
    avgFirstChase: mean(firsts),
    runsWithoutChase: rs.length - firsts.length,
    avgSurvival: mean(rs.map((r) => r.time)) ?? 0,
  };
}
