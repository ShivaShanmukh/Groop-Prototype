/**
 * The facility floor plan. One character = one 2m × 2m cell.
 *   #  wall        .  floor
 *   D  door (opens automatically for anyone nearby)
 *   K  security door (needs the keycard)
 *   X  emergency exit (locked until the research drive is taken)
 * Columns run west → east (x), rows north → south (z).
 */
export const MAP: readonly string[] = [
  "##############################", // 0
  "#........#..........#........#", // 1   security | lab | archive
  "#........#..........#........#", // 2
  "#........#..........#........#", // 3
  "#........D..........#........#", // 4   security ↔ lab door
  "#........#..........#........#", // 5
  "#........#..........#........#", // 6
  "#........#..........#........#", // 7
  "####D#########D#########D#####", // 8
  "X...................K........#", // 9   corridor | restricted corridor
  "#...................#........#", // 10
  "######D########D##############", // 11
  "#..........#........##########", // 12  reception | storage
  "#..........#........##########", // 13
  "#..........#........##########", // 14
  "#..........D........##########", // 15  reception ↔ storage door
  "#..........#........##########", // 16
  "#..........#........##########", // 17
  "#####D########################", // 18
  "###.....######################", // 19  entrance
  "###.....######################", // 20
  "##############################", // 21
];

export const CELL = 2;
export const WALL_HEIGHT = 3.2;
export const COLS = MAP[0].length;
export const ROWS = MAP.length;

export interface Vec2 {
  x: number;
  z: number;
}

/** World-space centre of a cell. */
export function cell(col: number, row: number): Vec2 {
  return { x: col * CELL + CELL / 2, z: row * CELL + CELL / 2 };
}

export type RoomId =
  | "entrance"
  | "reception"
  | "corridor"
  | "security"
  | "lab"
  | "storage"
  | "restricted"
  | "archive";

export interface Room {
  id: RoomId;
  name: string;
  /** Inclusive cell bounds. */
  c0: number;
  r0: number;
  c1: number;
  r1: number;
  floor: string;
  light: string;
}

export const ROOMS: Room[] = [
  { id: "entrance", name: "Entrance", c0: 3, r0: 19, c1: 7, r1: 20, floor: "#3a3f45", light: "#ffe7c4" },
  { id: "reception", name: "Reception", c0: 1, r0: 12, c1: 10, r1: 17, floor: "#5b4636", light: "#ffe2b8" },
  { id: "corridor", name: "Corridor", c0: 1, r0: 9, c1: 19, r1: 10, floor: "#2f3a44", light: "#dfefff" },
  { id: "security", name: "Security", c0: 1, r0: 1, c1: 8, r1: 7, floor: "#283246", light: "#cfe0ff" },
  { id: "lab", name: "Laboratory", c0: 10, r0: 1, c1: 19, r1: 7, floor: "#d5dadf", light: "#eefbff" },
  { id: "storage", name: "Storage", c0: 12, r0: 12, c1: 19, r1: 17, floor: "#4a4536", light: "#fff0c8" },
  { id: "restricted", name: "Restricted Wing", c0: 21, r0: 9, c1: 28, r1: 10, floor: "#3d2a2a", light: "#ffd6d0" },
  { id: "archive", name: "Archive", c0: 21, r0: 1, c1: 28, r1: 7, floor: "#1f2a2e", light: "#b8fff4" },
];

export function roomAt(p: Vec2): Room | undefined {
  const c = Math.floor(p.x / CELL);
  const r = Math.floor(p.z / CELL);
  return ROOMS.find((rm) => c >= rm.c0 && c <= rm.c1 && r >= rm.r0 && r <= rm.r1);
}

/** Fixed placements, in world metres. */
export const PLAYER_START = { ...cell(5, 20), yaw: 0 };
export const KEYCARD_POS = { x: 37, z: 2.6 };
export const DRIVE_POS = cell(27, 6);
export const GENERATOR_POS = { x: 37.6, z: 32.8 };
export const TERMINAL_POS = { x: 3.6, z: 3.6 };

export interface GuardSpec {
  id: string;
  route: Vec2[];
}

export const GUARDS: GuardSpec[] = [
  { id: "Guard Reyes", route: [cell(2, 10), cell(12, 9), cell(6, 15), cell(2, 9)] },
  { id: "Guard Okafor", route: [cell(18, 7), cell(18, 2), cell(11, 2), cell(4, 4)] },
  { id: "Guard Lin", route: [cell(21, 10), cell(28, 9), cell(24, 5), cell(22, 2)] },
];

export interface CameraSpec {
  id: string;
  pos: Vec2;
  /** Centre of the sweep, radians. Yaw 0 looks toward -z (north). */
  yaw: number;
  sweep: number;
}

const deg = (d: number): number => (d * Math.PI) / 180;

export const CAMERAS: CameraSpec[] = [
  { id: "CAM-01 Reception", pos: { x: 21.6, z: 24.4 }, yaw: deg(135), sweep: deg(35) },
  { id: "CAM-02 Corridor", pos: { x: 39.6, z: 21.6 }, yaw: deg(90), sweep: deg(30) },
  { id: "CAM-03 Restricted", pos: { x: 57.6, z: 21.6 }, yaw: deg(90), sweep: deg(25) },
  { id: "CAM-04 Archive", pos: { x: 57.6, z: 15.6 }, yaw: deg(45), sweep: deg(30) },
];
