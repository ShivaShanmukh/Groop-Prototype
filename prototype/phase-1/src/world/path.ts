import type { Vec2 } from "../level/map";
import { NAV, NAV_COLS as COLS, NAV_ROWS as ROWS, type Grid } from "./grid";
import { Heap } from "./heap";

const toCell = (p: Vec2): [number, number] => [Math.floor(p.x / NAV), Math.floor(p.z / NAV)];
const centre = (c: number, r: number): Vec2 => ({ x: c * NAV + NAV / 2, z: r * NAV + NAV / 2 });

/** Nearest walkable cell to a point (spiral search), so targets inside props still resolve. */
export function nearestWalkable(grid: Grid, p: Vec2): [number, number] | null {
  const [sc, sr] = toCell(p);
  for (let rad = 0; rad < 10; rad++) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let r = sr - rad; r <= sr + rad; r++) {
      for (let c = sc - rad; c <= sc + rad; c++) {
        if (!grid.walkable(c, r)) continue;
        const q = centre(c, r);
        const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = [c, r];
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/**
 * A* over walkable cells, 8 directions, no corner cutting.
 * Returns world-space waypoints (excluding the start), or null when unreachable.
 */
export function findPath(grid: Grid, from: Vec2, to: Vec2): Vec2[] | null {
  const s = nearestWalkable(grid, from);
  const g = nearestWalkable(grid, to);
  if (!s || !g) return null;
  const key = (c: number, r: number): number => r * COLS + c;
  const goal = key(g[0], g[1]);
  const open = new Heap();
  open.push(key(s[0], s[1]), 0);
  const cost = new Float64Array(COLS * ROWS).fill(Infinity);
  const came = new Int32Array(COLS * ROWS).fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  cost[key(s[0], s[1])] = 0;
  const h = (k: number): number => Math.hypot((k % COLS) - g[0], Math.floor(k / COLS) - g[1]);

  while (open.size) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) break;
    const cc = cur % COLS;
    const cr = Math.floor(cur / COLS);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || !grid.walkable(nc, nr)) continue;
        if (dc && dr && (!grid.walkable(cc + dc, cr) || !grid.walkable(cc, cr + dr))) continue;
        const nk = key(nc, nr);
        const ng = cost[cur] + (dc && dr ? Math.SQRT2 : 1);
        if (ng < cost[nk]) {
          cost[nk] = ng;
          came[nk] = cur;
          open.push(nk, ng + h(nk));
        }
      }
    }
  }
  if (cost[goal] === Infinity) return null;

  const cells: Vec2[] = [];
  for (let k = goal; k !== -1 && k !== key(s[0], s[1]); k = came[k]) {
    cells.unshift(centre(k % COLS, Math.floor(k / COLS)));
  }
  // End exactly on the requested point when it is itself reachable.
  const [tc, tr] = toCell(to);
  if (cells.length && tc === g[0] && tr === g[1]) cells[cells.length - 1] = { ...to };
  return smooth(grid, from, cells);
}

/** Drop waypoints that can be skipped in a straight, collision-free line (string pulling). */
function smooth(grid: Grid, from: Vec2, cells: Vec2[]): Vec2[] {
  const clear = (a: Vec2, b: Vec2): boolean => {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.4);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (grid.hits(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.36)) return false;
    }
    return true;
  };
  const out: Vec2[] = [];
  let at = from;
  let i = 0;
  while (i < cells.length) {
    let j = i;
    while (j + 1 < cells.length && clear(at, cells[j + 1])) j++;
    out.push(cells[j]);
    at = cells[j];
    i = j + 1;
  }
  return out;
}

/** Random walkable point within `radius` metres of p that a guard can actually reach. */
export function randomNear(grid: Grid, p: Vec2, radius: number, rand: () => number): Vec2 | null {
  for (let i = 0; i < 20; i++) {
    const a = rand() * Math.PI * 2;
    const d = 1 + rand() * radius;
    const q = { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d };
    const [c, r] = toCell(q);
    if (grid.walkable(c, r) && grid.lineOfSight(p, q)) return centre(c, r);
  }
  return null;
}
