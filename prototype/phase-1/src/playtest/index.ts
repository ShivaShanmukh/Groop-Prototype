import type { Facility } from "../world/facility";
import type { GameEvent } from "../world/types";
import { installPanel, save } from "./panel";
import { Recorder } from "./recorder";

declare global {
  interface Window {
    /** Set by the playtest build (scripts/build-playable.mjs). */
    __PLAYTEST__?: boolean;
    __BUILD__?: { version: string; built: string; bundleSha256: string; playtest: boolean };
  }
}

export interface Playtest {
  attempt: (f: Facility) => void;
  interacted: (what: string) => void;
  frame: (dt: number, events: GameEvent[]) => void;
  recorder: Recorder;
}

/** Playtest mode is on in the playtest build, or with ?playtest in the URL. Otherwise nothing is recorded. */
export function startPlaytest(): Playtest | null {
  const on = window.__PLAYTEST__ === true || new URLSearchParams(location.search).has("playtest");
  if (!on) return null;
  const rec = new Recorder(window.__BUILD__ ?? { version: "dev", built: "unbuilt", bundleSha256: "n/a", playtest: true });
  const refresh = installPanel(rec);
  let lastSave = 0;
  window.addEventListener("beforeunload", () => save(rec));
  return {
    recorder: rec,
    attempt: (f) => {
      rec.attempt(f);
      save(rec);
    },
    interacted: (what) => rec.interacted(what),
    frame: (dt, events) => {
      rec.frame(dt, events);
      if (events.some((e) => e.type === "end" || e.type === "pickup" || e.type === "alarm") || rec.s.playSeconds - lastSave > 5) {
        lastSave = rec.s.playSeconds;
        save(rec);
        if (!document.getElementById("playtest-panel")?.hidden) refresh();
      }
    },
  };
}
