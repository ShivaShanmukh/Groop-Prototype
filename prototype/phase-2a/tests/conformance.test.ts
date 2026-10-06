// Checks blueprint claims against the RUNNING game (prototype/phase-1 runtime, headless).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guardSightRange } from "../../phase-1/src/ai/perception";
import { CAMERAS, cell, type Vec2 } from "../../phase-1/src/level/map";
import { Facility } from "../../phase-1/src/world/facility";
import type { PlayerInput } from "../../phase-1/src/world/types";
import { BLUEPRINT_PATH } from "../src/build";
import type { Blueprint } from "../src/schema";

const bp = JSON.parse(readFileSync(BLUEPRINT_PATH, "utf8")) as Blueprint;
/** A property's value; parameter bindings ({ $param }) resolve to the Blueprint parameter's value. */
const prop = (id: string, comp: string, p: string): unknown => {
  const v = bp.entities.find((e) => e.id === id)?.components[comp]?.[p];
  if (v && typeof v === "object" && "$param" in v) return bp.parameters.find((x) => x.id === v.$param)?.value;
  return v;
};
const idle: PlayerInput = { forward: 0, strafe: 0, sprint: false, toggleCrouch: false, interact: false, turn: 0, pitch: 0 };
const DT = 1 / 60;
const run = (f: Facility, s: number, input: Partial<PlayerInput> = {}): void => { for (let t = 0; t < s && !f.outcome; t += DT) f.update(DT, { ...idle, ...input }); };
const face = (f: Facility, at: Vec2): void => { f.player.yaw = Math.atan2(-(at.x - f.player.pos.x), -(at.z - f.player.pos.z)); };
const use = (f: Facility, from: Vec2, at: Vec2): void => { f.player.pos = { ...from }; face(f, at); f.update(DT, { ...idle, interact: true }); };
const park = (f: Facility, except = -1): void => f.guards.forEach((g, i) => { if (i !== except) { g.pos = { x: -40 - i * 5, z: -40 }; g.route = [{ ...g.pos }]; g.routeIdx = 0; } });

