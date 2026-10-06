import { CELL, COLS, ROOMS, ROWS } from "../level/map";
import type { Facility } from "../world/facility";

const PX = 7.4; // pixels per cell

/** Facility plan with the player and the current objective. Guards are not shown. */
export function drawMinimap(canvas: HTMLCanvasElement, f: Facility): void {
  const g = canvas.getContext("2d");
  if (!g) return;
  const ox = (canvas.width - COLS * PX) / 2;
  const oy = (canvas.height - ROWS * PX) / 2;
  g.clearRect(0, 0, canvas.width, canvas.height);

  for (const r of ROOMS) {
    g.fillStyle = "rgba(255,255,255,0.10)";
    g.fillRect(ox + r.c0 * PX, oy + r.r0 * PX, (r.c1 - r.c0 + 1) * PX, (r.r1 - r.r0 + 1) * PX);
  }
  for (const d of f.grid.doors) {
    g.fillStyle = d.kind === "door" ? "#38d6ff" : d.locked ? "#ff3b3b" : "#38ff8a";
    g.fillRect(ox + d.col * PX + 1, oy + d.row * PX + 1, PX - 2, PX - 2);
  }
  g.fillStyle = "rgba(242,239,233,0.55)";
  g.font = "8px Consolas, monospace";
  g.textAlign = "center";
  for (const r of ROOMS) {
    if (r.id === "corridor" || r.id === "restricted") continue;
    g.fillText(r.name.toUpperCase(), ox + ((r.c0 + r.c1 + 1) / 2) * PX, oy + ((r.r0 + r.r1 + 1) / 2) * PX + 3);
  }

  // Objective marker (blinking).
  const target = !f.inventory.has("keycard")
    ? { x: 37, z: 2.6 }
    : !f.inventory.has("drive")
      ? { x: 55, z: 13 }
      : { x: 1, z: 19 };
  if (Math.floor(f.time * 2.5) % 2 === 0 || f.time === 0) {
    g.strokeStyle = "#e8833a";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(ox + (target.x / CELL) * PX, oy + (target.z / CELL) * PX, 5, 0, Math.PI * 2);
    g.stroke();
  }

  // Player arrow.
  const px = ox + (f.player.pos.x / CELL) * PX;
  const pz = oy + (f.player.pos.z / CELL) * PX;
  g.save();
  g.translate(px, pz);
  g.rotate(-f.player.yaw);
  g.fillStyle = "#f2efe9";
  g.beginPath();
  g.moveTo(0, -6);
  g.lineTo(4, 4);
  g.lineTo(-4, 4);
  g.closePath();
  g.fill();
  g.restore();
}
