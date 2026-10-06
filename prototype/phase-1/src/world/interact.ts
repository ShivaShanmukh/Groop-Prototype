import { DRIVE_POS, GENERATOR_POS, KEYCARD_POS, TERMINAL_POS, type Vec2 } from "../level/map";
import { doorCentre } from "./doors";
import type { Facility } from "./facility";
import { angleDiff, dist, yawTo } from "./types";

export interface Interactable {
  id: string;
  pos: Vec2;
  /** Prompt text, or null when there's nothing to do here right now. */
  label: (f: Facility) => string | null;
  use: (f: Facility) => void;
}

export const REACH = 2.4;
export const VIEW_CONE = (75 * Math.PI) / 180;

export function interactables(f: Facility): Interactable[] {
  const secure = f.grid.doors.find((d) => d.kind === "secure");
  const exit = f.grid.doors.find((d) => d.kind === "exit");
  const list: Interactable[] = [
    {
      id: "keycard",
      pos: KEYCARD_POS,
      label: (g) => (g.inventory.has("keycard") ? null : "Take security keycard"),
      use: (g) => g.pickUp("keycard"),
    },
    {
      id: "drive",
      pos: DRIVE_POS,
      label: (g) => (g.inventory.has("drive") ? null : "Take research drive"),
      use: (g) => g.pickUp("drive"),
    },
    {
      id: "generator",
      pos: GENERATOR_POS,
      label: (g) => (g.power ? "Shut down generator" : "Restart generator"),
      use: (g) => g.toggleGenerator(),
    },
    {
      id: "terminal",
      pos: TERMINAL_POS,
      label: (g) => (g.power ? "Use security terminal" : "Security terminal (no power)"),
      use: (g) => (g.power ? g.events.push({ type: "terminal" }) : g.toast("The terminal is dead. The generator is off.")),
    },
  ];
  if (secure) {
    list.push({
      id: "secure-door",
      pos: doorCentre(secure),
      label: (g) => (secure.locked && !g.inventory.has("keycard") ? "Restricted wing: keycard required" : null),
      use: (g) => g.toast("Access denied. You need a security keycard."),
    });
  }
  if (exit) {
    list.push({
      id: "exit",
      pos: doorCentre(exit),
      label: () => (exit.locked ? "Emergency exit: sealed" : null),
      use: (g) => g.toast("Sealed. Lockdown lifts only when the research drive leaves the archive."),
    });
  }
  return list;
}

/** The thing the player is looking at and close enough to use, if any. */
export function focused(f: Facility): { item: Interactable; label: string } | null {
  let best: { item: Interactable; label: string } | null = null;
  let bestD = Infinity;
  for (const item of f.interactables) {
    const label = item.label(f);
    if (!label) continue;
    const d = dist(f.player.pos, item.pos);
    if (d > REACH || d >= bestD) continue;
    const facing = Math.abs(angleDiff(yawTo(f.player.pos, item.pos), f.player.yaw)) < VIEW_CONE / 2;
    if (!facing && d > 0.9) continue;
    best = { item, label };
    bestD = d;
  }
  return best;
}
