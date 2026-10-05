import type { Input } from "../input";
import { runtime2D, type World2D } from "../runtime2d";
import type { Blueprint, GameRuntime, RuntimeHooks } from "../types";
import { readConfig, type BrickStormCfg } from "./config";
import { drawBrickStorm, type BrickView } from "./draw";
import { layoutBricks, PADDLE_H, setVelocity, stepBall, type Ball } from "./physics";

/** Builds one round. Exported so it can be driven headlessly in tests. */
export function makeBrickWorld(cfg: BrickStormCfg, input: Input): World2D & { view: BrickView } {
  const paddleY = cfg.height - 30;
  const paddleWidth = (level: number): number =>
    Math.max(36, cfg.paddle.width - cfg.paddle.shrinkPerLevel * (level - 1));
  const ballSpeed = (level: number): number => cfg.ball.speed + cfg.ball.speedUpPerLevel * (level - 1);

  const v: BrickView = {
    cfg,
    level: 1,
    lives: cfg.lives,
    score: 0,
    paddle: { x: cfg.width / 2 - paddleWidth(1) / 2, y: paddleY, w: paddleWidth(1) },
    balls: [],
    bricks: layoutBricks(cfg),
    drops: [],
    banner: { text: "Level 1", t: 1.2 },
  };
  const restBall = (): Ball => ({ x: 0, y: 0, vx: 0, vy: 0, stuck: true });
  v.balls = [restBall()];

  return {
    view: v,
    draw: (ctx) => drawBrickStorm(ctx, v),
    update: (dt) => {
      v.banner.t -= dt;
      const p = v.paddle;
      const dir = (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0);
      p.x = Math.max(0, Math.min(cfg.width - p.w, p.x + dir * cfg.paddle.speed * dt));
      const speed = ballSpeed(v.level);
      const launch = input.wasPressed("action") || input.wasPressed("up");

      for (const b of v.balls) {
        if (b.stuck) {
          b.x = p.x + p.w / 2;
          b.y = p.y - cfg.ball.radius - 1;
          if (launch) {
            b.stuck = false;
            setVelocity(b, speed, -0.35);
          }
          continue;
        }
        const steps = Math.ceil((speed * dt) / 4);
        for (let s = 0; s < steps; s++) {
          const { hit, broke } = stepBall(b, dt / steps, cfg, p, speed, v.bricks);
          if (broke && hit) {
            v.score += cfg.bricks.points * v.level;
            if (cfg.multiBall && Math.random() < cfg.multiBall.dropChance) {
              v.drops.push({ x: hit.x + hit.w / 2, y: hit.y + hit.h });
            }
          }
        }
      }

      if (cfg.multiBall) {
        const mb = cfg.multiBall;
        for (const d of v.drops) d.y += mb.fallSpeed * dt;
        const caught = v.drops.filter((d) => d.y + 8 >= p.y && d.y <= p.y + PADDLE_H && d.x > p.x && d.x < p.x + p.w);
        v.drops = v.drops.filter((d) => !caught.includes(d) && d.y < cfg.height + 20);
        for (let c = 0; c < caught.length; c++) {
          const from = v.balls.find((b) => !b.stuck) ?? { x: p.x + p.w / 2, y: p.y - 10 };
          for (let i = 0; i < mb.extraBalls && v.balls.length < mb.maxBalls; i++) {
            const nb: Ball = { x: from.x, y: from.y, vx: 0, vy: 0, stuck: false };
            setVelocity(nb, speed, (i % 2 === 0 ? -1 : 1) * (0.4 + 0.2 * i));
            v.balls.push(nb);
          }
        }
      }

      v.balls = v.balls.filter((b) => b.y < cfg.height + cfg.ball.radius * 2);
      if (v.balls.length === 0) {
        v.lives -= 1;
        if (v.lives <= 0) {
          return { status: "lost", title: "Game over", detail: `Score ${v.score} · reached level ${v.level}/${cfg.levels}.` };
        }
        v.balls = [restBall()];
        v.drops = [];
      }

      if (v.bricks.every((k) => k.hp <= 0)) {
        if (v.level >= cfg.levels) {
          return { status: "won", title: "Storm cleared!", detail: `Score ${v.score} with ${v.lives} lives left.` };
        }
        v.level += 1;
        v.bricks = layoutBricks(cfg);
        v.balls = [restBall()];
        v.drops = [];
        p.w = paddleWidth(v.level);
        p.x = Math.max(0, Math.min(cfg.width - p.w, p.x));
        v.banner = { text: `Level ${v.level}`, t: 1.4 };
      }
      return null;
    },
  };
}

export function createBrickStorm(
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
    { title: "Brick Storm", detail: `Clear ${cfg.levels} levels of neon bricks. Space launches the ball.` },
    () => makeBrickWorld(cfg, input),
  );
}
