# Current game model: The Research Facility (runtime v0.1.1)

What the running game actually does, from reading `prototype/phase-1/src`. Paths are relative to that folder.

**Labels:**

| Label | Meaning |
|---|---|
| **VERIFIED** | Read in the code *and* exercised by a test against the runtime (`tests/conformance.test.ts`, or the Phase 1 suites) |
| **APPROXIMATION** | Matches the code, but the blueprint simplifies it (each one has a note) |
| **CODE-READ** | Read in the code but not separately tested |
| **DOES NOT EXIST** | Looked for and not found |

## 0. Architecture in one paragraph

- **`Facility`** (`world/facility.ts`) is the whole game as plain data. `update(dt, input)` runs one frame.
- **Each frame, in order:**
  1. player (`world/player.ts`)
  2. interaction (`world/interact.ts`)
  3. keycard check
  4. doors (`world/doors.ts`)
  5. cameras and alarm (`world/security.ts`, `world/cameras.ts`)
  6. guards (`ai/guard.ts`, `ai/perception.ts`, `ai/move.ts`)
  7. exit check
- **Events:** systems talk through a per-frame `GameEvent[]` queue (`world/types.ts`) that `game.ts` drains into audio and the HUD, and through a one-frame `noises[]` list that guards read.
- **Read-only layers:** rendering (`render/*`), audio (`audio/sfx.ts`) and HUD (`ui/*`) only read `Facility`.

## 1. Entities (things that exist at runtime)

| Entity | Runtime object | Source | Status |
|---|---|---|---|
| Player | `Facility.player` (`PlayerState`) | `world/player.ts` `makePlayer`, `updatePlayer` | VERIFIED |
| Guards ×3 (Reyes, Okafor, Lin) | `Facility.guards[i]` (`Guard`) | `ai/guard-state.ts` `makeGuard`; routes in `level/map.ts` `GUARDS` | VERIFIED |
| Security cameras ×4 | `Facility.cameras[i]` (`SecCam`) | `world/cameras.ts`; placements in `level/map.ts` `CAMERAS` | VERIFIED |
| Generator | **No object.** It's a boolean `Facility.power`, plus an interactable with id `generator` and a position constant | `world/facility.ts` `toggleGenerator`; `world/interact.ts` | VERIFIED |
| Security terminal | **No object.** `Facility.camerasEnabled`, `setCameras()`, `resetAlarm()`, plus an interactable with id `terminal` | `world/facility.ts`; `world/interact.ts`; menu in `ui/screens.ts` | VERIFIED |
| Alarm | `Facility.alarm` `{active, timer, source, lastReport}` | `world/facility.ts`, `world/security.ts` | VERIFIED |
| Keycard, research drive | **No objects.** Ids in `Facility.inventory`, plus interactables and position constants | `world/facility.ts` `pickUp`; `world/types.ts` `ITEM_INFO` | VERIFIED |
| Doors ×10 (8 normal, 1 security `K`, 1 exit `X`) | `Facility.grid.doors[i]` (`Door`) | `world/grid.ts` constructor (from the `MAP` letters) | VERIFIED |
| Areas ×8 | `ROOMS` (data only; used for the HUD location and minimap, not for rules) | `level/map.ts` | CODE-READ |
| Props ×39 | `PROPS` → collision boxes in `Grid` | `level/props.ts`, `world/grid.ts` `addProp` | VERIFIED |
| Lighting, audio, HUD | Presentation classes | `render/lights.ts`, `audio/sfx.ts`, `ui/hud.ts` | CODE-READ |

## 2. Components (state each entity carries)

- **Player** (`world/types.ts` `PlayerState`):
  - position, yaw, pitch, crouching, sprinting, moving, eye, stepTimer
  - inventory, held on `Facility` (`Set<ItemId>`)
- **Guard** (`ai/guard-state.ts` `Guard`, extends `Mover` from `ai/move.ts`):
  - pos, yaw, mode, modeTime, suspicion
  - lastKnown, unseen, pause, memory, searchLeft, searchTarget
  - seesPlayer, route, routeIdx, path, history
- **Camera** (`world/cameras.ts` `SecCam`):
  - pos, baseYaw, sweep, yaw, phase
  - detect, mode, seesPlayer
- **Door** (`world/types.ts` `Door`):
  - col, row, kind, locked, open, axis

## 3. Properties (tuning, as named constants)

**Moved to named exports in Phase 2A; values unchanged.**
- Before this phase, many values were written inline as numbers. They were given exported names with **identical values** so the blueprint can read them from the runtime.
- Behaviour is proven unchanged: the deterministic difficulty bots give identical results before and after (planned bot 3/30, average 174 s; naive and careful 0/30), and the Phase 1 suites pass. See `TEST_REPORT.md`.

