# Phase 2B — Test report

**Verdict:** the Blueprint → Runtime → Behaviour round trip **is demonstrated**, for 5 numeric parameters.

- Editing one value in the Blueprint *file* changed what the running game did.
- Restoring the file restored the baseline exactly, run for run.
- Invalid values stop the game from starting.

All numbers below come from files in `evidence/`, recorded on 2026-10-06. None are estimates.

---

## 1. Baseline (Test A)

The question: does the game behave **identically** once the five values come from the Blueprint instead of being hard-coded?

`evidence/baseline-phase2a-hardcoded.json` was recorded during Phase 2A, before any runtime change. `evidence/baseline.json` was recorded after the runtime started reading the Blueprint. Both use the 3 deterministic bots × 30 runs (seeds 1–10 × start delays 0/4/8 s).

| Bot | Won | Caught | Chases | Alarms | First chase (avg) | Survival (avg) |
|---|---|---|---|---|---|---|
| A planned | 3/30 | 27 | 46 | 0 | 89.72 s | 102.08 s |
| B naive | 0/30 | 30 | 30 | 20 | 10.33 s | 12.21 s |
| C careful | 0/30 | 30 | 30 | 20 | 12.44 s | 15.08 s |

**Result: identical on every field** (`checks.testA_baselineEqualsPhase2AHardcoded: true`, a deep-equal over the full summaries). This matches the PLAYTEST_BASELINE numbers (A 3/30, B 0/30, C 0/30).

## 2. Parameter integration

| Parameter | Blueprint → | Runtime consumer | Proven by |
|---|---|---|---|
| `guardSightRange` 11 m | `Senses.params` | `guardSightRange()` (lit only) | Player at 8 m: seen at 11, not seen at 6. With the power off, sight is 5.5 m regardless |
| `guardChaseSpeed` 4 m/s | `Senses.params` | `guardSpeed("CHASE")` | A chasing guard covers >2.4× the distance at 6 m/s as at 2 m/s over 0.5 s |
| `sprintNoiseRadius` 9 m | `updatePlayer(…, params)` | sprint footstep noise | Every sprint noise has exactly radius 9 (or 20 when set to 20) |
| `alarmDuration` 60 s | `Facility.params` | `raiseAlarm` / `setAlarm` | The alarm lasts 5 s ± 1 frame when set to 5, and 12 s when set to 12 |
| `cameraRange` 13 m | `Senses.params` | `cameraSees()`, render cone | Player at 9 m: detected at 13, not at 6 |

Each behavioural test drives the **real system** (perception, the guard FSM, the player, the facility, the cameras) with values loaded through the real loader and validator. It checks that two values produce two different behaviours.

**No duplicate values remain.**
- The old constants are gone: `SIGHT.lit`, `SPEED.CHASE`, `STEP_NOISE.sprint`, `CAM_RANGE`, `ALARM_DURATION`. A test asserts they're absent.
- A source scan of all 43 runtime `.ts` files finds no re-declaration (`lit: 11`, `CHASE: 4`, `sprint: 9`, `coneLen = 13`, …).
- The Blueprint's own entity properties use `{ "$param": id }` bindings, so the file has no second copy either.

**Provenance** (Blueprint → validator → runtime param → system → behaviour):
- `loadParameters()` returns `{ id, value, source, file, pointer: "/parameters/<i>/value", blueprintValue, validated, consumers[] }`.
- The tests check that each pointer resolves to the same value in the file.
- The running game exposes this via `?debug` as `__facility.provenance()`. Verified in the browser for all 5 parameters.

## 3. Validation

| Case | Result |
|---|---|
| Wrong type (`"far"`, `null`, `NaN`) | Rejected, e.g. `guardSightRange: supplied "far" — expected number, minimum 1, maximum 50.` |
| Out of range (0.5, 41, 999) | Rejected with `PARAMETER_OUT_OF_RANGE`. **Not clamped**: the value is never altered |
| Range boundaries (1, 40) | Accepted unchanged |
| Missing required parameter | `alarmDuration: required by the runtime but missing from the Blueprint.` |
| Unknown parameter override | `guardSpeed: not a Blueprint parameter (known: …)` |
| Entity bound to a missing parameter | `INVALID_REFERENCE` |
| **In the browser** (`?bp.guardSightRange=999`) | The "Blueprint rejected · the game did not start" screen lists the message. Title hidden, no game loop, no debug hook |
| Inspector trial value 0.5 | Same message, shown by the same validator code; Play disabled |

## 4. Experiment: one change, guard sight 11 → 6

`experiment.mts` edits the **real Blueprint file**. The diff is exactly one line, `"value": 11,` → `"value": 6,`. Each measurement runs in a fresh process that reads the file from disk; the script injects no value. The runtime reported back the value it actually received: 11, then 6, then 11.

**Hypothesis:** a shorter lit sight range lets bots get closer before guards notice, so the first chase comes later.

## 5. Before/after evidence

| Bot | Metric | Baseline (11) | Changed (6) | Restored (11) |
|---|---|---|---|---|
| A planned | wins / chases / first chase / survival | 3 / 46 / 89.72 s / 102.08 s | **3 / 46 / 89.72 s / 102.08 s (no change)** | 3 / 46 / 89.72 s / 102.08 s |
| B naive | wins / chases / first chase / survival | 0 / 30 / 10.33 s / 12.21 s | 0 / 30 / **10.47 s / 12.35 s** | 0 / 30 / 10.33 s / 12.21 s |
| C careful | wins / chases / first chase / survival | 0 / 30 / 12.44 s / 15.08 s | 0 / **35 / 17.43 s / 19.29 s** | 0 / 30 / 12.44 s / 15.08 s |