describe("rules match runtime behaviour", () => {
  it("R01 + R02 + R03/R04 + R07: generator off → cameras off, terminal dead, guard sight = sightDark, guards in earshot react", () => {
    const f = new Facility();
    use(f, { x: 37.6, z: 31 }, { x: 37.6, z: 32.8 });
    expect(f.power).toBe(!prop("generator_01", "Power", "on"));
    run(f, 0.1);
    expect(f.cameras.every((c) => c.mode === "off")).toBe(true);
    expect(f.interactables.find((i) => i.id === "terminal")?.label(f)).toContain("no power");
    expect(guardSightRange(f.senses)).toBe(prop("guard_01", "Perception", "sightDark"));
    expect(f.guards.some((g) => g.history.some((h) => h.why === "heard the generator"))).toBe(true);
  });

  it("R08 / R09 / R10: sight multipliers are the blueprint's values", () => {
    const f = new Facility();
    const base = prop("guard_01", "Perception", "sightLit") as number;
    f.player.crouching = true;
    expect(guardSightRange(f.senses)).toBeCloseTo(base * (prop("guard_01", "Perception", "crouchMultiplier") as number));
    f.power = false;
    f.player.moving = false;
    expect(guardSightRange(f.senses)).toBeCloseTo((prop("guard_01", "Perception", "sightDark") as number) * 0.65 * (prop("guard_01", "Perception", "shadowMultiplier") as number));
    f.power = true;
    f.player.crouching = false;
    f.alarm.active = true;
    expect(guardSightRange(f.senses)).toBeCloseTo(base * (prop("guard_01", "Perception", "alarmMultiplier") as number));
  });

  it("R05 + R06: terminal switches cameras and resets the alarm only with power", () => {
    const f = new Facility();
    f.raiseAlarm({ x: 10, z: 20 }, "test");
    f.power = false;
    f.resetAlarm();
    f.setCameras(false);
    expect(f.alarm.active).toBe(true);
    expect(f.camerasEnabled).toBe(true);
    f.power = true;
    f.resetAlarm();
    f.setCameras(false);
    expect(f.alarm.active).toBe(false);
    expect(f.camerasActive).toBe(false);
  });

  it("R11 + T01: a camera detection raises the alarm and every non-chasing guard investigates ('alarm raised')", () => {
    const f = new Facility();
    const cam = CAMERAS[1].pos;
    f.player.pos = { x: cam.x - 6, z: cam.z };
    f.cameras[1].yaw = f.cameras[1].baseYaw;
    run(f, 2);
    expect(f.alarm.active).toBe(true);
    expect(f.guards.every((g) => g.history.some((h) => h.to === "INVESTIGATE" && h.why === "alarm raised"))).toBe(true);
  });

  it("R13: the alarm switches off after Alarm.duration seconds", () => {
    const f = new Facility();
    park(f);
    f.raiseAlarm({ x: 10, z: 20 }, "test");
    f.player.pos = cell(5, 3);
    const d = prop("alarm_01", "Alarm", "duration") as number;
    run(f, d - 0.5);
    expect(f.alarm.active).toBe(true);
    run(f, 1);
    expect(f.alarm.active).toBe(false);
  });

  it("R14 + R15 + R17 + R24: keycard → door unlocks within unlockRadius; drive → exit unlocks; crossing the line wins", () => {
    const f = new Facility();
    park(f);
    f.camerasEnabled = false;
    use(f, { x: 37, z: 4 }, { x: 37, z: 2.6 });
    expect(f.inventory.has("keycard")).toBe(true);
    const door = f.grid.doors.find((d) => d.kind === "secure");
    const r = prop("keycard_lock", "KeycardLock", "unlockRadius") as number;
    f.player.pos = { x: 41 - r - 0.2, z: 19 };
    run(f, 0.1);
    expect(door?.locked).toBe(true);
    f.player.pos = { x: 41 - r + 0.2, z: 19 };
    run(f, 0.1);
    expect(door?.locked).toBe(false);
    use(f, { x: 55, z: 11.8 }, { x: 55, z: 13 });
    expect(f.grid.doors.find((d) => d.kind === "exit")?.locked).toBe(false);
    f.player.pos = { x: (prop("exit_zone", "ExitZone", "lineX") as number) - 0.1, z: 19 };
    run(f, 0.05);
    expect(f.outcome?.result).toBe("won");
    expect(f.outcome?.reason).toBe(bp.outcomes.find((o) => o.result === "won")?.reason);
  });

  it("R23: a chasing guard that sees the player within catchDistance ends the run as lost", () => {
    const f = new Facility();
    park(f, 0);
    const g = f.guards[0];
    g.pos = { x: 20, z: 21 };
    g.yaw = Math.PI / 2;
    f.player.pos = { x: 14, z: 21 };
    run(f, 8);
    expect(f.outcome?.result).toBe("lost");
    expect(g.history.map((h) => h.to)).toContain("CHASE");
  });
});

