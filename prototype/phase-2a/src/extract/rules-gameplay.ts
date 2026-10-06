import type { Rule } from "../schema";
import { and, eq, gt, gte, isFalse, isTrue, lte, neq, not, or, pred, ref, src, target, val } from "./dsl";

const CAMS = ["camera_01", "camera_02", "camera_03", "camera_04"];
const GUARDS = ["guard_01", "guard_02", "guard_03"];
const F = "src/world/facility.ts";
const POWER = "generator_01.Power.on";
const ALARM = "alarm_01.Alarm.active";

/** Gameplay rules: each one is implemented by the cited code (checked by tests/conformance). */
export const GAMEPLAY_RULES: Rule[] = [
  {
    id: "R01_generator_toggle", title: "E on the generator toggles power, loudly", category: "gameplay",
    trigger: { event: "ev_interact" }, condition: target("generator_01"),
    actions: [
      { do: "set", target: POWER, value: not(ref(POWER)) }, { do: "emit", event: "ev_power" }, { do: "emit", event: "ev_generator" },
      { do: "noise", at: "generator_01", radius: ref("generator_01.Power.noiseRadius"), source: "the generator" },
      { do: "message", text: "Generator down. Lights out, cameras offline. / Generator restarted. Lights and cameras are back." },
    ],
    affects: ["generator_01"], source: [src(F, "toggleGenerator")], fidelity: "verified",
  },
  {
    id: "R02_cameras_need_power_and_switch", title: "Cameras only work with power on and the terminal switch on", category: "gameplay",
    trigger: "frame", condition: or(isFalse(POWER), isFalse("terminal_01.Terminal.camerasEnabled")),
    actions: [{ do: "set", target: "@camera.Camera.mode", value: val("off") }, { do: "set", target: "@camera.Camera.detect", value: val(0) }],
    affects: CAMS, source: [src(F, "get camerasActive"), src("src/world/cameras.ts", "if (!active)")], fidelity: "verified",
  },
  {
    id: "R03_terminal_opens_with_power", title: "E on the terminal opens its menu, only with power", category: "gameplay",
    trigger: { event: "ev_interact" }, condition: and(target("terminal_01"), isTrue(POWER)),
    actions: [{ do: "emit", event: "ev_terminal_opened" }], affects: ["terminal_01"], source: [src("src/world/interact.ts", 'id: "terminal"')], fidelity: "verified",
  },
  {
    id: "R04_terminal_dead_without_power", title: "Without power the terminal does nothing", category: "gameplay",
    trigger: { event: "ev_interact" }, condition: and(target("terminal_01"), isFalse(POWER)),
    actions: [{ do: "message", text: "The terminal is dead. The generator is off." }], affects: ["terminal_01"], source: [src("src/world/interact.ts", "The terminal is dead")], fidelity: "verified",
  },
  {
    id: "R05_terminal_toggles_cameras", title: "Terminal option 1 switches cameras on/off (needs power)", category: "gameplay",
    trigger: { event: "ev_terminal_command" }, condition: and(eq(ref("$event.command"), val("cameras")), isTrue(POWER)),
    actions: [{ do: "set", target: "terminal_01.Terminal.camerasEnabled", value: not(ref("terminal_01.Terminal.camerasEnabled")) }, { do: "emit", event: "ev_cameras" }],
    affects: ["terminal_01", ...CAMS], source: [src(F, "setCameras")], fidelity: "verified",
  },
  {
    id: "R06_terminal_resets_alarm", title: "Terminal option 2 resets an active alarm (needs power)", category: "gameplay",
    trigger: { event: "ev_terminal_command" }, condition: and(eq(ref("$event.command"), val("resetAlarm")), isTrue(POWER), isTrue(ALARM)),
    actions: [{ do: "set", target: ALARM, value: val(false) }, { do: "emit", event: "ev_alarm" }, { do: "message", text: "Alarm reset." }],
    affects: ["alarm_01"], source: [src(F, "resetAlarm")], fidelity: "verified",
  },
  {
    id: "R07_dark_halves_guard_sight", title: "Power off: guards use their dark sight range", category: "gameplay",
    trigger: "frame", condition: isFalse(POWER),
    actions: [{ do: "replace", target: "@guard.Perception.sightLit", with: ref("@guard.Perception.sightDark") }],
    affects: GUARDS, source: [src("src/ai/perception.ts", "s.power ? s.params.guardSightRange : SIGHT.dark")], fidelity: "verified",
  },
  {
    id: "R08_crouch_reduces_guard_sight", title: "Crouching shrinks how far guards see you", category: "gameplay",
    trigger: "frame", condition: isTrue("player.Posture.crouching"),
    actions: [{ do: "scale", target: "@guard.Perception.sightLit", by: ref("@guard.Perception.crouchMultiplier") }],
    affects: GUARDS, source: [src("src/ai/perception.ts", "SIGHT.crouch")], fidelity: "verified",
  },
  {
    id: "R09_shadow_hiding", title: "Crouched, still and in the dark: sight shrinks again", category: "gameplay",
    trigger: "frame", condition: and(isFalse(POWER), isTrue("player.Posture.crouching"), isFalse("player.Mover.moving")),
    actions: [{ do: "scale", target: "@guard.Perception.sightLit", by: ref("@guard.Perception.shadowMultiplier") }],
    affects: GUARDS, source: [src("src/ai/perception.ts", "SIGHT.shadow")], fidelity: "verified",
  },
  {
    id: "R10_alarm_boosts_guards", title: "During an alarm guards see further, move faster, suspect faster and search longer", category: "gameplay",
    trigger: "frame", condition: isTrue(ALARM),
    actions: [
      { do: "scale", target: "@guard.Perception.sightLit", by: ref("@guard.Perception.alarmMultiplier") },
      ...["patrolSpeed", "investigateSpeed", "chaseSpeed", "searchSpeed", "returnSpeed"].map((p) => ({ do: "scale" as const, target: `@guard.GuardBrain.${p}`, by: ref("@guard.GuardBrain.alarmSpeedMultiplier") })),
      { do: "scale", target: "@guard.GuardBrain.suspicionRate", by: ref("@guard.GuardBrain.alarmSuspicionMultiplier") },
      { do: "replace", target: "@guard.GuardBrain.searchTime", with: ref("@guard.GuardBrain.searchTimeAlarm") },
    ],
    affects: GUARDS, source: [src("src/ai/perception.ts", "SIGHT.alarm"), src("src/ai/guard.ts", "ALARM_SPEED_MULTIPLIER"), src("src/ai/guard.ts", "S.alarmMultiplier"), src("src/ai/guard.ts", "T.searchDuringAlarm")], fidelity: "verified",
  },
  {
    id: "R11_camera_trips_alarm", title: "A camera that detects you raises the alarm and alerts every guard", category: "gameplay",
    trigger: { event: "ev_camera_detected" },
    actions: [{ do: "set", target: ALARM, value: val(true) }, { do: "set", target: "alarm_01.Alarm.timer", value: ref("alarm_01.Alarm.duration") }, { do: "emit", event: "ev_alarm" }, { do: "alertGuards", source: "player" }, { do: "message", text: "{camera} spotted you. Alarm!" }],
    affects: ["alarm_01", ...GUARDS], source: [src("src/world/security.ts", "if (tripped || report) f.raiseAlarm"), src(F, "raiseAlarm")], fidelity: "verified",
  },
  {
    id: "R12_camera_keeps_reporting", title: "During an alarm, a camera that still sees you re-alerts guards every 2 s and restarts the timer", category: "gameplay",
    trigger: { event: "ev_camera_report" }, condition: isTrue(ALARM),
    actions: [{ do: "set", target: "alarm_01.Alarm.timer", value: ref("alarm_01.Alarm.duration") }, { do: "alertGuards", source: "player" }],
    affects: ["alarm_01", ...GUARDS], source: [src("src/world/security.ts", "ALARM_REPORT_INTERVAL"), src(F, "raiseAlarm")], fidelity: "verified",
  },
  {
    id: "R13_alarm_times_out", title: "The alarm switches itself off after its duration", category: "gameplay",
    trigger: "frame", condition: and(isTrue(ALARM), lte(ref("alarm_01.Alarm.timer"), val(0))),
    actions: [{ do: "set", target: ALARM, value: val(false) }, { do: "emit", event: "ev_alarm" }, { do: "message", text: "The alarm timed out." }],
    affects: ["alarm_01"], source: [src("src/world/security.ts", "The alarm timed out.")], fidelity: "verified",
  },
  {
    id: "R14_take_keycard", title: "E on the keycard puts it in the inventory", category: "gameplay",
    trigger: { event: "ev_interact" }, condition: and(target("keycard_01"), isFalse("keycard_01.Item.taken")),
    actions: [{ do: "give", item: "keycard_01", to: "player" }, { do: "emit", event: "ev_pickup" }, { do: "emit", event: "ev_objective" }],
    affects: ["keycard_01", "player"], source: [src(F, "pickUp")], fidelity: "verified",
  },
  {
    id: "R15_keycard_unlocks_security_door", title: "Coming within 2.6 m of the security door with the keycard unlocks it", category: "gameplay",
    trigger: "frame", condition: and(isTrue("door_security.Door.locked"), pred("has", ref("player"), ref("keycard_01")), pred("within", ref("player"), ref("door_security"), ref("keycard_lock.KeycardLock.unlockRadius"))),
    actions: [{ do: "set", target: "door_security.Door.locked", value: val(false) }, { do: "message", text: "Keycard accepted. Restricted wing unlocked." }],
    affects: ["door_security"], source: [src(F, "KEYCARD_UNLOCK_RADIUS")], fidelity: "verified",
  },
  {
    id: "R16_security_door_denies", title: "E on the locked security door without a keycard is refused", category: "gameplay",
    trigger: { event: "ev_interact" }, condition: and(target("door_security"), not(pred("has", ref("player"), ref("keycard_01")))),
    actions: [{ do: "message", text: "Access denied. You need a security keycard." }], affects: ["door_security"], source: [src("src/world/interact.ts", "Access denied")], fidelity: "verified",
  },
  {
    id: "R17_take_drive_lifts_lockdown", title: "Taking the research drive unlocks the emergency exit", category: "gameplay",
    trigger: { event: "ev_interact" }, condition: and(target("drive_01"), isFalse("drive_01.Item.taken")),
    actions: [{ do: "give", item: "drive_01", to: "player" }, { do: "emit", event: "ev_pickup" }, { do: "set", target: "door_exit.Door.locked", value: val(false) }, { do: "message", text: "Lockdown lifted. The emergency exit is open." }, { do: "emit", event: "ev_objective" }],
    affects: ["drive_01", "player", "door_exit"], source: [src(F, 'if (item === "drive")')], fidelity: "verified",
  },
  {
    id: "R18_exit_sealed", title: "E on the sealed exit explains it is locked", category: "gameplay",
    trigger: { event: "ev_interact" }, condition: and(target("door_exit"), isTrue("door_exit.Door.locked")),
    actions: [{ do: "message", text: "Sealed. Lockdown lifts only when the research drive leaves the archive." }], affects: ["door_exit"], source: [src("src/world/interact.ts", "Sealed. Lockdown")], fidelity: "verified",
  },
  {
    id: "R19_doors_open_for_player", title: "Unlocked doors slide open when the player is near", category: "gameplay",
    trigger: "frame", condition: and(isFalse("@door.Door.locked"), pred("within", ref("player"), ref("@door"), ref("@door.Door.openRadius"))),
    actions: [{ do: "set", target: "@door.Door.open", value: val(1) }, { do: "emit", event: "ev_door_opening" }],
    affects: ["@door"], source: [src("src/world/doors.ts", "updateDoors")], fidelity: "approximation",
    note: "The runtime eases `open` toward 1 at Door.speed per second (and back to 0 when nobody is near); the blueprint shows only the target.",
  },
  {
    id: "R20_doors_open_for_guards", title: "Unlocked doors open for guards too, except the emergency exit", category: "gameplay",
    trigger: "frame", condition: and(isFalse("@door.Door.locked"), neq(ref("@door.Door.kind"), val("exit")), pred("within", ref("@guard"), ref("@door"), ref("@door.Door.openRadius"))),
    actions: [{ do: "set", target: "@door.Door.open", value: val(1) }],
    affects: ["@door"], source: [src("src/world/doors.ts", 'b.kind === "player" || d.kind !== "exit"')], fidelity: "approximation",
    note: "Same easing as R19. Guards also cannot plan routes through the exit or a locked security door (grid.walkable).",
  },
  {
    id: "R21_footsteps_walking", title: "Walking (not crouched) makes footsteps heard within 3 m", category: "gameplay",
    trigger: { event: "ev_step" }, condition: and(isFalse("player.Posture.crouching"), isFalse("player.Mover.sprinting")),
    actions: [{ do: "noise", at: "player", radius: ref("player.Footsteps.walkRadius"), source: "footsteps" }],
    affects: GUARDS, source: [src("src/world/player.ts", "STEP_NOISE.walk")], fidelity: "verified",
  },
  {
    id: "R22_footsteps_sprinting", title: "Sprinting makes footsteps heard within the sprint noise radius (Blueprint parameter)", category: "gameplay",
    trigger: { event: "ev_step" }, condition: isTrue("player.Mover.sprinting"),
    actions: [{ do: "noise", at: "player", radius: ref("player.Footsteps.sprintRadius"), source: "running footsteps" }],
    affects: GUARDS, source: [src("src/world/player.ts", "params.sprintNoiseRadius")], fidelity: "verified",
  },
  {
    id: "R23_guard_catches_player", title: "A chasing guard who has finished reacting, sees you and is within 1.2 m catches you", category: "gameplay",
    trigger: "frame",
    condition: and(eq(ref("@guard.GuardBrain.mode"), val("CHASE")), gte(ref("@guard.GuardBrain.modeTime"), ref("@guard.GuardBrain.reactionTime")), pred("sees", ref("@guard"), ref("player")), pred("within", ref("@guard"), ref("player"), ref("@guard.GuardBrain.catchDistance"))),
    actions: [{ do: "endGame", outcome: "lost", reason: "{guard} caught you." }, { do: "emit", event: "ev_end" }],
    affects: ["session"], source: [src("src/ai/guard.ts", "sight.distance < CATCH_DISTANCE"), src(F, "caught you.")], fidelity: "verified",
  },
  {
    id: "R24_escape", title: "Crossing the escape line through the unlocked exit wins", category: "gameplay",
    trigger: "frame", condition: and(isFalse("door_exit.Door.locked"), gt(ref("exit_zone.ExitZone.lineX"), ref("player.Transform.position.x"))),
    actions: [{ do: "endGame", outcome: "won", reason: "You escaped with the research." }, { do: "emit", event: "ev_end" }],
    affects: ["session"], source: [src(F, "EXIT_LINE_X")], fidelity: "verified",
  },
  {
    id: "R25_suspicion_builds", title: "While a guard sees you, suspicion rises (faster when close, during an alarm, or when already alert)", category: "gameplay",
    trigger: "frame", condition: pred("sees", ref("@guard"), ref("player")),
    actions: [{ do: "set", target: "@guard.GuardBrain.suspicion", value: ref("@guard.GuardBrain.suspicionRate") }],
    affects: GUARDS, source: [src("src/ai/guard.ts", "S.rate * sight.strength")], fidelity: "approximation",
    note: "Exact runtime formula per frame: suspicion = min(1, suspicion + suspicionRate × strength × (alarm ? alarmSuspicionMultiplier : 1) × (INVESTIGATE/SEARCH ? alertMultiplier : 1) × (distance < closeDistance ? closeMultiplier : 1) × dt), where strength = max(0.15, 1 − distance / sight range). The blueprint expression language has no arithmetic yet, so the action only names the rate.",
  },
  {
    id: "R26_suspicion_decays", title: "When a guard cannot see you (and is not chasing), suspicion drains", category: "gameplay",
    trigger: "frame", condition: and(not(pred("sees", ref("@guard"), ref("player"))), neq(ref("@guard.GuardBrain.mode"), val("CHASE"))),
    actions: [{ do: "set", target: "@guard.GuardBrain.suspicion", value: ref("@guard.GuardBrain.suspicionDecay") }],
    affects: GUARDS, source: [src("src/ai/guard.ts", "S.decay * dt")], fidelity: "approximation",
    note: "Exact: suspicion = max(0, suspicion − suspicionDecay × dt).",
  },
];
