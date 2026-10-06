# Test report: Phase 2A (Research Facility Blueprint)

**Date:** 2026-10-06.

**Machine:** Windows 11, Node 22.16, Chrome (headless, Intel UHD graphics).

## Results by required test

| # | Required test | Result | Evidence |
|---|---|---|---|
| 1 | Blueprint loads | ✅ Pass | `tests/blueprint.test.ts` "1. loads" |
| 2 | Blueprint schema validates | ✅ Pass | Zero errors from `src/validate.ts` (test "2."); `npm run validate` prints VALID |
| 3 | All entity references resolve | ✅ Pass | Test "3.": no `INVALID_REFERENCE`. Plus 289 source references, each checked to name a real file that contains the cited symbol |
| 4 | All major systems represented | ✅ Pass | Test "4.": 22 required entity ids; 8 areas, 10 doors; the player's six components; 3 objectives; win and loss outcomes |
| 5 | Guard states represented | ✅ Pass | Test "5.": the guard machine's states equal the runtime's `GuardMode` set, and every state has transitions in and out |
| 6 | Cross-system relationships represented | ✅ Pass | Test "6." checks generator → lighting, cameras ×4, terminal and guards ×3 (degrades + attracts); cameras → alarm; alarm → guards; terminal → cameras and alarm; keycard → security door; drive → exit |
| 7 | Invalid references rejected | ✅ Pass | `tests/validator.test.ts`, 13 cases: `camera_99`; a missing entity in a condition; duplicate ids; a missing property; an unknown component; wrong type and bad enum; a non-property target; a transition to a missing state; 4 kinds of malformed relationship; an unknown event, predicate or arity; a bad `$event` field; malformed input and schema version. Plus **never mutates its input** |
| 8 | Existing game still launches | ✅ Pass | Phase 1 browser suite "Game launches"; Phase 1.5 `tests/playtest.mjs` (double-click build) 11/11; the GROOP studio Play tab loads and runs it |
| 9 | Existing game still plays | ✅ Pass | Phase 1 browser suite **25/25, run twice**, with real keyboard and mouse input |
| 10 | Existing Phase 1 tests still pass | ✅ Pass | Unit tests 12/12; browser suite 25/25 ×2; playtest checks 11/11; bot probe identical (below) |

**Phase 2A suite:** `npm test` in `prototype/phase-2a`, 3 files, **35/35 tests pass**.

**Drift check:** `npm run check` → "Blueprint matches the runtime."

## Conformance: blueprint claims checked against the running game

`tests/conformance.test.ts` runs the real runtime headlessly:

| Blueprint claim | How it was checked | Result |
|---|---|---|
| R01–R04, R07: generator off → cameras off, terminal dead, guard sight = `sightDark`, guards in earshot react | Pressed E at the generator | ✅ |
| R08, R09, R10: sight multipliers equal the blueprint's numbers | Computed by the runtime's `guardSightRange` | ✅ |
| R10: alarm makes guards faster, more suspicious, and search 15 s | Measured: speed ratio ≈ `alarmSpeedMultiplier`; suspicion ratio > 1.9; search time = `searchTimeAlarm` | ✅ |
| R05, R06: terminal actions need power | Called with power off, then on | ✅ |
| R11, T01: camera detection → alarm → every guard investigates "alarm raised" | Stood in a camera's view | ✅ |
| R12: re-report during an alarm | `lastReport` advances and the timer resets | ✅ |
| R13: alarm turns off after `duration` | Checked just before and just after | ✅ |
| R14, R15, R17, R24: keycard → unlock at `unlockRadius`; drive → exit unlocks; crossing `lineX` wins | Positioned just outside, then just inside, the unlock radius | ✅ |
| R16, R18: denial and "sealed" messages | Message text equals the blueprint's | ✅ |
| R21, R22: footsteps carry `walkRadius` / `sprintRadius`; crouching is silent | Read the runtime's noise list | ✅ |
| R23: a chasing guard catches within `catchDistance` | Outcome `lost` | ✅ |
| Guard machine, scripted | 4 scenarios: generator noise, sighting → chase → escape, alarm, noise while searching. Every observed transition matches a blueprint transition (same from, to and logged reason), and together they cover T01–T05 and T07–T11 | ✅ |
| Guard machine, random play | 12 seeded random-input runs × 90 s: **no guard ever made a transition the blueprint doesn't list** | ✅ |

**Not covered by an automated behavioural test:**
- **T06** (re-targeting while investigating) can't be observed, because it isn't logged.
- **The 18 presentation rules** are marked **CODE-READ** in the blueprint.
- **Door easing (R19, R20, door machine)** is marked **APPROXIMATION**.

## Gameplay unchanged: before vs after

The only runtime change in this phase: inline numbers in 8 files became **named exported constants with identical values** (`ai/guard-state.ts`, `ai/guard.ts`, `ai/perception.ts`, `world/facility.ts`, `world/security.ts`, `world/doors.ts`, `world/interact.ts`, `world/player.ts`, `world/cameras.ts`).

| Aspect | Before (Phase 1.5) | After (Phase 2A) | Same? |
|---|---|---|---|
| Controls | Browser suite: launch, camera (mouse + ←), interaction, Tab inventory, Esc, R restart | Same checks pass | ✅ |
| Movement | 3.60 / 6.00 / 1.90 m/s; eye 1.65 / 1.0 m | 3.60 / 6.00 / 1.90 m/s; eye 1.64–1.65 / 1.01 m | ✅ |
| Guard behaviour | Planned bot 3/30 (average 174 s), naive 0/30, careful 0/30 | **Identical:** 3/30 (174 s), 0/30, 0/30. The bots are deterministic, so any change in guard maths would show here | ✅ |
| Generator, cameras, alarm, terminal | Browser checks pass | Pass | ✅ |
| Keycard, door, drive, exit, win/loss | Browser checks and unit tests pass | Pass | ✅ |

## GROOP studio inspector (browser test)

- **Play tab:** the game starts, and walking moves Entrance → Reception.
- **Blueprint tab summary:**
  - "VALID · schema groop.blueprint/0.1 · runtime v0.1.1"
  - Entities 77 (38 gameplay + 39 props), Rules 44 (26 + 18), State machines 6 (33 transitions)
  - Objectives 3 (+ 2 outcomes), Relationships 74 (16 types), Events 19 (13 runtime GameEvents)
- **Generator:** shows Power on: ON, plus its relationships to lighting, the 4 cameras, the terminal and the guards, each with the rules that implement it.
- **Guard AI:** shows 13 transitions with logged reasons.
- **Validation:** "VALID: no errors."
- **Switching back to Play:** the run continues where it was.
- **Console:** no errors.

## Not verified

- **Visual and audio presentation:** the 18 rules are CODE-READ. No automated check that they look or sound right.
- **Whether a human finds the inspector understandable:** not tested.
- **The inspector on small screens:** a layout exists; not checked in a browser.
