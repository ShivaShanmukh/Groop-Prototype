import type { BrickStormCfg } from "./config";

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Resting on the paddle, waiting for launch. */
  stuck: boolean;
}

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  row: number;
}

export const PADDLE_H = 10;
export const BRICK_H = 16;

export function layoutBricks(cfg: BrickStormCfg): Brick[] {
  const { rows, cols, hitsToBreak } = cfg.bricks;
  const side = 30;
  const gap = 6;
  const w = (cfg.width - side * 2 - gap * (cols - 1)) / cols;
  const out: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: side + c * (w + gap), y: 50 + r * (BRICK_H + gap), w, h: BRICK_H, hp: hitsToBreak, row: r });
    }
  }
  return out;
}

export function setVelocity(b: Ball, speed: number, angle: number): void {
  b.vx = Math.sin(angle) * speed;
  b.vy = -Math.cos(angle) * speed;
}

/**
 * Move one ball by a small time step against walls, paddle and bricks.
 * Returns the brick it broke (hp reached 0), if any.
 */
export function stepBall(
  b: Ball,
  h: number,
  cfg: BrickStormCfg,
  paddle: { x: number; y: number; w: number },
  speed: number,
  bricks: Brick[],
): { hit: Brick | null; broke: boolean } {
  const r = cfg.ball.radius;
  b.x += b.vx * h;
  b.y += b.vy * h;

  if (cfg.walls.passThrough) {
    if (b.x < -r) b.x = cfg.width + r;
    else if (b.x > cfg.width + r) b.x = -r;
  } else if (cfg.walls.bounce) {
    if (b.x < r) {
      b.x = r;
      b.vx = Math.abs(b.vx);
    } else if (b.x > cfg.width - r) {
      b.x = cfg.width - r;
      b.vx = -Math.abs(b.vx);
    }
  }
  if (b.y < r) {
    b.y = r;
    b.vy = Math.abs(b.vy);
  }

  const onPaddleX = b.x > paddle.x - r && b.x < paddle.x + paddle.w + r;
  if (b.vy > 0 && onPaddleX && b.y + r >= paddle.y && b.y - r <= paddle.y + PADDLE_H) {
    // Where it lands on the paddle steers the bounce angle.
    const offset = Math.max(-1, Math.min(1, (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)));
    setVelocity(b, speed, offset * 1.05);
    b.y = paddle.y - r;
  }

  for (const k of bricks) {
    if (k.hp <= 0) continue;
    const nx = Math.max(k.x, Math.min(b.x, k.x + k.w));
    const ny = Math.max(k.y, Math.min(b.y, k.y + k.h));
    if (Math.hypot(b.x - nx, b.y - ny) >= r) continue;
    const overX = Math.min(b.x + r - k.x, k.x + k.w - (b.x - r));
    const overY = Math.min(b.y + r - k.y, k.y + k.h - (b.y - r));
    if (overX < overY) b.vx = b.x < k.x + k.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
    else b.vy = b.y < k.y + k.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
    k.hp -= 1;
    return { hit: k, broke: k.hp <= 0 };
  }
  return { hit: null, broke: false };
}
