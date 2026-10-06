# Traceability: Blueprint → runtime → source

Generated from `research-facility.blueprint.json` by `scripts/traceability.ts`. **Do not edit by hand.**

Every source path is relative to `prototype/phase-1/`. The test `tests/blueprint.test.ts` checks that each file exists and contains the cited symbol.

## Entities

| Blueprint entity | Kind | Runtime object | Source |
|---|---|---|---|
| `level_01` | level | `MAP + Grid` | `src/level/map.ts` → `export const MAP`<br>`src/world/grid.ts` → `class Grid` |
| `area_entrance` | area | `ROOMS["entrance"]` | `src/level/map.ts` → `export const ROOMS` |
| `area_reception` | area | `ROOMS["reception"]` | `src/level/map.ts` → `export const ROOMS` |
| `area_corridor` | area | `ROOMS["corridor"]` | `src/level/map.ts` → `export const ROOMS` |
| `area_security` | area | `ROOMS["security"]` | `src/level/map.ts` → `export const ROOMS` |
| `area_lab` | area | `ROOMS["lab"]` | `src/level/map.ts` → `export const ROOMS` |
| `area_storage` | area | `ROOMS["storage"]` | `src/level/map.ts` → `export const ROOMS` |
| `area_restricted` | area | `ROOMS["restricted"]` | `src/level/map.ts` → `export const ROOMS` |
| `area_archive` | area | `ROOMS["archive"]` | `src/level/map.ts` → `export const ROOMS` |
| `door_lab_security` | door | `Facility.grid.doors[0]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_corridor_security` | door | `Facility.grid.doors[1]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_corridor_lab` | door | `Facility.grid.doors[2]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_archive_restricted` | door | `Facility.grid.doors[3]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_exit` | door | `Facility.grid.doors[4]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_security` | door | `Facility.grid.doors[5]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_corridor_reception` | door | `Facility.grid.doors[6]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_corridor_storage` | door | `Facility.grid.doors[7]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_reception_storage` | door | `Facility.grid.doors[8]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `door_entrance_reception` | door | `Facility.grid.doors[9]` | `src/world/grid.ts` → `this.doors.push`<br>`src/world/doors.ts` → `updateDoors` |
| `player` | player | `Facility.player` | `src/world/player.ts` → `makePlayer`<br>`src/world/player.ts` → `updatePlayer`<br>`src/world/interact.ts` → `focused` |
| `generator_01` | generator | `Facility.power + interactables['generator']` | `src/world/facility.ts` → `toggleGenerator`<br>`src/world/interact.ts` → `id: "generator"` |
| `camera_01` | camera | `Facility.cameras[0]` | `src/world/cameras.ts` → `updateCamera`<br>`src/level/map.ts` → `export const CAMERAS` |
| `camera_02` | camera | `Facility.cameras[1]` | `src/world/cameras.ts` → `updateCamera`<br>`src/level/map.ts` → `export const CAMERAS` |
| `camera_03` | camera | `Facility.cameras[2]` | `src/world/cameras.ts` → `updateCamera`<br>`src/level/map.ts` → `export const CAMERAS` |
| `camera_04` | camera | `Facility.cameras[3]` | `src/world/cameras.ts` → `updateCamera`<br>`src/level/map.ts` → `export const CAMERAS` |
| `terminal_01` | terminal | `Facility.camerasEnabled + setCameras/resetAlarm` | `src/world/facility.ts` → `setCameras`<br>`src/world/facility.ts` → `resetAlarm`<br>`src/ui/screens.ts` → `renderTerminal` |
| `alarm_01` | alarm | `Facility.alarm` | `src/world/facility.ts` → `raiseAlarm`<br>`src/world/security.ts` → `updateSecurity` |
| `keycard_01` | item | `Facility.inventory.has("keycard")` | `src/world/facility.ts` → `pickUp`<br>`src/world/interact.ts` → `id: "keycard"` |
| `drive_01` | item | `Facility.inventory.has("drive")` | `src/world/facility.ts` → `pickUp`<br>`src/world/interact.ts` → `id: "drive"` |
| `guard_01` | guard | `Facility.guards[0]` | `src/ai/guard-state.ts` → `makeGuard`<br>`src/ai/guard.ts` → `updateGuard`<br>`src/ai/perception.ts` → `guardSees` |
| `guard_02` | guard | `Facility.guards[1]` | `src/ai/guard-state.ts` → `makeGuard`<br>`src/ai/guard.ts` → `updateGuard`<br>`src/ai/perception.ts` → `guardSees` |
| `guard_03` | guard | `Facility.guards[2]` | `src/ai/guard-state.ts` → `makeGuard`<br>`src/ai/guard.ts` → `updateGuard`<br>`src/ai/perception.ts` → `guardSees` |
| `keycard_lock` | system | `Facility.update keycard check` | `src/world/facility.ts` → `KEYCARD_UNLOCK_RADIUS` |
| `exit_zone` | system | `Facility.update exit check` | `src/world/facility.ts` → `EXIT_LINE_X` |
| `session` | system | `game.ts app state + Facility.objective/outcome` | `src/game.ts` → `setState`<br>`src/world/facility.ts` → `get objective` |
| `lighting_01` | system | `Room lighting` | `src/render/lights.ts` → `class Lighting` |
| `audio_01` | system | `Sound effects` | `src/audio/sfx.ts` → `class Sfx`<br>`src/game.ts` → `function handle` |
| `hud_01` | system | `HUD` | `src/ui/hud.ts` → `class Hud` |
| `prop_01` … `prop_39` | prop | `PROPS[0…38]` | `src/level/props.ts` → `export const PROPS`<br>`src/world/grid.ts` → `addProp` |

## Rules

| Rule | What it says | Fidelity | Source |
|---|---|---|---|
| `R01_generator_toggle` | E on the generator toggles power, loudly | VERIFIED | `src/world/facility.ts` → `toggleGenerator` |
| `R02_cameras_need_power_and_switch` | Cameras only work with power on and the terminal switch on | VERIFIED | `src/world/facility.ts` → `get camerasActive`<br>`src/world/cameras.ts` → `if (!active)` |
| `R03_terminal_opens_with_power` | E on the terminal opens its menu, only with power | VERIFIED | `src/world/interact.ts` → `id: "terminal"` |
| `R04_terminal_dead_without_power` | Without power the terminal does nothing | VERIFIED | `src/world/interact.ts` → `The terminal is dead` |
| `R05_terminal_toggles_cameras` | Terminal option 1 switches cameras on/off (needs power) | VERIFIED | `src/world/facility.ts` → `setCameras` |
| `R06_terminal_resets_alarm` | Terminal option 2 resets an active alarm (needs power) | VERIFIED | `src/world/facility.ts` → `resetAlarm` |
| `R07_dark_halves_guard_sight` | Power off: guards use their dark sight range | VERIFIED | `src/ai/perception.ts` → `s.power ? s.params.guardSightRange : SIGHT.dark` |
| `R08_crouch_reduces_guard_sight` | Crouching shrinks how far guards see you | VERIFIED | `src/ai/perception.ts` → `SIGHT.crouch` |
| `R09_shadow_hiding` | Crouched, still and in the dark: sight shrinks again | VERIFIED | `src/ai/perception.ts` → `SIGHT.shadow` |
| `R10_alarm_boosts_guards` | During an alarm guards see further, move faster, suspect faster and search longer | VERIFIED | `src/ai/perception.ts` → `SIGHT.alarm`<br>`src/ai/guard.ts` → `ALARM_SPEED_MULTIPLIER`<br>`src/ai/guard.ts` → `S.alarmMultiplier`<br>`src/ai/guard.ts` → `T.searchDuringAlarm` |
| `R11_camera_trips_alarm` | A camera that detects you raises the alarm and alerts every guard | VERIFIED | `src/world/security.ts` → `if (tripped || report) f.raiseAlarm`<br>`src/world/facility.ts` → `raiseAlarm` |
| `R12_camera_keeps_reporting` | During an alarm, a camera that still sees you re-alerts guards every 2 s and restarts the timer | VERIFIED | `src/world/security.ts` → `ALARM_REPORT_INTERVAL`<br>`src/world/facility.ts` → `raiseAlarm` |
| `R13_alarm_times_out` | The alarm switches itself off after its duration | VERIFIED | `src/world/security.ts` → `The alarm timed out.` |
| `R14_take_keycard` | E on the keycard puts it in the inventory | VERIFIED | `src/world/facility.ts` → `pickUp` |
| `R15_keycard_unlocks_security_door` | Coming within 2.6 m of the security door with the keycard unlocks it | VERIFIED | `src/world/facility.ts` → `KEYCARD_UNLOCK_RADIUS` |
| `R16_security_door_denies` | E on the locked security door without a keycard is refused | VERIFIED | `src/world/interact.ts` → `Access denied` |
| `R17_take_drive_lifts_lockdown` | Taking the research drive unlocks the emergency exit | VERIFIED | `src/world/facility.ts` → `if (item === "drive")` |
| `R18_exit_sealed` | E on the sealed exit explains it is locked | VERIFIED | `src/world/interact.ts` → `Sealed. Lockdown` |
| `R19_doors_open_for_player` | Unlocked doors slide open when the player is near | APPROXIMATION | `src/world/doors.ts` → `updateDoors` |
| `R20_doors_open_for_guards` | Unlocked doors open for guards too, except the emergency exit | APPROXIMATION | `src/world/doors.ts` → `b.kind === "player" || d.kind !== "exit"` |
| `R21_footsteps_walking` | Walking (not crouched) makes footsteps heard within 3 m | VERIFIED | `src/world/player.ts` → `STEP_NOISE.walk` |
| `R22_footsteps_sprinting` | Sprinting makes footsteps heard within the sprint noise radius (Blueprint parameter) | VERIFIED | `src/world/player.ts` → `params.sprintNoiseRadius` |
| `R23_guard_catches_player` | A chasing guard who has finished reacting, sees you and is within 1.2 m catches you | VERIFIED | `src/ai/guard.ts` → `sight.distance < CATCH_DISTANCE`<br>`src/world/facility.ts` → `caught you.` |
| `R24_escape` | Crossing the escape line through the unlocked exit wins | VERIFIED | `src/world/facility.ts` → `EXIT_LINE_X` |
| `R25_suspicion_builds` | While a guard sees you, suspicion rises (faster when close, during an alarm, or when already alert) | APPROXIMATION | `src/ai/guard.ts` → `S.rate * sight.strength` |
| `R26_suspicion_decays` | When a guard cannot see you (and is not chasing), suspicion drains | APPROXIMATION | `src/ai/guard.ts` → `S.decay * dt` |
| `P01_emergency_lighting` | Power off: room lights drop to dim amber emergency lighting; ceiling panels go dark | CODE-READ | `src/render/lights.ts` → `EMERGENCY` |
| `P02_alarm_lighting` | Alarm on: lights pulse red | CODE-READ | `src/render/lights.ts` → `ALARM` |
| `P03_siren` | Alarm on/off starts/stops the siren | CODE-READ | `src/game.ts` → `case "alarm": return sfx.setAlarm(e.on)` |
| `P04_generator_hum` | Power on/off starts/stops the generator hum | CODE-READ | `src/game.ts` → `case "power": return sfx.setHum(e.on)` |
| `P05_generator_clunk` | Operating the generator plays a clunk | CODE-READ | `src/game.ts` → `case "generator": return sfx.clunk()` |
| `P06_footstep_sound` | Footsteps are audible to the player (louder when sprinting) | CODE-READ | `src/game.ts` → `case "step": return sfx.step(e.loud)` |
| `P07_pickup_chime` | Picking something up plays a chime | CODE-READ | `src/game.ts` → `case "pickup": return sfx.pickup()` |
| `P08_door_sound` | A door starting to open plays a whoosh | CODE-READ | `src/game.ts` → `case "door": return sfx.door()` |
| `P09_spotted_sting` | A guard starting a chase plays an alert sting (the only guard sound) | CODE-READ | `src/game.ts` → `case "spotted": return sfx.spotted()` |
| `P10_end_screen` | Run end: stings, siren off, end screen with stats | CODE-READ | `src/game.ts` → `case "end":`<br>`src/ui/screens.ts` → `renderEnd` |
| `P11_messages` | Messages appear as toasts | CODE-READ | `src/game.ts` → `case "toast": return hud.toast(e.text)` |
| `P12_terminal_menu` | Terminal opened: menu overlay, mouse released | CODE-READ | `src/game.ts` → `case "terminal":` |
| `P13_guard_icons` | Guards show ? (suspicious, investigating, searching) or ! (chasing) above their heads | CODE-READ | `src/render/guards.ts` → `const ICON` |
| `P14_camera_cones` | Active cameras show a vision cone that warms from blue to red as detection builds; LED red when it sees you | CODE-READ | `src/render/objects.ts` → `v.cone.visible` |
| `P15_door_lights` | Door light strip: blue for normal doors, red when locked, green when unlocked | CODE-READ | `src/render/doors.ts` → `COLORS` |
| `P16_terminal_screen` | Terminal screen goes black without power | CODE-READ | `src/render/objects.ts` → `this.termOff` |
| `P17_generator_lamp` | Generator lamp green when on, red when off; fan spins only with power | CODE-READ | `src/render/objects.ts` → `genLamp` |
| `P18_hud_status` | HUD shows posture, power, cameras, alarm countdown, detection meter and red vignette while chased | CODE-READ | `src/ui/hud.ts` → `update(f: Facility)` |

## State machines and transitions

### Guard AI (`sm_guard`): VERIFIED

Applies to guard_01, guard_02, guard_03 · state in `$self.GuardBrain.mode` · source `src/ai/guard.ts` → `updateGuard`<br>`src/ai/guard-state.ts` → `setMode`

| Transition | From → To | Logged reason | Fidelity | Source |
|---|---|---|---|---|
| `T01_alarm_alert` | * → INVESTIGATE | "alarm raised" | VERIFIED | `src/ai/guard-state.ts` → `alertGuard` |
| `T02_suspicion_full` | * → CHASE | "spotted the intruder" | VERIFIED | `src/ai/guard.ts` → `spotted the intruder` |
| `T03_glimpse_patrol` | PATROL → SUSPICIOUS | "glimpsed movement" | VERIFIED | `src/ai/guard.ts` → `glimpsed movement` |
| `T03_glimpse_return` | RETURN → SUSPICIOUS | "glimpsed movement" | VERIFIED | `src/ai/guard.ts` → `glimpsed movement` |
| `T04_hear_patrol` | PATROL → SUSPICIOUS | "heard {noise}" | VERIFIED | `src/ai/guard.ts` → `heard ${noise.source}` |
| `T04_hear_return` | RETURN → SUSPICIOUS | "heard {noise}" | VERIFIED | `src/ai/guard.ts` → `heard ${noise.source}` |
| `T05_hear_while_searching` | SEARCH → INVESTIGATE | "heard {noise}" | VERIFIED | `src/ai/guard.ts` → `T.noiseRetargetDistance` |
| `T06_hear_while_investigating` | INVESTIGATE → INVESTIGATE | — | VERIFIED | `src/ai/guard.ts` → `T.noiseRetargetDistance`<br>`src/ai/guard-state.ts` → `if (g.mode === to) return` |
| `T07_lost_sight_suspicious` | SUSPICIOUS → INVESTIGATE | "going to check it out" | VERIFIED | `src/ai/guard.ts` → `going to check it out` |
| `T08_investigated` | INVESTIGATE → SEARCH | "nothing here, searching" | VERIFIED | `src/ai/guard.ts` → `nothing here, searching` |
| `T09_lost_intruder` | CHASE → SEARCH | "lost the intruder" | VERIFIED | `src/ai/guard.ts` → `lost the intruder` |
| `T10_search_over` | SEARCH → RETURN | "giving up the search" | VERIFIED | `src/ai/guard.ts` → `giving up the search` |
| `T11_back_on_route` | RETURN → PATROL | "back on patrol" | VERIFIED | `src/ai/guard.ts` → `back on patrol` |

### Security camera (`sm_camera`): VERIFIED

Applies to camera_01, camera_02, camera_03, camera_04 · state in `$self.Camera.mode` · source `src/world/cameras.ts` → `updateCamera`

| Transition | From → To | Logged reason | Fidelity | Source |
|---|---|---|---|---|
| `C01_deactivate` | * → off | — | VERIFIED | `src/world/cameras.ts` → `if (!active)` |
| `C02_sees_player` | * → track | — | VERIFIED | `src/world/cameras.ts` → `c.mode = "track"` |
| `C03_loses_player` | * → scan | — | VERIFIED | `src/world/cameras.ts` → `c.mode = "scan"` |

### Alarm (`sm_alarm`): VERIFIED

Applies to alarm_01 · state in `$self.Alarm.active` · source `src/world/facility.ts` → `setAlarm`<br>`src/world/security.ts` → `updateSecurity`

| Transition | From → To | Logged reason | Fidelity | Source |
|---|---|---|---|---|
| `A01_raised` | inactive → active | "{camera} spotted you. Alarm!" | VERIFIED | `src/world/facility.ts` → `raiseAlarm` |
| `A02_timed_out` | active → inactive | "The alarm timed out." | VERIFIED | `src/world/security.ts` → `The alarm timed out.` |
| `A03_reset` | active → inactive | "Alarm reset." | VERIFIED | `src/world/facility.ts` → `resetAlarm` |

### Facility power (`sm_power`): VERIFIED

Applies to generator_01 · state in `$self.Power.on` · source `src/world/facility.ts` → `toggleGenerator`

| Transition | From → To | Logged reason | Fidelity | Source |
|---|---|---|---|---|
| `P01_cut` | on → off | — | VERIFIED | `src/world/facility.ts` → `toggleGenerator` |
| `P02_restore` | off → on | — | VERIFIED | `src/world/facility.ts` → `toggleGenerator` |

### Sliding door (`sm_door`): APPROXIMATION

Applies to door_lab_security, door_corridor_security, door_corridor_lab, door_archive_restricted, door_exit, door_security, door_corridor_reception, door_corridor_storage, door_reception_storage, door_entrance_reception · state in `$self.Door.open` · source `src/world/doors.ts` → `updateDoors`

| Transition | From → To | Logged reason | Fidelity | Source |
|---|---|---|---|---|
| `D01_unlocked` | locked → closed | — | VERIFIED | `src/world/facility.ts` → `secure.locked = false`<br>`src/world/facility.ts` → `exit.locked = false` |
| `D02_someone_near` | closed → open | — | APPROXIMATION | `src/world/doors.ts` → `OPEN_RADIUS` |
| `D03_nobody_near` | open → closed | — | APPROXIMATION | `src/world/doors.ts` → `-SPEED` |

### Game session (screens) (`sm_session`): VERIFIED

Applies to session · state in `$self.Session.appState` · source `src/game.ts` → `function setState`<br>`src/ui/screens.ts` → `type AppState`

| Transition | From → To | Logged reason | Fidelity | Source |
|---|---|---|---|---|
| `S01_start` | title → playing | — | VERIFIED | `src/game.ts` → `onClick("start", play)` |
| `S02_pause` | playing → paused | — | VERIFIED | `src/game.ts` → `setState("paused")` |
| `S03_resume` | paused → playing | — | VERIFIED | `src/game.ts` → `onClick("resume", play)` |
| `S04_terminal` | playing → terminal | — | VERIFIED | `src/game.ts` → `setState("terminal")` |
| `S05_log_out` | terminal → playing | — | VERIFIED | `src/game.ts` → `onClick("t-close"` |
| `S06_open_inventory` | playing → inventory | — | VERIFIED | `src/game.ts` → `setState("inventory")` |
| `S07_close_inventory` | inventory → playing | — | VERIFIED | `src/game.ts` → `else if (state === "inventory") setState("playing")` |
| `S08_end` | * → ended | — | VERIFIED | `src/game.ts` → `setState("ended")` |
| `S09_restart` | * → playing | — | VERIFIED | `src/game.ts` → `function restart` |

## Events

| Event | Runtime | Source |
|---|---|---|
| `ev_interact` | internal (not a GameEvent) | `src/world/facility.ts` → `this.focus()?.item.use(this)` |
| `ev_terminal_command` | internal (not a GameEvent) | `src/game.ts` → `onClick("t-cams"`<br>`src/game.ts` → `onClick("t-alarm"` |
| `ev_ui` | internal (not a GameEvent) | `src/game.ts` → `function keys`<br>`src/game.ts` → `onClick("start", play)` |
| `ev_power` | GameEvent `"power"` | `src/world/facility.ts` → `type: "power"` |
| `ev_generator` | GameEvent `"generator"` | `src/world/facility.ts` → `type: "generator"` |
| `ev_noise` | internal (not a GameEvent) | `src/world/player.ts` → `noises.push`<br>`src/world/facility.ts` → `this.noises.push` |
| `ev_step` | GameEvent `"step"` | `src/world/player.ts` → `type: "step"` |
| `ev_terminal_opened` | GameEvent `"terminal"` | `src/world/interact.ts` → `type: "terminal"` |
| `ev_cameras` | GameEvent `"cameras"` | `src/world/facility.ts` → `type: "cameras"` |
| `ev_camera_detected` | internal (not a GameEvent) | `src/world/cameras.ts` → `return was < 1 && c.detect >= 1` |
| `ev_camera_report` | internal (not a GameEvent) | `src/world/security.ts` → `ALARM_REPORT_INTERVAL` |
| `ev_alarm` | GameEvent `"alarm"` | `src/world/facility.ts` → `type: "alarm"` |
| `ev_guard_state` | GameEvent `"guard"` | `src/ai/guard-state.ts` → `type: "guard"` |
| `ev_spotted` | GameEvent `"spotted"` | `src/ai/guard.ts` → `type: "spotted"` |
| `ev_pickup` | GameEvent `"pickup"` | `src/world/facility.ts` → `type: "pickup"` |
| `ev_door_opening` | GameEvent `"door"` | `src/world/doors.ts` → `type: "door"` |
| `ev_message` | GameEvent `"toast"` | `src/world/facility.ts` → `type: "toast"` |
| `ev_objective` | GameEvent `"objective"` | `src/world/facility.ts` → `type: "objective"` |
| `ev_end` | GameEvent `"end"` | `src/world/facility.ts` → `type: "end"` |

## Objectives and outcomes

- **1.** "Find a keycard to get into the restricted wing.": `src/world/facility.ts` → `get objective`
- **2.** "Retrieve the research drive from the Archive in the restricted wing.": `src/world/facility.ts` → `get objective`
- **3.** "Escape through the emergency exit at the west end of the corridor.": `src/world/facility.ts` → `get objective`<br>`src/world/facility.ts` → `You escaped with the research.`
- **won:** "You escaped with the research.": `src/world/facility.ts` → `EXIT_LINE_X`
- **lost:** "{guard} caught you.": `src/ai/guard.ts` → `sight.distance < CATCH_DISTANCE`
