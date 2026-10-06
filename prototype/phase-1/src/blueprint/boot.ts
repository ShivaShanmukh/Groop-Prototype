import { BLUEPRINT_FILE, BlueprintError, loadParameters, type GameParameters, type Provenance } from "./parameters";

export type Boot = { ok: true; params: GameParameters; provenance: Provenance[] } | { ok: false; problems: string[] };

/**
 * Temporary, in-memory overrides from the URL: ?bp.<parameterId>=<value>.
 * Used by the studio inspector's "Play with this value". Nothing is written back to the Blueprint file.
 * A value that is not a plain number is passed through as text so the validator can reject it by name.
 */
export function readOverrides(search: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of new URLSearchParams(search)) {
    if (!key.startsWith("bp.")) continue;
    const n = raw.trim() === "" ? NaN : Number(raw);
    out[key.slice(3)] = Number.isFinite(n) ? n : raw;
  }
  return out;
}

/** Load + validate the Blueprint parameters BEFORE the game starts. Never throws. */
export function bootBlueprint(search: string): Boot {
  try {
    const { params, provenance } = loadParameters(readOverrides(search));
    return { ok: true, params, provenance };
  } catch (e) {
    if (e instanceof BlueprintError) return { ok: false, problems: e.problems };
    return { ok: false, problems: [e instanceof Error ? e.message : String(e)] };
  }
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** The game does not start: show exactly what is wrong. */
export function renderBlueprintError(problems: string[]): void {
  const title = document.getElementById("title");
  const screen = document.getElementById("bp-error");
  const list = document.getElementById("bp-error-list");
  if (title) title.hidden = true;
  if (list) list.innerHTML = problems.map((p) => `<li>${esc(p)}</li>`).join("");
  if (screen) screen.hidden = false;
}

/** Title-screen line: where the parameters came from, and any temporary override. */
export function renderBlueprintSource(provenance: Provenance[]): void {
  const el = document.getElementById("bp-source");
  if (!el) return;
  const overridden = provenance.filter((p) => p.source === "override");
  const base = `Parameters: ${provenance.length} from ${BLUEPRINT_FILE.split("/").pop() ?? BLUEPRINT_FILE} (validated)`;
  el.textContent = overridden.length
    ? `${base} · temporary override, not saved: ${overridden.map((p) => `${p.id} ${p.blueprintValue} → ${p.value}`).join(", ")}`
    : base;
  el.classList.toggle("bp-override", overridden.length > 0);
}
