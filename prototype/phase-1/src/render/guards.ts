import * as THREE from "three";
import type { Guard, GuardMode } from "../ai/guard";
import { MAT, box } from "./kit";

interface GuardView {
  root: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  icon: THREE.Sprite;
  iconCtx: CanvasRenderingContext2D | null;
  iconTex: THREE.CanvasTexture;
  iconKey: string;
  phase: number;
}

const UNIFORM = new THREE.MeshStandardMaterial({ color: "#26324a", roughness: 0.8 });
const VEST = new THREE.MeshStandardMaterial({ color: "#3a3f46", roughness: 0.7 });
const REFLECT = new THREE.MeshStandardMaterial({ color: "#d8ff3a", emissive: "#556b00", roughness: 0.4 });
const SKIN = new THREE.MeshStandardMaterial({ color: "#c79a78", roughness: 0.8 });

/** A limb that swings from its top. */
function limb(w: number, h: number, mat: THREE.Material, x: number, y: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  pivot.add(box(w, h, w, mat, 0, -h / 2, 0));
  return pivot;
}

const ICON: Partial<Record<GuardMode, { glyph: string; color: string }>> = {
  SUSPICIOUS: { glyph: "?", color: "#ffd23f" },
  INVESTIGATE: { glyph: "?", color: "#ffb02e" },
  SEARCH: { glyph: "?", color: "#ff8a2e" },
  CHASE: { glyph: "!", color: "#ff3b3b" },
};

/** Low-poly guards with flashlights, a walk cycle and an alert icon. */
export class GuardViews {
  private views: GuardView[] = [];

  constructor(scene: THREE.Scene, guards: Guard[]) {
    for (const _ of guards) {
      const root = new THREE.Group();
      const legs = [limb(0.17, 0.85, UNIFORM, -0.11, 0.85), limb(0.17, 0.85, UNIFORM, 0.11, 0.85)];
      const arms = [limb(0.12, 0.62, UNIFORM, -0.33, 1.48), limb(0.12, 0.62, UNIFORM, 0.33, 1.48)];
      const light = new THREE.SpotLight("#ffe3b0", 26, 15, 0.42, 0.55, 1.2);
      light.position.set(0.15, 1.3, -0.2);
      light.target.position.set(0.15, 0.4, -6);
      root.add(
        ...legs, ...arms,
        box(0.52, 0.66, 0.3, VEST, 0, 1.2, 0),
        box(0.53, 0.06, 0.31, REFLECT, 0, 1.12, 0),
        box(0.53, 0.06, 0.31, REFLECT, 0, 1.3, 0),
        new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), SKIN).translateY(1.7),
        new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14), MAT.plastic).translateY(1.82),
        box(0.18, 0.02, 0.14, MAT.plastic, 0, 1.79, -0.15),
        box(0.07, 0.07, 0.16, MAT.darkMetal, 0.15, 1.3, -0.2),
        light, light.target,
      );
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const iconTex = new THREE.CanvasTexture(canvas);
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, transparent: true }));
      icon.scale.set(0.55, 0.55, 1);
      icon.position.y = 2.3;
      root.add(icon);
      scene.add(root);
      this.views.push({ root, legs, arms, icon, iconCtx: canvas.getContext("2d"), iconTex, iconKey: "", phase: 0 });
    }
  }

  update(guards: Guard[], dt: number): void {
    guards.forEach((g, i) => {
      const v = this.views[i];
      v.root.position.set(g.pos.x, 0, g.pos.z);
      v.root.rotation.y = g.yaw;
      v.phase += g.moving ? dt * (g.mode === "CHASE" ? 13 : 8) : 0;
      const swing = g.moving ? Math.sin(v.phase) * 0.55 : 0;
      v.legs[0].rotation.x = swing;
      v.legs[1].rotation.x = -swing;
      v.arms[0].rotation.x = -swing * 0.8;
      v.arms[1].rotation.x = swing * 0.8;
      v.root.position.y = g.moving ? Math.abs(Math.sin(v.phase)) * 0.04 : 0;

      const icon = ICON[g.mode];
      v.icon.visible = !!icon;
      const key = icon ? `${g.mode}:${Math.round(g.suspicion * 10)}` : "";
      if (icon && key !== v.iconKey && v.iconCtx) {
        const c = v.iconCtx;
        c.clearRect(0, 0, 128, 128);
        c.fillStyle = "rgba(10,10,12,0.75)";
        c.beginPath();
        c.arc(64, 64, 56, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = icon.color;
        c.lineWidth = 9;
        c.beginPath();
        c.arc(64, 64, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (g.mode === "CHASE" ? 1 : Math.max(0.08, g.suspicion)));
        c.stroke();
        c.fillStyle = icon.color;
        c.font = "900 80px Arial";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(icon.glyph, 64, 70);
        v.iconTex.needsUpdate = true;
        v.iconKey = key;
      }
    });
  }
}
