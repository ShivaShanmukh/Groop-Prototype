import type { Provenance } from "./blueprint/parameters";
import type { Facility } from "./world/facility";
import { findPath } from "./world/path";
import type { ItemId } from "./world/types";

declare global {
  interface Window {
    __facility?: unknown;
  }
}

/**
 * Test hook, only with ?debug in the URL. Lets automated tests read state and
 * set up scenarios (teleport, face a direction). Gameplay itself runs normally.
 */
export function installDebug(get: () => Facility, state: () => string, start: () => void, provenance: Provenance[] = []): void {
  const params = new URLSearchParams(location.search);
  if (!params.has("debug")) return;
  window.__facility = {
    start,
    appState: state,
    /** Phase 2B: where each Blueprint parameter came from, and which runtime systems read it. */
    provenance: () => provenance.map((p) => ({ ...p, consumers: p.consumers.map((c) => ({ ...c })) })),
    snapshot: () => {
      const f = get();
      return {
        time: f.time,
        params: { ...f.params },
        player: { ...f.player, pos: { ...f.player.pos } },
        inventory: [...f.inventory],
        power: f.power,
        camerasEnabled: f.camerasEnabled,
        camerasActive: f.camerasActive,
        alarm: { active: f.alarm.active, timer: f.alarm.timer },
        doors: f.grid.doors.map((d) => ({ kind: d.kind, col: d.col, row: d.row, locked: d.locked, open: d.open })),
        guards: f.guards.map((g) => ({ id: g.id, mode: g.mode, pos: { ...g.pos }, suspicion: g.suspicion, history: g.history.map((h) => ({ ...h })) })),
        cameras: f.cameras.map((c) => ({ id: c.id, mode: c.mode, detect: c.detect })),
        outcome: f.outcome,
        focus: f.focus()?.label ?? null,
        objective: f.objective,
      };
    },
    teleport: (x: number, z: number, yaw?: number) => {
      const f = get();
      f.player.pos = { x, z };
      if (yaw !== undefined) f.player.yaw = yaw;
      f.player.pitch = 0;
    },
    face: (x: number, z: number) => {
      const f = get();
      f.player.yaw = Math.atan2(-(x - f.player.pos.x), -(z - f.player.pos.z));
      f.player.pitch = 0;
    },
    give: (item: ItemId) => get().pickUp(item),
    setCameras: (on: boolean) => {
      get().camerasEnabled = on;
    },
    /** Freeze guards in place (for screenshots of specific rooms). */
    parkGuards: (x: number, z: number) =>
      get().guards.forEach((g) => {
        g.pos = { x, z };
        g.route = [{ x, z }];
        g.routeIdx = 0;
        g.path = [];
        g.pathGoal = null;
      }),
    /** Move one guard and pin its patrol to that spot. */
    placeGuard: (i: number, x: number, z: number, yaw = 0) => {
      const g = get().guards[i];
      g.pos = { x, z };
      g.yaw = yaw;
      g.route = [{ x, z }];
      g.routeIdx = 0;
      g.path = [];
      g.pathGoal = null;
      g.pause = 1e9;
    },
    /** The game's own A* route, for the test autopilot to steer along. */
    pathTo: (x: number, z: number) => findPath(get().grid, get().player.pos, { x, z }),
  };
  if (params.has("autostart")) start();
}
