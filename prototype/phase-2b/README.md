# Phase 2B — Blueprint → Runtime parameter control

Phase 2A described the game in a Blueprint. Phase 2B makes the Blueprint **control** five gameplay values. The running game reads them from the Blueprint, and nowhere else.

```
research-facility.blueprint.json  ──►  validator (type + range, no clamping)  ──►  Facility.params  ──►  system  ──►  behaviour
   /parameters/<i>/value                 phase-2a/src/validate*.ts                 phase-1/src/blueprint/parameters.ts
```

| Parameter | Blueprint value | Range | Read by (runtime consumer) |
|---|---|---|---|
| `guardSightRange` | 11 m | 1–50 | `ai/perception.ts` `guardSightRange()`: lit sight only; dark sight stays at a fixed 5.5 m |
| `guardChaseSpeed` | 4 m/s | 0.5–10 | `ai/guard-state.ts` `guardSpeed()` → `ai/guard.ts` |
| `sprintNoiseRadius` | 9 m | 0–40 | `world/player.ts` `updatePlayer()` |
| `alarmDuration` | 60 s | 5–600 | `world/facility.ts` `raiseAlarm()` / `setAlarm()` |
| `cameraRange` | 13 m | 1–40 | `world/cameras.ts` `cameraSees()`, and the visible cone in `render/objects.ts` |

Everything else (level, entities, rules, state machines) is still owned by the runtime code. The Blueprint still only *describes* that part, and Phase 2A's generator and drift check still apply to it. `game.authority` in the file records this split: `{ structure: "runtime", parameters: "blueprint" }`.

## How it works

1. **Authored, not generated.** `parameters` is the one hand-written section of the Blueprint. `npm run build` in `phase-2a` regenerates every other section from the code and copies `parameters` through unchanged. Entity properties that these values feed are written as bindings (`"range": { "$param": "cameraRange" }`), not as numbers, so the Blueprint holds no second copy either.
2. **Validated before the game starts.** `src/main.ts` calls `bootBlueprint()`. It validates the whole Blueprint plus the parameters (each must be a number within `min`–`max`, and every required id must be present). If anything fails, the game shows **"Blueprint rejected · the game did not start"** with messages like `guardSightRange: supplied 999 — expected number, minimum 1, maximum 50.`. Out-of-range values are rejected, never clamped.
3. **Passed in, not looked up.** The validated values are frozen and handed to `new Facility(seed, params)`. Systems read `facility.params` or `senses.params`. The old constants (`SIGHT.lit`, `SPEED.CHASE`, `STEP_NOISE.sprint`, `ALARM_DURATION`, `CAM_RANGE`) were deleted, and a test fails if any of them comes back.
4. **Provenance.** `loadParameters()` returns, for each value: where it came from (`blueprint` or `override`), the file and JSON pointer (`/parameters/0/value`), the original Blueprint value, and its runtime consumers. With `?debug`, `window.__facility.provenance()` and `snapshot().params` expose this from the running game.

## Changing a value

- **Permanently:** edit `prototype/phase-2a/research-facility.blueprint.json`, then:
  - `npm run dev` in `prototype/phase-1`: the dev server picks up the change on reload.
  - Built game or studio: `npm run sync:facility` at the repo root (or `npm run build:playable` in `phase-1`). The built game carries the Blueprint inside its bundle, so a file edit does nothing to an existing build.
- **Temporarily (not saved):**
  - Open the game with `?bp.guardSightRange=6`. The title screen then says `temporary override, not saved: guardSightRange 11 → 6`.
  - Or, in the studio: Blueprint tab → **Parameters** → type a trial value → **Play with 1 trial value**. The inspector checks it with the same validator first, and Play stays disabled while a value is invalid. **Reset to Blueprint values** removes the override.

## Running the evidence

```bash
# unit + behavioural tests (Phase 1 runtime incl. Phase 2B parameter tests)
cd prototype/phase-1 && npm test

# Phase 2A blueprint tests, schema validation, drift check
cd prototype/phase-2a && npm test && npm run validate && npm run check

# the round-trip experiment: edits the REAL Blueprint file (11 → 6), measures, restores, verifies SHA-256
cd prototype/phase-1 && npx tsx ../phase-2b/experiment.mts

# live-edit check against the dev server (needs: cd prototype/phase-1 && npx vite --port 5179)
node prototype/phase-2b/dev-reload.mjs

# browser checks (needs: game preview on :4173 and studio on :3000, see the header of the file)
node prototype/phase-2b/browser.mjs prototype/phase-2b/evidence/screenshots
```

## Files

| File | What |
|---|---|
| `experiment.mts` | The on-disk round trip: baseline → edit the file → measure → restore (byte-for-byte) → measure. Writes `evidence/` |
| `probe.mts` | One measurement in a fresh process: 3 bots × 30 runs against whatever the file says |
| `browser.mjs` | 18 browser checks: game boot, rejection screen, override, studio Parameters view |
| `dev-reload.mjs` | Edits the Blueprint FILE while the dev game runs; reads the value back from the live runtime; invalid edit → refused; restores |
| `evidence/` | `baseline-phase2a-hardcoded.json` (recorded before Phase 2B), `baseline/changed/restored.json` (per-run), `experiment-result.json`, screenshots |
| `TEST_REPORT.md` | What was tested, the results and the limits |
| `CHANGELOG.md` | Every file changed |
