import { dist, moveCircle } from "../geometry";
import type { Input } from "../input";
import { formatTime } from "../loop";
import { boundsWalls, runtime2D, type World2D } from "../runtime2d";
import type { Blueprint, GameRuntime, RuntimeHooks } from "../types";
import { readConfig } from "./config";
import { drawNightWatch, type NightWatchView } from "./draw";
import { makeGuard, updateGuard } from "./guard";

const PLAYER_RADIUS = 8;

export function createNightWatch(
  canvas: HTMLCanvasElement,
  bp: Blueprint,
  input: Input,
  hooks: RuntimeHooks,
): GameRuntime {
  const cfg = readConfig(bp);
  canvas.width = cfg.width;
  canvas.height = cfg.height;
  const solid = [...cfg.walls, ...boundsWalls(cfg.width, cfg.height)];
  const guardCount = cfg.guards.length;

  const makeWorld = (): World2D => {
    const view: NightWatchView = {
      cfg,
      solid,
      player: { x: cfg.player.x, y: cfg.player.y },
      hasKey: false,
      time: 0,
      guards: cfg.guards.map(makeGuard),
    };

    return {
      draw: (ctx) => drawNightWatch(ctx, view),
      update: (dt) => {
        view.time += dt;
        let mx = 0;
        let my = 0;
        if (input.isDown("left")) mx -= 1;
        if (input.isDown("right")) mx += 1;
        if (input.isDown("up")) my -= 1;
        if (input.isDown("down")) my += 1;
        const len = Math.hypot(mx, my) || 1;
        const step = cfg.player.speed * dt;
        view.player = moveCircle(view.player, PLAYER_RADIUS, (mx / len) * step, (my / len) * step, solid);

        if (cfg.key && !view.hasKey && dist(view.player, cfg.key) < 16) view.hasKey = true;

        for (const g of view.guards) {
          updateGuard(g, dt, view.player, solid, cfg.rules);
          if (dist(g.pos, view.player) < cfg.rules.caughtDistance) {
            return {
              status: "lost",
              title: "Caught!",
              detail: `${g.cfg.name} got you after ${formatTime(view.time)}.`,
            };
          }
        }

        if (view.hasKey && dist(view.player, cfg.door) < 26) {
          return { status: "won", title: "Escaped!", detail: `Out the door in ${formatTime(view.time)}.` };
        }
        if (view.time >= cfg.timeLimit) {
          return { status: "lost", title: "Out of time", detail: "The night shift is over." };
        }
        return null;
      },
    };
  };

  const plural = guardCount === 1 ? "guard" : "guards";
  return runtime2D(
    canvas,
    input,
    hooks,
    {
      title: "Night Watch",
      detail: `Grab the key, slip past ${guardCount} ${plural}, reach the door.`,
    },
    makeWorld,
  );
}
