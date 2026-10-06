import { ENTITY_KINDS, FIDELITIES, PREDICATES, RELATIONSHIP_TYPES, SCHEMA_VERSION, type Action, type Blueprint, type Expr, type PropertyDef, type Value } from "./schema";
import { resolveRef, type RefContext } from "./validate-refs";
import { checkParameters } from "./validate-params";

export type ErrorCode =
  | "MALFORMED" | "SCHEMA_VERSION" | "DUPLICATE_ID" | "INVALID_REFERENCE" | "UNKNOWN_COMPONENT" | "MISSING_PROPERTY"
  | "UNKNOWN_PROPERTY" | "INVALID_TYPE" | "INVALID_KIND" | "INVALID_RULE_TARGET" | "INVALID_TRANSITION"
  | "INVALID_RELATIONSHIP" | "INVALID_EXPRESSION" | "INVALID_ACTION"
  | "INVALID_PARAMETER" | "PARAMETER_OUT_OF_RANGE" | "MISSING_PARAMETER";

export interface ValidationError {
  code: ErrorCode;
  path: string;
  message: string;
}

const ARITY: Record<string, number> = { sees: 2, hears: 1, within: 3, has: 2, arrived: 2, event: 1 };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isVec2 = (v: unknown): boolean => isObj(v) && typeof v.x === "number" && typeof v.z === "number";

function typeOk(def: PropertyDef, v: Value, bp: Blueprint): boolean {
  if (v === null) return !def.required;
  // A parameter binding: the value lives in `parameters`; only number properties can be bound.
  if (isObj(v) && "$param" in v) return def.type === "number" && (bp.parameters ?? []).some((p) => p.id === v.$param);
  switch (def.type) {
    case "number": return typeof v === "number" && Number.isFinite(v);
    case "boolean": return typeof v === "boolean";
    case "string": return typeof v === "string";
    case "enum": return typeof v === "string" && !!def.values?.includes(v);
    case "vec2": return isVec2(v);
    case "vec2[]": return Array.isArray(v) && v.every(isVec2);
    case "string[]": return Array.isArray(v) && v.every((s) => typeof s === "string");
    case "rect": return Array.isArray(v) && v.length === 4 && v.every((x) => typeof x === "number");
  }
}

/**
 * Deterministic validator. Reports every problem it finds; NEVER repairs or mutates the blueprint.
 */
