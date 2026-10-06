import type { Vec2 } from "../level/map";

export type ItemId = "keycard" | "drive";

export const ITEM_INFO: Record<ItemId, { name: string; detail: string }> = {
  keycard: { name: "Security keycard", detail: "Level-3 clearance. Opens the restricted wing." },
  drive: { name: "Research drive", detail: "Project HELIX: the only copy of the research." },
};

export interface PlayerInput {
  forward: number; // -1..1
  strafe: number; // -1..1
  sprint: boolean;
  /** True on the frame C was pressed. */
  toggleCrouch: boolean;
  /** True on the frame E was pressed. */
  interact: boolean;
  /** Radians to add this frame. */
  turn: number;
  pitch: number;
}

export interface PlayerState {
  pos: Vec2;
  yaw: number;
  pitch: number;
  crouching: boolean;
  sprinting: boolean;
  moving: boolean;
  /** Eye height in metres; eases between standing and crouching. */
  eye: number;
  stepTimer: number;
}

export interface Noise {
  pos: Vec2;
  radius: number;
  source: string;
}

export type GameEvent =
  | { type: "toast"; text: string }
  | { type: "pickup"; item: ItemId }
  | { type: "objective"; text: string }
  | { type: "alarm"; on: boolean }
  | { type: "power"; on: boolean }
  | { type: "cameras"; on: boolean }
  | { type: "door"; open: boolean }
  | { type: "terminal" }
  | { type: "generator" }
  | { type: "guard"; id: string; from: string; to: string; why: string }
  | { type: "spotted"; by: string }
  | { type: "step"; loud: boolean }
  | { type: "end"; outcome: "won" | "lost"; reason: string };

/** Forward direction for a yaw (0 = north / -z), matching Three.js camera rotation. */
export function forward(yaw: number): Vec2 {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

/** Yaw that faces from a toward b. */
export function yawTo(a: Vec2, b: Vec2): number {
  return Math.atan2(-(b.x - a.x), -(b.z - a.z));
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export type DoorKind = "door" | "secure" | "exit";

export interface Door {
  col: number;
  row: number;
  kind: DoorKind;
  locked: boolean;
  /** 0 = closed, 1 = fully open. */
  open: number;
  /** "x" when the door sits in an east–west wall (panels slide along x). */
  axis: "x" | "z";
}

/** Axis-aligned box on the floor plane, in metres. */
export interface Box {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Tall props (shelves, racks) block line of sight. */
  tall: boolean;
}
