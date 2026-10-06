import * as THREE from "three";
import { DRIVE_POS, KEYCARD_POS } from "../level/map";
import { CAM_FOV } from "../world/cameras";
import type { Facility } from "../world/facility";
import { MAT, box, cyl, glow, group } from "./kit";
import { screen } from "./textures-ui";

/** Soft additive glow so pickups can be spotted across a room. */
function halo(color: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
  s.scale.set(1.1, 1.1, 1);
  return s;
}

interface CamView {
  yawGroup: THREE.Group;
  cone: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  led: THREE.MeshStandardMaterial;
}

/** Interactive objects whose look depends on game state. */
export class ObjectViews {
  private keycard: THREE.Group;
  private drive: THREE.Group;
  private fan: THREE.Mesh;
  private genLamp: THREE.MeshStandardMaterial;
  private termScreen: THREE.MeshBasicMaterial;
  private termOn = screen(["HELIX SECURITY v4.2", "> cameras ......", "> alarm ........", "", "[E] log in"], "#7dff9a");
  private termOff = screen([], "#000");
  private cams: CamView[] = [];

  constructor(scene: THREE.Scene, f: Facility) {
    this.keycard = group(KEYCARD_POS.x, KEYCARD_POS.z, box(0.42, 0.02, 0.27, glow("#3fa9ff", 1.8), 0, 0, 0), box(0.42, 0.022, 0.06, MAT.white, 0, 0, -0.07), halo("#3fa9ff"));
    this.keycard.position.y = 1.0;
    this.drive = group(DRIVE_POS.x, DRIVE_POS.z, box(0.32, 0.09, 0.22, MAT.darkMetal), box(0.33, 0.02, 0.05, glow("#3fe8ff", 3), 0, 0.03, 0));
    const holo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 40), glow("#3fe8ff", 3));
    holo.rotation.x = Math.PI / 2;
    holo.position.y = 0.25;
    this.drive.add(holo, halo("#3fe8ff"));
    this.drive.position.y = 1.3;

    // Generator: body, vents, exhaust, control panel, spinning fan.
    this.genLamp = glow("#3dff7a", 3);
    this.fan = box(0.08, 1.0, 0.12, MAT.darkMetal);
    const fanHub = group(39.25, 34.6, this.fan);
    fanHub.position.y = 0.9;
    scene.add(
      group(
        37.6, 34.6,
        box(3.0, 1.5, 1.6, MAT.yellow, 0, 0.85, 0),
        box(3.2, 0.1, 1.8, MAT.darkMetal, 0, 0.05, 0),
        ...[-1, -0.5, 0, 0.5, 1].map((x) => box(0.3, 0.05, 1.4, MAT.darkMetal, x, 1.62, 0)),
        cyl(0.12, 0.12, 1.6, MAT.metal, -1.2, 2.3, 0.5),
        box(0.9, 0.6, 0.06, MAT.plastic, -0.6, 1.1, -0.83),
        box(0.12, 0.12, 0.04, this.genLamp, -0.85, 1.25, -0.87),
        cyl(0.55, 0.55, 0.06, MAT.darkMetal, 1.53, 0.9, 0).rotateZ(Math.PI / 2),
      ),
      fanHub,
    );

    this.termScreen = new THREE.MeshBasicMaterial({ map: this.termOn, toneMapped: false });
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.4), this.termScreen);
    screenMesh.position.set(0, 1.12, 0.03);
    scene.add(this.keycard, this.drive, group(3.2, 2.7, box(0.7, 0.46, 0.05, MAT.plastic, 0, 1.12, 0), screenMesh, box(0.1, 0.3, 0.1, MAT.plastic, 0, 0.88, -0.05), box(0.5, 0.03, 0.18, MAT.plastic, 0, 0.79, 0.3)));

    const coneLen = f.params.cameraRange;
    const coneGeo = new THREE.ConeGeometry(Math.tan(CAM_FOV / 2) * coneLen, coneLen, 28, 1, true);
    coneGeo.translate(0, -coneLen / 2, 0);
    coneGeo.rotateX(Math.PI / 2); // apex at the lens, opening toward -z
    for (const c of f.cameras) {
      const yawGroup = new THREE.Group();
      yawGroup.position.set(c.pos.x, 2.85, c.pos.z);
      const led = glow("#3dff7a", 3);
      const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: "#9ad7ff", transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
      cone.rotation.x = -0.2; // tilt down toward the floor
      yawGroup.add(box(0.2, 0.2, 0.46, MAT.white, 0, 0, -0.05), cyl(0.07, 0.08, 0.06, MAT.plastic, 0, 0, -0.3).rotateX(Math.PI / 2), box(0.05, 0.05, 0.05, led, 0.07, 0.08, -0.25), cone);
      scene.add(yawGroup, box(0.08, 0.35, 0.08, MAT.darkMetal, c.pos.x, 3.0, c.pos.z));
      this.cams.push({ yawGroup, cone, led });
    }
  }

  update(f: Facility, dt: number): void {
    this.keycard.visible = !f.inventory.has("keycard");
    this.keycard.rotation.y += dt * 0.8;
    this.keycard.position.y = 1.0 + Math.sin(f.time * 3) * 0.03;
    this.drive.visible = !f.inventory.has("drive");
    this.drive.rotation.y += dt * 0.6;
    this.drive.position.y = 1.3 + Math.sin(f.time * 2) * 0.05;
    if (f.power) this.fan.parent?.rotateX(dt * 12);
    this.genLamp.emissive.set(f.power ? "#3dff7a" : "#ff3b3b");
    this.termScreen.map = f.power ? this.termOn : this.termOff;

    f.cameras.forEach((c, i) => {
      const v = this.cams[i];
      v.yawGroup.rotation.y = c.yaw;
      v.cone.visible = c.mode !== "off";
      const hot = c.detect;
      v.cone.material.color.setRGB(0.6 + 0.4 * hot, 0.85 - 0.65 * hot, 1 - 0.8 * hot);
      v.cone.material.opacity = 0.06 + 0.14 * hot;
      v.led.emissive.set(c.mode === "off" ? "#000000" : c.seesPlayer ? "#ff2a2a" : "#3dff7a");
    });
  }
}
