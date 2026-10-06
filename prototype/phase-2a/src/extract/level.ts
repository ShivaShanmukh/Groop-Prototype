import { CELL, MAP, ROOMS, WALL_HEIGHT, roomAt } from "../../../phase-1/src/level/map";
import { PROPS } from "../../../phase-1/src/level/props";
import { OPEN_RADIUS, SPEED as DOOR_SPEED, doorCentre } from "../../../phase-1/src/world/doors";
import type { Facility } from "../../../phase-1/src/world/facility";
import type { Door } from "../../../phase-1/src/world/grid";
import type { Entity } from "../schema";

const round = (v: number): number => Math.round(v * 1000) / 1000;

export const areaId = (roomId: string): string => `area_${roomId}`;

/** Areas on either side of a door, e.g. ["corridor", "security"]; "outside" for the exit. */
export function doorSides(d: Door): string[] {
  const c = doorCentre(d);
  const probe = d.axis === "x" ? [{ x: c.x, z: c.z - CELL }, { x: c.x, z: c.z + CELL }] : [{ x: c.x - CELL, z: c.z }, { x: c.x + CELL, z: c.z }];
  return probe.map((p) => roomAt(p)?.id ?? "outside").sort();
}

export function doorId(d: Door): string {
  if (d.kind === "secure") return "door_security";
  if (d.kind === "exit") return "door_exit";
  return `door_${doorSides(d).join("_")}`;
}

export function levelEntities(f: Facility): Entity[] {
  const level: Entity = {
    id: "level_01",
    name: "Helix Research facility",
    kind: "level",
    components: { Layout: { cellSize: CELL, wallHeight: WALL_HEIGHT, rows: [...MAP] } },
    runtime: { object: "MAP + Grid", source: [{ file: "src/level/map.ts", symbol: "export const MAP" }, { file: "src/world/grid.ts", symbol: "class Grid" }] },
  };
  const areas: Entity[] = ROOMS.map((r) => ({
    id: areaId(r.id),
    name: r.name,
    kind: "area",
    components: { Area: { bounds: [r.c0, r.r0, r.c1, r.r1], floorColor: r.floor, lightColor: r.light } },
    runtime: { object: `ROOMS["${r.id}"]`, source: [{ file: "src/level/map.ts", symbol: "export const ROOMS" }] },
  }));
  const doors: Entity[] = f.grid.doors.map((d, i) => {
    const sides = doorSides(d);
    const components: Entity["components"] = {
      Transform: { position: doorCentre(d), yaw: 0 },
      Door: { kind: d.kind, col: d.col, row: d.row, locked: d.locked, open: d.open, openRadius: OPEN_RADIUS, speed: DOOR_SPEED },
    };
    return {
      id: doorId(d),
      name: d.kind === "secure" ? "Security door (restricted wing)" : d.kind === "exit" ? "Emergency exit" : `Door: ${sides.join(" ↔ ")}`,
      kind: "door" as const,
      components,
      runtime: { object: `Facility.grid.doors[${i}]`, source: [{ file: "src/world/grid.ts", symbol: "this.doors.push" }, { file: "src/world/doors.ts", symbol: "updateDoors" }] },
    };
  });
  const props: Entity[] = PROPS.map((p, i) => ({
    id: `prop_${String(i + 1).padStart(2, "0")}_${p.type.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`,
    name: p.type,
    kind: "prop",
    components: {
      Transform: { position: { x: round(p.x), z: round(p.z) }, yaw: 0 },
      Blocker: { propType: p.type, width: p.w, depth: p.d, blocksSight: !!p.tall },
    },
    runtime: { object: `PROPS[${i}]`, source: [{ file: "src/level/props.ts", symbol: "export const PROPS" }, { file: "src/world/grid.ts", symbol: "addProp" }] },
  }));
  return [level, ...areas, ...doors, ...props];
}
