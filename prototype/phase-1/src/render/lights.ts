import * as THREE from "three";
import { CELL, ROOMS, WALL_HEIGHT } from "../level/map";

interface RoomLight {
  light: THREE.PointLight;
  base: THREE.Color;
  intensity: number;
  panel: THREE.MeshStandardMaterial;
}

const EMERGENCY = new THREE.Color("#ff8a3d");
const ALARM = new THREE.Color("#ff2a2a");

/**
 * One or two ceiling lights per room. The number of lights never changes
 * (that would force shader recompiles); power and alarm only change colour
 * and intensity.
 */
export class Lighting {
  private rooms: RoomLight[] = [];
  private hemi = new THREE.HemisphereLight("#cfe3ff", "#2a2420", 0.55);

  constructor(scene: THREE.Scene) {
    scene.add(this.hemi);
    const fixtureGeo = new THREE.BoxGeometry(1.4, 0.06, 0.4);
    for (const room of ROOMS) {
      const x0 = room.c0 * CELL;
      const z0 = room.r0 * CELL;
      const w = (room.c1 - room.c0 + 1) * CELL;
      const d = (room.r1 - room.r0 + 1) * CELL;
      const n = Math.max(1, Math.round(Math.max(w, d) / 16));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = w >= d ? x0 + w * t : x0 + w / 2;
        const z = w >= d ? z0 + d / 2 : z0 + d * t;
        const base = new THREE.Color(room.light);
        const intensity = 9;
        const light = new THREE.PointLight(base, intensity, Math.max(w, d) / n + 10, 1.1);
        light.position.set(x, WALL_HEIGHT - 0.4, z);
        scene.add(light);
        const panel = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: base, emissiveIntensity: 1.3 });
        const fixture = new THREE.Mesh(fixtureGeo, panel);
        fixture.position.set(x, WALL_HEIGHT - 0.03, z);
        scene.add(fixture);
        this.rooms.push({ light, base, intensity, panel });
      }
    }
  }

  update(power: boolean, alarm: boolean, time: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(time * 7);
    this.hemi.intensity = power ? 0.55 : 0.16;
    for (const r of this.rooms) {
      if (power) {
        r.light.color.copy(r.base);
        r.light.intensity = r.intensity;
        r.panel.emissive.copy(r.base);
        r.panel.emissiveIntensity = 1.3;
        if (alarm) {
          r.light.color.lerp(ALARM, 0.65 * pulse);
          r.panel.emissive.lerp(ALARM, pulse);
        }
      } else {
        // Emergency lighting: dim amber, red pulse during an alarm.
        r.light.color.copy(alarm ? ALARM : EMERGENCY);
        r.light.intensity = r.intensity * (alarm ? 0.25 + 0.2 * pulse : 0.32);
        r.panel.emissive.set("#000000");
        r.panel.emissiveIntensity = 0;
      }
    }
  }
}
