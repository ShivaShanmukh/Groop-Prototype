import { DRIVE_POS, GENERATOR_POS, KEYCARD_POS, TERMINAL_POS, roomAt, type Vec2 } from "../level/map";
import { doorCentre } from "../world/doors";
import type { Facility } from "../world/facility";
import { angleDiff, dist, yawTo, type GameEvent } from "../world/types";

/**
 * Observes a playtest and records what the player did. READ-ONLY: it never
 * changes game state, so the game plays exactly the same with or without it.
 * All times are seconds of active play (title, pause and end screens excluded),
 * counted across every attempt in the session.
 */
export type Landmark = "keycard" | "generator" | "terminal" | "securityDoor" | "drive" | "exit";

export interface Attempt {
  n: number;
  start: number;
  end: number | null;
  outcome: "won" | "lost" | "abandoned" | null;
  reason: string;
}

export interface Session {
  id: string;
  startedAt: string;
  build: unknown;
  playSeconds: number;
  firstMovement: number | null;
  firstInteraction: { t: number; what: string } | null;
  /** First time each landmark was in view (≤ 10 m, in front, not behind a wall). */
  firstSeen: Partial<Record<Landmark, number>>;
  firstObjectiveDiscovery: number | null;
  firstSprint: number | null;
  firstCrouch: number | null;
  alarms: number;
  guardSightings: number;
  guardChases: number;
  deaths: number;
  generatorCuts: number;
  generatorRestarts: number;
  firstGeneratorCut: number | null;
  terminalOpens: number;
  terminalCameraToggles: number;
  terminalAlarmResets: number;
  keycardTaken: number | null;
  archiveReached: number | null;
  driveTaken: number | null;
  escaped: number | null;
  attempts: Attempt[];
}

const SIGHT = 10;
const VIEW = (45 * Math.PI) / 180;

export class Recorder {
  readonly s: Session;
  private f: Facility | null = null;

  constructor(build: unknown) {
    this.s = {
      id: new Date().toISOString().replace(/[:.]/g, "-"), startedAt: new Date().toISOString(), build,
      playSeconds: 0, firstMovement: null, firstInteraction: null, firstSeen: {}, firstObjectiveDiscovery: null,
      firstSprint: null, firstCrouch: null, alarms: 0, guardSightings: 0, guardChases: 0, deaths: 0,
      generatorCuts: 0, generatorRestarts: 0, firstGeneratorCut: null, terminalOpens: 0, terminalCameraToggles: 0,
      terminalAlarmResets: 0, keycardTaken: null, archiveReached: null, driveTaken: null, escaped: null, attempts: [],
    };
  }

  /** A new run began (first Start, or a restart). */
  attempt(f: Facility): void {
    const prev = this.s.attempts.at(-1);
    if (prev && prev.end === null) Object.assign(prev, { end: this.t, outcome: "abandoned", reason: "restarted" });
    this.f = f;
    this.s.attempts.push({ n: this.s.attempts.length + 1, start: this.t, end: null, outcome: null, reason: "" });
  }

  private get t(): number {
    return Math.round(this.s.playSeconds * 10) / 10;
  }

  /** The player pressed E on something. */
  interacted(what: string): void {
    this.s.firstInteraction ??= { t: this.t, what };
  }

  /** Called once per active frame, after the game has updated. */
  frame(dt: number, events: GameEvent[]): void {
    const f = this.f;
    if (!f) return;
    const s = this.s;
    s.playSeconds += dt;
    const p = f.player;
    if (p.moving) s.firstMovement ??= this.t;
    if (p.sprinting) s.firstSprint ??= this.t;
    if (p.crouching) s.firstCrouch ??= this.t;
    if (roomAt(p.pos)?.id === "archive") s.archiveReached ??= this.t;

    const secure = f.grid.doors.find((d) => d.kind === "secure");
    const exit = f.grid.doors.find((d) => d.kind === "exit");
    const marks: [Landmark, Vec2 | undefined][] = [
      ["keycard", f.inventory.has("keycard") ? undefined : KEYCARD_POS],
      ["generator", GENERATOR_POS],
      ["terminal", TERMINAL_POS],
      ["securityDoor", secure && doorCentre(secure)],
      ["drive", f.inventory.has("drive") ? undefined : DRIVE_POS],
      ["exit", exit && doorCentre(exit)],
    ];
    for (const [name, pos] of marks) {
      if (!pos || s.firstSeen[name] !== undefined) continue;
      const inFront = Math.abs(angleDiff(yawTo(p.pos, pos), p.yaw)) < VIEW;
      if (dist(p.pos, pos) <= SIGHT && inFront && f.grid.lineOfSight(p.pos, pos)) s.firstSeen[name] = this.t;
    }
    if (s.firstSeen.keycard !== undefined) s.firstObjectiveDiscovery ??= s.firstSeen.keycard;

    for (const e of events) {
      if (e.type === "alarm" && e.on) s.alarms += 1;
      if (e.type === "guard" && e.to === "SUSPICIOUS" && e.why === "glimpsed movement") s.guardSightings += 1;
      if (e.type === "spotted") s.guardChases += 1;
      if (e.type === "power" && !e.on) {
        s.generatorCuts += 1;
        s.firstGeneratorCut ??= this.t;
      }
      if (e.type === "power" && e.on) s.generatorRestarts += 1;
      if (e.type === "terminal") s.terminalOpens += 1;
      if (e.type === "cameras") s.terminalCameraToggles += 1;
      if (e.type === "toast" && e.text === "Alarm reset.") s.terminalAlarmResets += 1;
      if (e.type === "pickup" && e.item === "keycard") s.keycardTaken ??= this.t;
      if (e.type === "pickup" && e.item === "drive") s.driveTaken ??= this.t;
      if (e.type === "end") {
        if (e.outcome === "lost") s.deaths += 1;
        if (e.outcome === "won") s.escaped ??= this.t;
        const a = s.attempts.at(-1);
        if (a) Object.assign(a, { end: this.t, outcome: e.outcome, reason: e.reason });
      }
    }
  }
}
