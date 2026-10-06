import type { Facility } from "../world/facility";

export type AppState = "title" | "playing" | "paused" | "terminal" | "inventory" | "ended";

const el = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing #${id}`);
  return e;
};

const SCREENS: Record<Exclude<AppState, "playing">, string> = {
  title: "title",
  paused: "pause",
  terminal: "terminal",
  inventory: "inventory",
  ended: "end",
};

/** Shows exactly one overlay for the current state. */
export function showScreen(state: AppState): void {
  for (const [s, id] of Object.entries(SCREENS)) el(id).hidden = s !== state;
}

export function renderTerminal(f: Facility): void {
  const cams = el("t-cams") as HTMLButtonElement;
  const alarm = el("t-alarm") as HTMLButtonElement;
  cams.innerHTML = `<kbd>1</kbd> ${f.camerasEnabled ? "Disable security cameras" : "Re-enable security cameras"}`;
  alarm.innerHTML = `<kbd>2</kbd> ${f.alarm.active ? `Reset alarm (${Math.ceil(f.alarm.timer)}s left)` : "Alarm is not active"}`;
  alarm.disabled = !f.alarm.active;
}

export function renderEnd(f: Facility): void {
  const won = f.outcome?.result === "won";
  el("end-eyebrow").textContent = won ? "Mission complete" : "Mission failed";
  el("end-title").textContent = won ? "You escaped" : "Caught";
  el("end-reason").textContent = f.outcome?.reason ?? "";
  const mins = Math.floor(f.time / 60);
  const secs = String(Math.floor(f.time % 60)).padStart(2, "0");
  el("end-stats").innerHTML = [
    ["Time", `${mins}:${secs}`],
    ["Times spotted", String(f.stats.spotted)],
    ["Alarms", String(f.stats.alarms)],
  ]
    .map(([k, v]) => `<div><b>${v}</b>${k}</div>`)
    .join("");
}

export function onClick(id: string, fn: () => void): void {
  el(id).addEventListener("click", fn);
}

export function setInventory(html: string): void {
  el("inv-list").innerHTML = html;
}
