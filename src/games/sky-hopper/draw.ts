import type { Vec } from "../geometry";
import { formatTime } from "../loop";
import type { SkyHopperCfg, SpikePath } from "./config";

export const FOX_W = 22;
export const FOX_H = 20;
export const SPIKE_W = 30;
export const SPIKE_H = 11;

export interface SkyView {
  cfg: SkyHopperCfg;
  fox: Vec;
  vy: number;
  facing: number;
  onGround: boolean;
  airLeft: number;
  coyote: number;
  got: Set<number>;
  time: number;
}

type SpikeX = (p: SpikePath, speed: number, t: number) => number;

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = spin + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawFox(ctx: CanvasRenderingContext2D, v: SkyView): void {
  const { x, y } = v.fox;
  const f = v.facing;
  const cx = x + FOX_W / 2;
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(f, 1);
  // tail
  ctx.fillStyle = "#c96a26";
  ctx.beginPath();
  ctx.ellipse(-13, 11, 8, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2efe9";
  ctx.beginPath();
  ctx.arc(-19, 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // body + head
  ctx.fillStyle = "#E8833A";
  ctx.beginPath();
  ctx.roundRect(-FOX_W / 2, 6, FOX_W, FOX_H - 6, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 8);
  ctx.lineTo(4, -2);
  ctx.lineTo(8, 5);
  ctx.lineTo(11, -2);
  ctx.lineTo(13, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#0b0b0c";
  ctx.fillRect(7, 8, 2, 2);
  ctx.restore();
}

export function drawSkyHopper(ctx: CanvasRenderingContext2D, v: SkyView, spikeX: SpikeX): void {
  const { cfg } = v;
  const sky = ctx.createLinearGradient(0, 0, 0, cfg.height);
  sky.addColorStop(0, "#14122a");
  sky.addColorStop(1, "#0b0b0c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cfg.width, cfg.height);
  ctx.fillStyle = "rgba(242,239,233,0.35)";
  for (let i = 0; i < 40; i++) {
    ctx.fillRect((i * 151) % cfg.width, (i * 97) % (cfg.height - 60), 1.5, 1.5);
  }

  for (const i of cfg.islands) {
    ctx.fillStyle = "#2a2b30";
    ctx.beginPath();
    ctx.moveTo(i.x, i.y + 4);
    ctx.lineTo(i.x + i.w, i.y + 4);
    ctx.lineTo(i.x + i.w * 0.7, i.y + i.h + 14);
    ctx.lineTo(i.x + i.w * 0.3, i.y + i.h + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3fae6a";
    ctx.beginPath();
    ctx.roundRect(i.x, i.y, i.w, 7, 3);
    ctx.fill();
  }

  cfg.collectibles.forEach((s, i) => {
    if (v.got.has(i)) return;
    ctx.fillStyle = "#ffce54";
    ctx.shadowColor = "#ffce54";
    ctx.shadowBlur = 10;
    starPath(ctx, s.x, s.y + Math.sin(v.time * 3 + i) * 2, 9, Math.sin(v.time + i) * 0.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  if (cfg.spikes) {
    ctx.fillStyle = "#ff5a5a";
    for (const p of cfg.spikes.paths) {
      const sx = spikeX(p, cfg.spikes.speed, v.time);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        ctx.moveTo(sx + k * 10, p.y);
        ctx.lineTo(sx + k * 10 + 5, p.y - SPIKE_H);
        ctx.lineTo(sx + k * 10 + 10, p.y);
      }
      ctx.fill();
    }
  }

  drawFox(ctx, v);

  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(242,239,233,0.85)";
  ctx.textAlign = "left";
  ctx.fillText(`★ ${v.got.size}/${cfg.toWin}`, 12, 22);
  ctx.textAlign = "right";
  const jumps = cfg.fox.airJumps ? `AIR JUMP ${v.airLeft}   ` : "";
  ctx.fillText(`${jumps}${formatTime(v.time)} / ${formatTime(cfg.timeLimit)}`, cfg.width - 12, 22);
}
