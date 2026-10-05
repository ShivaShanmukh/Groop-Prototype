import * as THREE from "three";
import type { VaultCfg } from "./config";

export const CONE_RAYS = 28;

export interface VaultScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: THREE.Group;
  key: THREE.Group;
  drone: THREE.Group;
  cone: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  exitPanel: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  flashlight: THREE.SpotLight | null;
}

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** Greybox vault built entirely from the config. */
export function buildScene(canvas: HTMLCanvasElement, cfg: VaultCfg): VaultScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(640, 400, false);
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.dark ? "#050506" : "#0b0b0c");
  const camera = new THREE.PerspectiveCamera(50, 640 / 400, 0.1, 100);

  scene.add(new THREE.HemisphereLight("#dfe3ff", "#1a1a22", 1.2 * cfg.ambient));
  const sun = new THREE.DirectionalLight("#ffffff", 1.8 * cfg.ambient);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  const { width: W, depth: D } = cfg;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std("#26272c"));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  // GridHelper is square: size it to the width, then squash it to the room's depth.
  const grid = new THREE.GridHelper(W, W, "#3a3b42", "#2e2f35");
  grid.scale.z = D / W;
  grid.position.y = 0.01;
  // Grid lines ignore lighting, so fade them when the vault is dark.
  for (const m of [grid.material].flat()) {
    m.transparent = true;
    m.opacity = cfg.dark ? 0.12 : 0.7;
  }
  scene.add(grid);

  const wall = std("#34353c");
  scene.add(box(W + 0.8, 2.2, 0.4, wall, 0, 1.1, -D / 2 - 0.2));
  scene.add(box(W + 0.8, 0.5, 0.4, wall, 0, 0.25, D / 2 + 0.2)); // low wall nearest the camera
  scene.add(box(0.4, 2.2, D, wall, -W / 2 - 0.2, 1.1, 0));
  scene.add(box(0.4, 2.2, D, wall, W / 2 + 0.2, 1.1, 0));

  const stone = std("#4a4b55");
  for (const p of cfg.pillars) scene.add(box(p.size, 2.6, p.size, stone, p.x + p.w / 2, 1.3, p.y + p.h / 2));

  const exitPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 2, 1.8),
    std("#7a2e2e", { emissive: "#7a2e2e", emissiveIntensity: 0.8 }),
  );
  exitPanel.position.set(-W / 2 + 0.02, 1, cfg.exit.y);
  scene.add(exitPanel);

  const player = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 20), std("#E8833A"));
  body.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 12), std("#f2efe9"));
  head.position.y = 1.1;
  const visor = box(0.12, 0.1, 0.3, std("#0b0b0c"), 0.22, 1.12, 0);
  player.add(body, head, visor);
  scene.add(player);

  const gold = std("#ffce54", { metalness: 0.6, roughness: 0.3, emissive: "#ffce54", emissiveIntensity: 0.5 });
  const key = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 10, 24), gold);
  ring.position.x = -0.3;
  key.add(ring, box(0.5, 0.08, 0.08, gold, 0.1, 0, 0), box(0.08, 0.16, 0.08, gold, 0.3, -0.08, 0));
  key.add(new THREE.PointLight("#ffce54", 4, 4, 1.5));
  key.position.set(cfg.key.x, 0.8, cfg.key.y);
  scene.add(key);

  const drone = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), std("#c9cad3", { metalness: 0.5, roughness: 0.4 }));
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 8, 32), std("#8a8b95"));
  halo.rotation.x = Math.PI / 2;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), std("#ff3b3b", { emissive: "#ff3b3b", emissiveIntensity: 2 }));
  eye.position.x = 0.3;
  drone.add(shell, halo, eye);
  scene.add(drone);

  const coneGeo = new THREE.BufferGeometry();
  coneGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((CONE_RAYS + 2) * 3), 3));
  const idx: number[] = [];
  for (let i = 1; i <= CONE_RAYS; i++) idx.push(0, i, i + 1);
  coneGeo.setIndex(idx);
  const cone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({ color: "#E8833A", transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = 0.03;
  scene.add(cone);

  let flashlight: THREE.SpotLight | null = null;
  if (cfg.flashlight) {
    flashlight = new THREE.SpotLight("#fff2dd", 90, cfg.flashlight.range, cfg.flashlight.angle, 0.45, 1.3);
    flashlight.position.set(0, 1.1, 0);
    // The player faces local +x, so aim the beam ahead and slightly down.
    flashlight.target.position.set(4, 0, 0);
    player.add(flashlight, flashlight.target);
  }

  return { renderer, scene, camera, player, key, drone, cone, exitPanel, flashlight };
}

export function disposeScene(v: VaultScene, extra: THREE.Object3D[] = []): void {
  for (const root of [v.scene, ...extra]) {
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m instanceof THREE.MeshBasicMaterial) m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
  v.renderer.dispose();
}
