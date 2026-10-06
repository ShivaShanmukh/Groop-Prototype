import { roomAt } from "../level/map";
import type { Facility } from "../world/facility";
import { ITEM_INFO, type ItemId } from "../world/types";
import { drawMinimap } from "./minimap";

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

function chip(el: HTMLElement, text: string, tone: "" | "ok" | "warn" | "bad"): void {
  if (el.textContent !== text) el.textContent = text;
  el.className = `chip ${tone}`;
}

/** Heads-up display: reads the Facility every frame, never changes it. */
export class Hud {
  private root = $("hud");
  private minimap = $<HTMLCanvasElement>("minimap");
  private lastArea = "";
  private lastSlots = "";

  show(on: boolean): void {
    this.root.hidden = !on;
  }

  toast(text: string): void {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    $("toasts").append(el);
    setTimeout(() => el.remove(), 4000);
  }

  update(f: Facility): void {
    const obj = $("objective");
    if (obj.textContent !== f.objective) obj.textContent = f.objective;
    const area = roomAt(f.player.pos)?.name ?? "Doorway";
    if (area !== this.lastArea) {
      $("area").textContent = `Location · ${area}`;
      this.lastArea = area;
    }

    const focus = f.focus();
    const prompt = $("prompt");
    prompt.hidden = !focus;
    if (focus) {
      const html = `<b>[E]</b> ${focus.label}`;
      if (prompt.innerHTML !== html) prompt.innerHTML = html;
    }

    const p = f.player;
    chip($("posture"), p.sprinting ? "SPRINTING · loud" : p.crouching ? "CROUCHED · quiet" : "STANDING", p.sprinting ? "warn" : p.crouching ? "ok" : "");
    chip($("power"), f.power ? "POWER ON" : "POWER OFF · dark", f.power ? "" : "warn");
    chip($("cams"), f.camerasActive ? "CAMERAS ACTIVE" : "CAMERAS OFFLINE", f.camerasActive ? "warn" : "ok");
    chip($("alarm"), f.alarm.active ? `ALARM · ${Math.ceil(f.alarm.timer)}s` : "ALARM OFF", f.alarm.active ? "bad" : "ok");

    // Detection: the most alarmed guard that can see you, or a camera locking on.
    const chasing = f.guards.some((g) => g.mode === "CHASE");
    let level = 0;
    for (const g of f.guards) if (g.seesPlayer || g.mode === "CHASE") level = Math.max(level, g.mode === "CHASE" ? 1 : g.suspicion);
    for (const c of f.cameras) level = Math.max(level, c.detect);
    $("meter-fill").style.width = `${Math.round(level * 100)}%`;
    $("meter-fill").style.background = level >= 1 || chasing ? "#ff4b4b" : "#ffd23f";
    $("meter-label").textContent = chasing ? "CHASED" : level > 0.02 ? "Noticed" : "Hidden";

    const slotsKey = [...f.inventory].join(",");
    if (slotsKey !== this.lastSlots) {
      const items: ItemId[] = ["keycard", "drive"];
      $("slots").innerHTML = items
        .map((id) => (f.inventory.has(id) ? `<div class="slot full"><i>ITEM</i>${ITEM_INFO[id].name}</div>` : `<div class="slot"><i>EMPTY</i>—</div>`))
        .join("");
      this.lastSlots = slotsKey;
    }

    const v = $("vignette");
    v.className = chasing ? "chase" : f.alarm.active ? "alarm" : "";
    drawMinimap(this.minimap, f);
  }

  inventoryList(f: Facility): string {
    if (!f.inventory.size) return "<li>Nothing yet.</li>";
    return [...f.inventory].map((id) => `<li>${ITEM_INFO[id].name}<small>${ITEM_INFO[id].detail}</small></li>`).join("");
  }
}
