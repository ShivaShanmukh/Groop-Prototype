import type { GameParameters } from "../blueprint/parameters";
import type { GuardSpec, Vec2 } from "../level/map";
import type { GameEvent } from "../world/types";
import type { Mover } from "./move";

export type GuardMode = "PATROL" | "SUSPICIOUS" | "INVESTIGATE" | "CHASE" | "SEARCH" | "RETURN";
export const GUARD_MODES: GuardMode[] = ["PATROL", "SUSPICIOUS", "INVESTIGATE", "CHASE", "SEARCH", "RETURN"];

export interface Transition {
  t: number;
  from: GuardMode;
  to: GuardMode;
  why: string;
}

export interface Guard extends Mover {
  id: string;
  route: Vec2[];
  routeIdx: number;
  mode: GuardMode;
  modeTime: number;
  /** 0..1. Reaching 1 starts a chase. */
  suspicion: number;
  lastKnown: Vec2 | null;
  unseen: number;
  pause: number;
  memory: number;
  searchLeft: number;
  searchTarget: Vec2 | null;
  seesPlayer: boolean;
  history: Transition[];
}

/** Guard speeds per state (m/s). CHASE is Blueprint-controlled (params.guardChaseSpeed). */
export const SPEED: Record<Exclude<GuardMode, "CHASE">, number> = {
  PATROL: 1.8,
  SUSPICIOUS: 0,
  INVESTIGATE: 2.6,
  SEARCH: 2.0,
  RETURN: 2.0,
};

export function guardSpeed(mode: GuardMode, params: GameParameters): number {
  return mode === "CHASE" ? params.guardChaseSpeed : SPEED[mode];
}
export const CATCH_DISTANCE = 1.2;
/** Seconds a guard stands frozen after spotting you before giving chase. */
export const REACTION_TIME = 0.6;
/** Guards move this much faster while the alarm is on. */
export const ALARM_SPEED_MULTIPLIER = 1.2;
/** How suspicion builds while a guard sees the player, and drains when he does not. */
export const SUSPICION = {
  rate: 1.0,
  closeDistance: 2.5,
  closeMultiplier: 2,
  alarmMultiplier: 2,
  alertMultiplier: 1.3, // already investigating or searching
  decay: 0.25,
  afterChase: 0.3,
};
export const GUARD_TIMING = {
  chaseMemory: 2.5,
  unseenBeforeInvestigate: 1.4,
  search: 9,
  searchDuringAlarm: 15,
  patrolPause: 2,
  searchPause: 1.2,
  giveUpWhenUnseen: 0.5,
  directSteerDistance: 3,
  noiseRetargetDistance: 2,
  searchRadius: 6,
};

export function makeGuard(spec: GuardSpec): Guard {
  const start = spec.route[0];
  return {
    id: spec.id, route: spec.route, routeIdx: 1 % spec.route.length, mode: "PATROL", modeTime: 0,
    pos: { ...start }, yaw: 0, path: [], pathGoal: null, repathIn: 0, stuck: 0, moving: false,
    suspicion: 0, lastKnown: null, unseen: 0, pause: 0, memory: 0, searchLeft: 0, searchTarget: null,
    seesPlayer: false, history: [],
  };
}

export function setMode(g: Guard, to: GuardMode, why: string, time: number, events: GameEvent[]): void {
  if (g.mode === to) return;
  g.history.push({ t: time, from: g.mode, to, why });
  if (g.history.length > 40) g.history.shift();
  events.push({ type: "guard", id: g.id, from: g.mode, to, why });
  g.mode = to;
  g.modeTime = 0;
  g.pathGoal = null;
  g.pause = 0;
}

/** Called when the alarm goes off: every guard not already chasing heads for the source. */
export function alertGuard(g: Guard, source: Vec2, time: number, events: GameEvent[]): void {
  if (g.mode === "CHASE") return;
  g.lastKnown = { ...source };
  if (g.mode === "INVESTIGATE") g.pathGoal = null;
  else setMode(g, "INVESTIGATE", "alarm raised", time, events);
}
