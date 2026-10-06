"use client";

import { useState } from "react";
import { checkParameters } from "../../../prototype/phase-2a/src/validate-params";
import type { Blueprint } from "./load";
import { sourceText } from "./format";

export type Overrides = Record<string, number>;

interface Props {
  bp: Blueprint;
  active: Overrides;
  play: (overrides: Overrides) => void;
}

const FILE = "prototype/phase-2a/research-facility.blueprint.json";
const parse = (text: string): unknown => (text.trim() !== "" && Number.isFinite(Number(text)) ? Number(text) : text);

/** Problems the game's own validator would report for these trial values (same code, no clamping). */
function problemsFor(bp: Blueprint, draft: Record<string, string>): Record<string, string> {
  const trial = { ...bp, parameters: bp.parameters.map((p) => (p.id in draft ? { ...p, value: parse(draft[p.id]) as number } : p)) };
  const out: Record<string, string> = {};
  checkParameters(trial).forEach((e) => {
    const id = /\((\w+)\)/.exec(e.path)?.[1];
    if (id) out[id] = e.message;
  });
  return out;
}

/**
 * The Blueprint-controlled parameters: the game reads these values from the Blueprint and has no copy of its own.
 * Trial values are validated here, then passed to the embedded game in its URL. The file is never written.
 */
export function ParamView({ bp, active, play }: Props) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(active).map(([k, v]) => [k, String(v)])));
  const problems = problemsFor(bp, draft);
  const changed = Object.entries(draft).filter(([id, text]) => parse(text) !== bp.parameters.find((p) => p.id === id)?.value);
  const ok = Object.keys(problems).length === 0;

  return (
    <div>
      <p className="bpi-kicker">Authoritative</p>
      <h2>Parameters <small>({bp.parameters.length})</small></h2>
      <p className="bpi-note">
        These values live <b>only</b> in the Blueprint. The game validates them before it starts (wrong type or out of range → it refuses to start; nothing is clamped)
        and its systems read them from there. Trial values below are <b>temporary</b>: they reload the game with the value in its URL and are not saved.
        To change the game permanently, edit <code>{FILE}</code>, then run <code>npm run sync:facility</code> so the embedded build picks it up.
      </p>
      <div className="bpi-params">
        {bp.parameters.map((p, i) => {
          const inUse = active[p.id];
          const err = problems[p.id];
          return (
            <article key={p.id} className="bpi-param">
              <header>
                <div><b>{p.name}</b> <code>{p.id}</code></div>
                <div className="bpi-param-value"><b>{p.value}</b> {p.unit}{inUse !== undefined && <em> · playing with {inUse}</em>}</div>
                {err ? <span className="bpi-bad">INVALID</span> : <span className="bpi-good">VALID</span>}
                <input
                  className="bpi-try" aria-label={`Trial value for ${p.id}`} inputMode="decimal" placeholder={`try ${p.value}`}
                  value={draft[p.id] ?? ""}
                  onChange={(e) => setDraft((d) => {
                    const next = { ...d };
                    if (e.target.value === "") delete next[p.id];
                    else next[p.id] = e.target.value;
                    return next;
                  })}
                />
              </header>
              <p className="bpi-note">{p.description}</p>
              {err && <p className="bpi-bad bpi-param-err">{err}</p>}
              <dl>
                <dt>Type · range</dt><dd>{p.type}, {p.min} – {p.max} {p.unit}</dd>
                <dt>Source</dt><dd><code>{FILE}</code> <code>/parameters/{i}/value</code></dd>
                <dt>Runtime consumer</dt>
                <dd>{p.consumers.map((c) => <div key={c.source.file + c.source.symbol}>{c.system}: {c.reads} <code className="bpi-faint">{sourceText(c.source)}</code></div>)}</dd>
              </dl>
            </article>
          );
        })}
      </div>
      <div className="bpi-actions">
        <button className="bpi-btn" disabled={!ok || !changed.length} onClick={() => play(Object.fromEntries(changed.map(([id, t]) => [id, parse(t) as number])))}>
          Play with {changed.length ? `${changed.length} trial value${changed.length > 1 ? "s" : ""}` : "trial values"}
        </button>
        <button className="bpi-btn ghost" disabled={!Object.keys(active).length && !Object.keys(draft).length} onClick={() => { setDraft({}); play({}); }}>
          Reset to Blueprint values
        </button>
        {!ok && <span className="bpi-bad">Fix the invalid value first — the game would refuse to start.</span>}
      </div>
    </div>
  );
}
