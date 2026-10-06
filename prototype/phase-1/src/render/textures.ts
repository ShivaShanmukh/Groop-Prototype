import * as THREE from "three";

/** All textures are drawn on canvases at startup, so the game ships no image files. */
export function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) draw(g);
  return c;
}

export function tex(c: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Deterministic speckle so surfaces aren't flat colour. */
function speckle(g: CanvasRenderingContext2D, w: number, h: number, alpha: number, seed: number): void {
  let s = seed;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 40; i++) {
    g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${alpha * rnd()})` : `rgba(0,0,0,${alpha * rnd()})`;
    g.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
}

export function floorTiles(base: string, seed: number): THREE.CanvasTexture {
  return tex(
    canvas(256, 256, (g) => {
      g.fillStyle = base;
      g.fillRect(0, 0, 256, 256);
      speckle(g, 256, 256, 0.12, seed);
      g.strokeStyle = "rgba(0,0,0,0.35)";
      g.lineWidth = 3;
      for (const p of [0, 128]) {
        g.strokeRect(p + 1.5, 1.5, 125, 253);
        g.strokeRect(1.5, p + 1.5, 253, 125);
      }
    }),
  );
}

export function wallPanels(): THREE.CanvasTexture {
  return tex(
    canvas(256, 410, (g) => {
      g.fillStyle = "#b9bec4";
      g.fillRect(0, 0, 256, 410);
      speckle(g, 256, 410, 0.06, 3);
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(126, 0, 4, 330); // panel seam
      g.fillStyle = "#4b5560";
      g.fillRect(0, 330, 256, 80); // dado / kick band
      g.fillStyle = "#e8833a";
      g.fillRect(0, 322, 256, 8); // orange safety stripe
      g.fillStyle = "rgba(255,255,255,0.15)";
      g.fillRect(0, 0, 256, 4);
    }),
  );
}

export function ceilingTiles(): THREE.CanvasTexture {
  return tex(
    canvas(128, 128, (g) => {
      g.fillStyle = "#cfd3d6";
      g.fillRect(0, 0, 128, 128);
      speckle(g, 128, 128, 0.1, 9);
      g.strokeStyle = "rgba(0,0,0,0.12)";
      g.lineWidth = 2;
      g.strokeRect(1.5, 1.5, 125, 125);
    }),
  );
}

export function hazard(): THREE.CanvasTexture {
  return tex(
    canvas(128, 32, (g) => {
      g.fillStyle = "#f2c230";
      g.fillRect(0, 0, 128, 32);
      g.fillStyle = "#1b1b1b";
      for (let x = -32; x < 160; x += 32) {
        g.beginPath();
        g.moveTo(x, 32);
        g.lineTo(x + 16, 32);
        g.lineTo(x + 48, 0);
        g.lineTo(x + 32, 0);
        g.fill();
      }
    }),
  );
}
