import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLUEPRINT_PATH } from "../src/build";
import type { Blueprint } from "../src/schema";
import { validate, type ErrorCode } from "../src/validate";

const original = readFileSync(BLUEPRINT_PATH, "utf8");
const fresh = (): Blueprint => JSON.parse(original) as Blueprint;

/** Apply one corruption and return the error codes the validator reports. */
function codes(mutate: (b: Blueprint) => void): { codes: ErrorCode[]; messages: string[] } {
  const b = fresh();
  mutate(b);
  const errs = validate(b);
  return { codes: errs.map((e) => e.code), messages: errs.map((e) => e.message) };
}

describe("7. the validator rejects invalid blueprints", () => {
  it("a rule that references a camera that doesn't exist", () => {
    const r = codes((b) => b.rules.find((x) => x.id === "R02_cameras_need_power_and_switch")?.affects.push("camera_99"));
    expect(r.codes).toContain("INVALID_RULE_TARGET");
    expect(r.messages.join("\n")).toContain("camera_99 does not exist.");
  });

  it("a condition that reads a property of a missing entity", () => {
    const r = codes((b) => { b.rules[0].condition = { ref: "generator_99.Power.on" }; });
    expect(r.codes).toEqual(["INVALID_REFERENCE"]);
    expect(r.messages[0]).toBe("generator_99 does not exist.");
  });

  it("duplicate entity ids", () => {
    expect(codes((b) => { b.entities[5].id = b.entities[4].id; }).codes).toContain("DUPLICATE_ID");
  });

  it("missing required property", () => {
    expect(codes((b) => { delete (b.entities.find((e) => e.id === "camera_01")?.components.Camera as Record<string, unknown>).range; }).codes).toContain("MISSING_PROPERTY");
  });

  it("unknown component type", () => {
    expect(codes((b) => { (b.entities[0].components as Record<string, unknown>).Jetpack = { thrust: 9 }; }).codes).toContain("UNKNOWN_COMPONENT");
  });

  it("wrong property type and out-of-range enum", () => {
    const r = codes((b) => {
      const g = b.entities.find((e) => e.id === "generator_01");
      if (g) g.components.Power.on = "yes";
      const c = b.entities.find((e) => e.id === "camera_01");
      if (c) c.components.Camera.mode = "spinning";
    });
    expect(r.codes.filter((c) => c === "INVALID_TYPE")).toHaveLength(2);
  });

  it("a rule action that targets a non-property", () => {
    expect(codes((b) => { b.rules[0].actions.push({ do: "set", target: "generator_01.Power", value: { value: 1 } }); }).codes).toContain("INVALID_RULE_TARGET");
  });

  it("a state transition to a state that doesn't exist", () => {
    const r = codes((b) => { const t = b.stateMachines[0].transitions[0]; t.to = "DANCE"; });
    expect(r.codes).toContain("INVALID_TRANSITION");
  });

  it("malformed relationships (unknown type, missing end, self-loop, unknown 'via')", () => {
    const r = codes((b) => {
      b.relationships[0].type = "befriends" as never;
      b.relationships[1].to = "camera_99";
      b.relationships[2].to = b.relationships[2].from;
      b.relationships[3].via = ["R99_missing"];
    });
    expect(r.codes).toEqual(expect.arrayContaining(["INVALID_RELATIONSHIP", "INVALID_REFERENCE"]));
    expect(r.codes.length).toBeGreaterThanOrEqual(4);
  });

  it("unknown event, unknown predicate, wrong arity", () => {
    const r = codes((b) => {
      b.rules[0].trigger = { event: "ev_teleport" };
      b.rules[1].condition = { pred: "teleports" as never, args: [] };
      b.rules[2].condition = { pred: "sees", args: [{ ref: "player" }] };
    });
    expect(r.codes).toEqual(expect.arrayContaining(["INVALID_REFERENCE", "INVALID_EXPRESSION"]));
  });

  it("$event fields that the triggering event doesn't carry", () => {
    expect(codes((b) => { b.rules[0].condition = { ref: "$event.colour" }; }).codes).toEqual(["INVALID_REFERENCE"]);
  });

  it("not an object / missing sections / wrong schema version", () => {
    expect(validate(null)[0].code).toBe("MALFORMED");
    expect(validate({ schemaVersion: "x" })[0].code).toBe("MALFORMED");
    expect(codes((b) => { b.schemaVersion = "groop.blueprint/9"; }).codes).toEqual(["SCHEMA_VERSION"]);
  });

  it("never repairs or mutates the blueprint it checks", () => {
    const b = fresh();
    b.rules[0].affects.push("camera_99");
    const before = JSON.stringify(b);
    validate(b);
    validate(b);
    expect(JSON.stringify(b)).toBe(before);
  });
});
