import * as brickStorm from "./brick-storm/blueprint";
import { createBrickStorm } from "./brick-storm/runtime";
import * as nightWatch from "./night-watch/blueprint";
import { createNightWatch } from "./night-watch/runtime";
import * as skyHopper from "./sky-hopper/blueprint";
import { createSkyHopper } from "./sky-hopper/runtime";
import type { GameDef } from "./types";
import * as vaultRun from "./vault-run/blueprint";

const DPAD: GameDef["touch"] = [
  { key: "up", label: "▲" },
  { key: "left", label: "◀" },
  { key: "down", label: "▼" },
  { key: "right", label: "▶" },
];

const DEFS: Record<string, GameDef> = {
  "sky-hopper": {
    id: "sky-hopper",
    blueprint: skyHopper.blueprint,
    requests: skyHopper.requests,
    checks: skyHopper.checks,
    touch: [
      { key: "left", label: "◀" },
      { key: "right", label: "▶" },
      { key: "action", label: "Jump" },
    ],
    controlsHint: "← → move · Space / ↑ jump",
    width: 640,
    height: 400,
    create: createSkyHopper,
  },
  "night-watch": {
    id: "night-watch",
    blueprint: nightWatch.blueprint,
    requests: nightWatch.requests,
    checks: nightWatch.checks,
    touch: DPAD,
    controlsHint: "Arrows / WASD to move",
    width: 640,
    height: 400,
    create: createNightWatch,
  },
  "brick-storm": {
    id: "brick-storm",
    blueprint: brickStorm.blueprint,
    requests: brickStorm.requests,
    checks: brickStorm.checks,
    touch: [
      { key: "left", label: "◀" },
      { key: "right", label: "▶" },
      { key: "action", label: "Launch" },
    ],
    controlsHint: "← → move · Space launches",
    width: 640,
    height: 400,
    create: createBrickStorm,
  },
  "vault-run": {
    id: "vault-run",
    blueprint: vaultRun.blueprint,
    requests: vaultRun.requests,
    checks: vaultRun.checks,
    touch: DPAD,
    controlsHint: "WASD / arrows to move",
    width: 640,
    height: 400,
    // Three.js is loaded only when this game opens.
    create: async (canvas, bp, input, hooks) => {
      const { createVaultRun } = await import("./vault-run/runtime");
      return createVaultRun(canvas, bp, input, hooks);
    },
  },
};

export function getGameDef(id: string): GameDef | undefined {
  return DEFS[id];
}
