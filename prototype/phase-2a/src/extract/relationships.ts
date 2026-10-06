import { roomAt } from "../../../phase-1/src/level/map";
import type { Entity, Relationship, RelationshipType } from "../schema";
import { areaId, doorSides } from "./level";
import type { Facility } from "../../../phase-1/src/world/facility";

const CAMS = ["camera_01", "camera_02", "camera_03", "camera_04"];
const GUARDS = ["guard_01", "guard_02", "guard_03"];

let n = 0;
const rel = (type: RelationshipType, from: string, to: string, label: string, via: string[], fidelity: Relationship["fidelity"] = "verified"): Relationship => ({
  id: `rel_${String(++n).padStart(3, "0")}`, type, from, to, label, via, fidelity,
});

/** Cross-system relationships, each implemented by the listed rules / transitions. */
function crossSystem(): Relationship[] {
  return [
    rel("powers", "generator_01", "lighting_01", "Power off → emergency lighting", ["P01_emergency_lighting"]),
    ...CAMS.map((c) => rel("disables", "generator_01", c, "Power off → camera offline", ["R02_cameras_need_power_and_switch", "C01_deactivate"])),
    rel("powers", "generator_01", "terminal_01", "Power off → terminal dead", ["R03_terminal_opens_with_power", "R04_terminal_dead_without_power"]),
    ...GUARDS.map((g) => rel("degrades", "generator_01", g, "Power off → guard sight drops from guardSightRange (Blueprint parameter) to 5.5 m", ["R07_dark_halves_guard_sight", "R09_shadow_hiding"])),
    ...GUARDS.map((g) => rel("attracts", "generator_01", g, "Toggling is loud (30 m, 15 m through walls): guards in earshot investigate", ["R01_generator_toggle", "T04_hear_patrol", "T04_hear_return", "T05_hear_while_searching"])),
    ...CAMS.map((c) => rel("triggers", c, "alarm_01", "Camera detects the player → alarm", ["R11_camera_trips_alarm", "A01_raised"])),
    ...GUARDS.map((g) => rel("alerts", "alarm_01", g, "Alarm → every guard not chasing investigates the sighting", ["R11_camera_trips_alarm", "R12_camera_keeps_reporting", "T01_alarm_alert"])),
    ...GUARDS.map((g) => rel("boosts", "alarm_01", g, "Alarm → sight ×1.35, speed ×1.2, suspicion ×2, search 15 s", ["R10_alarm_boosts_guards"])),
    ...CAMS.map((c) => rel("controls", "terminal_01", c, "Terminal option 1 switches cameras off/on", ["R05_terminal_toggles_cameras"])),
    rel("resets", "terminal_01", "alarm_01", "Terminal option 2 resets the alarm", ["R06_terminal_resets_alarm", "A03_reset"]),
    rel("unlocks", "keycard_01", "door_security", "Carrying the keycard within 2.6 m unlocks the security door", ["R14_take_keycard", "R15_keycard_unlocks_security_door"]),
    rel("controls", "keycard_lock", "door_security", "The keycard reader is what unlocks the door", ["R15_keycard_unlocks_security_door"]),
    rel("unlocks", "drive_01", "door_exit", "Taking the research drive unlocks the emergency exit", ["R17_take_drive_lifts_lockdown"]),
    rel("requires", "exit_zone", "door_exit", "Escaping needs the exit unlocked", ["R24_escape"]),
    ...GUARDS.map((g) => rel("attracts", "player", g, "Footsteps (walk 3 m, sprint = sprintNoiseRadius parameter; crouch silent)", ["R21_footsteps_walking", "R22_footsteps_sprinting", "T04_hear_patrol"])),
    ...GUARDS.map((g) => rel("blocks", "door_security", g, "Guards cannot route through the security door while it is locked", ["R20_doors_open_for_guards"], "approximation")),
    rel("feedback", "alarm_01", "audio_01", "Siren", ["P03_siren"]),
    rel("feedback", "alarm_01", "lighting_01", "Red pulsing lights", ["P02_alarm_lighting"]),
    rel("feedback", "generator_01", "audio_01", "Hum while powered; clunk when operated", ["P04_generator_hum", "P05_generator_clunk"]),
    rel("feedback", "alarm_01", "hud_01", "Alarm chip and countdown, red vignette", ["P18_hud_status"]),
  ];
}

/** Structural relationships computed from the level data. */
function structural(f: Facility, entities: Entity[]): Relationship[] {
  const out: Relationship[] = [];
  for (const d of f.grid.doors) {
    const id = entities.find((e) => e.kind === "door" && e.runtime.object.endsWith(`[${f.grid.doors.indexOf(d)}]`))?.id;
    if (!id) continue;
    for (const side of doorSides(d)) if (side !== "outside") out.push(rel("connects", id, areaId(side), `Door opens onto ${side}`, ["R19_doors_open_for_player"]));
  }
  for (const e of entities) {
    if (!["item", "generator", "terminal", "camera"].includes(e.kind)) continue;
    const pos = e.components.Transform?.position as { x: number; z: number } | undefined;
    const room = pos && roomAt(pos);
    if (room) out.push(rel("contains", areaId(room.id), e.id, `${e.name} is in ${room.name}`, []));
  }
  f.guards.forEach((g, i) => {
    const rooms = [...new Set(g.route.map((p) => roomAt(p)?.id).filter((r): r is NonNullable<typeof r> => !!r))];
    for (const r of rooms) out.push(rel("patrols", `guard_0${i + 1}`, areaId(r), `${g.id}'s route passes through it`, ["T11_back_on_route"]));
  });
  return out;
}

export function relationships(f: Facility, entities: Entity[]): Relationship[] {
  n = 0;
  return [...crossSystem(), ...structural(f, entities)];
}