The paired comparison (same seed and delay, changed vs baseline), from `experiment-result.json`:

- **Bot B (naive):** all 30 runs changed, and the first chase came later in all 30. The size is tiny: +0.02 s (10 runs), +0.03 s (10), +0.35 s (10). No outcome changed.
- **Bot C (careful):** all 30 runs changed, and the first chase came later in all 30. In the delay-0/4 runs it shifted +0.03–0.05 s. In the 10 delay-8 runs it shifted **+8.5 s to +53.5 s**: at 6 m the guard misses that encounter entirely and spots the bot later. That gave 5 extra chases. No outcome changed: still 0 wins.
- **Bot A (planned):** **0 of 30 runs changed.**

Why A is unaffected: I checked by running A at lit sight 1, 6, 11, 30 and 50 m. Results were identical at every value, and in all 28 runs with a chase the power was **off** at the first chase. The intended plan cuts the generator before any guard sees the player. With the power off, sight is the fixed 5.5 m dark range, which is *not* a parameter. So `guardSightRange` cannot affect that route. This is a real property of the game, not a fault in the wiring.

The tiny shifts (+0.02–0.05 s) are also expected. Suspicion builds at `1 − distance/range`, so a shorter range means slower build-up even for encounters inside 6 m.

## 6. Restoration

| Check | Result |
|---|---|
| File bytes after restore | SHA-256 `93576e0b…` = original `93576e0b…` (restored inside `finally`, so it happens even if a measurement crashes) |
| Runtime value after restore | 11 |
| Restored vs baseline, **every one of the 90 runs** | Identical (`isDeepStrictEqual` over each run's outcome, time, chases, alarms and first chase) |
| Restored vs baseline summaries | Identical |

All 10 experiment checks pass: `fileEditTouchedOneLine`, `baselineRuntimeReceived11`, `changedRuntimeReceived6`, `otherParamsUnchanged`, `testA_baselineEqualsPhase2AHardcoded`, `behaviourChanged`, `fileRestoredByteForByte`, `restoredRuntimeReceived11`, `restoredEqualsBaselineEveryRun`, `restoredEqualsBaselineSummaries`.

**Live game, dev server** (`dev-reload.mjs`, output in `evidence/dev-reload.txt`). With the game running in Chrome:
- `guardChaseSpeed` 4 → 7 in the file, then reload: the running runtime reports 7.
- 4 → 999: the game refuses to start (`guardChaseSpeed: supplied 999 — expected number, minimum 0.5, maximum 10.`).
- File restored: the runtime reports 4, and the file is byte-identical.

## 7. Tests run

| Suite | Result |
|---|---|
| Phase 1 unit + behavioural (`phase-1`, `npm test`) | **29/29**: 12 original + 10 parameter loading/validation/no-duplicate + 7 runtime/causality |
| Phase 2A blueprint (`phase-2a`, `npm test`) | **35/35**: traceability now covers 295 source refs, including the parameter consumers |
| Phase 2A schema validation, drift check | VALID; "Blueprint matches the runtime" |
| Phase 1 browser e2e (`tests/e2e.mjs`) | **25/25**, no console errors |
| Phase 1.5 playtest recorder (`tests/playtest.mjs`) | **11/11**, no console errors |
| Phase 2B browser (`browser.mjs`) | **18/18**: game boot, provenance, title line, rejection screen, type error, override, studio Parameters view, invalid trial, Play with value, entity binding display, Reset, no page errors |
| Round-trip experiment (`experiment.mts`) | **10/10** checks |
| Live dev-server edit (`dev-reload.mjs`) | PASS |
| Release file (`release/ResearchFacility.html`, opened via `file://`) | Boots from the Blueprint; `?bp.alarmDuration=2` is rejected |
| TypeScript strict (phase-1, phase-2a, studio), `next build` | Clean |

**Regressions found and fixed during the phase:**
- Phase 2A traceability broke twice, both times correctly:
  - Rule source symbols still cited `SIGHT.lit` / `STEP_NOISE.sprint`.
  - 26 references still pointed at `src/main.ts` after the game loop moved to `src/game.ts`.
- Bindings rendered as "(undefined, undefined)" in the inspector's entity view.
- NaN was reported as "supplied null".

## 8. Limitations (what this does NOT show)

- **Only 5 numbers.** No structure (entities, rules, state machines, level) is Blueprint-controlled. That remains runtime-owned and is only described.
- **One experiment, one parameter, one direction** (11 → 6). The other four parameters are proven to be *wired* by unit and behavioural tests, but not experimented on with the bots. No dose-response curve was measured.
- **The bots are not players.** Bots B and C are always caught, and A's route never meets a lit guard. The change moved first-chase timing but **changed no outcome**. Nothing here says whether 6 m is a better *game*.
- **"30 runs" are not 30 independent samples.** The bots' behaviour is dominated by the start delay: effects came in clean blocks of 10. In effect there are ~3 scenarios per bot.
- **The dark sight range (5.5 m) and walking noise (3 m) are not parameters.** So "guard sight range" only governs the lit game, and the main stealth route doesn't use it. A designer could reasonably expect otherwise. The inspector says so in each parameter's description.
- **No cross-parameter rules.** `guardSightRange: 1` (below the 5.5 m dark range) is accepted, though it means the lights *help* the player.
- **Built copies bundle the Blueprint at build time.** Editing the file does nothing to `release/`, `dist/` or the studio's embedded copy until `npm run build:playable` / `npm run sync:facility`. Only the dev server reads it live. The whole Blueprint (~205 KB raw) ships inside the game bundle.
- **Inspector "editing" is a temporary URL override**, not a save. It never writes the file (by design: no disk writes from the studio).
- The deployed Railway studio has not been updated. Everything here is local and uncommitted.
