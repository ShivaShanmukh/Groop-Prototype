import { ALARM_SPEED_MULTIPLIER, CATCH_DISTANCE, GUARD_TIMING, REACTION_TIME, SPEED as GUARD_SPEED, SUSPICION } from "../../../phase-1/src/ai/guard-state";

/** Properties whose single authoritative value lives in the Blueprint's `parameters` (Phase 2B). */
const param = (id: string) => ({ $param: id });
import { GUARD_RADIUS } from "../../../phase-1/src/ai/move";
import { GUARD_FOV, PERIPHERAL, SIGHT, WALL_SOUND_FACTOR } from "../../../phase-1/src/ai/perception";
import { DRIVE_POS, GENERATOR_POS, KEYCARD_POS, PLAYER_START, TERMINAL_POS } from "../../../phase-1/src/level/map";
import { CAM_CROUCH, CAM_DECAY, CAM_DETECT_TIME, CAM_FOV } from "../../../phase-1/src/world/cameras";
import { EXIT_LINE_X, GENERATOR_NOISE, KEYCARD_UNLOCK_RADIUS, type Facility } from "../../../phase-1/src/world/facility";
import { REACH, VIEW_CONE } from "../../../phase-1/src/world/interact";
import { EYE, PLAYER_RADIUS, SPEED, STEP_INTERVAL, STEP_NOISE } from "../../../phase-1/src/world/player";
import { ALARM_REPORT_INTERVAL } from "../../../phase-1/src/world/security";
import { ITEM_INFO } from "../../../phase-1/src/world/types";
import type { Entity } from "../schema";

const deg = (r: number): number => Math.round((r * 180) / Math.PI * 100) / 100;
const label = (f: Facility, id: string): string => f.interactables.find((i) => i.id === id)?.label(f) ?? "";
const src = (file: string, symbol: string) => ({ file, symbol });

