import * as THREE from "three";
import { WALL_HEIGHT } from "../level/map";
import { doorCentre } from "../world/doors";
import type { Door, Grid } from "../world/grid";
import { hazard, wallPanels } from "./textures";

interface DoorView {
  door: Door;
  left: THREE.Mesh;
  right: THREE.Mesh;
  strip: THREE.MeshStandardMaterial;
}

const DOOR_H = 2.4;
const COLORS = { open: "#38d6ff", locked: "#ff3b3b", unlocked: "#38ff8a" };

/** Sliding double doors with a status light above. */
export class DoorViews {
  private views: DoorView[] = [];

  constructor(scene: THREE.Scene, grid: Grid) {
    const panelGeo = new THREE.BoxGeometry(0.98, DOOR_H, 0.12);
    const lintelMat = new THREE.MeshStandardMaterial({ map: wallPanels(), roughness: 0.85 });
    const mats = {
      door: new THREE.MeshStandardMaterial({ color: "#7d8a96", metalness: 0.6, roughness: 0.35 }),
      secure: new THREE.MeshStandardMaterial({ color: "#c9a227", map: hazard(), metalness: 0.4, roughness: 0.5 }),
      exit: new THREE.MeshStandardMaterial({ color: "#2f8f5b", metalness: 0.5, roughness: 0.4 }),
    };
    for (const door of grid.doors) {
      const c = doorCentre(door);
      const g = new THREE.Group();
      g.position.set(c.x, 0, c.z);
      if (door.axis === "z") g.rotation.y = Math.PI / 2;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2, WALL_HEIGHT - DOOR_H, 2), lintelMat);
      lintel.position.y = DOOR_H + (WALL_HEIGHT - DOOR_H) / 2;
      const mat = mats[door.kind];
      const left = new THREE.Mesh(panelGeo, mat);
      const right = new THREE.Mesh(panelGeo, mat);
      left.position.y = right.position.y = DOOR_H / 2;
      const strip = new THREE.MeshStandardMaterial({ color: "#111", emissive: COLORS.open, emissiveIntensity: 2.5 });
      for (const side of [-1, 1]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.04), strip);
        s.position.set(0, DOOR_H + 0.12, side * 1.01);
        g.add(s);
      }
      g.add(lintel, left, right);
      scene.add(g);
      this.views.push({ door, left, right, strip });
    }
  }

  update(): void {
    for (const v of this.views) {
      const off = 0.5 + v.door.open * 0.95;
      v.left.position.x = -off;
      v.right.position.x = off;
      const color = v.door.kind === "door" ? COLORS.open : v.door.locked ? COLORS.locked : COLORS.unlocked;
      v.strip.emissive.set(color);
    }
  }
}
