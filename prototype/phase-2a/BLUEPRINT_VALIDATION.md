# Blueprint validation

`src/validate.ts` (with `src/validate-refs.ts`) is a deterministic validator:
- **No dependencies, no I/O.** It's the same code in the tests, the command-line tool and the GROOP studio inspector.
- **It never repairs or changes the blueprint.** It returns a list of errors, and an empty list means valid. A test checks that validating twice leaves the input byte-identical.

```bash
cd prototype/phase-2a
npx tsx scripts/validate.ts                        # validates research-facility.blueprint.json
npx tsx scripts/validate.ts path/to/other.json     # exit code 1 if invalid
```

## What it checks

| Check | Error code |
|---|---|
| Not an object, or a required section is missing | `MALFORMED` |
| Wrong `schemaVersion` | `SCHEMA_VERSION` |
| Duplicate id: entities, events, rules, state machines, transitions, relationships, objectives, outcomes (one shared namespace); duplicate state ids; duplicate objective order | `DUPLICATE_ID` |
| Entity id not `lower_snake_case`; an entity, rule or transition with no source reference | `MALFORMED` |
| Unknown entity kind | `INVALID_KIND` |
| Component not declared in `componentTypes` | `UNKNOWN_COMPONENT` |
| Required property missing | `MISSING_PROPERTY` |
| Property not declared for that component | `UNKNOWN_PROPERTY` |
| Value has the wrong type, or an enum value isn't allowed | `INVALID_TYPE` |
| Any reference (entity, `entity.Component.prop`, `@kind…`, `$self…`, `$event.field`, event id) that doesn't resolve | `INVALID_REFERENCE` |
| A rule or action target that doesn't exist or isn't a property, or `affects` naming a missing entity | `INVALID_RULE_TARGET` |
| Unknown operator or predicate, wrong number of arguments, malformed expression | `INVALID_EXPRESSION` |
| Unknown action | `INVALID_ACTION` |
| Transition from or to a state that doesn't exist, or an initial state that isn't a state | `INVALID_TRANSITION` |
| Unknown relationship type, a self-loop, or a missing end | `INVALID_RELATIONSHIP` / `INVALID_REFERENCE` |
| A relationship whose `via` names no real rule or transition | `INVALID_REFERENCE` |

**Context rules:**
- `$self` is only valid inside a state machine. It must resolve on **every** entity the machine applies to.
- `$event.<field>` must be a field the triggering event declares in its `payload`.
- `@kind.Component` requires **every** entity of that kind to have the component.

## Real output on a deliberately broken copy

Three corruptions:
- a rule's `affects` names `camera_99`
- the generator's `Power.on` is set to `"yes"`
- a guard transition goes to `DANCE`

```
INVALID_TYPE
  entities[59](generator_01).Power.on
  Expected boolean, got "yes".
INVALID_RULE_TARGET
  rules[10](R11_camera_trips_alarm).affects
  camera_99 does not exist.
INVALID_TRANSITION
  stateMachines[0](sm_guard).transitions[0](T01_alarm_alert)
  To-state "DANCE" does not exist in sm_guard.
```

## Current result on `research-facility.blueprint.json`

**VALID.** Zero errors from the validator. It covers 77 entities, 19 events, 44 rules, 6 state machines (33 transitions), 74 relationships, 3 objectives and 2 outcomes.

## What validation does *not* prove

The validator checks that the blueprint is **well-formed and internally consistent**. It doesn't prove the blueprint is **true to the game**. Three other tests do that:
- **Regeneration** (`tests/blueprint.test.ts`): the JSON is identical to a fresh build from the runtime.
- **Traceability** (`tests/blueprint.test.ts`): every cited source file exists and contains the cited symbol.
- **Conformance** (`tests/conformance.test.ts`): rules and guard transitions are exercised against the running game.
