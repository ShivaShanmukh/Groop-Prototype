import * as THREE from "three";
import { CELL, COLS, MAP, ROOMS, ROWS, WALL_HEIGHT } from "../level/map";
import { ceilingTiles, floorTiles, wallPanels } from "./textures";

function isOpen(c: number, r: number): boolean {
  const ch = MAP[r]?.[c];
  return ch !== undefined && ch !== "#";
}

/** Floors, ceilings and walls. Static: built once. */
export function buildLevel(scene: THREE.Scene): void {
  // Walls: one instanced box per wall cell that touches open space.
  const wallCells: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] !== "#") continue;
      let touches = false;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isOpen(c + dc, r + dr)) touches = true;
      if (touches) wallCells.push([c, r]);
    }
  }
  const wallMat = new THREE.MeshLambertMaterial({ map: wallPanels() });
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL), wallMat, wallCells.length);
  const m = new THREE.Matrix4();
  wallCells.forEach(([c, r], i) => {
    m.setPosition(c * CELL + CELL / 2, WALL_HEIGHT / 2, r * CELL + CELL / 2);
    walls.setMatrixAt(i, m);
  });
  scene.add(walls);

  const ceilingMat = new THREE.MeshLambertMaterial({ map: ceilingTiles() });
  const addPlane = (x0: number, z0: number, w: number, d: number, mat: THREE.Material, y: number, up: boolean): void => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    p.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
    p.position.set(x0 + w / 2, y, z0 + d / 2);
    scene.add(p);
  };

  ROOMS.forEach((room, i) => {
    const x0 = room.c0 * CELL;
    const z0 = room.r0 * CELL;
    const w = (room.c1 - room.c0 + 1) * CELL;
    const d = (room.r1 - room.r0 + 1) * CELL;
    const ft = floorTiles(room.floor, 11 + i);
    ft.repeat.set(w / 2, d / 2);
    addPlane(x0, z0, w, d, new THREE.MeshLambertMaterial({ map: ft }), 0, true);
    const ct = ceilingMat.clone();
    const cTex = ceilingTiles();
    cTex.repeat.set(w / 1.2, d / 1.2);
    ct.map = cTex;
    addPlane(x0, z0, w, d, ct, WALL_HEIGHT, false);
  });

  // Floor + ceiling under every doorway.
  const doorFloor = floorTiles("#30363d", 99);
  const doorFloorMat = new THREE.MeshLambertMaterial({ map: doorFloor });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!"DKX".includes(MAP[r][c])) continue;
      addPlane(c * CELL, r * CELL, CELL, CELL, doorFloorMat, 0.002, true);
      addPlane(c * CELL, r * CELL, CELL, CELL, ceilingMat, WALL_HEIGHT, false);
    }
  }

  // Night outside the emergency exit, visible once it slides open.
  const night = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4),
    new THREE.MeshBasicMaterial({ color: "#0d2a2a", toneMapped: false }),
  );
  night.rotation.y = Math.PI / 2;
  night.position.set(-1.2, 1.6, 19);
  scene.add(night);
  const glow = new THREE.PointLight("#5dffb0", 6, 7, 1.2);
  glow.position.set(-0.8, 2, 19);
  scene.add(glow);
}
