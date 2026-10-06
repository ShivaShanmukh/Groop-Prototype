import { describe, expect, it } from "vitest";
import { GUARDS, MAP, cell, type Vec2 } from "../src/level/map";
import { Facility } from "../src/world/facility";
import { findPath } from "../src/world/path";
import { forward, type PlayerInput } from "../src/world/types";
import type { GuardMode } from "../src/ai/guard";

const idle = (): PlayerInput => ({ forward: 0, strafe: 0, sprint: false, toggleCrouch: false, interact: false, turn: 0, pitch: 0 });
const DT = 1 / 60;

function run(f: Facility, secs: number, input: Partial<PlayerInput> = {}): void {
  for (let t = 0; t < secs && !f.outcome; t += DT) f.update(DT, { ...idle(), ...input });
}

/** Teleport the player and face a point. */
function place(f: Facility, p: Vec2, face?: Vec2): void {
  f.player.pos = { ...p };
  if (face) f.player.yaw = Math.atan2(-(face.x - p.x), -(face.z - p.z));
}

/** Walk the player along an A* path (as a perfect, guard-free courier). */
function walkTo(f: Facility, target: Vec2, maxSecs = 40): boolean {
  for (let t = 0; t < maxSecs && !f.outcome; t += DT) {
    const path = findPath(f.grid, f.player.pos, target) ?? [];
    const next = path.find((p) => Math.hypot(p.x - f.player.pos.x, p.z - f.player.pos.z) > 0.25) ?? target;
    if (Math.hypot(target.x - f.player.pos.x, target.z - f.player.pos.z) < 0.6) return true;
    f.player.yaw = Math.atan2(-(next.x - f.player.pos.x), -(next.z - f.player.pos.z));
    f.update(DT, { ...idle(), forward: 1 });
  }
  return false;
}

function interact(f: Facility, at: Vec2): void {
  place(f, f.player.pos, at);
  f.update(DT, { ...idle(), interact: true });
}