/** Player, security systems, items, guards and presentation systems, with initial state read from a live Facility. */
export function actorEntities(f: Facility): Entity[] {
  const p = f.player;
  const player: Entity = {
    id: "player", name: "Player", kind: "player",
    components: {
      Transform: { position: { ...p.pos }, yaw: PLAYER_START.yaw },
      Mover: { walkSpeed: SPEED.walk, sprintSpeed: SPEED.sprint, crouchSpeed: SPEED.crouch, radius: PLAYER_RADIUS, moving: p.moving, sprinting: p.sprinting },
      Posture: { crouching: p.crouching, eyeStand: EYE.stand, eyeCrouch: EYE.crouch },
      Footsteps: { walkRadius: STEP_NOISE.walk, sprintRadius: param("sprintNoiseRadius"), interval: STEP_INTERVAL },
      Interactor: { reach: REACH, viewCone: deg(VIEW_CONE) },
      Inventory: { items: [...f.inventory] },
    },
    runtime: { object: "Facility.player", source: [src("src/world/player.ts", "makePlayer"), src("src/world/player.ts", "updatePlayer"), src("src/world/interact.ts", "focused")] },
  };
  const generator: Entity = {
    id: "generator_01", name: "Generator", kind: "generator",
    components: { Transform: { position: { ...GENERATOR_POS }, yaw: 0 }, Power: { on: f.power, noiseRadius: GENERATOR_NOISE }, Interactable: { runtimeId: "generator", prompt: label(f, "generator") } },
    runtime: { object: "Facility.power + interactables['generator']", source: [src("src/world/facility.ts", "toggleGenerator"), src("src/world/interact.ts", 'id: "generator"')] },
  };
  const cameras: Entity[] = f.cameras.map((c, i) => ({
    id: `camera_0${i + 1}`, name: c.id, kind: "camera" as const,
    components: {
      Transform: { position: { ...c.pos }, yaw: c.baseYaw },
      Camera: { mode: c.mode, range: param("cameraRange"), fov: deg(CAM_FOV), baseYaw: deg(c.baseYaw), sweep: deg(c.sweep), detectTime: CAM_DETECT_TIME, crouchRangeMultiplier: CAM_CROUCH.range, crouchTimeMultiplier: CAM_CROUCH.time, decay: CAM_DECAY, detect: c.detect },
    },
    runtime: { object: `Facility.cameras[${i}]`, source: [src("src/world/cameras.ts", "updateCamera"), src("src/level/map.ts", "export const CAMERAS")] },
  }));
  const terminal: Entity = {
    id: "terminal_01", name: "Security terminal", kind: "terminal",
    components: { Transform: { position: { ...TERMINAL_POS }, yaw: 0 }, Terminal: { requiresPower: true, camerasEnabled: f.camerasEnabled }, Interactable: { runtimeId: "terminal", prompt: label(f, "terminal") } },
    runtime: { object: "Facility.camerasEnabled + setCameras/resetAlarm", source: [src("src/world/facility.ts", "setCameras"), src("src/world/facility.ts", "resetAlarm"), src("src/ui/screens.ts", "renderTerminal")] },
  };
  const alarm: Entity = {
    id: "alarm_01", name: "Facility alarm", kind: "alarm",
    components: { Alarm: { active: f.alarm.active, timer: f.alarm.timer, duration: param("alarmDuration"), reportInterval: ALARM_REPORT_INTERVAL } },
    runtime: { object: "Facility.alarm", source: [src("src/world/facility.ts", "raiseAlarm"), src("src/world/security.ts", "updateSecurity")] },
  };
  const item = (id: string, itemId: "keycard" | "drive", pos: { x: number; z: number }): Entity => ({
    id, name: ITEM_INFO[itemId].name, kind: "item",
    components: { Transform: { position: { ...pos }, yaw: 0 }, Item: { itemId, detail: ITEM_INFO[itemId].detail, taken: f.inventory.has(itemId) }, Interactable: { runtimeId: itemId, prompt: label(f, itemId) } },
    runtime: { object: `Facility.inventory.has("${itemId}")`, source: [src("src/world/facility.ts", "pickUp"), src("src/world/interact.ts", `id: "${itemId}"`)] },
  });
  const guards: Entity[] = f.guards.map((g, i) => ({
    id: `guard_0${i + 1}`, name: g.id, kind: "guard" as const,
    components: {
      Transform: { position: { ...g.pos }, yaw: g.yaw },
      Patrol: { route: g.route.map((r) => ({ ...r })) },
      Perception: { sightLit: param("guardSightRange"), sightDark: SIGHT.dark, crouchMultiplier: SIGHT.crouch, shadowMultiplier: SIGHT.shadow, alarmMultiplier: SIGHT.alarm, fov: deg(GUARD_FOV), peripheral: PERIPHERAL, wallSoundFactor: WALL_SOUND_FACTOR },
      GuardBrain: {
        mode: g.mode, suspicion: g.suspicion, patrolSpeed: GUARD_SPEED.PATROL, investigateSpeed: GUARD_SPEED.INVESTIGATE, chaseSpeed: param("guardChaseSpeed"),
        searchSpeed: GUARD_SPEED.SEARCH, returnSpeed: GUARD_SPEED.RETURN, alarmSpeedMultiplier: ALARM_SPEED_MULTIPLIER, catchDistance: CATCH_DISTANCE,
        reactionTime: REACTION_TIME, suspicionRate: SUSPICION.rate, closeDistance: SUSPICION.closeDistance, closeMultiplier: SUSPICION.closeMultiplier,
        alarmSuspicionMultiplier: SUSPICION.alarmMultiplier, alertMultiplier: SUSPICION.alertMultiplier, suspicionDecay: SUSPICION.decay,
        chaseMemory: GUARD_TIMING.chaseMemory, searchTime: GUARD_TIMING.search, searchTimeAlarm: GUARD_TIMING.searchDuringAlarm, patrolPause: GUARD_TIMING.patrolPause, radius: GUARD_RADIUS,
        unseen: g.unseen, memory: g.memory, searchLeft: g.searchLeft, modeTime: g.modeTime, lastKnown: g.lastKnown,
      },
    },
    runtime: { object: `Facility.guards[${i}]`, source: [src("src/ai/guard-state.ts", "makeGuard"), src("src/ai/guard.ts", "updateGuard"), src("src/ai/perception.ts", "guardSees")] },
  }));
  const presentation = (id: string, name: string, reads: string[], source: { file: string; symbol: string }[]): Entity => ({
    id, name, kind: "system", components: { Presentation: { reads } }, runtime: { object: name, source },
  });
  const session: Entity = {
    id: "session", name: "Game session", kind: "system",
    components: { Session: { appState: "title", objective: f.objective } },
    runtime: { object: "game.ts app state + Facility.objective/outcome", source: [src("src/game.ts", "setState"), src("src/world/facility.ts", "get objective")] },
  };
  const exitZone: Entity = {
    id: "exit_zone", name: "Escape line", kind: "system",
    components: { ExitZone: { lineX: EXIT_LINE_X } },
    runtime: { object: "Facility.update exit check", source: [src("src/world/facility.ts", "EXIT_LINE_X")] },
  };
  const keycardLock: Entity = {
    id: "keycard_lock", name: "Keycard reader", kind: "system",
    components: { KeycardLock: { requiresItem: "keycard", unlockRadius: KEYCARD_UNLOCK_RADIUS } },
    runtime: { object: "Facility.update keycard check", source: [src("src/world/facility.ts", "KEYCARD_UNLOCK_RADIUS")] },
  };
  return [
    player, generator, ...cameras, terminal, alarm, item("keycard_01", "keycard", KEYCARD_POS), item("drive_01", "drive", DRIVE_POS), ...guards,
    keycardLock, exitZone, session,
    presentation("lighting_01", "Room lighting", ["power", "alarm"], [src("src/render/lights.ts", "class Lighting")]),
    presentation("audio_01", "Sound effects", ["events"], [src("src/audio/sfx.ts", "class Sfx"), src("src/game.ts", "function handle")]),
    presentation("hud_01", "HUD", ["objective", "posture", "power", "cameras", "alarm", "detection", "inventory"], [src("src/ui/hud.ts", "class Hud")]),
  ];
}
