import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUARD_MODES } from "../../phase-1/src/ai/guard-state";
import { BLUEPRINT_PATH, buildBlueprint, serialise } from "../src/build";
import { SCHEMA_VERSION, type Blueprint, type SourceRef } from "../src/schema";
import { validate } from "../src/validate";

const bp = JSON.parse(readFileSync(BLUEPRINT_PATH, "utf8")) as Blueprint;
const ids = new Set(bp.entities.map((e) => e.id));
const has = (type: string, from: string, to: string): boolean => bp.relationships.some((r) => r.type === type && r.from === from && r.to === to);

describe("blueprint file", () => {
  it("1. loads", () => {
    expect(bp.schemaVersion).toBe(SCHEMA_VERSION);
    expect(bp.game.authority).toEqual({ structure: "runtime", parameters: "blueprint" });
  });

  it("2. validates against the schema with zero errors", () => {
    expect(validate(bp)).toEqual([]);
  });

  it("is up to date with the runtime (regenerating gives the identical file)", () => {
    expect(serialise(buildBlueprint())).toBe(readFileSync(BLUEPRINT_PATH, "utf8"));
  });
});

describe("coverage", () => {
  it("3. every entity reference resolves (validator reports no INVALID_REFERENCE)", () => {
    expect(validate(bp).filter((e) => e.code === "INVALID_REFERENCE")).toEqual([]);
  });

  it("4. all major systems are represented", () => {
    for (const id of ["player", "generator_01", "camera_01", "camera_02", "camera_03", "camera_04", "terminal_01", "alarm_01", "keycard_01", "drive_01", "door_security", "door_exit", "guard_01", "guard_02", "guard_03", "area_archive", "lighting_01", "audio_01", "hud_01", "session", "exit_zone", "keycard_lock"]) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(bp.entities.filter((e) => e.kind === "area")).toHaveLength(8);
    expect(bp.entities.filter((e) => e.kind === "door")).toHaveLength(10);
    const player = bp.entities.find((e) => e.id === "player");
    expect(Object.keys(player?.components ?? {}).sort()).toEqual(["Footsteps", "Interactor", "Inventory", "Mover", "Posture", "Transform"]);
    expect(bp.objectives.map((o) => o.order)).toEqual([1, 2, 3]);
    expect(bp.outcomes.map((o) => o.result).sort()).toEqual(["lost", "won"]);
  });

  it("5. the guard state machine has exactly the runtime's guard states, and every state is reachable and left", () => {
    const sm = bp.stateMachines.find((m) => m.id === "sm_guard");
    expect(sm?.states.map((s) => s.id).sort()).toEqual([...GUARD_MODES].sort());
    for (const s of GUARD_MODES) {
      expect(sm?.transitions.some((t) => t.to === s), `into ${s}`).toBe(true);
      expect(sm?.transitions.some((t) => t.from === s || t.from === "*"), `out of ${s}`).toBe(true);
    }
  });

  it("6. cross-system relationships are represented", () => {
    expect(has("powers", "generator_01", "lighting_01")).toBe(true);
    for (const c of ["camera_01", "camera_02", "camera_03", "camera_04"]) {
      expect(has("disables", "generator_01", c)).toBe(true);
      expect(has("triggers", c, "alarm_01")).toBe(true);
      expect(has("controls", "terminal_01", c)).toBe(true);
    }
    expect(has("powers", "generator_01", "terminal_01")).toBe(true);
    for (const g of ["guard_01", "guard_02", "guard_03"]) {
      expect(has("degrades", "generator_01", g)).toBe(true);
      expect(has("alerts", "alarm_01", g)).toBe(true);
      expect(has("attracts", "generator_01", g)).toBe(true);
    }
    expect(has("unlocks", "keycard_01", "door_security")).toBe(true);
    expect(has("unlocks", "drive_01", "door_exit")).toBe(true);
    expect(has("resets", "terminal_01", "alarm_01")).toBe(true);
  });
});

describe("traceability", () => {
  const phase1 = resolve(BLUEPRINT_PATH, "../../phase-1");
  const refs: { where: string; ref: SourceRef }[] = [
    ...bp.entities.flatMap((e) => e.runtime.source.map((ref) => ({ where: e.id, ref }))),
    ...bp.events.flatMap((e) => e.source.map((ref) => ({ where: e.id, ref }))),
    ...bp.rules.flatMap((r) => r.source.map((ref) => ({ where: r.id, ref }))),
    ...bp.stateMachines.flatMap((m) => [...m.source, ...m.transitions.flatMap((t) => t.source)].map((ref) => ({ where: m.id, ref }))),
    ...bp.objectives.flatMap((o) => o.source.map((ref) => ({ where: o.id, ref }))),
    ...bp.outcomes.flatMap((o) => o.source.map((ref) => ({ where: o.id, ref }))),
    ...bp.notRepresented.flatMap((n) => n.source.map((ref) => ({ where: n.item, ref }))),
    ...bp.parameters.flatMap((p) => p.consumers.map((c) => ({ where: `param ${p.id}`, ref: c.source }))),
  ];

  it(`every source reference (${refs.length}) points at a real file containing the cited symbol`, () => {
    const broken = refs.filter(({ ref }) => {
      const file = resolve(phase1, ref.file);
      return !existsSync(file) || !readFileSync(file, "utf8").includes(ref.symbol);
    });
    expect(broken.map((b) => `${b.where}: ${b.ref.file} → ${b.ref.symbol}`)).toEqual([]);
  });

  it("every rule, transition and entity carries at least one source reference", () => {
    expect(bp.rules.filter((r) => !r.source.length)).toEqual([]);
    expect(bp.entities.filter((e) => !e.runtime.source.length)).toEqual([]);
    expect(bp.stateMachines.flatMap((m) => m.transitions).filter((t) => !t.source.length)).toEqual([]);
  });
});
