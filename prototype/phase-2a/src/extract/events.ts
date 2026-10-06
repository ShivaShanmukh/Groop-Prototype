import type { EventDef } from "../schema";
import { src } from "./dsl";

const CAMERAS = ["camera_01", "camera_02", "camera_03", "camera_04"];
const GUARDS = ["guard_01", "guard_02", "guard_03"];

/** Events in the running game. runtimeType = the GameEvent "type" (null = internal, not a GameEvent). */
export function events(doorIds: string[]): EventDef[] {
  return [
    { id: "ev_interact", description: "Player pressed E while an interactable was in focus", emittedBy: ["player"], payload: ["target"], runtimeType: null, source: [src("src/world/facility.ts", "this.focus()?.item.use(this)")] },
    { id: "ev_terminal_command", description: "A terminal menu button was used (1 = cameras, 2 = reset alarm)", emittedBy: ["terminal_01"], payload: ["command"], runtimeType: null, source: [src("src/game.ts", 'onClick("t-cams"'), src("src/game.ts", 'onClick("t-alarm"')] },
    { id: "ev_ui", description: "A screen command: start, pause (Esc / mouse released), resume, inventory (Tab), log out of terminal, restart", emittedBy: ["session"], payload: ["command"], runtimeType: null, source: [src("src/game.ts", "function keys"), src("src/game.ts", 'onClick("start", play)')] },
    { id: "ev_power", description: "Power switched on or off", emittedBy: ["generator_01"], payload: ["on"], runtimeType: "power", source: [src("src/world/facility.ts", 'type: "power"')] },
    { id: "ev_generator", description: "Generator was operated (loud)", emittedBy: ["generator_01"], payload: [], runtimeType: "generator", source: [src("src/world/facility.ts", 'type: "generator"')] },
    { id: "ev_noise", description: "A sound guards may hear (footsteps, generator). Lasts one frame.", emittedBy: ["player", "generator_01"], payload: ["position", "radius", "source"], runtimeType: null, source: [src("src/world/player.ts", "noises.push"), src("src/world/facility.ts", "this.noises.push")] },
    { id: "ev_step", description: "Player footstep", emittedBy: ["player"], payload: ["loud"], runtimeType: "step", source: [src("src/world/player.ts", 'type: "step"')] },
    { id: "ev_terminal_opened", description: "Terminal menu opened (only with power)", emittedBy: ["terminal_01"], payload: [], runtimeType: "terminal", source: [src("src/world/interact.ts", 'type: "terminal"')] },
    { id: "ev_cameras", description: "Cameras switched from the terminal", emittedBy: ["terminal_01"], payload: ["on"], runtimeType: "cameras", source: [src("src/world/facility.ts", 'type: "cameras"')] },
    { id: "ev_camera_detected", description: "A camera's detection reached 1", emittedBy: CAMERAS, payload: ["camera"], runtimeType: null, source: [src("src/world/cameras.ts", "return was < 1 && c.detect >= 1")] },
    { id: "ev_camera_report", description: "A camera still sees the player during an alarm (every report interval)", emittedBy: CAMERAS, payload: ["camera"], runtimeType: null, source: [src("src/world/security.ts", "ALARM_REPORT_INTERVAL")] },
    { id: "ev_alarm", description: "Alarm turned on or off", emittedBy: ["alarm_01"], payload: ["on"], runtimeType: "alarm", source: [src("src/world/facility.ts", 'type: "alarm"')] },
    { id: "ev_guard_state", description: "A guard changed state", emittedBy: GUARDS, payload: ["from", "to", "why"], runtimeType: "guard", source: [src("src/ai/guard-state.ts", 'type: "guard"')] },
    { id: "ev_spotted", description: "A guard started chasing", emittedBy: GUARDS, payload: ["by"], runtimeType: "spotted", source: [src("src/ai/guard.ts", 'type: "spotted"')] },
    { id: "ev_pickup", description: "An item was picked up", emittedBy: ["keycard_01", "drive_01"], payload: ["item"], runtimeType: "pickup", source: [src("src/world/facility.ts", 'type: "pickup"')] },
    { id: "ev_door_opening", description: "A closed door started opening", emittedBy: doorIds, payload: [], runtimeType: "door", source: [src("src/world/doors.ts", 'type: "door"')] },
    { id: "ev_message", description: "On-screen message (toast)", emittedBy: ["session"], payload: ["text"], runtimeType: "toast", source: [src("src/world/facility.ts", 'type: "toast"')] },
    { id: "ev_objective", description: "Objective text changed. Emitted, but nothing in the runtime listens to it (the HUD reads the objective directly).", emittedBy: ["session"], payload: ["text"], runtimeType: "objective", source: [src("src/world/facility.ts", 'type: "objective"')] },
    { id: "ev_end", description: "Run ended (won or lost)", emittedBy: ["session"], payload: ["outcome", "reason"], runtimeType: "end", source: [src("src/world/facility.ts", 'type: "end"')] },
  ];
}
