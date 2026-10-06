// Phase 2B: the runtime RECEIVES each Blueprint parameter, and the system that consumes it changes
// behaviour when (and only when) the value changes. Values arrive through the real loader + validator.
import { describe, expect, it } from "vitest";
import { guardSees, guardSightRange } from "../src/ai/perception";
import { REACTION_TIME, setMode } from "../src/ai/guard-state";
import { loadParameters, type ParameterId } from "../src/blueprint/parameters";
import { cameraSees } from "../src/world/cameras";
import { Facility } from "../src/world/facility";
import type { Vec2 } from "../src/level/map";
import { dist, yawTo, type PlayerInput } from "../src/world/types";
import { sweepRuns } from "./bots";

const DT = 1 / 60;
const idle: PlayerInput = { forward: 0, strafe: 0, sprint: false, toggleCrouch: false, interact: false, turn: 0, pitch: 0 };
const make = (over: Partial<Record<ParameterId, number>> = {}): Facility => new Facility(1, loadParameters(over).params);

/** A floor point exactly `d` m from `from` with clear line of sight (searched, not hand-picked). */
function clearPoint(f: Facility, from: Vec2, d: number): Vec2 {
  for (let a = 0; a < 360; a += 5) {
    const p = { x: from.x + d * Math.sin((a * Math.PI) / 180), z: from.z + d * Math.cos((a * Math.PI) / 180) };
    if (!f.grid.hits(p.x, p.z, 0.3) && f.grid.lineOfSight(from, p)) return p;
  }
  throw new Error(`no clear point ${d} m from ${JSON.stringify(from)}`);
}

describe("the runtime receives each parameter", () => {
  it("Facility and its Senses carry exactly the validated values", () => {
    const f = make({ guardSightRange: 7, guardChaseSpeed: 3, sprintNoiseRadius: 12, alarmDuration: 30, cameraRange: 9 });
    expect(f.params).toEqual({ guardSightRange: 7, guardChaseSpeed: 3, sprintNoiseRadius: 12, alarmDuration: 30, cameraRange: 9 });
    expect(f.senses.params).toBe(f.params);
  });

  it("guardSightRange → guard perception (lit only; the dark range is not a parameter)", () => {
    for (const [sight, expected] of [[11, true], [6, false]] as const) {
      const f = make({ guardSightRange: sight });
      const g = f.guards[0];
      f.player.pos = clearPoint(f, g.pos, 8);
      g.yaw = yawTo(g.pos, f.player.pos);
      expect(guardSightRange(f.senses)).toBe(sight);
      expect(guardSees(g.pos, g.yaw, f.senses).seen, `sight ${sight} m, player at 8 m`).toBe(expected);
      f.power = false;
      expect(guardSightRange(f.senses)).toBe(5.5);
    }
  });

  it("guardChaseSpeed → how fast a chasing guard closes in", () => {
    const travelled = (speed: number): number => {
      const f = make({ guardChaseSpeed: speed });
      f.camerasEnabled = false;
      const g = f.guards[0];
      f.player.pos = clearPoint(f, g.pos, 8);
      g.lastKnown = { ...f.player.pos };
      setMode(g, "CHASE", "test", 0, []);
      for (let t = 0; t < REACTION_TIME + 0.05; t += DT) f.update(DT, idle); // guards pause before chasing
      expect(g.mode).toBe("CHASE");
      const start = { ...g.pos };
      for (let t = 0; t < 0.5; t += DT) f.update(DT, idle);
      return dist(start, g.pos);
    };
    const slow = travelled(2), fast = travelled(6);
    expect(slow).toBeGreaterThan(0.5);
    expect(fast / slow).toBeGreaterThan(2.4);
  });

  it("sprintNoiseRadius → the radius of sprinting footsteps", () => {
    for (const r of [9, 20]) {
      const f = make({ sprintNoiseRadius: r });
      const heard: number[] = [];
      for (let t = 0; t < 1.5; t += DT) {
        f.update(DT, { ...idle, forward: 1, sprint: true });
        heard.push(...f.noises.map((n) => n.radius));
      }
      expect(heard.length).toBeGreaterThan(0);
      expect(new Set(heard)).toEqual(new Set([r]));
    }
  });

  it("alarmDuration → how long the alarm lasts", () => {
    for (const secs of [5, 12]) {
      const f = make({ alarmDuration: secs });
      f.camerasEnabled = false;
      f.guards.forEach((g) => (g.pos = { x: 9999, z: 9999 }));
      f.raiseAlarm(f.player.pos, "test");
      expect(f.alarm.timer).toBe(secs);
      let t = 0;
      while (f.alarm.active && t < 100) (f.update(DT, idle), (t += DT));
      expect(t).toBeGreaterThan(secs - 0.1);
      expect(t).toBeLessThan(secs + 0.1);
    }
  });

  it("cameraRange → camera detection distance", () => {
    for (const [range, expected] of [[13, true], [6, false]] as const) {
      const f = make({ cameraRange: range });
      const c = f.cameras[0];
      f.player.pos = clearPoint(f, c.pos, 9);
      c.yaw = yawTo(c.pos, f.player.pos);
      expect(cameraSees(c, f.senses), `range ${range} m, player at 9 m`).toBe(expected);
    }
  });
});

describe("causality (in memory; the on-disk version is phase-2b/experiment.mts)", () => {
  it("changing one Blueprint value changes behaviour; restoring it restores the baseline exactly", () => {
    const baseline = sweepRuns("careful");
    const changed = sweepRuns("careful", (s) => new Facility(s, loadParameters({ guardSightRange: 6 }).params));
    const restored = sweepRuns("careful", (s) => new Facility(s, loadParameters().params));
    expect(changed).not.toEqual(baseline);
    expect(restored).toEqual(baseline);
  }, 60_000);
});