describe("more rules against the runtime", () => {
  it("R10: during an alarm, guards move alarmSpeedMultiplier faster, suspect alarmSuspicionMultiplier faster and search searchTimeAlarm s", () => {
    const speedOver1s = (alarm: boolean): number => {
      const f = new Facility();
      park(f, 0);
      f.player.pos = cell(5, 3);
      f.alarm.active = alarm;
      f.alarm.timer = 999;
      const g = f.guards[0];
      run(f, 0.5);
      const a = { ...g.pos };
      run(f, 1);
      return Math.hypot(g.pos.x - a.x, g.pos.z - a.z);
    };
    expect(speedOver1s(true) / speedOver1s(false)).toBeCloseTo(prop("guard_01", "GuardBrain", "alarmSpeedMultiplier") as number, 1);

    const suspicionAfter = (alarm: boolean): number => {
      const f = new Facility();
      park(f, 0);
      const g = f.guards[0];
      g.pos = { x: 20, z: 21 };
      g.yaw = Math.PI / 2;
      g.pause = 100;
      f.alarm.active = alarm;
      f.alarm.timer = 999;
      f.player.pos = { x: 12, z: 21 };
      f.player.crouching = true; // at 8 m crouched the guard sees but suspicion builds slowly
      run(f, 0.2);
      return g.suspicion;
    };
    expect(suspicionAfter(true) / suspicionAfter(false)).toBeGreaterThan(1.9);

    const f = new Facility();
    park(f, 0);
    const g = f.guards[0];
    f.alarm.active = true;
    f.alarm.timer = 999;
    g.mode = "INVESTIGATE";
    g.lastKnown = { ...g.pos };
    f.player.pos = cell(5, 3);
    run(f, 0.05);
    expect(g.mode).toBe("SEARCH");
    expect(g.searchLeft).toBeCloseTo(prop("guard_01", "GuardBrain", "searchTimeAlarm") as number, 0);
  });

  it("R12: while the alarm is on, a camera that still sees you re-alerts guards every reportInterval s", () => {
    const f = new Facility();
    park(f);
    const cam = CAMERAS[1].pos;
    f.player.pos = { x: cam.x - 6, z: cam.z };
    f.cameras[1].yaw = f.cameras[1].baseYaw;
    run(f, 2);
    const first = f.alarm.lastReport;
    run(f, (prop("alarm_01", "Alarm", "reportInterval") as number) + 0.2);
    expect(f.alarm.lastReport).toBeGreaterThan(first);
    // Without a re-report the timer would be ≈ duration − 4.2 s; a reset keeps it above duration − reportInterval.
    expect(f.alarm.timer).toBeGreaterThan((prop("alarm_01", "Alarm", "duration") as number) - (prop("alarm_01", "Alarm", "reportInterval") as number));
  });

  it("R16 / R18: E on the locked security door (no keycard) and on the sealed exit gives the blueprint's messages", () => {
    const f = new Facility();
    park(f);
    f.camerasEnabled = false;
    use(f, { x: 39, z: 19 }, { x: 41, z: 19 });
    use(f, { x: 2.6, z: 19 }, { x: 1, z: 19 });
    const toasts = f.drain().filter((e) => e.type === "toast").map((e) => (e.type === "toast" ? e.text : ""));
    expect(toasts).toContain((bp.rules.find((r) => r.id === "R16_security_door_denies")?.actions[0] as { text: string }).text);
    expect(toasts).toContain((bp.rules.find((r) => r.id === "R18_exit_sealed")?.actions[0] as { text: string }).text);
  });

  it("R21 / R22: footsteps are heard within walkRadius walking and sprintRadius sprinting; crouching is silent", () => {
    const radius = (input: Partial<PlayerInput>): number | null => {
      const f = new Facility();
      park(f);
      f.player.pos = { x: 20, z: 21 };
      f.player.yaw = Math.PI / 2;
      if (input.toggleCrouch) f.update(DT, { ...idle, toggleCrouch: true });
      for (let i = 0; i < 40; i++) {
        f.update(DT, { ...idle, forward: 1, sprint: !!input.sprint });
        if (f.noises.length) return f.noises[0].radius;
      }
      return null;
    };
    expect(radius({})).toBe(prop("player", "Footsteps", "walkRadius"));
    expect(radius({ sprint: true })).toBe(prop("player", "Footsteps", "sprintRadius"));
    expect(radius({ toggleCrouch: true })).toBeNull();
  });
});