export function validate(input: unknown): ValidationError[] {
  const errs: ValidationError[] = [];
  const err = (code: ErrorCode, path: string, message: string): void => void errs.push({ code, path, message });
  if (!isObj(input)) return [{ code: "MALFORMED", path: "$", message: "Blueprint must be a JSON object." }];
  const bp = input as unknown as Blueprint;
  for (const key of ["componentTypes", "entities", "events", "rules", "stateMachines", "relationships", "objectives", "outcomes", "parameters"] as const) {
    if (bp[key] === undefined) err("MALFORMED", key, `Missing section "${key}".`);
  }
  if (errs.length) return errs;
  if (bp.schemaVersion !== SCHEMA_VERSION) err("SCHEMA_VERSION", "schemaVersion", `Expected ${SCHEMA_VERSION}, got ${String(bp.schemaVersion)}.`);

  const seen = new Map<string, string>();
  const unique = (id: string, path: string): void => {
    if (seen.has(id)) err("DUPLICATE_ID", path, `Duplicate id "${id}" (also at ${seen.get(id)}).`);
    else seen.set(id, path);
  };

  bp.entities.forEach((e, i) => {
    const p = `entities[${i}](${e.id})`;
    unique(e.id, p);
    if (!/^[a-z][a-z0-9_]*$/.test(e.id)) err("MALFORMED", p, `Entity id "${e.id}" must be lower_snake_case.`);
    if (!(ENTITY_KINDS as readonly string[]).includes(e.kind)) err("INVALID_KIND", p, `Unknown entity kind "${e.kind}".`);
    if (!e.runtime?.source?.length) err("MALFORMED", p, "Entity has no runtime source reference.");
    for (const [name, values] of Object.entries(e.components ?? {})) {
      const type = bp.componentTypes[name];
      if (!type) { err("UNKNOWN_COMPONENT", `${p}.${name}`, `Unknown component type "${name}".`); continue; }
      for (const [prop, def] of Object.entries(type.properties)) {
        if (def.required && !(prop in values)) err("MISSING_PROPERTY", `${p}.${name}`, `Missing required property "${prop}".`);
      }
      for (const [prop, v] of Object.entries(values)) {
        const def = type.properties[prop];
        if (!def) err("UNKNOWN_PROPERTY", `${p}.${name}.${prop}`, `${name} has no property "${prop}".`);
        else if (!typeOk(def, v, bp)) {
          const bound = isObj(v) && "$param" in v;
          err(bound ? "INVALID_REFERENCE" : "INVALID_TYPE", `${p}.${name}.${prop}`, bound ? `Bound to parameter "${String(v.$param)}", which does not exist (or the property is not a number).` : `Expected ${def.type}${def.values ? ` (${def.values.join("|")})` : ""}, got ${JSON.stringify(v)}.`);
        }
      }
    }
  });

  const checkRef = (r: string, path: string, ctx: RefContext, code: ErrorCode = "INVALID_REFERENCE"): void => {
    const res = resolveRef(bp, r, ctx);
    if (!res.ok) err(code, path, res.reason);
  };
  const checkExpr = (x: Expr, path: string, ctx: RefContext): void => {
    if (!isObj(x)) return err("INVALID_EXPRESSION", path, "Expression must be an object.");
    if ("ref" in x) return checkRef(x.ref, path, ctx);
    if ("value" in x) return;
    if ("pred" in x) {
      if (!(PREDICATES as readonly string[]).includes(x.pred)) return err("INVALID_EXPRESSION", path, `Unknown predicate "${x.pred}".`);
      if (x.args.length !== ARITY[x.pred]) err("INVALID_EXPRESSION", path, `${x.pred} takes ${ARITY[x.pred]} argument(s), got ${x.args.length}.`);
      if (x.pred === "event") {
        const a = x.args[0];
        if (!a || !("ref" in a) || !bp.events.some((ev) => ev.id === a.ref)) err("INVALID_REFERENCE", path, `event(): ${a && "ref" in a ? a.ref : "?"} is not an event.`);
        return;
      }
      return x.args.forEach((a, i) => checkExpr(a, `${path}.args[${i}]`, ctx));
    }
    if ("op" in x) {
      const want = ["and", "or"].includes(x.op) ? -1 : x.op === "not" ? 1 : 2;
      if (want > 0 && x.args.length !== want) err("INVALID_EXPRESSION", path, `${x.op} takes ${want} argument(s).`);
      if (!["eq", "neq", "lt", "lte", "gt", "gte", "and", "or", "not"].includes(x.op)) return err("INVALID_EXPRESSION", path, `Unknown operator "${String(x.op)}".`);
      return x.args.forEach((a, i) => checkExpr(a, `${path}.args[${i}]`, ctx));
    }
    err("INVALID_EXPRESSION", path, "Expression must have ref, value, op or pred.");
  };
  const checkAction = (a: Action, path: string, ctx: RefContext): void => {
    switch (a.do) {
      case "set": case "scale": case "replace": {
        const res = resolveRef(bp, a.target, ctx);
        if (!res.ok || (!res.prop && !a.target.startsWith("$event"))) err("INVALID_RULE_TARGET", path, res.ok ? `"${a.target}" is not a property.` : res.reason);
        checkExpr(a.do === "set" ? a.value : a.do === "scale" ? a.by : a.with, `${path}.value`, ctx);
        return;
      }
      case "emit": if (!bp.events.some((e) => e.id === a.event)) err("INVALID_REFERENCE", path, `${a.event} does not exist.`); return;
      case "noise": checkRef(a.at, path, ctx, "INVALID_RULE_TARGET"); checkExpr(a.radius, `${path}.radius`, ctx); return;
      case "alertGuards": checkRef(a.source, path, ctx); return;
      case "give": checkRef(a.item, path, ctx); checkRef(a.to, path, ctx); return;
      case "endGame": case "message": case "feedback": return;
      default: err("INVALID_ACTION", path, `Unknown action "${String((a as { do: unknown }).do)}".`);
    }
  };

  const eventFields = (id: string): string[] | undefined => bp.events.find((e) => e.id === id)?.payload;
  bp.events.forEach((ev, i) => {
    unique(ev.id, `events[${i}]`);
    ev.emittedBy.forEach((id) => checkRef(id, `events[${i}](${ev.id}).emittedBy`, {}));
  });
  bp.rules.forEach((r, i) => {
    const p = `rules[${i}](${r.id})`;
    unique(r.id, p);
    if (!r.source?.length) err("MALFORMED", p, "Rule has no source reference.");
    if (!(FIDELITIES as readonly string[]).includes(r.fidelity)) err("INVALID_TYPE", `${p}.fidelity`, `Fidelity must be one of ${FIDELITIES.join(", ")}.`);
    const ctx: RefContext = {};
    if (r.trigger !== "frame") {
      ctx.eventFields = eventFields(r.trigger.event);
      if (!ctx.eventFields) err("INVALID_REFERENCE", `${p}.trigger`, `${r.trigger.event} does not exist.`);
    }
    if (r.condition) checkExpr(r.condition, `${p}.condition`, ctx);
    r.actions.forEach((a, j) => checkAction(a, `${p}.actions[${j}]`, ctx));
    r.affects.forEach((id) => checkRef(id, `${p}.affects`, ctx, "INVALID_RULE_TARGET"));
  });
  for (const e of checkParameters(bp)) err(e.code === "DUPLICATE_ID" ? "DUPLICATE_ID" : e.code, e.path, e.message);
  validateMachines(bp, unique, err, checkExpr, checkAction, eventFields);
  validateGraph(bp, unique, err, checkExpr);
  return errs;
}

