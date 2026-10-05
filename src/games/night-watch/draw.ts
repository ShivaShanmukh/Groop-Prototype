import { castRay, type Vec } from "../geometry";
import { formatTime } from "../loop";
import type { Rect } from "../read";
import type { NightWatchCfg } from "./config";
import { GUARD_RADIUS, type Guard } from "./guard";

export interface NightWatchView {
  cfg: NightWatchCfg;
  solid: Rect[];
  player: Vec;
  hasKey: boolean;
  time: number;
  guards: Guard[];
}

const CONE: Record<Guard["mode"], string> = {
  patrol: "rgba(232,131,58,0.16)",
  return: "rgba(232,131,58,0.16)",
  chase: "rgba(255,72,72,0.30)",
  track: "rgba(255,72,72,0.22)",
  investigate: "rgba(255,206,84,0.22)",
  search: "rgba(255,206,84,0.22)",
};

function drawCone(ctx: CanvasRenderingContext2D, g: Guard, solid: Rect[]): void {
  const rays = 32;
  const half = g.cfg.visionAngle / 2;
  ctx.beginPath();
  ctx.moveTo(g.pos.x, g.pos.y);
  for (let i = 0; i <= rays; i++) {
    const a = g.facing - half + (half * 2 * i) / rays;
    const d = castRay(g.pos, a, g.cfg.visionRange, solid);
    ctx.lineTo(g.pos.x + Math.cos(a) * d, g.pos.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = CONE[g.mode];
  ctx.fill();
}

function drawGuard(ctx: CanvasRenderingContext2D, g: Guard): void {
  if (g.lastSeen && (g.mode === "investigate" || g.mode === "search")) {
    const { x, y } = g.lastSeen;
    ctx.strokeStyle = "rgba(255,206,84,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 5);
    ctx.lineTo(x + 5, y + 5);
    ctx.moveTo(x + 5, y - 5);
    ctx.lineTo(x - 5, y + 5);
    ctx.stroke();
  }
  ctx.fillStyle = "#c9cad3";
  ctx.beginPath();
  ctx.arc(g.pos.x, g.pos.y, GUARD_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b0b0c";
  ctx.beginPath();
  ctx.arc(g.pos.x + Math.cos(g.facing) * 5, g.pos.y + Math.sin(g.facing) * 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  const mark = g.mode === "chase" || g.mode === "track" ? "!" : g.mode === "patrol" ? "" : "?";
  if (mark) {
    ctx.fillStyle = mark === "!" ? "#ff5a5a" : "#ffce54";
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(mark, g.pos.x, g.pos.y - 14);
  }
}

export function drawNightWatch(ctx: CanvasRenderingContext2D, v: NightWatchView): void {
  const { cfg } = v;
  ctx.fillStyle = "#121315";
  ctx.fillRect(0, 0, cfg.width, cfg.height);
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cfg.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, cfg.height);
    ctx.stroke();
  }
  for (let y = 0; y <= cfg.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(cfg.width, y + 0.5);
    ctx.stroke();
  }

  for (const g of v.guards) drawCone(ctx, g, v.solid);

  for (const w of cfg.walls) {
    ctx.fillStyle = "#2a2b30";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = "#3a3b42";
    ctx.fillRect(w.x, w.y, w.w, 3);
  }

  const open = v.hasKey;
  ctx.fillStyle = open ? "#4ade80" : "#7a2e2e";
  ctx.fillRect(cfg.door.x - 8, cfg.door.y - 22, 16, 44);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(open ? "EXIT" : "LOCKED", cfg.door.x + 12, cfg.door.y + 4);

  if (cfg.key && !v.hasKey) {
    ctx.fillStyle = "#ffce54";
    ctx.beginPath();
    ctx.arc(cfg.key.x, cfg.key.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cfg.key.x + 4, cfg.key.y - 1.5, 10, 3);
  }

  for (const g of v.guards) drawGuard(ctx, g);

  ctx.fillStyle = "#f2efe9";
  ctx.strokeStyle = "#E8833A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(v.player.x, v.player.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(242,239,233,0.85)";
  const keyText = v.hasKey ? "KEY ✓" : "KEY –";
  ctx.fillText(`${keyText}   ${formatTime(v.time)} / ${formatTime(cfg.timeLimit)}`, cfg.width - 12, cfg.height - 12);
}
