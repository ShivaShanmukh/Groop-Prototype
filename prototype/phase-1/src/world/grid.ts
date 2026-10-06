import { CELL, COLS, MAP, ROWS, type Vec2 } from "../level/map";
import type { Box, Door, DoorKind } from "./types";

export type { Box, Door, DoorKind } from "./types";

/** Guard navigation runs on a finer 1 m grid so props only block the space they take up. */
export const NAV = 1;
export const NAV_COLS = (COLS * CELL) / NAV;
export const NAV_ROWS = (ROWS * CELL) / NAV;
/** Props are inflated by this much so guards don't plan routes that scrape them. */
const NAV_CLEARANCE = 0.35;

const KIND: Record<string, DoorKind> = { D: "door", K: "secure", X: "exit" };

/** Collision, line of sight and door state for the whole facility. */
export class Grid {
  readonly doors: Door[] = [];
  readonly props: Box[] = [];
  private navBlocked = new Set<number>();
  private doorIndex = new Map<number, Door>();
  /** Props overlapping each map cell (inflated by 0.5 m), so collision checks stay local. */
  private propBuckets = new Map<number, Box[]>();
  /** Static walkability per nav cell (walls/props); locked doors are checked live. 0 = unknown. */
  private navCache = new Uint8Array(NAV_COLS * NAV_ROWS);

  constructor() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const kind = KIND[MAP[r][c]];
        if (!kind) continue;
        const wallWE = MAP[r][c - 1] === "#" || MAP[r][c + 1] === "#";
        const door: Door = { col: c, row: r, kind, locked: kind !== "door", open: 0, axis: wallWE ? "x" : "z" };
        this.doors.push(door);
        this.doorIndex.set(r * COLS + c, door);
      }
    }
  }

  addProp(box: Box): void {
    this.props.push(box);
    this.navCache.fill(0);
    for (let r = Math.floor((box.z0 - 0.5) / CELL); r <= Math.floor((box.z1 + 0.5) / CELL); r++) {
      for (let c = Math.floor((box.x0 - 0.5) / CELL); c <= Math.floor((box.x1 + 0.5) / CELL); c++) {
        const k = r * COLS + c;
        this.propBuckets.set(k, [...(this.propBuckets.get(k) ?? []), box]);
      }
    }
    const x0 = box.x0 - NAV_CLEARANCE;
    const x1 = box.x1 + NAV_CLEARANCE;
    const z0 = box.z0 - NAV_CLEARANCE;
    const z1 = box.z1 + NAV_CLEARANCE;
    for (let nz = Math.floor(z0 / NAV); nz <= Math.floor(z1 / NAV); nz++) {
      for (let nx = Math.floor(x0 / NAV); nx <= Math.floor(x1 / NAV); nx++) {
        const cx = nx * NAV + NAV / 2;
        const cz = nz * NAV + NAV / 2;
        if (cx > x0 && cx < x1 && cz > z0 && cz < z1) this.navBlocked.add(nz * NAV_COLS + nx);
      }
    }
  }

  char(c: number, r: number): string {
    return MAP[r]?.[c] ?? "#";
  }

  doorAt(c: number, r: number): Door | undefined {
    return this.doorIndex.get(r * COLS + c);
  }

  /** Can a guard plan a route through this 1 m nav cell? Never via the exit or a still-locked security door. */
  walkable(nx: number, nz: number): boolean {
    if (nx < 0 || nz < 0 || nx >= NAV_COLS || nz >= NAV_ROWS) return false;
    const i = nz * NAV_COLS + nx;
    const c = Math.floor((nx * NAV) / CELL);
    const r = Math.floor((nz * NAV) / CELL);
    if (this.navCache[i] === 0) {
      const ch = this.char(c, r);
      this.navCache[i] = ch === "#" || ch === "X" || this.navBlocked.has(i) ? 1 : 2;
    }
    if (this.navCache[i] === 1) return false;
    return !(MAP[r][c] === "K" && this.doorAt(c, r)?.locked);
  }

  /** Is this cell solid right now for a moving body? */
  solid(c: number, r: number): boolean {
    const ch = this.char(c, r);
    if (ch === "#") return true;
    const d = this.doorAt(c, r);
    return d ? d.open < 0.85 : false;
  }

  blocksSight(x: number, z: number): boolean {
    const c = Math.floor(x / CELL);
    const r = Math.floor(z / CELL);
    const ch = this.char(c, r);
    if (ch === "#") return true;
    const d = this.doorAt(c, r);
    if (d && d.open < 0.5) return true;
    const near = this.propBuckets.get(r * COLS + c);
    return !!near && near.some((p) => p.tall && x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1);
  }

  lineOfSight(a: Vec2, b: Vec2): boolean {
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(dist / 0.2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.blocksSight(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /** Does a circle at (x, z) overlap a wall, a closed door or a prop? */
  hits(x: number, z: number, radius: number): boolean {
    const c0 = Math.floor((x - radius) / CELL);
    const c1 = Math.floor((x + radius) / CELL);
    const r0 = Math.floor((z - radius) / CELL);
    const r1 = Math.floor((z + radius) / CELL);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.solid(c, r) && circleBox(x, z, radius, c * CELL, r * CELL, c * CELL + CELL, r * CELL + CELL)) return true;
      }
    }
    const near = this.propBuckets.get(Math.floor(z / CELL) * COLS + Math.floor(x / CELL));
    return !!near && near.some((p) => circleBox(x, z, radius, p.x0, p.z0, p.x1, p.z1));
  }

  /** Move with sliding: try each axis separately. */
  move(p: Vec2, radius: number, dx: number, dz: number): Vec2 {
    let { x, z } = p;
    if (!this.hits(x + dx, z, radius)) x += dx;
    if (!this.hits(x, z + dz, radius)) z += dz;
    return { x, z };
  }
}

function circleBox(x: number, z: number, r: number, x0: number, z0: number, x1: number, z1: number): boolean {
  const nx = Math.max(x0, Math.min(x, x1));
  const nz = Math.max(z0, Math.min(z, z1));
  return (x - nx) ** 2 + (z - nz) ** 2 < r * r;
}
