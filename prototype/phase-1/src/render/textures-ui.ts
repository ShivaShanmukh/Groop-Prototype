import type * as THREE from "three";
import { canvas, tex } from "./textures";

/** Text-bearing textures: signs, monitor screens, the lab whiteboard. */
export function sign(text: string, opts: { bg?: string; fg?: string; sub?: string; w?: number } = {}): THREE.CanvasTexture {
  const w = opts.w ?? 512;
  return tex(
    canvas(w, 128, (g) => {
      g.fillStyle = opts.bg ?? "#1d2733";
      g.fillRect(0, 0, w, 128);
      g.strokeStyle = "rgba(255,255,255,0.25)";
      g.lineWidth = 4;
      g.strokeRect(6, 6, w - 12, 116);
      g.fillStyle = opts.fg ?? "#f2efe9";
      g.textAlign = "center";
      g.textBaseline = "middle";
      // Shrink long titles until they fit inside the border.
      let size = opts.sub ? 50 : 60;
      g.font = `700 ${size}px "Segoe UI", Arial, sans-serif`;
      while (g.measureText(text).width > w - 40 && size > 20) {
        size -= 2;
        g.font = `700 ${size}px "Segoe UI", Arial, sans-serif`;
      }
      g.fillText(text, w / 2, opts.sub ? 50 : 66);
      if (opts.sub) {
        g.globalAlpha = 0.75;
        g.font = `500 26px "Segoe UI", Arial, sans-serif`;
        g.fillText(opts.sub, w / 2, 98);
      }
    }),
    false,
  );
}

export function screen(lines: string[], color: string): THREE.CanvasTexture {
  return tex(
    canvas(256, 160, (g) => {
      g.fillStyle = "#06120d";
      g.fillRect(0, 0, 256, 160);
      g.fillStyle = color;
      g.font = "16px Consolas, monospace";
      lines.forEach((l, i) => g.fillText(l, 12, 26 + i * 22));
      g.fillStyle = "rgba(255,255,255,0.04)";
      for (let y = 0; y < 160; y += 4) g.fillRect(0, y, 256, 2);
    }),
    false,
  );
}

export function whiteboard(): THREE.CanvasTexture {
  return tex(
    canvas(512, 256, (g) => {
      g.fillStyle = "#f4f6f6";
      g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "#2a55c0";
      g.lineWidth = 4;
      g.beginPath();
      for (let x = 20; x < 260; x += 6) g.lineTo(x, 150 - Math.sin(x / 22) * 50 - x / 6);
      g.stroke();
      g.fillStyle = "#c0392b";
      g.font = "700 30px 'Segoe UI', Arial";
      g.fillText("HELIX  phase III", 280, 60);
      g.fillStyle = "#333";
      g.font = "22px 'Segoe UI', Arial";
      ["- stabilise sample 7", "- DO NOT power down", "  cold storage!", "- drive → archive"].forEach((l, i) => g.fillText(l, 290, 105 + i * 32));
    }),
    false,
  );
}
