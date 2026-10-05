import type { Input } from "./input";
import { thumbnail } from "./loop";
import type { Rect } from "./read";
import { runShell, type World } from "./shell";
import type { GameRuntime, RuntimeHooks } from "./types";

export type { Outcome } from "./shell";

export interface World2D extends World {
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/** Shell for the 2D games: draws each frame to the canvas's 2D context. */
export function runtime2D(
  canvas: HTMLCanvasElement,
  input: Input,
  hooks: RuntimeHooks,
  intro: { title: string; detail: string },
  makeWorld: () => World2D,
): GameRuntime {
  const ctx = canvas.getContext("2d");
  return runShell({
    input,
    hooks,
    intro,
    makeWorld,
    render: (world) => {
      if (ctx) world.draw(ctx);
    },
    snapshot: () => thumbnail(canvas),
  });
}

/** Invisible walls just outside the world, so rays and movement stop at edges. */
export function boundsWalls(width: number, height: number, x0 = 0, y0 = 0): Rect[] {
  const t = 50;
  return [
    { x: x0 - t, y: y0 - t, w: width + t * 2, h: t },
    { x: x0 - t, y: y0 + height, w: width + t * 2, h: t },
    { x: x0 - t, y: y0, w: t, h: height },
    { x: x0 + width, y: y0, w: t, h: height },
  ];
}
