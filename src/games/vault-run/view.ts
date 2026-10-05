import * as THREE from "three";
import { castRay } from "../geometry";
import { formatTime } from "../loop";
import type { VaultState } from "./logic";
import { CONE_RAYS, type VaultScene } from "./scene";

const CAM_OFFSET = new THREE.Vector3(0, 15.5, 10.5);

/** HUD drawn into a small 2D canvas and shown as a flat overlay. */
export function buildHud(): { scene: THREE.Scene; camera: THREE.OrthographicCamera; draw: (s: VaultState) => void } {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 64;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(640, 32), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  plane.position.y = 200 - 16;
  scene.add(plane);
  const camera = new THREE.OrthographicCamera(-320, 320, 200, -200, 0, 10);
  camera.position.z = 5;
  let last = "";

  const draw = (s: VaultState): void => {
    const mode = s.drone.mode === "chase" ? "DRONE: CHASING" : "DRONE: PATROL";
    const text = `${s.hasKey ? "KEY ✓" : "KEY –"}|${formatTime(s.time)} / ${formatTime(s.cfg.timeLimit)}|${mode}`;
    if (!ctx || text === last) return;
    last = text;
    const [k, t, d] = text.split("|");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = "26px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(242,239,233,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(k ?? "", 24, 34);
    ctx.textAlign = "center";
    ctx.fillText(t ?? "", 640, 34);
    ctx.textAlign = "right";
    ctx.fillStyle = s.drone.mode === "chase" ? "#ff5a5a" : "rgba(242,239,233,0.9)";
    ctx.fillText(d ?? "", 1256, 34);
    tex.needsUpdate = true;
  };
  return { scene, camera, draw };
}

/** Copy the logic state onto the meshes, rebuild the vision cone, move the camera. */
export function syncScene(v: VaultScene, s: VaultState, dt: number): void {
  const { cfg } = s;
  v.player.position.set(s.player.x, 0, s.player.y);
  v.player.rotation.y = -s.facing;

  v.key.visible = !s.hasKey;
  v.key.rotation.y += dt * 1.8;
  v.key.position.y = 0.8 + Math.sin(s.time * 3) * 0.08;

  const exitColor = s.hasKey ? "#2fbf6a" : "#7a2e2e";
  v.exitPanel.material.color.set(exitColor);
  v.exitPanel.material.emissive.set(exitColor);

  const d = s.drone;
  v.drone.position.set(d.pos.x, 1.3 + Math.sin(s.time * 2.5) * 0.06, d.pos.y);
  v.drone.rotation.y = -d.facing;

  const pos = v.cone.geometry.getAttribute("position");
  if (pos instanceof THREE.BufferAttribute) {
    pos.setXYZ(0, d.pos.x, 0, d.pos.y);
    const half = cfg.drone.visionAngle / 2;
    const blockers = cfg.pillarsBlockSight ? cfg.pillars : [];
    for (let i = 0; i <= CONE_RAYS; i++) {
      const a = d.facing - half + (half * 2 * i) / CONE_RAYS;
      const r = castRay(d.pos, a, cfg.drone.visionRange, blockers);
      pos.setXYZ(i + 1, d.pos.x + Math.cos(a) * r, 0, d.pos.y + Math.sin(a) * r);
    }
    pos.needsUpdate = true;
    v.cone.geometry.computeBoundingSphere();
  }
  const chasing = d.mode === "chase";
  v.cone.material.color.set(chasing ? "#ff4848" : "#E8833A");
  v.cone.material.opacity = chasing ? 0.34 : 0.24;

  // Follow the player, but keep the view's centre inside the room so the edges don't show empty space.
  const fx = THREE.MathUtils.clamp(s.player.x, -cfg.width / 2 + 6, cfg.width / 2 - 6);
  const fz = THREE.MathUtils.clamp(s.player.y, -cfg.depth / 2 + 3, cfg.depth / 2 - 3);
  const goal = new THREE.Vector3(fx, 0, fz).add(CAM_OFFSET);
  v.camera.position.lerp(goal, dt === 0 ? 1 : Math.min(1, dt * 5));
  v.camera.lookAt(v.camera.position.x, 0, v.camera.position.z - CAM_OFFSET.z);
}
