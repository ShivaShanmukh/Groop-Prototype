import * as THREE from "three";
import { sign, whiteboard } from "./textures-ui";

interface SignSpec {
  text: string;
  sub?: string;
  x: number;
  y: number;
  z: number;
  /** Direction the sign faces: rotation about y (0 = faces +z / south). */
  face: number;
  w?: number;
  bg?: string;
  fg?: string;
  glow?: boolean;
}

const S = 0; // faces south (+z)
const N = Math.PI; // faces north (-z)
const E = Math.PI / 2; // faces east (+x)
const W = -Math.PI / 2; // faces west (-x)

const SIGNS: SignSpec[] = [
  { text: "SECURITY", sub: "Operations", x: 9, y: 2.75, z: 18.03, face: S },
  { text: "CORRIDOR", x: 9, y: 2.75, z: 15.97, face: N, w: 1.4 },
  { text: "LAB 02", sub: "Biochemistry", x: 29, y: 2.75, z: 18.03, face: S },
  { text: "CORRIDOR", x: 29, y: 2.75, z: 15.97, face: N, w: 1.4 },
  { text: "ARCHIVE", sub: "Level 3 clearance", x: 49, y: 2.75, z: 18.03, face: S, bg: "#3a1414" },
  { text: "RECEPTION", x: 13, y: 2.75, z: 21.97, face: N },
  { text: "LABS · SECURITY", x: 13, y: 2.75, z: 24.03, face: S },
  { text: "STORAGE", sub: "Generator room", x: 31, y: 2.75, z: 21.97, face: N },
  { text: "CORRIDOR", x: 31, y: 2.75, z: 24.03, face: S, w: 1.4 },
  { text: "RESTRICTED", sub: "Keycard holders only", x: 39.97, y: 2.75, z: 19, face: W, bg: "#7a1010" },
  { text: "CORRIDOR", x: 42.03, y: 2.75, z: 19, face: E, w: 1.4 },
  { text: "EMERGENCY EXIT", x: 2.03, y: 2.75, z: 19, face: E, bg: "#0f6b3a", glow: true },
  { text: "RECEPTION", x: 11, y: 2.75, z: 38.03, face: S },
  { text: "ENTRANCE", x: 11, y: 2.75, z: 35.97, face: N, w: 1.4 },
  { text: "HELIX RESEARCH", sub: "Authorised personnel only", x: 11, y: 2.1, z: 41.97, face: N, w: 3.4 },
  { text: "HELIX", sub: "Research Facility · Est. 2009", x: 5, y: 2, z: 24.03, face: S, w: 3.2, bg: "#e8833a", fg: "#1a0d02" },
  { text: "SECURITY OPERATIONS", x: 11, y: 2.65, z: 2.03, face: S, w: 3 },
  { text: "GENERATOR", sub: "High voltage · Do not touch", x: 37.6, y: 2.5, z: 35.97, face: N, w: 2.4, bg: "#c9a227", fg: "#111" },
  { text: "PROJECT HELIX", sub: "Archive · Cold storage", x: 51, y: 2.6, z: 2.03, face: S, w: 3, bg: "#103a3a" },
  { text: "LAB 02", x: 17.97, y: 2.75, z: 9, face: W, w: 1.4 },
  { text: "SECURITY", x: 20.03, y: 2.75, z: 9, face: E, w: 1.4 },
  { text: "STORAGE", x: 21.97, y: 2.75, z: 31, face: W, w: 1.4 },
  { text: "RECEPTION", x: 24.03, y: 2.75, z: 31, face: E, w: 1.4 },
];

export function buildSigns(scene: THREE.Scene): void {
  for (const s of SIGNS) {
    const w = s.w ?? 1.9;
    const map = sign(s.text, { sub: s.sub, bg: s.bg, fg: s.fg });
    // Signs stay readable in emergency lighting.
    const mat = s.glow
      ? new THREE.MeshBasicMaterial({ map, toneMapped: false })
      : new THREE.MeshStandardMaterial({ map, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 0.35, roughness: 0.6 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat);
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.face;
    scene.add(m);
  }
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.6),
    new THREE.MeshStandardMaterial({ map: whiteboard(), roughness: 0.4 }),
  );
  board.position.set(23.5, 1.7, 2.03);
  scene.add(board);
}
