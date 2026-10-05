import { angleDiff, dist, lineBlocked, moveCircle, type Vec } from "../geometry";
import type { Input } from "../input";
import { formatTime } from "../loop";
import type { Rect } from "../read";
import { boundsWalls } from "../runtime2d";
import type { World } from "../shell";
import type { VaultCfg } from "./config";

export const PLAYER_R = 0.35;
const DRONE_R = 0.4;

export interface DroneState {
  pos: Vec;
  facing: number;
  mode: "patrol" | "chase" | "return";
  target: number;
  stuck: number;
  /** Seconds spent in the current chase. */
  chaseT: number;
  /** While > 0 the drone ignores the player (it just gave up a chase). */
  cooldown: number;
}

export interface VaultState {
  cfg: VaultCfg;
  player: Vec;
  facing: number;
  hasKey: boolean;
  time: number;
  drone: DroneState;
  solid: Rect[];
}

export function droneSees(s: VaultState): boolean {
  const { drone, player, cfg } = s;
  const d = dist(drone.pos, player);
  if (d > cfg.drone.visionRange) return false;
  const a = Math.atan2(player.y - drone.pos.y, player.x - drone.pos.x);
  if (Math.abs(angleDiff(a, drone.facing)) > cfg.drone.visionAngle / 2) return false;
  return !(cfg.pillarsBlockSight && lineBlocked(drone.pos, player, cfg.pillars));
}

function walk(s: VaultState, to: Vec, speed: number, dt: number): boolean {
  const dr = s.drone;
  const d = dist(dr.pos, to);
  if (d < 0.1) return true;
  const step = Math.min(d, speed * dt);
  const dx = ((to.x - dr.pos.x) / d) * step;
  const dy = ((to.y - dr.pos.y) / d) * step;
  const next = moveCircle(dr.pos, DRONE_R, dx, dy, s.solid);
  dr.stuck = dist(dr.pos, next) < step * 0.2 ? dr.stuck + dt : 0;
  dr.pos = next;
  const turn = angleDiff(Math.atan2(dy, dx), dr.facing);
  dr.facing += Math.sign(turn) * Math.min(Math.abs(turn), 3 * dt);
  return dr.stuck > 0.8;
}

function updateDrone(s: VaultState, dt: number): "alarm" | null {
  const dr = s.drone;
  const cfg = s.cfg.drone;
  const pts = cfg.patrol;
  const giveUp = (): void => {
    // Head back to the nearest patrol point.
    dr.target = pts.reduce((best, p, i) => (dist(dr.pos, p) < dist(dr.pos, pts[best] ?? p) ? i : best), 0);
    dr.mode = "return";
  };
  dr.cooldown = Math.max(0, dr.cooldown - dt);

  if (dr.cooldown <= 0 && droneSees(s)) {
    if (cfg.onSeen !== "chase") return "alarm";
    if (dr.mode !== "chase") dr.chaseT = 0;
    dr.mode = "chase";
  } else if (dr.mode === "chase") {
    giveUp();
  }
  if (dr.mode === "chase") {
    dr.chaseT += dt;
    if (cfg.chaseSeconds > 0 && dr.chaseT >= cfg.chaseSeconds) {
      dr.cooldown = cfg.cooldownSeconds;
      giveUp();
    }
  }
  if (dr.mode === "chase") {
    walk(s, s.player, cfg.chaseSpeed, dt);
  } else {
    const to = pts[dr.target];
    if (to && walk(s, to, cfg.speed, dt)) {
      if (dr.mode === "patrol") dr.target = (dr.target + 1) % pts.length;
      dr.mode = "patrol";
      dr.stuck = 0;
    }
  }
  return null;
}

/** One round of Vault Run as pure data + rules. Rendering lives in scene.ts. */
export function makeVaultWorld(cfg: VaultCfg, input: Input): World & { state: VaultState } {
  const start = cfg.drone.patrol[0] ?? { x: 0, y: 0 };
  const next = cfg.drone.patrol[1] ?? start;
  const s: VaultState = {
    cfg,
    player: { x: cfg.player.x, y: cfg.player.y },
    facing: -Math.PI / 2,
    hasKey: false,
    time: 0,
    drone: {
      pos: { ...start },
      facing: Math.atan2(next.y - start.y, next.x - start.x),
      mode: "patrol",
      target: cfg.drone.patrol.length > 1 ? 1 : 0,
      stuck: 0,
      chaseT: 0,
      cooldown: 0,
    },
    solid: [...cfg.pillars, ...boundsWalls(cfg.width, cfg.depth, -cfg.width / 2, -cfg.depth / 2)],
  };

  return {
    state: s,
    update: (dt) => {
      s.time += dt;
      const mx = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
      const mz = (input.isDown("down") ? 1 : 0) - (input.isDown("up") ? 1 : 0);
      if (mx || mz) {
        const len = Math.hypot(mx, mz);
        const step = cfg.player.speed * dt;
        s.player = moveCircle(s.player, PLAYER_R, (mx / len) * step, (mz / len) * step, s.solid);
        s.facing = Math.atan2(mz, mx);
      }
      if (!s.hasKey && dist(s.player, cfg.key) < 0.9) s.hasKey = true;

      if (updateDrone(s, dt) === "alarm") {
        return { status: "lost", title: "Spotted!", detail: `The drone raised the alarm at ${formatTime(s.time)}.` };
      }
      if (dist(s.drone.pos, s.player) < cfg.catchDistance) {
        return { status: "lost", title: "Caught!", detail: `The drone caught you at ${formatTime(s.time)}.` };
      }
      if (s.hasKey && dist(s.player, cfg.exit) < 1.4) {
        return { status: "won", title: "Escaped the vault!", detail: `Out with the key in ${formatTime(s.time)}.` };
      }
      if (s.time >= cfg.timeLimit) {
        return { status: "lost", title: "Out of time", detail: "The vault locked down." };
      }
      return null;
    },
  };
}
