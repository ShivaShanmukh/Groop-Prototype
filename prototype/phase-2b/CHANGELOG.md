# Phase 2B — Changelog

No system was rewritten. Guard AI, perception, cameras, the alarm, the player, the level, rendering and audio work exactly as before. Five constants were replaced by values read from the Blueprint, and a start-up gate was added.

## Runtime: `prototype/phase-1` (v0.1.1 → **v0.2.0**)

- **New `src/blueprint/parameters.ts`:** `loadParameters(overrides?, source?)` imports the Blueprint JSON, applies optional in-memory overrides, then runs the full Phase 2A validator plus the parameter checks. It throws `BlueprintError(problems[])` on failure, and on success returns frozen `params` plus `provenance`. Also exports `defaultParameters()`, `PARAMETER_IDS` and `GameParameters`.
- **New `src/blueprint/boot.ts`:**
  - `readOverrides(location.search)` reads `?bp.<id>=<value>`.
  - `bootBlueprint()` never throws.
  - `renderBlueprintError()` and `renderBlueprintSource()` drive the rejection screen and the title-screen line.
- **`src/main.ts`** is now only the gate: validate first, then `startGame(boot)` or the rejection screen.
- **New `src/game.ts`:** the previous body of `main.ts`, wrapped in `startGame(boot)`. The only changes: both `new Facility(seed, boot.params)` calls, the title line, and provenance passed to the debug hook.
- **`src/world/facility.ts`:**
  - `ALARM_DURATION` removed.
  - `readonly params`; `constructor(seed, params = defaultParameters())`.
  - Senses carry `params`; the alarm timer uses `params.alarmDuration`.
- **`src/ai/perception.ts`:** `SIGHT.lit` removed; the lit range is `s.params.guardSightRange`. `Senses.params` added.
- **`src/ai/guard-state.ts`:** `SPEED.CHASE` removed; new `guardSpeed(mode, params)`; new `GUARD_MODES` list.
- **`src/ai/guard.ts`:** uses `guardSpeed()`.
- **`src/world/player.ts`:** `STEP_NOISE.sprint` removed; `updatePlayer(…, params)` uses `params.sprintNoiseRadius`.
- **`src/world/cameras.ts`:** `CAM_RANGE` removed; uses `s.params.cameraRange`.
- **`src/render/objects.ts`:** the visible cone length is `f.params.cameraRange`, so what you see matches what detects you.
- **`src/debug.ts`:** `snapshot().params` and `provenance()` added.
- **`index.html` / `src/style.css`:** a `#bp-error` rejection screen and a `#bp-source` title line.
- **`vite.config.ts`:** `server.fs.allow: [".."]`, so the dev server can serve the Blueprint from `../phase-2a`.
- **`tsconfig.json`:** `resolveJsonModule`.
- **`tests/bots.ts`:** `sweepRuns()` and `summarise()` exported, so experiments can compare run by run. `sweep()` is unchanged in behaviour.
- **New `tests/parameters.test.ts`** (10 tests) and **`tests/parameters-runtime.test.ts`** (7 tests).
- **Rebuilt** `dist/` and `release/`. Both now carry the Blueprint inside the bundle.

## Blueprint: `prototype/phase-2a`

- **`research-facility.blueprint.json`:**
  - New authored `parameters` section (5 entries, each with value, min, max, unit, description and consumers with source refs).
  - `game.authority` is now `{ structure: "runtime", parameters: "blueprint" }`.
  - Five entity properties became `{ "$param": … }` bindings.
  - `runtimeVersion` 0.2.0.
  - Session, audio and UI references now point at `src/game.ts`.
- **`src/schema.ts`:** `Parameter`, `ParamBinding`; `parameters` on `Blueprint`; the authority object.
- **New `src/validate-params.ts`:** type and range checks, duplicate and missing ids, consumers required. No clamping.
- **`src/validate.ts`:** `parameters` is a required section; `$param` bindings are accepted only on number properties and only for existing parameters.
- **`src/build.ts`:** carries `parameters` through verbatim, and refuses to build if the section is missing.
- **`src/extract/*`:**
  - `actors.ts` emits bindings.
  - `rules-gameplay.ts`: the R07 and R22 source symbols were updated, and R22's title no longer hard-codes "9 m".
  - `relationships.ts`: labels name the parameters instead of the numbers.
  - `main.ts` references → `game.ts`.
- **`tests/blueprint.test.ts`:** traceability also covers parameter consumer refs (289 → 295 refs).
- **`tests/conformance.test.ts`:** resolves bindings before comparing against the runtime.
- **`CURRENT_GAME_MODEL.md`:** marks the 5 Blueprint-controlled values; `main.ts` → `game.ts`.
- **`TRACEABILITY.md`:** regenerated.

## Studio (repo root)

- **New `src/studio/blueprint/ParamView.tsx`:** the Parameters view. Each parameter shows its value, type and range, source (file + JSON pointer), runtime consumers and status. Trial values are checked by the same validator, then "Play with N trial values" or "Reset to Blueprint values".
- **`StageTabs.tsx`:** holds the trial overrides and reloads the game iframe with `?bp.…`.
- **`Inspector.tsx`:** a Parameters entry, plus updated summary text explaining the two directions of authority.
- **`format.ts` / `EntityView.tsx`:** bound properties display as `13 ← parameter cameraRange` (previously "(undefined, undefined)").
- **`EmbeddedStudio.tsx`, `load.ts`:** copy no longer calls the Blueprint read-only.
- **`studio.css`:** parameter card styles.
- **`public/games/research-facility/`:** re-synced to v0.2.0.

## New in `prototype/phase-2b`

- `README.md`, `TEST_REPORT.md`, `CHANGELOG.md`
- `experiment.mts`, `probe.mts`, `browser.mjs`, `dev-reload.mjs`
- `evidence/`: `baseline-phase2a-hardcoded.json`, `baseline.json`, `changed.json`, `restored.json`, `experiment-result.json`, `dev-reload.txt`, `screenshots/`