| Constant | Value | Where |
|---|---|---|
| Player speeds | walk 3.6, sprint 6.0, crouch 1.9 m/s | `world/player.ts` `SPEED` |
| Eye height | 1.65 / 1.0 m | `EYE` |
| Footstep noise | walk 3 m, sprint = **Blueprint `sprintNoiseRadius`** (9 m), every 0.5 s at walk speed | `STEP_NOISE` (walk), `params.sprintNoiseRadius`, `STEP_INTERVAL` |
| Interaction | reach 2.4 m, 75° view cone | `world/interact.ts` `REACH`, `VIEW_CONE` |
| Doors | open radius 2.4 m, speed 3.5 per s | `world/doors.ts` `OPEN_RADIUS`, `SPEED` |
| Guard sight | lit = **Blueprint `guardSightRange`** (11 m) / 5.5 m dark; ×0.65 crouched; ×0.5 crouched, still and dark; ×1.35 during an alarm | `ai/perception.ts` `SIGHT`; lit range from `s.params.guardSightRange` (Phase 2B) |
| Guard view | FOV 100°; peripheral 1.8 m | `GUARD_FOV`, `PERIPHERAL` |
| Sound through walls | ×0.5 | `WALL_SOUND_FACTOR` |
| Guard speeds | patrol 1.8, investigate 2.6, chase = **Blueprint `guardChaseSpeed`** (4.0), search 2.0, return 2.0; ×1.2 during an alarm | `ai/guard-state.ts` `SPEED`, `guardSpeed()`, `ALARM_SPEED_MULTIPLIER` |
| Catch | catch distance 1.2 m; reaction 0.6 s | `CATCH_DISTANCE`, `REACTION_TIME` |
| Suspicion | rate 1.0, ×2 within 2.5 m, ×2 during an alarm, ×1.3 when alert; decay 0.25/s; 0.3 after a chase | `SUSPICION` |
| Guard timing | memory 2.5 s, unseen-to-investigate 1.4 s, search 9 s (15 s during an alarm), patrol pause 2 s, search pause 1.2 s, … | `GUARD_TIMING` |
| Cameras | range = **Blueprint `cameraRange`** (13 m), FOV 50°, detect 1.5 s, crouched ×0.75 range and ×1.6 time, decay 0.5/s | `world/cameras.ts` |
| Alarm | **Blueprint `alarmDuration`** (60 s); cameras re-report every 2 s | `world/facility.ts` `this.params.alarmDuration`; `world/security.ts` `ALARM_REPORT_INTERVAL` |
| Generator noise | 30 m | `GENERATOR_NOISE` |
| Keycard reader | 2.6 m | `KEYCARD_UNLOCK_RADIUS` |
| Escape line | x < 1.6 | `EXIT_LINE_X` |

## 4. Relationships (verified against code)

| From | To | Real mechanism | Source | Status |
|---|---|---|---|---|
| Generator | Lighting | `Lighting.update(power, alarm, …)` switches to amber emergency light | `render/lights.ts` | CODE-READ (visual) |
| Generator | Cameras | `camerasActive = power && camerasEnabled`; inactive cameras go `off` with detect 0 | `world/facility.ts`, `world/cameras.ts` | VERIFIED |
| Generator | Terminal | Interact label/use checks `g.power`; `setCameras` / `resetAlarm` return early without power | `world/interact.ts`, `world/facility.ts` | VERIFIED |
| Generator | Guard perception | `guardSightRange`: `power ? 11 : 5.5` | `ai/perception.ts` | VERIFIED |
| Generator | Guards (noise) | Toggling pushes a 30 m noise. Guards **in earshot** that are PATROL/RETURN become SUSPICIOUS; SEARCH/INVESTIGATE guards re-target. **Not every guard reacts.** | `world/facility.ts`, `ai/guard.ts` | VERIFIED |
| Camera | Alarm | Detection reaching 1 → `raiseAlarm` | `world/security.ts` | VERIFIED |
| Alarm | Guards | `raiseAlarm` → `alertGuard` on every guard (→ INVESTIGATE unless chasing). While the alarm is on: sight ×1.35, speed ×1.2, suspicion ×2, search 15 s | `world/facility.ts`, `ai/*` | VERIFIED |
| Terminal | Cameras / alarm | Menu option 1 → `setCameras`; option 2 → `resetAlarm` | `game.ts`, `world/facility.ts` | VERIFIED |
| Keycard | Security door | Within 2.6 m with the keycard → `locked = false` | `world/facility.ts` | VERIFIED |
| Research drive | Exit | `pickUp("drive")` → exit `locked = false` | `world/facility.ts` | VERIFIED |
| Locked doors | Guard navigation | `grid.walkable` refuses a locked `K` and any `X` cell | `world/grid.ts` | CODE-READ |

