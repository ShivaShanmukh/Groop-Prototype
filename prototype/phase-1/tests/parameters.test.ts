// Phase 2B: Blueprint-controlled parameters — loading, validation, provenance, no duplicate values.
import { describe, expect, it } from "vitest";
import * as perception from "../src/ai/perception";
import * as guardState from "../src/ai/guard-state";
import * as cameras from "../src/world/cameras";
import * as facility from "../src/world/facility";
import * as player from "../src/world/player";
import { bootBlueprint, readOverrides } from "../src/blueprint/boot";
import { BlueprintError, PARAMETER_IDS, defaultParameters, loadParameters } from "../src/blueprint/parameters";
// The Blueprint FILE as raw text (independent of the JSON import the runtime uses).
import blueprintText from "../../phase-2a/research-facility.blueprint.json?raw";

type FileParam = { id: string; value: number; min: number; max: number; type: string };
const file = (): { parameters: FileParam[] } & Record<string, unknown> => JSON.parse(blueprintText);
const problems = (fn: () => unknown): string[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof BlueprintError) return e.problems;
    throw e;
  }
  throw new Error("expected a BlueprintError");
};

describe("loading", () => {
  it("loads every required parameter with exactly the Blueprint FILE's values", () => {
    const { params, provenance } = loadParameters();
    const onDisk = file().parameters;
    expect(Object.keys(params).sort()).toEqual([...PARAMETER_IDS].sort());
    for (const id of PARAMETER_IDS) expect(params[id], id).toBe(onDisk.find((p) => p.id === id)?.value);
    expect(defaultParameters()).toEqual(params);
    expect(Object.isFrozen(params)).toBe(true);
    // Provenance: every value points back at its exact location in the file, and lists its consumers.
    for (const p of provenance) {
      const i = Number(p.pointer.split("/")[2]);
      expect(onDisk[i].id).toBe(p.id);
      expect(onDisk[i].value).toBe(p.value);
      expect(p.source).toBe("blueprint");
      expect(p.consumers.length).toBeGreaterThan(0);
    }
  });

  it("required parameters: a Blueprint missing one is rejected by name", () => {
    const bp = file();
    bp.parameters = bp.parameters.filter((p) => p.id !== "alarmDuration");
    expect(problems(() => loadParameters({}, bp)).join("\n")).toContain("alarmDuration: required by the runtime but missing from the Blueprint.");
  });

  it("every parameter is a number with a declared min < max, and its value is inside it", () => {
    for (const p of file().parameters) {
      expect(p.type).toBe("number");
      expect(p.min).toBeLessThan(p.max);
      expect(p.value).toBeGreaterThanOrEqual(p.min);
      expect(p.value).toBeLessThanOrEqual(p.max);
    }
  });
});

describe("validation (rejects; never clamps)", () => {
  it("wrong type → clear message naming parameter, supplied value, expected type and range", () => {
    expect(problems(() => loadParameters({ guardSightRange: "far" }))).toContain(
      "INVALID_PARAMETER at parameters[0](guardSightRange): guardSightRange: supplied \"far\" — expected number, minimum 1, maximum 50.",
    );
    expect(problems(() => loadParameters({ guardChaseSpeed: null })).join()).toContain("guardChaseSpeed: supplied null — expected number");
    expect(problems(() => loadParameters({ alarmDuration: Number.NaN })).join()).toContain("alarmDuration: supplied NaN — expected number");
  });

  it("out of range → rejected, not clamped", () => {
    expect(problems(() => loadParameters({ guardSightRange: 0.5 })).join()).toContain("PARAMETER_OUT_OF_RANGE");
    expect(problems(() => loadParameters({ guardSightRange: 0.5 })).join()).toContain("guardSightRange: supplied 0.5 — expected number, minimum 1, maximum 50.");
    expect(problems(() => loadParameters({ cameraRange: 41 })).join()).toContain("cameraRange: supplied 41 — expected number, minimum 1, maximum 40.");
    // Boundaries are inclusive and pass through unchanged.
    expect(loadParameters({ guardSightRange: 1, cameraRange: 40 }).params).toMatchObject({ guardSightRange: 1, cameraRange: 40 });
  });

  it("an unknown parameter is rejected, and an override never touches the Blueprint", () => {
    const source = file();
    const before = JSON.stringify(source);
    expect(problems(() => loadParameters({ guardSpeed: 3 })).join()).toContain("guardSpeed: not a Blueprint parameter");
    const { provenance } = loadParameters({ guardSightRange: 6 }, source);
    expect(provenance.find((p) => p.id === "guardSightRange")).toMatchObject({ value: 6, blueprintValue: 11, source: "override" });
    expect(JSON.stringify(source)).toBe(before);
    expect(loadParameters().params.guardSightRange).toBe(11);
  });

  it("an entity bound to a parameter that does not exist is rejected", () => {
    const bp = file() as { entities: { components: Record<string, Record<string, unknown>> }[] } & ReturnType<typeof file>;
    const cam = bp.entities.find((e) => e.components.Camera)!;
    cam.components.Camera.range = { $param: "cameraReach" };
    expect(problems(() => loadParameters({}, bp)).join()).toContain("INVALID_REFERENCE");
  });

  it("the game's boot gate: URL overrides parse, and a bad value stops start-up instead of throwing", () => {
    expect(readOverrides("?debug&bp.guardSightRange=6&bp.cameraRange=abc&x=1")).toEqual({ guardSightRange: 6, cameraRange: "abc" });
    expect(bootBlueprint("?bp.guardSightRange=6")).toMatchObject({ ok: true, params: { guardSightRange: 6 } });
    const bad = bootBlueprint("?bp.guardSightRange=999");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.problems.join()).toContain("guardSightRange: supplied 999 — expected number, minimum 1, maximum 50.");
  });
});

describe("no duplicate values in the runtime", () => {
  it("the old hard-coded constants are gone", () => {
    expect(perception.SIGHT).not.toHaveProperty("lit");
    expect(guardState.SPEED).not.toHaveProperty("CHASE");
    expect(player.STEP_NOISE).not.toHaveProperty("sprint");
    expect(cameras).not.toHaveProperty("CAM_RANGE");
    expect(facility).not.toHaveProperty("ALARM_DURATION");
  });

  it("no runtime source file re-declares a controlled value", () => {
    const files = import.meta.glob<string>("../src/**/*.ts", { query: "?raw", import: "default", eager: true });
    expect(Object.keys(files).length).toBeGreaterThan(30);
    const banned = [/\blit:\s*11\b/, /\bCHASE:\s*4/, /\bsprint:\s*9\b/, /\bCAM_RANGE\b/, /\bALARM_DURATION\b/, /coneLen = 13\b/];
    const hits = Object.entries(files).flatMap(([f, text]) => banned.filter((re) => re.test(text)).map((re) => `${f}: ${re}`));
    expect(hits).toEqual([]);
  });
});