describe("level", () => {
  it("every floor cell is reachable from the entrance", () => {
    const f = new Facility();
    for (const d of f.grid.doors) d.locked = false;
    const seen = new Set<string>(["5,20"]);
    const queue: [number, number][] = [[5, 20]];
    while (queue.length) {
      const [c, r] = queue.shift()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${c + dc},${r + dr}`;
        if (!seen.has(k) && MAP[r + dr]?.[c + dc] && MAP[r + dr][c + dc] !== "#") {
          seen.add(k);
          queue.push([c + dc, r + dr]);
        }
      }
    }
    const floor = MAP.flatMap((row, r) => [...row].map((ch, c) => (ch !== "#" ? `${c},${r}` : ""))).filter(Boolean);
    expect(floor.filter((k) => !seen.has(k))).toEqual([]);
  });

  it("every guard can walk its whole route", () => {
    const f = new Facility();
    for (const g of GUARDS) {
      g.route.forEach((p, i) => {
        const q = g.route[(i + 1) % g.route.length];
        expect(findPath(f.grid, p, q), `${g.id} leg ${i}`).not.toBeNull();
      });
    }
  });
});

describe("guard state machine", () => {
  const modes = (f: Facility, i: number): GuardMode[] => f.guards[i].history.map((h) => h.to);

  it("patrol → suspicious → chase when the player stands in view, then catches", () => {
    const f = new Facility();
    const g = f.guards[0];
    f.guards.splice(1);
    place(f, { x: g.pos.x + 6, z: g.pos.z });
    g.yaw = Math.atan2(-6, 0); // face the player (east)
    run(f, 6);
    expect(modes(f, 0).slice(0, 2)).toEqual(["SUSPICIOUS", "CHASE"]);
    expect(f.outcome?.result).toBe("lost");
  });

  it("a player hugging furniture still gets caught (regression)", () => {
    const f = new Facility();
    f.guards.splice(1);
    f.camerasEnabled = false;
    const g = f.guards[0];
    g.pos = cell(5, 15);
    place(f, { x: 11, z: 29.05 }); // pressed against the reception desk
    g.mode = "CHASE";
    g.memory = 3;
    g.suspicion = 1;
    g.yaw = 0; // facing north, toward the player
    run(f, 6);
    expect(f.outcome?.result).toBe("lost");
  });

  it("A* on the 1 m grid is fast enough for frequent re-planning", () => {
    const f = new Facility();
    findPath(f.grid, cell(1, 12), cell(18, 1)); // warm up
    let t0 = performance.now();
    for (let i = 0; i < 100; i++) expect(findPath(f.grid, cell(1, 12), cell(18, 1))).not.toBeNull(); // reception → lab
    expect((performance.now() - t0) / 100).toBeLessThan(5);
    t0 = performance.now();
    for (let i = 0; i < 20; i++) expect(findPath(f.grid, cell(1, 12), cell(28, 1))).toBeNull(); // behind the locked door
    expect((performance.now() - t0) / 20).toBeLessThan(15);
  });

  it("chase → search → return → patrol after the player escapes", () => {
    const f = new Facility();
    f.guards.splice(1);
    const g = f.guards[0];
    g.mode = "CHASE";
    g.lastKnown = cell(10, 9);
    g.memory = 0.5;
    place(f, cell(5, 3)); // hidden in the security room
    f.grid.doors.forEach((d) => (d.locked = d.kind !== "door"));
    run(f, 40);
    expect(modes(f, 0)).toEqual(expect.arrayContaining(["SEARCH", "RETURN", "PATROL"]));
    const order = modes(f, 0);
    expect(order.indexOf("SEARCH")).toBeLessThan(order.indexOf("RETURN"));
    expect(order.indexOf("RETURN")).toBeLessThan(order.lastIndexOf("PATROL"));
  });

  it("hearing footsteps: suspicious → investigate → search", () => {
    const f = new Facility();
    f.guards.splice(1);
    const g = f.guards[0];
    g.pos = cell(10, 10);
    g.yaw = Math.PI / 2; // facing west
    g.pause = 100; // standing at a patrol stop
    place(f, cell(13, 10), cell(19, 10)); // 6m behind the guard, facing away
    run(f, 0.6, { forward: 1, sprint: true });
    place(f, cell(5, 3)); // vanish
    run(f, 12);
    expect(modes(f, 0).slice(0, 3)).toEqual(["SUSPICIOUS", "INVESTIGATE", "SEARCH"]);
    expect(g.history[0].why).toContain("footsteps");
  });

  it("crouching is silent: the same approach goes unheard", () => {
    const f = new Facility();
    f.guards.splice(1);
    const g = f.guards[0];
    g.pos = cell(10, 10);
    g.yaw = Math.PI / 2;
    g.pause = 100;
    place(f, cell(12, 10), cell(19, 10));
    run(f, 0.1, { toggleCrouch: true });
    run(f, 1.2, { forward: 1 });
    expect(g.history).toEqual([]);
  });
});

describe("world mechanics", () => {
  it("generator off → cameras offline, terminal dead, guards hear it", () => {
    const f = new Facility();
    expect(f.camerasActive).toBe(true);
    place(f, { x: 37.6, z: 31.5 });
    interact(f, { x: 37.6, z: 32.8 });
    expect(f.power).toBe(false);
    expect(f.camerasActive).toBe(false);
    expect(f.cameras.every((c) => c.mode === "off")).toBe(true);
    expect(f.guards.some((g) => g.history.some((h) => h.why.includes("generator")))).toBe(true);
  });

  it("camera sees the player → alarm on → guards investigate; terminal resets it", () => {
    const f = new Facility();
    const cam = f.cameras[1]; // corridor camera looking west
    place(f, { x: cam.pos.x - 6, z: cam.pos.z });
    cam.yaw = cam.baseYaw;
    run(f, 2);
    expect(f.alarm.active).toBe(true);
    // Every guard reacts. The restricted-wing guard can't get past the locked door, so it searches locally.
    expect(f.guards.every((g) => g.history.some((h) => h.why === "alarm raised"))).toBe(true);
    f.resetAlarm();
    expect(f.alarm.active).toBe(false);
  });

  it("full route: keycard → security door → drive → exit unlocks → escape", () => {
    const f = new Facility();
    f.guards.length = 0;
    f.camerasEnabled = false;
    const exit = f.grid.doors.find((d) => d.kind === "exit")!;
    expect(walkTo(f, { x: 37, z: 4.2 })).toBe(true);
    interact(f, { x: 37, z: 2.6 });
    expect(f.inventory.has("keycard")).toBe(true);
    expect(walkTo(f, cell(19, 9))).toBe(true); // keycard opens the security door
    expect(f.grid.doors.find((d) => d.kind === "secure")!.locked).toBe(false);
    expect(walkTo(f, cell(27, 5))).toBe(true);
    interact(f, cell(27, 6));
    expect(f.inventory.has("drive")).toBe(true);
    expect(exit.locked).toBe(false);
    expect(walkTo(f, cell(1, 9))).toBe(true);
    f.player.yaw = Math.PI / 2;
    run(f, 2, { forward: 1 });
    expect(f.outcome).toEqual({ result: "won", reason: "You escaped with the research." });
  });

  it("without the keycard the security door stays shut", () => {
    const f = new Facility();
    f.guards.length = 0;
    f.camerasEnabled = false;
    walkTo(f, cell(19, 9));
    f.player.yaw = -Math.PI / 2; // face east
    run(f, 2, { forward: 1 });
    expect(f.player.pos.x).toBeLessThan(40);
    const ahead = forward(f.player.yaw);
    expect(ahead.x).toBeGreaterThan(0.9);
  });
});