describe("guard state machine matches what guards actually do", () => {
  const machine = bp.stateMachines.find((m) => m.id === "sm_guard");
  if (!machine) throw new Error("no guard machine");
  const matches = (from: string, to: string, why: string): boolean =>
    machine.transitions.some((t) => (t.from === from || t.from === "*") && t.to === to && t.reason !== null && new RegExp(`^${t.reason.replace("{noise}", ".+")}$`).test(why));

  function observe(f: Facility, seconds: number, step: (t: number) => Partial<PlayerInput>): void {
    for (let t = 0; t < seconds && !f.outcome; t += DT) f.update(DT, { ...idle, ...step(t) });
  }

  it("every transition seen in scripted scenarios is in the blueprint, and they cover T01–T05 and T07–T11", () => {
    const seen: string[] = [];
    const collect = (f: Facility): void => f.guards.forEach((g) => g.history.forEach((h) => {
      expect(matches(h.from, h.to, h.why), `${h.from} → ${h.to} "${h.why}"`).toBe(true);
      const t = machine.transitions.find((x) => (x.from === h.from || x.from === "*") && x.to === h.to && x.reason && new RegExp(`^${x.reason.replace("{noise}", ".+")}$`).test(h.why));
      if (t) seen.push(t.id);
    }));
    // a) generator noise: hear → check it out → search → give up → back on patrol
    let f = new Facility();
    use(f, { x: 37.6, z: 31 }, { x: 37.6, z: 32.8 });
    f.player.pos = cell(5, 3);
    observe(f, 60, () => ({}));
    collect(f);
    // b) seen → chase → lost → search
    f = new Facility();
    park(f, 0);
    f.camerasEnabled = false;
    f.guards[0].pos = { x: 20, z: 21 };
    f.guards[0].yaw = Math.PI / 2;
    f.guards[0].pause = 100;
    f.player.pos = { x: 13, z: 21 };
    for (let t = 0; t < 8 && f.guards[0].mode !== "CHASE"; t += DT) f.update(DT, idle); // until the chase starts
    observe(f, 0.8, () => ({})); // past the reaction freeze
    f.player.pos = cell(5, 3); // slip away out of sight
    observe(f, 40, () => ({}));
    collect(f);
    // c) alarm alert
    f = new Facility();
    f.player.pos = { x: CAMERAS[1].pos.x - 6, z: CAMERAS[1].pos.z };
    f.cameras[1].yaw = f.cameras[1].baseYaw;
    observe(f, 2, () => ({}));
    collect(f);
    // d) a noise while searching → investigate again
    f = new Facility();
    park(f, 0);
    const g = f.guards[0];
    g.mode = "SEARCH";
    g.searchLeft = 20;
    g.lastKnown = { x: 5, z: 20 };
    g.pos = { x: 5, z: 20 };
    f.player.pos = { x: 13, z: 21 };
    f.player.yaw = -Math.PI / 2;
    face(f, { x: 40, z: 21 });
    observe(f, 0.6, () => ({ forward: 1, sprint: true }));
    collect(f);
    for (const id of ["T01_alarm_alert", "T02_suspicion_full", "T03_glimpse_patrol", "T04_hear_patrol", "T05_hear_while_searching", "T07_lost_sight_suspicious", "T08_investigated", "T09_lost_intruder", "T10_search_over", "T11_back_on_route"]) {
      expect(seen, id).toContain(id);
    }
  });

  it("random play (12 seeded runs × 90 s): no guard ever makes a transition the blueprint doesn't list", () => {
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const f = new Facility(seed);
      let turn = 0;
      observe(f, 90, (t) => {
        if (Math.floor(t * 2) !== Math.floor((t - DT) * 2)) turn = (f.rand() - 0.5) * 2;
        return { forward: 1, turn: turn * DT * 2, sprint: f.rand() < 0.3, toggleCrouch: f.rand() < 0.005, interact: f.rand() < 0.02 };
      });
      for (const g of f.guards) for (const h of g.history) {
        total++;
        expect(matches(h.from, h.to, h.why), `seed ${seed}: ${h.from} → ${h.to} "${h.why}"`).toBe(true);
      }
    }
    expect(total).toBeGreaterThan(10);
  });
});
