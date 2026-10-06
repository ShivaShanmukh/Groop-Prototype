/**
 * Every piece of furniture, as data. Collision (world/facility.ts) and
 * rendering (render/props*.ts) both read this list, so they always agree.
 * x/z = centre in metres, w = size along x, d = size along z.
 */
export type PropType =
  | "terminalDesk"
  | "monitorDesk"
  | "lockers"
  | "table"
  | "cabinet"
  | "bench"
  | "backBench"
  | "tank"
  | "hood"
  | "rack"
  | "pedestal"
  | "plant"
  | "vending"
  | "crate"
  | "reception"
  | "sofa"
  | "shelf"
  | "generator"
  | "barrel";

export interface Prop {
  type: PropType;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Blocks line of sight (shelves, racks, lockers, tanks). */
  tall?: boolean;
}

export const PROPS: Prop[] = [
  // Security room
  { type: "terminalDesk", x: 3.6, z: 2.9, w: 3, d: 1 },
  { type: "monitorDesk", x: 11, z: 2.6, w: 5, d: 1 },
  { type: "lockers", x: 17.4, z: 4.4, w: 0.8, d: 4, tall: true },
  { type: "table", x: 9, z: 9.5, w: 2.4, d: 1.4 },
  { type: "cabinet", x: 2.5, z: 12, w: 0.8, d: 2.4, tall: true },
  { type: "table", x: 5.4, z: 14.4, w: 2.4, d: 1.4 },
  { type: "plant", x: 2.8, z: 15.2, w: 0.8, d: 0.8 },
  { type: "barrel", x: 17.3, z: 15.2, w: 0.9, d: 0.9 },

  // Laboratory
  { type: "bench", x: 25, z: 7, w: 6, d: 1.2 },
  { type: "bench", x: 33, z: 7, w: 6, d: 1.2 },
  { type: "bench", x: 25, z: 11, w: 6, d: 1.2 },
  { type: "bench", x: 33, z: 11, w: 6, d: 1.2 },
  { type: "backBench", x: 36, z: 2.7, w: 6, d: 1 },
  { type: "tank", x: 21.2, z: 3.2, w: 1.4, d: 1.4, tall: true },
  { type: "tank", x: 21.2, z: 14.6, w: 1.4, d: 1.4, tall: true },
  { type: "hood", x: 28, z: 2.6, w: 2.4, d: 1, tall: true },

  // Archive (objective room)
  { type: "rack", x: 47, z: 7, w: 4, d: 1, tall: true },
  { type: "rack", x: 47, z: 11, w: 4, d: 1, tall: true },
  { type: "rack", x: 56.4, z: 6, w: 1, d: 4, tall: true },
  { type: "pedestal", x: 55, z: 13, w: 1, d: 1 },

  // Corridor and restricted wing
  { type: "plant", x: 2.8, z: 21.3, w: 0.8, d: 0.8 },
  { type: "vending", x: 24, z: 18.6, w: 1.6, d: 0.9, tall: true },
  { type: "plant", x: 38.8, z: 21.2, w: 0.8, d: 0.8 },
  { type: "crate", x: 52, z: 21.2, w: 1.2, d: 1.2 },
  { type: "barrel", x: 57.2, z: 18.8, w: 0.9, d: 0.9 },

  // Reception
  { type: "reception", x: 12, z: 28, w: 6, d: 1.2 },
  { type: "sofa", x: 3, z: 33, w: 1, d: 3 },
  { type: "sofa", x: 21, z: 27.2, w: 1, d: 3 },
  { type: "table", x: 5.2, z: 33, w: 1.2, d: 1.6 },
  { type: "plant", x: 2.8, z: 24.8, w: 0.8, d: 0.8 },
  { type: "plant", x: 21.2, z: 35.2, w: 0.8, d: 0.8 },

  // Storage
  { type: "shelf", x: 28, z: 27, w: 4, d: 1, tall: true },
  { type: "shelf", x: 28, z: 31, w: 4, d: 1, tall: true },
  { type: "shelf", x: 34, z: 27, w: 4, d: 1, tall: true },
  { type: "shelf", x: 34, z: 31, w: 4, d: 1, tall: true },
  { type: "crate", x: 25.4, z: 35, w: 1.4, d: 1.4 },
  { type: "crate", x: 38.6, z: 25.4, w: 1.4, d: 1.4 },
  { type: "barrel", x: 25, z: 24.8, w: 0.9, d: 0.9 },
  { type: "generator", x: 37.6, z: 34.6, w: 3.2, d: 1.8 },
];
