import { bool, num, obj } from "../read";
import type { Blueprint } from "../types";

export interface BrickStormCfg {
  width: number;
  height: number;
  lives: number;
  levels: number;
  paddle: { width: number; speed: number; shrinkPerLevel: number };
  ball: { speed: number; radius: number; speedUpPerLevel: number };
  bricks: { rows: number; cols: number; hitsToBreak: number; points: number; colors: string[] };
  walls: { bounce: boolean; passThrough: boolean };
  multiBall: { dropChance: number; extraBalls: number; maxBalls: number; fallSpeed: number } | null;
}

/** Everything the runtime knows comes from here — and only from the blueprint. */
export function readConfig(bp: Blueprint): BrickStormCfg {
  const world = obj(bp, "world");
  const paddle = obj(bp, "paddle");
  const ball = obj(bp, "ball");
  const bricks = obj(bp, "bricks");
  const walls = obj(bp, "walls");
  const multi = obj(obj(bp, "powerUps"), "multiBall");
  const colors = Array.isArray(bricks.colors) ? bricks.colors.filter((c): c is string => typeof c === "string") : [];

  return {
    width: num(world, "width", 640),
    height: num(world, "height", 400),
    lives: num(world, "lives", 3),
    levels: num(world, "levels", 3),
    paddle: {
      width: num(paddle, "width", 110),
      speed: num(paddle, "speed", 560),
      shrinkPerLevel: num(paddle, "shrinkPerLevel", 0),
    },
    ball: {
      speed: num(ball, "speed", 320),
      radius: num(ball, "radius", 6),
      speedUpPerLevel: num(ball, "speedUpPerLevel", 0),
    },
    bricks: {
      rows: num(bricks, "rows", 3),
      cols: num(bricks, "cols", 9),
      hitsToBreak: Math.max(1, num(bricks, "hitsToBreak", 1)),
      points: num(bricks, "points", 10),
      colors: colors.length ? colors : ["#E8833A"],
    },
    walls: { bounce: bool(walls, "bounce", true), passThrough: bool(walls, "passThrough", false) },
    multiBall:
      "dropChance" in multi
        ? {
            dropChance: num(multi, "dropChance", 0.25),
            extraBalls: num(multi, "extraBalls", 2),
            maxBalls: num(multi, "maxBalls", 6),
            fallSpeed: num(multi, "fallSpeed", 120),
          }
        : null,
  };
}
