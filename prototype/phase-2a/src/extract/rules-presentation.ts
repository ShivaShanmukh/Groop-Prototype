import type { Rule } from "../schema";
import { eq, isFalse, isTrue, ref, src, val } from "./dsl";

const fb = (channel: "audio" | "visual" | "hud", cue: string) => ({ do: "feedback" as const, channel, cue });

/** Presentation rules: rendering, audio and HUD reacting to game state. No gameplay effect. */
export const PRESENTATION_RULES: Rule[] = [
  {
    id: "P01_emergency_lighting", title: "Power off: room lights drop to dim amber emergency lighting; ceiling panels go dark", category: "presentation",
    trigger: "frame", condition: isFalse("generator_01.Power.on"), actions: [fb("visual", "emergency amber lighting, hemisphere light 0.16")],
    affects: ["lighting_01"], source: [src("src/render/lights.ts", "EMERGENCY")], fidelity: "code-read",
  },
  {
    id: "P02_alarm_lighting", title: "Alarm on: lights pulse red", category: "presentation",
    trigger: "frame", condition: isTrue("alarm_01.Alarm.active"), actions: [fb("visual", "red pulse on room lights and panels")],
    affects: ["lighting_01"], source: [src("src/render/lights.ts", "ALARM")], fidelity: "code-read",
  },
  {
    id: "P03_siren", title: "Alarm on/off starts/stops the siren", category: "presentation",
    trigger: { event: "ev_alarm" }, actions: [fb("audio", "siren (square wave, 1.6 Hz wobble)")],
    affects: ["audio_01"], source: [src("src/game.ts", 'case "alarm": return sfx.setAlarm(e.on)')], fidelity: "code-read",
  },
  {
    id: "P04_generator_hum", title: "Power on/off starts/stops the generator hum", category: "presentation",
    trigger: { event: "ev_power" }, actions: [fb("audio", "55 Hz hum")],
    affects: ["audio_01"], source: [src("src/game.ts", 'case "power": return sfx.setHum(e.on)')], fidelity: "code-read",
  },
  {
    id: "P05_generator_clunk", title: "Operating the generator plays a clunk", category: "presentation",
    trigger: { event: "ev_generator" }, actions: [fb("audio", "clunk")], affects: ["audio_01"], source: [src("src/game.ts", 'case "generator": return sfx.clunk()')], fidelity: "code-read",
  },
  {
    id: "P06_footstep_sound", title: "Footsteps are audible to the player (louder when sprinting)", category: "presentation",
    trigger: { event: "ev_step" }, actions: [fb("audio", "filtered noise tick")], affects: ["audio_01"], source: [src("src/game.ts", 'case "step": return sfx.step(e.loud)')], fidelity: "code-read",
  },
  {
    id: "P07_pickup_chime", title: "Picking something up plays a chime", category: "presentation",
    trigger: { event: "ev_pickup" }, actions: [fb("audio", "two-note chime")], affects: ["audio_01"], source: [src("src/game.ts", 'case "pickup": return sfx.pickup()')], fidelity: "code-read",
  },
  {
    id: "P08_door_sound", title: "A door starting to open plays a whoosh", category: "presentation",
    trigger: { event: "ev_door_opening" }, actions: [fb("audio", "door whoosh")], affects: ["audio_01"], source: [src("src/game.ts", 'case "door": return sfx.door()')], fidelity: "code-read",
  },
  {
    id: "P09_spotted_sting", title: "A guard starting a chase plays an alert sting (the only guard sound)", category: "presentation",
    trigger: { event: "ev_spotted" }, actions: [fb("audio", "rising sawtooth sting")], affects: ["audio_01"], source: [src("src/game.ts", 'case "spotted": return sfx.spotted()')], fidelity: "code-read",
  },
  {
    id: "P10_end_screen", title: "Run end: stings, siren off, end screen with stats", category: "presentation",
    trigger: { event: "ev_end" }, actions: [fb("audio", "win/lose stings"), fb("hud", "end screen: time, times spotted, alarms")],
    affects: ["audio_01", "hud_01", "session"], source: [src("src/game.ts", 'case "end":'), src("src/ui/screens.ts", "renderEnd")], fidelity: "code-read",
  },
  {
    id: "P11_messages", title: "Messages appear as toasts", category: "presentation",
    trigger: { event: "ev_message" }, actions: [fb("hud", "toast for 4 s")], affects: ["hud_01"], source: [src("src/game.ts", 'case "toast": return hud.toast(e.text)')], fidelity: "code-read",
  },
  {
    id: "P12_terminal_menu", title: "Terminal opened: menu overlay, mouse released", category: "presentation",
    trigger: { event: "ev_terminal_opened" }, actions: [fb("hud", "terminal menu: 1 cameras, 2 reset alarm, Esc log out")],
    affects: ["hud_01", "session"], source: [src("src/game.ts", 'case "terminal":')], fidelity: "code-read",
  },
  {
    id: "P13_guard_icons", title: "Guards show ? (suspicious, investigating, searching) or ! (chasing) above their heads", category: "presentation",
    trigger: "frame", actions: [fb("visual", "alert icon with suspicion ring")], affects: ["@guard"], source: [src("src/render/guards.ts", "const ICON")], fidelity: "code-read",
  },
  {
    id: "P14_camera_cones", title: "Active cameras show a vision cone that warms from blue to red as detection builds; LED red when it sees you", category: "presentation",
    trigger: "frame", actions: [fb("visual", "cone colour = detect; hidden when off")], affects: ["@camera"], source: [src("src/render/objects.ts", "v.cone.visible")], fidelity: "code-read",
  },
  {
    id: "P15_door_lights", title: "Door light strip: blue for normal doors, red when locked, green when unlocked", category: "presentation",
    trigger: "frame", actions: [fb("visual", "door status strip")], affects: ["@door"], source: [src("src/render/doors.ts", "COLORS")], fidelity: "code-read",
  },
  {
    id: "P16_terminal_screen", title: "Terminal screen goes black without power", category: "presentation",
    trigger: "frame", condition: isFalse("generator_01.Power.on"), actions: [fb("visual", "terminal screen off")], affects: ["terminal_01"], source: [src("src/render/objects.ts", "this.termOff")], fidelity: "code-read",
  },
  {
    id: "P17_generator_lamp", title: "Generator lamp green when on, red when off; fan spins only with power", category: "presentation",
    trigger: "frame", actions: [fb("visual", "status lamp + fan")], affects: ["generator_01"], source: [src("src/render/objects.ts", "genLamp")], fidelity: "code-read",
  },
  {
    id: "P18_hud_status", title: "HUD shows posture, power, cameras, alarm countdown, detection meter and red vignette while chased", category: "presentation",
    trigger: "frame", condition: eq(ref("session.Session.appState"), val("playing")), actions: [fb("hud", "status chips, detection meter, vignette")],
    affects: ["hud_01"], source: [src("src/ui/hud.ts", "update(f: Facility)")], fidelity: "code-read",
  },
];
