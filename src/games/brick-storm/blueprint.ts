import type { Blueprint, Check, ScriptedRequest } from "../types";

/** v1 — what GROOP "generates" from the starter prompt. */
export const blueprint: Blueprint = {
  world: { width: 640, height: 400, lives: 3, levels: 3 },
  paddle: { width: 110, speed: 560, shrinkPerLevel: 0 },
  ball: { speed: 320, radius: 6, speedUpPerLevel: 40 },
  bricks: {
    rows: 3,
    cols: 9,
    hitsToBreak: 1,
    points: 10,
    colors: ["#ff4fd8", "#4fd8ff", "#E8833A"],
  },
  walls: { bounce: true, passThrough: false },
};

export const requests: ScriptedRequest[] = [
  {
    id: "multi-ball",
    text: "Add a multi-ball power-up",
    reply:
      "Some bricks (1 in 4) will drop a ×3 capsule. Catch it with the paddle and two extra balls launch (up to 6 at once). You only lose a life when every ball is gone.",
    ops: [
      {
        op: "set",
        path: "powerUps.multiBall",
        value: { dropChance: 0.25, extraBalls: 2, maxBalls: 6, fallSpeed: 120 },
      },
    ],
  },
  {
    id: "shrink",
    text: "Make the paddle shrink every level",
    reply: "The paddle will lose 25px of width at the start of each new level: 110 → 85 → 60.",
    ops: [{ op: "set", path: "paddle.shrinkPerLevel", value: 25 }],
  },
  {
    id: "two-hits",
    text: "Bricks that need two hits",
    reply: "Every brick now takes two hits. After the first hit it dims, so you can see which ones are cracked.",
    ops: [{ op: "set", path: "bricks.hitsToBreak", value: 2 }],
  },
  {
    id: "walls-both",
    text: "Make the ball go through walls and also bounce off them",
    reply: "Setting the side walls to both pass-through and bounce.",
    ops: [
      { op: "set", path: "walls.passThrough", value: true },
      { op: "set", path: "walls.bounce", value: true },
    ],
  },
];

export const checks: Check[] = [
  {
    kind: "exclusive",
    paths: ["walls.bounce", "walls.passThrough"],
    message:
      "These two rules contradict each other: a ball that passes through a wall can't also bounce off it. Pick one (bounce, or wrap around to the other side) and ask again.",
  },
];
