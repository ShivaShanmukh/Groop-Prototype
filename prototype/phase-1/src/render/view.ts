import * as THREE from "three";
import type { Facility } from "../world/facility";
import { DoorViews } from "./doors";
import { GuardViews } from "./guards";
import { buildLevel } from "./level";
import { Lighting } from "./lights";
import { ObjectViews } from "./objects";
import { buildProps } from "./props";
import { buildSigns } from "./signs";

/** Everything the player sees. Reads the Facility; never changes it. */
export class View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 120);
  private lighting: Lighting;
  private doors: DoorViews;
  private objects: ObjectViews;
  private guards: GuardViews;
  private bob = 0;

  constructor(private renderer: THREE.WebGLRenderer, f: Facility) {
    this.scene.background = new THREE.Color("#07090b");
    this.scene.fog = new THREE.Fog("#07090b", 22, 70);
    this.camera.rotation.order = "YXZ";
    buildLevel(this.scene);
    buildProps(this.scene);
    buildSigns(this.scene);
    this.lighting = new Lighting(this.scene);
    this.doors = new DoorViews(this.scene, f.grid);
    this.objects = new ObjectViews(this.scene, f);
    this.guards = new GuardViews(this.scene, f.guards);
    this.resize();
  }

  resize(): void {
    const c = this.renderer.domElement;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(f: Facility, dt: number): void {
    const p = f.player;
    if (p.moving) this.bob += dt * (p.sprinting ? 14 : p.crouching ? 6 : 10);
    const bobAmp = p.moving ? (p.sprinting ? 0.06 : 0.03) : 0;
    this.camera.position.set(p.pos.x, p.eye + Math.sin(this.bob) * bobAmp, p.pos.z);
    this.camera.rotation.set(p.pitch, p.yaw, 0);
    this.lighting.update(f.power, f.alarm.active, f.time);
    this.doors.update();
    this.objects.update(f, dt);
    this.guards.update(f.guards, dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        o.geometry.dispose();
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
}
