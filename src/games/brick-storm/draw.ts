import type { Vec } from "../geometry";
import type { BrickStormCfg } from "./config";
import { PADDLE_H, type Ball, type Brick } from "./physics";

export interface BrickView {
  cfg: BrickStormCfg;
  level: number;
  lives: number;
  score: number;
  paddle: { x: number; y: number; w: number };
  balls: Ball[];
  bricks: Brick[];
  drops: Vec[];
  banner: { text: string; t: number };
}

export function drawBrickStorm(ctx: CanvasRenderingContext2D, v: BrickView): void {
  const { cfg } = v;
  ctx.fillStyle = "#0d0c12";
  ctx.fillRect(0, 0, cfg.width, cfg.height);
  ctx.strokeStyle = "rgba(255,79,216,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cfg.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, cfg.height);
    ctx.stroke();
  }
  if (cfg.walls.passThrough) {
    ctx.fillStyle = "rgba(79,216,255,0.25)";
    ctx.fillRect(0, 0, 2, cfg.height);
    ctx.fillRect(cfg.width - 2, 0, 2, cfg.height);
  }

  const max = cfg.bricks.hitsToBreak;
  for (const k of v.bricks) {
    if (k.hp <= 0) continue;
    const color = cfg.bricks.colors[k.row % cfg.bricks.colors.length] ?? "#E8833A";
    const cracked = k.hp < max;
    ctx.globalAlpha = cracked ? 0.4 : 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = cracked ? 0 : 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(k.x, k.y, k.w, k.h, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (cracked) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  for (const d of v.drops) {
    ctx.fillStyle = "#ff4fd8";
    ctx.shadowColor = "#ff4fd8";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(d.x - 14, d.y, 28, 12, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0d0c12";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("×3", d.x, d.y + 9);
  }

  const p = v.paddle;
  ctx.fillStyle = "#f2efe9";
  ctx.shadowColor = "#E8833A";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, PADDLE_H, 5);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffffff";
  for (const b of v.balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, cfg.ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(242,239,233,0.85)";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${v.score}`, 12, 22);
  ctx.textAlign = "center";
  ctx.fillText(`LEVEL ${v.level}/${cfg.levels}`, cfg.width / 2, 22);
  ctx.textAlign = "right";
  ctx.fillText(`${"● ".repeat(Math.max(0, v.lives)).trim()}`, cfg.width - 12, 22);

  if (v.banner.t > 0) {
    ctx.globalAlpha = Math.min(1, v.banner.t);
    ctx.fillStyle = "#f2efe9";
    ctx.font = "600 30px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(v.banner.text, cfg.width / 2, cfg.height / 2 + 20);
    ctx.globalAlpha = 1;
  }
  if (v.balls.some((b) => b.stuck)) {
    ctx.fillStyle = "rgba(242,239,233,0.5)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("SPACE / ▲ TO LAUNCH", cfg.width / 2, p.y + 24);
  }
}