## 5. Events

`GameEvent` types (`world/types.ts`): `toast`, `pickup`, `objective`, `alarm`, `power`, `cameras`, `door`, `terminal`, `generator`, `guard`, `spotted`, `step`, `end`.

They're consumed in `game.ts` `handle()`. **`objective` is emitted but nothing consumes it** (the HUD reads `Facility.objective` every frame).

There are also internal signals that aren't GameEvents:
- the one-frame `noises[]` list
- `updateCamera` returning `true` on detection
- the camera re-report during an alarm
- `input.interact`
- terminal menu clicks
- screen commands (`keys()`)

## 6. Conditions (what rules test)

**Perception:**
- `guardSees`: within sight range, inside the FOV (or within the peripheral distance and standing), and line of sight. Walls, closed doors and tall props block sight (`grid.blocksSight`).
- `hears`: within the noise radius, halved through walls.
- `cameraSees`: within range (×0.75 crouched), within FOV/2 of the current yaw, and line of sight.

**State checks:** inventory has an item, power on, `camerasEnabled`, alarm active, door locked, distance checks.

## 7. Actions (what changes state)

`toggleGenerator`, `setCameras`, `resetAlarm`, `raiseAlarm` / `setAlarm`, `pickUp`, door unlocks, `updateDoors` easing, `alertGuard`, `setMode` (guard transitions), `end()` (win/lose), and noise emission.

## 8. State machines

| Machine | States | Where |
|---|---|---|
| **Guard AI** (VERIFIED) | PATROL, SUSPICIOUS, INVESTIGATE, CHASE, SEARCH, RETURN | `ai/guard.ts` `updateGuard` + `ai/guard-state.ts` `alertGuard`. All 13 transitions are in `research-facility.blueprint.json` with their exact logged reasons. |
| Camera (VERIFIED) | off, scan, track | `world/cameras.ts` |
| Alarm (VERIFIED) | inactive, active | `world/facility.ts`, `world/security.ts` |
| Power (VERIFIED) | on, off | `world/facility.ts` |
| Door (APPROXIMATION) | locked, closed, open | `world/doors.ts`. `open` is really a continuous 0..1 value. |
| Session / screens (VERIFIED by the Phase 1 browser suite: start, pause/resume, terminal, inventory, end, restart) | title, playing, paused, terminal, inventory, ended | `game.ts` `setState` |

## 9. Objectives

The exact runtime texts from `Facility.objective`:
1. "Find a keycard to get into the restricted wing." Complete when the inventory has the keycard.
2. "Retrieve the research drive from the Archive in the restricted wing." Complete when the inventory has the drive.
3. "Escape through the emergency exit at the west end of the corridor."

"Reach the restricted area" and "reach the archive" are **not runtime objectives**. They're implied by objective 2, and the playtest recorder tracks reaching the archive.

## 10. Win / loss

- **Win:** the exit is unlocked and the player's x < 1.6 → "You escaped with the research." (`world/facility.ts`). VERIFIED.
- **Loss:** a guard in CHASE, past its 0.6 s reaction, sees the player within 1.2 m → "{guard} caught you." (`ai/guard.ts` → `world/facility.ts`). VERIFIED.
- There are **no other loss conditions**. The alarm alone doesn't end the game.

## Audio / feedback found in code

| Feedback | Trigger | Source |
|---|---|---|
| Siren | alarm on/off | `game.ts` → `sfx.setAlarm` |
| Generator hum / clunk | power / generator events | `sfx.setHum`, `sfx.clunk` |
| Footsteps | `step` event | `sfx.step` |
| Pickup chime, door whoosh | `pickup` / `door` | `sfx.pickup`, `sfx.door` |
| Alert sting | `spotted` | `sfx.spotted` |
| Win/lose stings | `end` | `sfx.end` |
| Emergency / red lighting | power / alarm | `render/lights.ts` |
| Guard "?" / "!" icons | guard mode | `render/guards.ts` |
| Camera cones and LEDs | camera mode / detect | `render/objects.ts` |
| HUD | posture, power, cameras, alarm, detection meter, chase vignette, toasts | `ui/hud.ts` |

**Guard voice lines and guard footsteps: DOES NOT EXIST.** The only guard-specific sound is the alert sting.
