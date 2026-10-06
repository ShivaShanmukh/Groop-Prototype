import type { StateMachine } from "../schema";
import { and, eq, isFalse, isTrue, lte, not, or, pred, ref, src, val } from "./dsl";

const camActive = and(isTrue("generator_01.Power.on"), isTrue("terminal_01.Terminal.camerasEnabled"));
const camSees = pred("sees", ref("$self"), ref("player"));

/** Camera, alarm, power, door and session machines. */
export const OTHER_MACHINES: StateMachine[] = [
  {
    id: "sm_camera", name: "Security camera", appliesTo: ["camera_01", "camera_02", "camera_03", "camera_04"],
    stateRef: "$self.Camera.mode", initial: "scan", fidelity: "verified", source: [src("src/world/cameras.ts", "updateCamera")],
    states: [
      { id: "off", behaviour: "No power or switched off at the terminal: no cone, detection reset to 0." },
      { id: "scan", behaviour: "Sweeps ±sweep around baseYaw; detection drains at decay per second." },
      { id: "track", behaviour: "Turns to follow the player; detection builds over detectTime s (×crouchTimeMultiplier if crouched). Reaching 1 emits ev_camera_detected." },
    ],
    transitions: [
      { id: "C01_deactivate", from: "*", to: "off", priority: 0, when: not(camActive), actions: [{ do: "set", target: "$self.Camera.detect", value: val(0) }], reason: null, source: [src("src/world/cameras.ts", "if (!active)")], fidelity: "verified" },
      { id: "C02_sees_player", from: "*", to: "track", priority: 1, when: and(camActive, camSees), actions: [], reason: null, source: [src("src/world/cameras.ts", 'c.mode = "track"')], fidelity: "verified" },
      { id: "C03_loses_player", from: "*", to: "scan", priority: 2, when: and(camActive, not(camSees)), actions: [], reason: null, source: [src("src/world/cameras.ts", 'c.mode = "scan"')], fidelity: "verified" },
    ],
  },
  {
    id: "sm_alarm", name: "Alarm", appliesTo: ["alarm_01"], stateRef: "$self.Alarm.active", initial: "inactive", fidelity: "verified",
    source: [src("src/world/facility.ts", "setAlarm"), src("src/world/security.ts", "updateSecurity")],
    states: [
      { id: "inactive", behaviour: "Quiet." },
      { id: "active", behaviour: "Siren and red lights; guards boosted (rule R10); counts down from duration." },
    ],
    transitions: [
      { id: "A01_raised", from: "inactive", to: "active", priority: 0, when: pred("event", ref("ev_camera_detected")), actions: [{ do: "alertGuards", source: "player" }], reason: "{camera} spotted you. Alarm!", source: [src("src/world/facility.ts", "raiseAlarm")], fidelity: "verified" },
      { id: "A02_timed_out", from: "active", to: "inactive", priority: 1, when: lte(ref("$self.Alarm.timer"), val(0)), actions: [], reason: "The alarm timed out.", source: [src("src/world/security.ts", "The alarm timed out.")], fidelity: "verified" },
      { id: "A03_reset", from: "active", to: "inactive", priority: 1, when: and(pred("event", ref("ev_terminal_command")), eq(ref("$event.command"), val("resetAlarm")), isTrue("generator_01.Power.on")), actions: [], reason: "Alarm reset.", source: [src("src/world/facility.ts", "resetAlarm")], fidelity: "verified" },
    ],
  },
  {
    id: "sm_power", name: "Facility power", appliesTo: ["generator_01"], stateRef: "$self.Power.on", initial: "on", fidelity: "verified",
    source: [src("src/world/facility.ts", "toggleGenerator")],
    states: [
      { id: "on", behaviour: "Lights on, cameras can run, terminal works, guards see sightLit." },
      { id: "off", behaviour: "Emergency lighting, cameras off, terminal dead, guards see sightDark." },
    ],
    transitions: [
      { id: "P01_cut", from: "on", to: "off", priority: 0, when: and(pred("event", ref("ev_interact")), eq(ref("$event.target"), val("generator_01"))), actions: [{ do: "emit", event: "ev_power" }], reason: null, source: [src("src/world/facility.ts", "toggleGenerator")], fidelity: "verified" },
      { id: "P02_restore", from: "off", to: "on", priority: 0, when: and(pred("event", ref("ev_interact")), eq(ref("$event.target"), val("generator_01"))), actions: [{ do: "emit", event: "ev_power" }], reason: null, source: [src("src/world/facility.ts", "toggleGenerator")], fidelity: "verified" },
    ],
  },
  {
    id: "sm_door", name: "Sliding door", appliesTo: [], stateRef: "$self.Door.open", initial: "closed", fidelity: "approximation",
    source: [src("src/world/doors.ts", "updateDoors")],
    states: [
      { id: "locked", behaviour: "Never opens (security door until the keycard is used; exit until the drive is taken)." },
      { id: "closed", behaviour: "open = 0. Solid; blocks sight." },
      { id: "open", behaviour: "open eases toward 1 at speed/s. Passable once open ≥ 0.85; blocks sight while < 0.5." },
    ],
    transitions: [
      { id: "D01_unlocked", from: "locked", to: "closed", priority: 0, when: isFalse("$self.Door.locked"), actions: [], reason: null, source: [src("src/world/facility.ts", "secure.locked = false"), src("src/world/facility.ts", "exit.locked = false")], fidelity: "verified" },
      { id: "D02_someone_near", from: "closed", to: "open", priority: 1, when: and(isFalse("$self.Door.locked"), or(pred("within", ref("player"), ref("$self"), ref("$self.Door.openRadius")), pred("within", ref("@guard"), ref("$self"), ref("$self.Door.openRadius")))), actions: [{ do: "emit", event: "ev_door_opening" }], reason: null, source: [src("src/world/doors.ts", "OPEN_RADIUS")], fidelity: "approximation" },
      { id: "D03_nobody_near", from: "open", to: "closed", priority: 1, when: not(or(pred("within", ref("player"), ref("$self"), ref("$self.Door.openRadius")), pred("within", ref("@guard"), ref("$self"), ref("$self.Door.openRadius")))), actions: [], reason: null, source: [src("src/world/doors.ts", "-SPEED")], fidelity: "approximation" },
    ],
  },
  {
    id: "sm_session", name: "Game session (screens)", appliesTo: ["session"], stateRef: "$self.Session.appState", initial: "title", fidelity: "verified",
    source: [src("src/game.ts", "function setState"), src("src/ui/screens.ts", "type AppState")],
    states: ["title", "playing", "paused", "terminal", "inventory", "ended"].map((id) => ({ id, behaviour: id === "playing" ? "Game updates; player input enabled." : id === "terminal" || id === "inventory" ? "Game keeps running; player input disabled." : "Game paused or not started." })),
    transitions: [
      { id: "S01_start", from: "title", to: "playing", priority: 0, when: and(pred("event", ref("ev_ui")), eq(ref("$event.command"), val("start"))), actions: [], reason: null, source: [src("src/game.ts", 'onClick("start", play)')], fidelity: "verified" },
      { id: "S02_pause", from: "playing", to: "paused", priority: 0, when: and(pred("event", ref("ev_ui")), eq(ref("$event.command"), val("pause"))), actions: [], reason: null, source: [src("src/game.ts", 'setState("paused")')], fidelity: "verified" },
      { id: "S03_resume", from: "paused", to: "playing", priority: 0, when: and(pred("event", ref("ev_ui")), eq(ref("$event.command"), val("resume"))), actions: [], reason: null, source: [src("src/game.ts", 'onClick("resume", play)')], fidelity: "verified" },
      { id: "S04_terminal", from: "playing", to: "terminal", priority: 0, when: pred("event", ref("ev_terminal_opened")), actions: [], reason: null, source: [src("src/game.ts", 'setState("terminal")')], fidelity: "verified" },
      { id: "S05_log_out", from: "terminal", to: "playing", priority: 0, when: and(pred("event", ref("ev_ui")), eq(ref("$event.command"), val("logout"))), actions: [], reason: null, source: [src("src/game.ts", 'onClick("t-close"')], fidelity: "verified" },
      { id: "S06_open_inventory", from: "playing", to: "inventory", priority: 0, when: and(pred("event", ref("ev_ui")), eq(ref("$event.command"), val("inventory"))), actions: [], reason: null, source: [src("src/game.ts", 'setState("inventory")')], fidelity: "verified" },
      { id: "S07_close_inventory", from: "inventory", to: "playing", priority: 0, when: and(pred("event", ref("ev_ui")), eq(ref("$event.command"), val("inventory"))), actions: [], reason: null, source: [src("src/game.ts", 'else if (state === "inventory") setState("playing")')], fidelity: "verified" },
      { id: "S08_end", from: "*", to: "ended", priority: 0, when: pred("event", ref("ev_end")), actions: [], reason: null, source: [src("src/game.ts", 'setState("ended")')], fidelity: "verified" },
      { id: "S09_restart", from: "*", to: "playing", priority: 1, when: and(pred("event", ref("ev_ui")), eq(ref("$event.command"), val("restart"))), actions: [], reason: null, source: [src("src/game.ts", "function restart")], fidelity: "verified" },
    ],
  },
];
