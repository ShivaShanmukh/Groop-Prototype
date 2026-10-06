import type { Recorder, Session } from "./recorder";

const KEY = "research-facility-playtests";

/** Saved sessions on this computer (browser localStorage). Never throws. */
function load(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export function save(rec: Recorder): void {
  try {
    const all = load().filter((s) => s.id !== rec.s.id);
    localStorage.setItem(KEY, JSON.stringify([...all, rec.s]));
  } catch {
    // Storage unavailable: the panel's Download button still works for this session.
  }
}

const fmt = (t: number | null | undefined): string => (t === null || t === undefined ? "—" : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`);
const yes = (t: number | null | undefined): string => (t === null || t === undefined ? "no" : `yes (${fmt(t)})`);

export function summary(s: Session): [string, string][] {
  return [
    ["Attempts / deaths", `${s.attempts.length} / ${s.deaths}`],
    ["Active play time", fmt(s.playSeconds)],
    ["First movement", fmt(s.firstMovement)],
    ["First interaction", s.firstInteraction ? `${fmt(s.firstInteraction.t)} (${s.firstInteraction.what})` : "—"],
    ["First saw the keycard (objective)", fmt(s.firstObjectiveDiscovery)],
    ["Alarms", String(s.alarms)],
    ["Guard encounters (glimpsed / chased)", `${s.guardSightings} / ${s.guardChases}`],
    ["Found generator / cut power", `${yes(s.firstSeen.generator)} / ${yes(s.firstGeneratorCut)} ×${s.generatorCuts}`],
    ["Found terminal / used it", `${yes(s.firstSeen.terminal)} / ${s.terminalOpens ? `yes ×${s.terminalOpens}` : "no"}`],
    ["Found keycard / took it", `${yes(s.firstSeen.keycard)} / ${yes(s.keycardTaken)}`],
    ["Reached archive", yes(s.archiveReached)],
    ["Took research drive", yes(s.driveTaken)],
    ["Escaped (time to completion)", yes(s.escaped)],
    ["Used sprint / crouch", `${yes(s.firstSprint)} / ${yes(s.firstCrouch)}`],
  ];
}

/** Facilitator panel, toggled with F9. Hidden from the player otherwise. */
export function installPanel(rec: Recorder): () => void {
  const el = document.createElement("div");
  el.id = "playtest-panel";
  el.hidden = true;
  document.body.append(el);

  const download = (): void => {
    save(rec);
    const blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `research-facility-playtests-${rec.s.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const render = (): void => {
    const rows = summary(rec.s).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    const saved = load().length;
    el.innerHTML = `<h3>Playtest data · session ${rec.s.id.slice(0, 19)}</h3>
      <table>${rows}</table>
      <p>${saved} session(s) saved on this computer.</p>
      <button data-a="download">Download all sessions (JSON)</button>
      <button data-a="copy">Copy this session</button>
      <button data-a="close">Close (F9)</button>`;
  };

  el.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).dataset.a;
    if (a === "download") download();
    if (a === "copy") void navigator.clipboard?.writeText(JSON.stringify(rec.s, null, 2));
    if (a === "close") el.hidden = true;
  });
  window.addEventListener("keydown", (e) => {
    if (e.code !== "F9") return;
    e.preventDefault();
    el.hidden = !el.hidden;
    if (!el.hidden) {
      document.exitPointerLock?.();
      save(rec);
      render();
    }
  });
  return render;
}
