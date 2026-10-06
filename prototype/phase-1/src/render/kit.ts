import * as THREE from "three";

/** Tiny helpers + a shared material palette for building low-poly props. */
export const MAT: Record<string, THREE.Material> = {
  metal: new THREE.MeshStandardMaterial({ color: "#8a939b", metalness: 0.7, roughness: 0.35 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: "#2b3036", metalness: 0.6, roughness: 0.45 }),
  white: new THREE.MeshLambertMaterial({ color: "#e9ecee" }),
  desk: new THREE.MeshLambertMaterial({ color: "#6d5a48" }),
  deskTop: new THREE.MeshLambertMaterial({ color: "#d9d4cb" }),
  fabric: new THREE.MeshLambertMaterial({ color: "#3e5a73" }),
  orange: new THREE.MeshLambertMaterial({ color: "#e8833a" }),
  wood: new THREE.MeshLambertMaterial({ color: "#8b6a43" }),
  woodDark: new THREE.MeshLambertMaterial({ color: "#5a4129" }),
  cardboard: new THREE.MeshLambertMaterial({ color: "#a98a5c" }),
  plastic: new THREE.MeshLambertMaterial({ color: "#1b1d20" }),
  leaf: new THREE.MeshLambertMaterial({ color: "#3f8a4a", flatShading: true }),
  pot: new THREE.MeshLambertMaterial({ color: "#b9714a" }),
  glass: new THREE.MeshStandardMaterial({ color: "#a8e6ff", transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  locker: new THREE.MeshLambertMaterial({ color: "#4f6d8a" }),
  yellow: new THREE.MeshLambertMaterial({ color: "#d9a514" }),
  blue: new THREE.MeshLambertMaterial({ color: "#2f6fb0" }),
};

export function glow(color: string, intensity = 2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#111", emissive: color, emissiveIntensity: intensity });
}

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function cyl(rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 16): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}

export function group(x: number, z: number, ...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  if (children.length) g.add(...children);
  return g;
}

/** Desk/bench top on legs. w along x, d along z. */
export function table(w: number, d: number, h: number, top: THREE.Material, legs: THREE.Material): THREE.Object3D[] {
  const out: THREE.Object3D[] = [box(w, 0.06, d, top, 0, h, 0)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(box(0.06, h, 0.06, legs, sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)));
  return out;
}

/** Deterministic pseudo-random from a prop's position. */
export function rng(seed: number): () => number {
  let s = Math.abs(Math.floor(seed * 9973)) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
