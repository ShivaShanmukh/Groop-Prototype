import * as THREE from "three";
import type { Prop } from "../level/props";
import { MAT, box, cyl, glow, group, rng } from "./kit";

const LIQUIDS = ["#3dffa8", "#3fc8ff", "#ff5ad1", "#ffd23f"];

function glassware(r: () => number, w: number, d: number, y: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (let x = -w / 2 + 0.4; x < w / 2 - 0.3; x += 0.45 + r() * 0.5) {
    if (r() < 0.35) continue;
    const z = (r() - 0.5) * (d * 0.5);
    const h = 0.18 + r() * 0.2;
    const liquid = glow(LIQUIDS[Math.floor(r() * LIQUIDS.length)], 1.2);
    out.push(cyl(0.07, 0.09, h, MAT.glass, x, y + h / 2, z), cyl(0.06, 0.08, h * 0.55, liquid, x, y + h * 0.28, z));
  }
  return out;
}

/** Lab and archive props. */
export function labProp(p: Prop): THREE.Object3D | null {
  const r = rng(p.x * 17 + p.z * 3);
  switch (p.type) {
    case "bench":
      return group(
        p.x, p.z,
        box(p.w, 0.85, p.d * 0.9, MAT.white, 0, 0.42, 0),
        box(p.w + 0.05, 0.05, p.d + 0.05, MAT.darkMetal, 0, 0.88, 0),
        ...glassware(r, p.w, p.d, 0.9),
        box(0.3, 0.35, 0.25, MAT.plastic, p.w / 2 - 0.4, 1.08, 0), // microscope body
        cyl(0.03, 0.03, 0.2, MAT.metal, p.w / 2 - 0.4, 1.3, 0.05),
      );
    case "backBench":
      return group(
        p.x, p.z,
        box(p.w, 0.9, p.d, MAT.white, 0, 0.45, 0),
        box(p.w + 0.05, 0.05, p.d + 0.05, MAT.darkMetal, 0, 0.93, 0),
        cyl(0.25, 0.25, 0.3, MAT.metal, -2, 1.1, 0), // centrifuge
        box(0.6, 0.4, 0.05, MAT.plastic, 2.2, 1.25, -0.3),
        box(0.54, 0.32, 0.02, glow("#3fc8ff", 0.8), 2.2, 1.25, -0.27),
        ...glassware(r, p.w * 0.5, p.d, 0.95),
      );
    case "tank":
      return group(
        p.x, p.z,
        cyl(0.62, 0.62, 0.25, MAT.darkMetal, 0, 0.12, 0),
        cyl(0.55, 0.55, 1.9, MAT.glass, 0, 1.2, 0),
        cyl(0.5, 0.5, 1.5, glow("#2bffb0", 0.6), 0, 1.05, 0),
        cyl(0.62, 0.62, 0.25, MAT.darkMetal, 0, 2.27, 0),
        ...[0, 1, 2].map((i) => cyl(0.04, 0.04, 0.8, MAT.metal, Math.cos(i * 2.1) * 0.3, 2.8, Math.sin(i * 2.1) * 0.3, 6)),
      );
    case "hood":
      return group(
        p.x, p.z,
        box(p.w, 0.9, p.d, MAT.white, 0, 0.45, 0),
        box(p.w, 1.3, 0.08, MAT.white, 0, 1.55, -p.d / 2 + 0.04),
        box(0.08, 1.3, p.d, MAT.white, -p.w / 2 + 0.04, 1.55, 0),
        box(0.08, 1.3, p.d, MAT.white, p.w / 2 - 0.04, 1.55, 0),
        box(p.w, 0.5, p.d, MAT.metal, 0, 2.45, 0),
        box(p.w - 0.2, 1.1, 0.02, MAT.glass, 0, 1.5, p.d / 2 - 0.05),
        box(p.w - 0.3, 0.04, 0.3, glow("#eafcff", 1.5), 0, 2.18, 0),
      );
    case "rack": {
      const along = p.w > p.d;
      const len = along ? p.w : p.d;
      const g = group(p.x, p.z, box(p.w, 2.3, p.d, MAT.plastic, 0, 1.15, 0));
      const colors = ["#3dff7a", "#3dff7a", "#3fc8ff", "#ffb347", "#3dff7a"];
      for (let i = 0; i < len / 0.6; i++) {
        for (let y = 0.4; y < 2.1; y += 0.35) {
          if (r() < 0.4) continue;
          const led = box(0.05, 0.05, 0.02, glow(colors[Math.floor(r() * colors.length)], 2.5));
          const off = -len / 2 + 0.3 + i * 0.6;
          for (const side of [-1, 1]) {
            const m = led.clone();
            if (along) m.position.set(off, y, side * (p.d / 2 + 0.01));
            else m.position.set(side * (p.w / 2 + 0.01), y, off);
            g.add(m);
          }
        }
      }
      return g;
    }
    case "pedestal":
      return group(
        p.x, p.z,
        cyl(0.45, 0.55, 0.15, MAT.darkMetal, 0, 0.07, 0),
        cyl(0.3, 0.35, 1.0, MAT.metal, 0, 0.6, 0),
        cyl(0.42, 0.42, 0.06, glow("#3fe8ff", 2), 0, 1.12, 0),
      );
    default:
      return null;
  }
}
