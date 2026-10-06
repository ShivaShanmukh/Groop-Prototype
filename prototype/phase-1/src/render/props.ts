import * as THREE from "three";
import { PROPS, type Prop } from "../level/props";
import { MAT, box, cyl, glow, group, rng, table } from "./kit";
import { labProp } from "./props-lab";
import { mergeStatic } from "./merge";
import { screen } from "./textures-ui";

const monitor = (x: number, y: number, z: number, lines: string[], color: string): THREE.Object3D[] => [
  box(0.62, 0.4, 0.05, MAT.plastic, x, y, z),
  new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34), new THREE.MeshBasicMaterial({ map: screen(lines, color), toneMapped: false })).translateX(x).translateY(y).translateZ(z + 0.03),
  box(0.08, 0.18, 0.08, MAT.plastic, x, y - 0.28, z),
];

/** Office, reception and storage props. Lab/archive props live in props-lab.ts. */
function officeProp(p: Prop): THREE.Object3D | null {
  const r = rng(p.x * 31 + p.z);
  switch (p.type) {
    case "terminalDesk":
      return group(p.x, p.z, ...table(p.w, p.d, 0.75, MAT.deskTop, MAT.darkMetal), box(0.5, 0.45, 0.5, MAT.fabric, 0.4, 0.45, 0.9));
    case "monitorDesk":
      return group(
        p.x, p.z,
        ...table(p.w, p.d, 0.75, MAT.deskTop, MAT.darkMetal),
        ...monitor(-1.4, 1.1, 0, ["CAM-01 RECEPTION", "● REC 02:14:07", "motion: none"], "#7dff9a"),
        ...monitor(0, 1.1, 0, ["CAM-02 CORRIDOR", "● REC 02:14:07", "motion: none"], "#7dff9a"),
        ...monitor(1.4, 1.1, 0, ["CAM-03 RESTRICTED", "● REC 02:14:07", "!! LEVEL 3 !!"], "#ffb347"),
        box(0.5, 0.45, 0.5, MAT.fabric, 0, 0.45, 0.95),
      );
    case "lockers": {
      const g = group(p.x, p.z);
      for (let i = 0; i < 5; i++) {
        const z = -p.d / 2 + 0.4 + i * 0.8;
        g.add(box(p.w, 2, 0.76, MAT.locker, 0, 1, z), box(0.02, 0.5, 0.3, MAT.darkMetal, -p.w / 2 - 0.01, 1.5, z));
      }
      return g;
    }
    case "table":
      return group(p.x, p.z, ...table(p.w, p.d, 0.74, MAT.wood, MAT.darkMetal), cyl(0.06, 0.05, 0.1, MAT.white, 0.3, 0.82, 0.1));
    case "cabinet":
      return group(p.x, p.z, box(p.w, 1.6, p.d, MAT.metal, 0, 0.8, 0), ...[0.3, 0.7, 1.1, 1.45].map((y) => box(0.02, 0.05, 0.4, MAT.darkMetal, p.w / 2 + 0.01, y, 0)));
    case "plant": {
      const leaves = [0, 1, 2, 3].map((i) => {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + r() * 0.12, 0), MAT.leaf);
        m.position.set((r() - 0.5) * 0.3, 0.75 + i * 0.18, (r() - 0.5) * 0.3);
        return m;
      });
      return group(p.x, p.z, cyl(0.28, 0.22, 0.55, MAT.pot, 0, 0.27, 0), ...leaves);
    }
    case "vending":
      return group(p.x, p.z, box(p.w, 1.9, p.d, MAT.darkMetal, 0, 0.95, 0), box(p.w * 0.8, 1.3, 0.02, glow("#3fa9ff", 1.4), -0.05, 1.15, p.d / 2 + 0.01), box(0.25, 0.5, 0.02, glow("#ff4f6d", 1.2), p.w / 2 - 0.2, 1.1, p.d / 2 + 0.02));
    case "crate": {
      const h = p.w;
      return group(p.x, p.z, box(p.w, h, p.d, MAT.wood, 0, h / 2, 0), box(p.w + 0.02, 0.1, p.d + 0.02, MAT.woodDark, 0, h - 0.1, 0), box(p.w + 0.02, 0.1, p.d + 0.02, MAT.woodDark, 0, 0.1, 0), box(p.w * 0.6, p.w * 0.6, p.d * 0.6, MAT.cardboard, 0.05, h + p.w * 0.3, 0.05));
    }
    case "barrel":
      return group(p.x, p.z, cyl(0.42, 0.42, 1.1, r() > 0.5 ? MAT.blue : MAT.yellow, 0, 0.55, 0), cyl(0.43, 0.43, 0.05, MAT.darkMetal, 0, 0.3, 0), cyl(0.43, 0.43, 0.05, MAT.darkMetal, 0, 0.85, 0));
    case "reception":
      return group(
        p.x, p.z,
        box(p.w, 1.1, p.d, MAT.white, 0, 0.55, 0),
        box(p.w + 0.1, 0.06, p.d + 0.3, MAT.wood, 0, 1.13, 0.1),
        box(p.w * 0.9, 0.25, 0.02, MAT.orange, 0, 0.7, p.d / 2 + 0.01),
        ...monitor(-1.2, 1.45, -0.2, ["VISITOR LOG", "02:13 - night shift", "02:14 - ???"], "#9ad7ff"),
        box(0.5, 0.45, 0.5, MAT.fabric, 0.8, 0.45, -1.1),
      );
    case "sofa":
      return group(p.x, p.z, box(p.w, 0.45, p.d, MAT.fabric, 0, 0.3, 0), box(0.25, 0.9, p.d, MAT.fabric, (p.x < 10 ? -1 : 1) * (p.w / 2 - 0.12), 0.55, 0), box(p.w, 0.6, 0.25, MAT.fabric, 0, 0.45, p.d / 2 - 0.12), box(p.w, 0.6, 0.25, MAT.fabric, 0, 0.45, -p.d / 2 + 0.12));
    case "shelf": {
      const g = group(p.x, p.z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, 2.2, 0.05, MAT.metal, sx * (p.w / 2 - 0.03), 1.1, sz * (p.d / 2 - 0.03)));
      for (const y of [0.15, 0.75, 1.35, 1.95]) {
        g.add(box(p.w, 0.04, p.d, MAT.metal, 0, y, 0));
        for (let x = -p.w / 2 + 0.35; x < p.w / 2 - 0.3; x += 0.55 + r() * 0.2) {
          const s = 0.3 + r() * 0.2;
          if (r() > 0.2) g.add(box(s, s * (0.8 + r() * 0.4), p.d * 0.7, r() > 0.3 ? MAT.cardboard : MAT.blue, x, y + 0.02 + s / 2, 0));
        }
      }
      return g;
    }
    default:
      return null;
  }
}

export function buildProps(scene: THREE.Scene): void {
  const all = new THREE.Group();
  for (const p of PROPS) {
    const obj = officeProp(p) ?? labProp(p);
    if (obj) all.add(obj);
  }
  // Props never move: bake them into one mesh per material.
  scene.add(mergeStatic(all));
}
