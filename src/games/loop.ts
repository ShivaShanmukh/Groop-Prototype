/** Fixed-cap requestAnimationFrame loop. dt is in seconds. */
export function startLoop(step: (dt: number) => void): () => void {
  let last = performance.now();
  let handle = 0;
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    handle = requestAnimationFrame(frame);
  };
  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}

/** Downscaled PNG of a canvas, used for version thumbnails. */
export function thumbnail(source: HTMLCanvasElement, width = 192): string {
  const height = Math.round((source.height / source.width) * width);
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(source, 0, 0, width, height);
  return out.toDataURL("image/png");
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
