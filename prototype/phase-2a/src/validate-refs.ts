import type { Blueprint, Entity, PropertyDef } from "./schema";

export interface RefContext {
  /** Entity ids "$self" stands for (state machines). */
  self?: string[];
  /** Fields allowed after "$event." */
  eventFields?: string[];
}

export type RefResult = { ok: true; prop?: PropertyDef } | { ok: false; reason: string };

/** Resolves a reference string against the blueprint. Never changes anything. */
export function resolveRef(bp: Blueprint, ref: string, ctx: RefContext): RefResult {
  const parts = ref.split(".");
  const head = parts[0];
  if (head === "$event") {
    if (parts.length !== 2) return { ok: false, reason: `"${ref}": use $event.<field>` };
    if (!ctx.eventFields) return { ok: false, reason: `"${ref}": no triggering event here` };
    return ctx.eventFields.includes(parts[1]) ? { ok: true } : { ok: false, reason: `"${ref}": the triggering event has no field "${parts[1]}" (has: ${ctx.eventFields.join(", ") || "none"})` };
  }

  let targets: Entity[];
  if (head === "$self") {
    if (!ctx.self) return { ok: false, reason: `"${ref}": $self is only valid inside a state machine` };
    targets = bp.entities.filter((e) => ctx.self?.includes(e.id));
  } else if (head.startsWith("@")) {
    const kind = head.slice(1);
    targets = bp.entities.filter((e) => e.kind === kind);
    if (!targets.length) return { ok: false, reason: `"${ref}": no entities of kind "${kind}"` };
  } else {
    const e = bp.entities.find((x) => x.id === head);
    if (!e) {
      const isOther = [...bp.events, ...bp.rules, ...bp.stateMachines].some((x) => x.id === head);
      return isOther && parts.length === 1 ? { ok: true } : { ok: false, reason: `${head} does not exist.` };
    }
    targets = [e];
  }
  if (parts.length === 1) return { ok: true };

  const [, component, property, sub] = parts;
  if (!bp.componentTypes[component]) return { ok: false, reason: `"${ref}": unknown component type "${component}"` };
  const missing = targets.filter((e) => !e.components[component]).map((e) => e.id);
  if (missing.length) return { ok: false, reason: `"${ref}": ${missing.join(", ")} ha${missing.length > 1 ? "ve" : "s"} no ${component} component` };
  if (property === undefined) return { ok: true };
  const prop = bp.componentTypes[component].properties[property];
  if (!prop) return { ok: false, reason: `"${ref}": component ${component} has no property "${property}"` };
  if (sub !== undefined) {
    if (prop.type !== "vec2" || (sub !== "x" && sub !== "z") || parts.length > 4) return { ok: false, reason: `"${ref}": only vec2 properties have .x / .z` };
  }
  return { ok: true, prop };
}