type Err = (code: ErrorCode, path: string, message: string) => void;

function validateMachines(bp: Blueprint, unique: (id: string, p: string) => void, err: Err, checkExpr: (x: Expr, p: string, c: RefContext) => void, checkAction: (a: Action, p: string, c: RefContext) => void, eventFields: (id: string) => string[] | undefined): void {
  const noiseFields = eventFields("ev_noise") ?? [];
  bp.stateMachines.forEach((m, i) => {
    const p = `stateMachines[${i}](${m.id})`;
    unique(m.id, p);
    if (!m.appliesTo.length) err("INVALID_REFERENCE", p, "State machine applies to no entities.");
    m.appliesTo.forEach((id) => { if (!bp.entities.some((e) => e.id === id)) err("INVALID_REFERENCE", `${p}.appliesTo`, `${id} does not exist.`); });
    const states = new Set(m.states.map((s) => s.id));
    if (states.size !== m.states.length) err("DUPLICATE_ID", `${p}.states`, "Duplicate state id.");
    if (!states.has(m.initial)) err("INVALID_TRANSITION", p, `Initial state "${m.initial}" is not a state.`);
    const ctxBase: RefContext = { self: m.appliesTo };
    const sr = resolveRef(bp, m.stateRef, ctxBase);
    if (!sr.ok) err("INVALID_REFERENCE", `${p}.stateRef`, sr.reason);
    m.transitions.forEach((t, j) => {
      const tp = `${p}.transitions[${j}](${t.id})`;
      unique(t.id, tp);
      if (t.from !== "*" && !states.has(t.from)) err("INVALID_TRANSITION", tp, `From-state "${t.from}" does not exist in ${m.id}.`);
      if (!states.has(t.to)) err("INVALID_TRANSITION", tp, `To-state "${t.to}" does not exist in ${m.id}.`);
      const evRefs = JSON.stringify(t.when).match(/"pred":"event","args":\[\{"ref":"(\w+)"/g)?.map((s) => s.replace(/.*"ref":"/, "").replace(/"$/, "")) ?? [];
      const fields = [...evRefs.flatMap((id) => eventFields(id) ?? []), ...(JSON.stringify(t.when).includes('"pred":"hears"') ? noiseFields : [])];
      const ctx: RefContext = { ...ctxBase, eventFields: fields };
      checkExpr(t.when, `${tp}.when`, ctx);
      t.actions.forEach((a, k) => checkAction(a, `${tp}.actions[${k}]`, ctx));
    });
  });
}

function validateGraph(bp: Blueprint, unique: (id: string, p: string) => void, err: Err, checkExpr: (x: Expr, p: string, c: RefContext) => void): void {
  const implementers = new Set([...bp.rules.map((r) => r.id), ...bp.stateMachines.flatMap((m) => m.transitions.map((t) => t.id))]);
  bp.relationships.forEach((r, i) => {
    const p = `relationships[${i}](${r.id})`;
    unique(r.id, p);
    if (!(RELATIONSHIP_TYPES as readonly string[]).includes(r.type)) err("INVALID_RELATIONSHIP", p, `Unknown relationship type "${r.type}".`);
    for (const end of [r.from, r.to]) if (!bp.entities.some((e) => e.id === end)) err("INVALID_REFERENCE", p, `${end} does not exist.`);
    if (r.from === r.to) err("INVALID_RELATIONSHIP", p, "Relationship connects an entity to itself.");
    r.via.forEach((v) => { if (!implementers.has(v)) err("INVALID_REFERENCE", `${p}.via`, `${v} does not exist (no rule or transition with that id).`); });
  });
  const orders = new Set<number>();
  bp.objectives.forEach((o, i) => {
    const p = `objectives[${i}](${o.id})`;
    unique(o.id, p);
    if (orders.has(o.order)) err("DUPLICATE_ID", p, `Duplicate objective order ${o.order}.`);
    orders.add(o.order);
    checkExpr(o.completeWhen, `${p}.completeWhen`, {});
  });
  bp.outcomes.forEach((o, i) => {
    unique(o.id, `outcomes[${i}]`);
    checkExpr(o.when, `outcomes[${i}](${o.id}).when`, {});
  });
}
