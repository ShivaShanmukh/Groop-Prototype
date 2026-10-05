import type { Rect } from "./read";

export interface Vec {
  x: number;
  y: number;
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Smallest signed difference between two angles, in radians. */
export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance along a ray (unit direction) to a rect, or Infinity. Slab method. */
export function rayRect(o: Vec, dx: number, dy: number, r: Rect): number {
  let tMin = 0;
  let tMax = Infinity;
  const axes: [number, number, number, number][] = [
    [o.x, dx, r.x, r.x + r.w],
    [o.y, dy, r.y, r.y + r.h],
  ];
  for (const [origin, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (origin < lo || origin > hi) return Infinity;
    } else {
      let t1 = (lo - origin) / d;
      let t2 = (hi - origin) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return Infinity;
    }
  }
  return tMin;
}

/** Distance a ray travels before hitting any rect (capped at maxDist). */
export function castRay(o: Vec, angle: number, maxDist: number, walls: Rect[]): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const w of walls) best = Math.min(best, rayRect(o, dx, dy, w));
  return best;
}

export function lineBlocked(a: Vec, b: Vec, walls: Rect[]): boolean {
  const d = dist(a, b);
  if (d < 1e-6) return false;
  return castRay(a, Math.atan2(b.y - a.y, b.x - a.x), d, walls) < d - 0.5;
}

/** Move a circle by (mx, my), sliding along rect walls one axis at a time. */
export function moveCircle(p: Vec, radius: number, mx: number, my: number, walls: Rect[]): Vec {
  const hits = (x: number, y: number): boolean =>
    walls.some((w) => {
      const cx = Math.max(w.x, Math.min(x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(y, w.y + w.h));
      return Math.hypot(x - cx, y - cy) < radius;
    });
  let { x, y } = p;
  if (!hits(x + mx, y)) x += mx;
  if (!hits(x, y + my)) y += my;
  return { x, y };
}
