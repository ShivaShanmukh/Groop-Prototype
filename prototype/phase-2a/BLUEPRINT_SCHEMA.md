# GROOP Blueprint schema v0.1 (`groop.blueprint/0.1`)

The schema is defined in TypeScript in `src/schema.ts`; that file is the authoritative definition. It is deliberately minimal: it models only what The Research Facility needs.

## Design decisions (after inspecting the runtime)

1. **The runtime is authoritative; the blueprint is generated from it.** `src/build.ts` builds the blueprint from a fresh runtime `Facility` and the runtime's exported constants. A test fails if the committed JSON differs from a fresh build, so there is one source of truth and drift is caught.
2. **Entities hold components; components hold typed properties.** Component types (e.g. `Camera`, `GuardBrain`, `Power`) are declared once with each property's type, unit and description. Entity values are the game's **initial state**.
3. **Behaviour is split between rules and state machines,** matching the code:
   - Rules model cross-system cause and effect (generator → cameras). They're either event-triggered or checked every frame.
   - State machines model the code's explicit modes, such as the guard's `mode`.
4. **Expressions are a small structured syntax tree, not strings,** so the validator can check every reference. They don't support arithmetic yet (see "Limits").
5. **Every rule, transition, event and entity carries `source` references** (file and symbol), and a **fidelity** label: `verified` or `approximation`.

## Top level

```
Blueprint
├── schemaVersion        "groop.blueprint/0.1"
├── game                 id, name, runtimeVersion, authority: "runtime", units, generatedFrom
├── componentTypes       { [name]: { description, properties: { [prop]: PropertyDef } } }
├── entities[]           { id, name, kind, components: { [Component]: { [prop]: Value } }, runtime: { object, source[] } }
├── events[]             { id, description, emittedBy[], payload[], runtimeType | null, source[] }
├── rules[]              { id, title, category, trigger, condition?, actions[], affects[], source[], fidelity, note? }
├── stateMachines[]      { id, name, appliesTo[], stateRef, initial, states[], transitions[], source[], fidelity }
├── relationships[]      { id, type, from, to, label, via[], fidelity }
├── objectives[]         { id, order, text, completeWhen, source[] }
├── outcomes[]           { id, result: won|lost, when, reason, source[] }
└── notRepresented[]     { item, why, source[] }
```

## Building blocks

### Entity kinds

`level`, `area`, `door`, `player`, `guard`, `camera`, `generator`, `terminal`, `alarm`, `item`, `prop`, `system`.

`system` covers things that aren't physical objects: the keycard reader, the escape line, the session, lighting, audio and the HUD.

### Property types

`number`, `boolean`, `string`, `enum` (with `values`), `vec2` (`{x, z}`), `vec2[]`, `string[]`, `rect` (`[c0, r0, c1, r1]`).

### References (`Expr.ref`, action targets)

| Form | Meaning |
|---|---|
| `generator_01` | an entity |
| `generator_01.Power.on` | a property; `.x` / `.z` reach into a `vec2` |
| `@guard.Perception.sightLit` | the property on **every** entity of that kind |
| `$self.GuardBrain.mode` | inside a state machine, the entity it runs on |
| `$event.target` | a payload field of the triggering event (must be listed in that event's `payload`) |

### Expressions (`Expr`)

| Expression | Notes |
|---|---|
| `{ ref }` / `{ value }` | a reference or a literal |
| `{ op: eq neq lt lte gt gte, args: [a, b] }` | comparison |
| `{ op: and or, args: [...] }`, `{ op: not, args: [a] }` | logic |
| `{ pred: sees }` | 2 args: guard or camera, then target |
| `{ pred: hears }` | 1 arg: the guard |
| `{ pred: within }` | 3 args: a, b, distance |
| `{ pred: has }` | 2 args: holder, item |
| `{ pred: arrived }` | 2 args: mover, target |
| `{ pred: event }` | 1 arg: an event id |

Predicates name checks the runtime does in code (perception, geometry, inventory). The blueprint states *that* they're used, not *how* they're computed.

### Actions

| Action | Meaning |
|---|---|
| `set target value` | change a property |
| `scale target by` | while the condition holds, the property is multiplied |
| `replace target with` | while the condition holds, the property uses another value |
| `give item to` | move an item into an inventory |
| `emit event` | fire an event |
| `noise at radius source` | make a sound guards may hear |
| `alertGuards source` | the alarm's call to every guard |
| `endGame outcome reason` | win or lose |
| `message text` | an on-screen toast |
| `feedback channel cue` | presentation only: audio, visual or HUD |

### Rules

- **`trigger`:** `{ event }` or `"frame"`.
- **`category`:** `gameplay` changes game state; `presentation` only drives visuals, audio or HUD.
- **`affects`:** the entities whose behaviour changes.

### State machines

- **`stateRef`:** the property that holds the state.
- **Transitions** have `from` (a state, or `"*"` for any), `to`, `priority` (the order the runtime checks them each frame), `when`, `actions`, and `reason`. `reason` is the **exact string the runtime logs**, with `{noise}` as a placeholder; tests match observed runtime transitions against it.

### Relationship types

`connects`, `contains`, `powers`, `disables`, `degrades`, `triggers`, `alerts`, `unlocks`, `requires`, `controls`, `resets`, `attracts`, `patrols`, `blocks`, `boosts`, `feedback`.

Every relationship lists in `via` the rule or transition ids that implement it.

## Limits of v0.1 (intentional)

- **No arithmetic in expressions.** Formulas such as suspicion build-up, the sight-range product and door easing are described in rule `note`s, and those rules are marked `approximation`.
- **No geometry, path-finding or rendering.** See `notRepresented` in the JSON.
- **Initial state only.** The blueprint isn't a live mirror of a running game.
- **Read-only.** Nothing reads the blueprint to drive the game yet: runtime → blueprint only, not blueprint → runtime.
