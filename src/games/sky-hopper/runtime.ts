import type { Input } from "../input";
import { formatTime } from "../loop";
import { runtime2D, type World2D } from "../runtime2d";
import type { Blueprint, GameRuntime, RuntimeHooks } from "../types";
import { readConfig, type SkyHopperCfg, type SpikePath } from "./config";
import { drawSkyHopper, FOX_H, FOX_W, SPIKE_H, SPIKE_W, type SkyView } from "./draw";

const COYOTE = 0.08;
const MAX_FALL = 900;

/** Left edge of a spike strip that ping-pongs between x1 and x2. */
export function spikeX(p: SpikePath, speed: number, t: number): number {
  const range = Math.max(1, p.x2 - p.x1 - SPIKE_W);
  const phase = (t * speed) % (range * 2);
  return p.x1 + (phase < range ? phase : range * 2 - phase);
}

/** Builds one round. Exported so it can be driven headlessly in tests. */
export function makeSkyWorld(cfg: SkyHopperCfg, input: Input): World2D & { view: SkyView } {
  const v: SkyView = {
    cfg,
    fox: { x: cfg.fox.x, y: cfg.fox.y },
    vy: 0,
    facing: 1,
    onGround: false,
    airLeft: cfg.fox.airJumps,
    coyote: 0,
    got: new Set<number>(),
    time: 0,
  };

  return {
    view: v,
    draw: (ctx) => drawSkyHopper(ctx, v, spikeX),
    update: (dt) => {
      v.time += dt;
      const dir = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
      if (dir) v.facing = dir;
      v.coyote = v.onGround ? COYOTE : v.coyote - dt;

      if (input.wasPressed("up") || input.wasPressed("action")) {
        if (v.onGround || v.coyote > 0) {
          v.vy = -cfg.fox.jumpPower;
          v.coyote = 0;
        } else if (v.airLeft > 0) {
          v.vy = -cfg.fox.jumpPower * 0.9;
          v.airLeft -= 1;
        }
      }

      v.vy = Math.min(MAX_FALL, v.vy + cfg.gravity * dt);
      v.fox.x = Math.max(0, Math.min(cfg.width - FOX_W, v.fox.x + dir * cfg.fox.runSpeed * dt));
      const prevBottom = v.fox.y + FOX_H;
      v.fox.y += v.vy * dt;
      v.onGround = false;

      // Islands are one-way: land on top when falling, pass through from below.
      if (v.vy >= 0) {
        for (const i of cfg.islands) {
          const overX = v.fox.x + FOX_W > i.x + 2 && v.fox.x < i.x + i.w - 2;
          if (overX && prevBottom <= i.y + 0.5 && v.fox.y + FOX_H >= i.y) {
            v.fox.y = i.y - FOX_H;
            v.vy = 0;
            v.onGround = true;
            v.airLeft = cfg.fox.airJumps;
          }
        }
      }

      const cx = v.fox.x + FOX_W / 2;
      const cy = v.fox.y + FOX_H / 2;
      cfg.collectibles.forEach((s, i) => {
        if (!v.got.has(i) && Math.abs(s.x - cx) < 18 && Math.abs(s.y - cy) < 18) v.got.add(i);
      });

      if (cfg.spikes) {
        for (const p of cfg.spikes.paths) {
          const sx = spikeX(p, cfg.spikes.speed, v.time);
          const hit = v.fox.x + FOX_W > sx + 3 && v.fox.x < sx + SPIKE_W - 3;
          if (hit && v.fox.y + FOX_H > p.y - SPIKE_H + 2 && v.fox.y < p.y) {
            return { status: "lost", title: "Ouch!", detail: `Spiked with ${v.got.size}/${cfg.toWin} ${cfg.collect}s.` };
          }
        }
      }

      if (v.got.size >= cfg.toWin) {
        return { status: "won", title: "All stars!", detail: `${v.got.size} ${cfg.collect}s in ${formatTime(v.time)}.` };
      }
      if (v.fox.y > cfg.height + 40) {
        return { status: "lost", title: "Fell off", detail: `The fox dropped out of the sky with ${v.got.size}/${cfg.toWin}.` };
      }
      if (v.time >= cfg.timeLimit) {
        return { status: "lost", title: "Out of time", detail: `${v.got.size}/${cfg.toWin} ${cfg.collect}s collected.` };
      }
      return null;
    },
  };
}

export function createSkyHopper(
  canvas: HTMLCanvasElement,
  bp: Blueprint,
  input: Input,
  hooks: RuntimeHooks,
): GameRuntime {
  const cfg = readConfig(bp);
  canvas.width = cfg.width;
  canvas.height = cfg.height;

  return runtime2D(
    canvas,
    input,
    hooks,
    {
      title: "Sky Hopper",
      detail: `Collect ${cfg.toWin} ${cfg.collect}s. Don't fall.${cfg.fox.airJumps ? " Double jump is on." : ""}`,
    },
    () => makeSkyWorld(cfg, input),
  );
}
