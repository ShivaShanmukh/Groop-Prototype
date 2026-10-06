/**
 * GROOP Game Blueprint schema, v0.1.
 * Minimal on purpose: only what is needed to describe The Research Facility.
 * The runtime (prototype/phase-1/src) is authoritative; a blueprint DESCRIBES it.
 */
export const SCHEMA_VERSION = "groop.blueprint/0.1";

/** Where in the real code something lives. `file` is relative to prototype/phase-1/. */
export interface SourceRef {
  file: string;
  /** An identifier that appears in that file (checked by tests). */
  symbol: string;
}

/**
 * How sure we are that this element matches the running game.
 *   verified       read in the code AND exercised against the running game by an automated test
 *   approximation  matches the code, but the blueprint simplifies it (see the element's note)
 *   code-read      read in the code, not covered by an automated behavioural test
 */
export const FIDELITIES = ["verified", "approximation", "code-read"] as const;
export type Fidelity = (typeof FIDELITIES)[number];

export type Vec2 = { x: number; z: number };
/** A property whose value lives in `parameters` (one authoritative value). */
export type ParamBinding = { $param: string };
export type Value = number | string | boolean | null | Vec2 | ParamBinding | Value[];

/**
 * A Blueprint-controlled gameplay parameter (Phase 2B). For these, the BLUEPRINT is the
 * authoritative source: the runtime reads the value from here, validated, at startup.
 */
export interface Parameter {
  id: string;
  name: string;
  description: string;
  type: "number";
  unit: string;
  value: number;
  min: number;
  max: number;
  /** Who reads it at runtime: the system, the function, and the file. */
  consumers: { system: string; reads: string; source: SourceRef }[];
}
export type PropType = "number" | "boolean" | "string" | "enum" | "vec2" | "vec2[]" | "string[]" | "rect";

export interface PropertyDef {
  type: PropType;
  description: string;
  unit?: string;
  values?: string[];
  required?: boolean;
}

export interface ComponentType {
  description: string;
  properties: Record<string, PropertyDef>;
}

export const ENTITY_KINDS = [
  "level", "area", "door", "player", "guard", "camera", "generator", "terminal", "alarm", "item", "prop", "system",
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export interface Entity {
  id: string;
  name: string;
  kind: EntityKind;
  /** component type name → property values (initial state, read from the runtime) */
  components: Record<string, Record<string, Value>>;
  /** The object in the running game this entity corresponds to. */
  runtime: { object: string; source: SourceRef[] };
}

/**
 * Expressions. A `ref` is one of:
 *   "entityId" | "entityId.Component.property" (".x"/".z" for vec2)
 *   "@kind.Component.property"   every entity of that kind (e.g. "@guard.Perception.sightLit")
 *   "$self.Component.property"   the entity a state machine is running on
 *   "$event.field"               a field of the event that triggered the rule
 */
export type Expr =
  | { ref: string }
  | { value: number | string | boolean | null }
  | { op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte"; args: [Expr, Expr] }
  | { op: "and" | "or"; args: Expr[] }
  | { op: "not"; args: [Expr] }
  | { pred: Predicate; args: Expr[] };

/** Named checks the runtime performs in code (perception, geometry, inventory). */
export const PREDICATES = ["sees", "hears", "within", "has", "arrived", "event"] as const;
export type Predicate = (typeof PREDICATES)[number];

export type Action =
  | { do: "set"; target: string; value: Expr }
  /** While the rule's condition holds, the target property is multiplied by `by`. */
  | { do: "scale"; target: string; by: Expr }
  /** While the rule's condition holds, the target property uses `with` instead. */
  | { do: "replace"; target: string; with: Expr }
  | { do: "give"; item: string; to: string }
  | { do: "emit"; event: string }
  | { do: "noise"; at: string; radius: Expr; source: string }
  | { do: "alertGuards"; source: string }
  | { do: "endGame"; outcome: "won" | "lost"; reason: string }
  | { do: "message"; text: string }
  | { do: "feedback"; channel: "audio" | "visual" | "hud"; cue: string };

export interface EventDef {
  id: string;
  description: string;
  /** Entity ids that can emit it. */
  emittedBy: string[];
  /** Fields a rule can read as $event.<field>. */
  payload: string[];
  /** The runtime `GameEvent.type`, or null when the event is internal (not a GameEvent). */
  runtimeType: string | null;
  source: SourceRef[];
}

export interface Rule {
  id: string;
  title: string;
  category: "gameplay" | "presentation";
  /** Event that triggers the rule, or "frame" for checks evaluated every update. */
  trigger: { event: string } | "frame";
  condition?: Expr;
  actions: Action[];
  /** Entity ids whose behaviour this rule changes. */
  affects: string[];
  source: SourceRef[];
  fidelity: Fidelity;
  note?: string;
}

export interface Transition {
  id: string;
  from: string | "*";
  to: string;
  /** Lower runs first; the runtime checks transitions in this order each frame. */
  priority: number;
  when: Expr;
  actions: Action[];
  /** The exact reason string the runtime logs for this transition ({noise} is a placeholder). */
  reason: string | null;
  source: SourceRef[];
  fidelity: Fidelity;
}

export interface StateMachine {
  id: string;
  name: string;
  appliesTo: string[];
  /** Where the current state lives, e.g. "$self.GuardBrain.mode". */
  stateRef: string;
  initial: string;
  states: { id: string; behaviour: string }[];
  transitions: Transition[];
  source: SourceRef[];
  fidelity: Fidelity;
}

export const RELATIONSHIP_TYPES = [
  "connects", "contains", "powers", "disables", "degrades", "triggers", "alerts", "unlocks", "requires",
  "controls", "resets", "attracts", "patrols", "blocks", "boosts", "feedback",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface Relationship {
  id: string;
  type: RelationshipType;
  from: string;
  to: string;
  label: string;
  /** Rules or state-machine transitions that implement it. */
  via: string[];
  fidelity: Fidelity;
}

export interface Objective {
  id: string;
  order: number;
  /** The exact objective text the runtime shows. */
  text: string;
  completeWhen: Expr;
  source: SourceRef[];
}

export interface Outcome {
  id: string;
  result: "won" | "lost";
  when: Expr;
  reason: string;
  source: SourceRef[];
}

export interface Blueprint {
  schemaVersion: string;
  /** Who is authoritative: the runtime for structure and behaviour; the Blueprint for `parameters` (Phase 2B). */
  game: { id: string; name: string; runtimeVersion: string; authority: { structure: "runtime"; parameters: "blueprint" }; units: string; generatedFrom: string };
  componentTypes: Record<string, ComponentType>;
  entities: Entity[];
  events: EventDef[];
  rules: Rule[];
  stateMachines: StateMachine[];
  relationships: Relationship[];
  objectives: Objective[];
  outcomes: Outcome[];
  /** Things the blueprint knowingly does not describe. */
  notRepresented: { item: string; why: string; source: SourceRef[] }[];
  /** Blueprint-controlled parameters: AUTHORITATIVE values the runtime loads (Phase 2B). */
  parameters: Parameter[];
}
