import type { CameraSpec, Vec2 } from "../level/map";
import type { Senses } from "../ai/perception";
import { angleDiff, dist, yawTo } from "./types";

export const CAM_FOV = (50 * Math.PI) / 180;
/** Seconds of continuous sight before the camera trips the alarm. */
export const CAM_DETECT_TIME = 1.5;
/** Crouching shrinks camera range and slows detection; detection drains when out of view. */
export const CAM_CROUCH = { range: 0.75, time: 1.6 };
export const CAM_DECAY = 0.5;

export type CamMode = "off" | "scan" | "track";

export interface SecCam {
  id: string;
  pos: Vec2;
  baseYaw: number;
  sweep: number;
  yaw: number;
  phase: number;
  /** 0..1, reaching 1 = alarm. */
  detect: number;
  mode: CamMode;
  seesPlayer: boolean;
}

export function makeCamera(spec: CameraSpec, phase: number): SecCam {
  return {
    id: spec.id, pos: spec.pos, baseYaw: spec.yaw, sweep: spec.sweep, yaw: spec.yaw,
    phase, detect: 0, mode: "scan", seesPlayer: false,
  };
}

export function cameraSees(c: SecCam, s: Senses): boolean {
  const p = s.player.pos;
  const range = s.params.cameraRange * (s.player.crouching ? CAM_CROUCH.range : 1);
  if (dist(c.pos, p) > range) return false;
  if (Math.abs(angleDiff(yawTo(c.pos, p), c.yaw)) > CAM_FOV / 2) return false;
  return s.grid.lineOfSight(c.pos, p);
}

/** Returns true on the frame the camera has fully detected the player. */
export function updateCamera(c: SecCam, dt: number, s: Senses, active: boolean): boolean {
  if (!active) {
    c.mode = "off";
    c.detect = 0;
    c.seesPlayer = false;
    return false;
  }
  c.seesPlayer = cameraSees(c, s);
  if (c.seesPlayer) {
    c.mode = "track";
    const d = angleDiff(yawTo(c.pos, s.player.pos), c.yaw);
    c.yaw += Math.sign(d) * Math.min(Math.abs(d), 2 * dt);
    const was = c.detect;
    c.detect = Math.min(1, c.detect + dt / (CAM_DETECT_TIME * (s.player.crouching ? CAM_CROUCH.time : 1)));
    return was < 1 && c.detect >= 1;
  }
  c.mode = "scan";
  c.detect = Math.max(0, c.detect - CAM_DECAY * dt);
  c.phase += dt * 0.45;
  const target = c.baseYaw + Math.sin(c.phase) * c.sweep;
  const d = angleDiff(target, c.yaw);
  c.yaw += Math.sign(d) * Math.min(Math.abs(d), 1.2 * dt);
  return false;
}
