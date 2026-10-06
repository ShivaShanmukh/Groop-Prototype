"use client";

import { useMemo, useState } from "react";
import type { Blueprint, ValidationError } from "./load";
import { EntityView } from "./EntityView";
import { GraphView } from "./GraphView";
import { ParamView, type Overrides } from "./ParamView";
import { MachineView, RuleView } from "./RuleView";

type Sel =
  | { view: "summary" }
  | { view: "entity" | "rule" | "machine"; id: string }
  | { view: "parameters" | "relationships" | "objectives" | "events" | "missing" | "validation" };

interface Props {
  blueprint: Blueprint;
  errors: ValidationError[];
  overrides: Overrides;
  play: (overrides: Overrides) => void;
}

const KIND_ORDER = ["player", "guard", "generator", "camera", "terminal", "alarm", "item", "door", "area", "system", "level", "prop"];

/** Blueprint inspector. The runtime is authoritative for structure; the Blueprint is authoritative for its parameters. */
export function BlueprintInspector({ blueprint: bp, errors, overrides, play }: Props) {
  const [sel, setSel] = useState<Sel>({ view: "summary" });
  const [filter, setFilter] = useState("");
  const byKind = useMemo(() => {
    const groups = new Map<string, Blueprint["entities"]>();
    for (const k of KIND_ORDER) groups.set(k, bp.entities.filter((e) => e.kind === k && (e.id + e.name).toLowerCase().includes(filter.toLowerCase())));
    return [...groups].filter(([, list]) => list.length);
  }, [bp, filter]);
  const gameplay = bp.rules.filter((r) => r.category === "gameplay");
  const props = bp.entities.filter((e) => e.kind === "prop").length;
  const is = (v: Sel["view"], id?: string): boolean => sel.view === v && (!id || ("id" in sel && sel.id === id));

  return (
    <div className="bpi">
      <nav className="bpi-nav">
        <button className={`bpi-link ${is("summary") ? "on" : ""}`} onClick={() => setSel({ view: "summary" })}>{bp.game.name}</button>
        <button className={`bpi-link bpi-top ${is("parameters") ? "on" : ""}`} onClick={() => setSel({ view: "parameters" })}>
          Parameters <span className="bpi-count">{bp.parameters.length}</span>{Object.keys(overrides).length > 0 && <em> · trial</em>}
        </button>
        <input className="bpi-filter" placeholder="Filter entities…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {byKind.map(([kind, list]) => (
          <details key={kind} open={["player", "guard", "generator", "camera", "terminal", "alarm", "item"].includes(kind) || !!filter}>
            <summary>{kind} <span>{list.length}</span></summary>
            {list.map((e) => (
              <button key={e.id} className={`bpi-link ${is("entity", e.id) ? "on" : ""}`} onClick={() => setSel({ view: "entity", id: e.id })}>{e.id}</button>
            ))}
          </details>
        ))}
        <details>
          <summary>rules <span>{bp.rules.length}</span></summary>
          {bp.rules.map((r) => <button key={r.id} className={`bpi-link ${is("rule", r.id) ? "on" : ""}`} onClick={() => setSel({ view: "rule", id: r.id })}>{r.id}</button>)}
        </details>
        <details open>
          <summary>state machines <span>{bp.stateMachines.length}</span></summary>
          {bp.stateMachines.map((m) => <button key={m.id} className={`bpi-link ${is("machine", m.id) ? "on" : ""}`} onClick={() => setSel({ view: "machine", id: m.id })}>{m.name}</button>)}
        </details>
        {(["relationships", "objectives", "events", "missing", "validation"] as const).map((v) => (
          <button key={v} className={`bpi-link bpi-top ${is(v) ? "on" : ""}`} onClick={() => setSel({ view: v })}>
            {v === "missing" ? "Not represented" : v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </nav>

      <section className="bpi-main">
        {sel.view === "summary" && (
          <div>
            <h2>{bp.game.name}</h2>
            <p className="bpi-note">
              <b>Structure</b> (entities, rules, state machines) is generated from the running game and checked against it by tests; values shown are the game&apos;s <b>initial</b> state, not a live view.
              <b> Parameters</b> are the other way round: {bp.parameters.length} gameplay values live only in this Blueprint and the game reads them from it.{" "}
              <button className="bpi-inline" onClick={() => setSel({ view: "parameters" })}>Open parameters</button>
            </p>
            <p className={`bpi-badge ${errors.length ? "bad" : "ok"}`}>{errors.length ? `${errors.length} validation error(s)` : "VALID"} · schema {bp.schemaVersion} · runtime v{bp.game.runtimeVersion}</p>
            <div className="bpi-stats">
              {[
                ["Entities", `${bp.entities.length}`, `${bp.entities.length - props} gameplay + ${props} props`],
                ["Rules", `${bp.rules.length}`, `${gameplay.length} gameplay + ${bp.rules.length - gameplay.length} presentation`],
                ["State machines", `${bp.stateMachines.length}`, `${bp.stateMachines.reduce((n, m) => n + m.transitions.length, 0)} transitions`],
                ["Objectives", `${bp.objectives.length}`, `+ ${bp.outcomes.length} outcomes`],
                ["Relationships", `${bp.relationships.length}`, `${new Set(bp.relationships.map((r) => r.type)).size} types`],
                ["Events", `${bp.events.length}`, `${bp.events.filter((e) => e.runtimeType).length} runtime GameEvents`],
              ].map(([k, v, s]) => <div key={k}><b>{v}</b>{k}<small>{s}</small></div>)}
            </div>
            <p className="bpi-note">Approximations: {[...bp.rules, ...bp.stateMachines.flatMap((m) => m.transitions)].filter((x) => x.fidelity === "approximation").length} rules/transitions are marked APPROXIMATION (see each one&apos;s note).</p>
          </div>
        )}
        {sel.view === "parameters" && <ParamView bp={bp} active={overrides} play={play} />}
        {sel.view === "entity" && <EntityView bp={bp} id={sel.id} open={(id) => setSel({ view: "entity", id })} openRule={(id) => setSel(bp.rules.some((r) => r.id === id) ? { view: "rule", id } : { view: "machine", id: bp.stateMachines.find((m) => m.transitions.some((t) => t.id === id))?.id ?? "" })} />}
        {sel.view === "rule" && <RuleView bp={bp} id={sel.id} />}
        {sel.view === "machine" && <MachineView bp={bp} id={sel.id} />}
        {(sel.view === "relationships" || sel.view === "objectives" || sel.view === "events" || sel.view === "missing" || sel.view === "validation") && (
          <GraphView bp={bp} errors={errors} view={sel.view} open={(id) => setSel({ view: "entity", id })} />
        )}
      </section>
    </div>
  );
}
