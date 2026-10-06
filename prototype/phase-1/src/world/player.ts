import type { GameParameters } from "../blueprint/parameters";
import { PLAYER_START } from "../level/map";
import type { Grid } from "./grid";
import { dist, forward, type GameEvent, type Noise, type PlayerInput, type PlayerState } from "./types";

export const PLAYER_RADIUS = 0.3;
export const SPEED = { walk: 3.6, sprint: 6.0, crouch: 1.9 };
export const EYE = { stand: 1.65, crouch: 1.0 };
/** How far walking footsteps carry (m). Sprinting is Blueprint-controlled (params.sprintNoiseRadius). Crouching is silent. */
export const STEP_NOISE = { walk: 3 };
/** Seconds between footsteps at walking speed (faster when sprinting). */
export const STEP_INTERVAL = 0.5;

export function makePlayer(): PlayerState {
  return {
    pos: { x: PLAYER_START.x, z: PLAYER_START.z },
    yaw: PLAYER_START.yaw, pitch: 0, crouching: false, sprinting: false, moving: false,
    eye: EYE.stand, stepTimer: 0,
  };
}

export function updatePlayer(
  p: PlayerState,
  input: PlayerInput,
  dt: number,
  grid: Grid,
  noises: Noise[],
  events: GameEvent[],
  params: GameParameters,
): void {
  p.yaw += input.turn;
  p.pitch = Math.max(-1.2, Math.min(1.2, p.pitch + input.pitch));
  if (input.toggleCrouch) p.crouching = !p.crouching;

  const wants = Math.hypot(input.forward, input.strafe) > 0.01;
  // Sprinting stands you up.
  if (input.sprint && wants && p.crouching) p.crouching = false;
  p.sprinting = input.sprint && wants && !p.crouching;
  const speed = p.crouching ? SPEED.crouch : p.sprinting ? SPEED.sprint : SPEED.walk;

  const f = forward(p.yaw);
  const r = { x: -f.z, z: f.x };
  let mx = f.x * input.forward + r.x * input.strafe;
  let mz = f.z * input.forward + r.z * input.strafe;
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  const before = p.pos;
  p.pos = grid.move(p.pos, PLAYER_RADIUS, mx * speed * dt, mz * speed * dt);
  p.moving = dist(before, p.pos) > 0.0005;

  const eyeTarget = p.crouching ? EYE.crouch : EYE.stand;
  p.eye += (eyeTarget - p.eye) * Math.min(1, dt * 10);

  if (!p.moving) return;
  p.stepTimer -= dt * (speed / SPEED.walk);
  if (p.stepTimer <= 0) {
    p.stepTimer = STEP_INTERVAL;
    if (!p.crouching) {
      const radius = p.sprinting ? params.sprintNoiseRadius : STEP_NOISE.walk;
      noises.push({ pos: { ...p.pos }, radius, source: p.sprinting ? "running footsteps" : "footsteps" });
    }
    events.push({ type: "step", loud: p.sprinting });
  }
}
