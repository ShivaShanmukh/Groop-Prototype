import type { Blueprint } from "./load";
import { sourceText, valueText } from "./format";

interface Props {
  bp: Blueprint;
  id: string;
  open: (id: string) => void;
  openRule: (id: string) => void;
}

/** One entity: its components (initial state), relationships, the rules that touch it, and where it lives in the code. */
export function EntityView({ bp, id, open, openRule }: Props) {
  const e = bp.entities.find((x) => x.id === id);
  if (!e) return <p>Unknown entity {id}.</p>;
  const out = bp.relationships.filter((r) => r.from === id);
  const into = bp.relationships.filter((r) => r.to === id);
  const touches = (s: string): boolean => s === id || s.startsWith(`${id}.`) || s === `@${e.kind}` || s.startsWith(`@${e.kind}.`);
  const rules = bp.rules.filter((r) => r.affects.some(touches) || JSON.stringify(r.condition ?? {}).includes(`"${id}`));
  const machines = bp.stateMachines.filter((m) => m.appliesTo.includes(id));

  return (
    <div>
      <p className="bpi-kicker">{e.kind}</p>
      <h2>{e.name} <code>{e.id}</code></h2>
      <p className="bpi-note">Runtime object: <code>{e.runtime.object}</code></p>
      <ul className="bpi-src">{e.runtime.source.map((s) => <li key={s.file + s.symbol}>{sourceText(s)}</li>)}</ul>

      <h3>State &amp; properties <small>(initial values from the runtime)</small></h3>
      {Object.entries(e.components).map(([comp, values]) => (
        <table key={comp} className="bpi-table">
          <caption>{comp}</caption>
          <tbody>
            {Object.entries(values).map(([k, v]) => {
              const def = bp.componentTypes[comp]?.properties[k];
              return (
                <tr key={k}>
                  <td title={def?.description}>{k}</td>
                  <td>{valueText(v, bp)}{def?.unit ? ` ${def.unit}` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}

      {machines.length > 0 && <><h3>State machines</h3><p>{machines.map((m) => m.name).join(", ")}</p></>}

      <h3>Relationships</h3>
      {!out.length && !into.length && <p className="bpi-note">None.</p>}
      <ul className="bpi-rel">
        {out.map((r) => (
          <li key={r.id}>→ <b>{r.type}</b> <button className="bpi-inline" onClick={() => open(r.to)}>{r.to}</button> <span>{r.label}</span>
            {r.via.length > 0 && <span className="bpi-via"> via {r.via.map((v) => <button key={v} className="bpi-inline" onClick={() => openRule(v)}>{v}</button>)}</span>}
            {r.fidelity === "approximation" && <em> APPROXIMATION</em>}
          </li>
        ))}
        {into.map((r) => (
          <li key={r.id}>← <button className="bpi-inline" onClick={() => open(r.from)}>{r.from}</button> <b>{r.type}</b> this <span>{r.label}</span></li>
        ))}
      </ul>

      <h3>Rules that involve it <small>({rules.length})</small></h3>
      <ul className="bpi-rel">{rules.map((r) => <li key={r.id}><button className="bpi-inline" onClick={() => openRule(r.id)}>{r.id}</button> {r.title}</li>)}</ul>
    </div>
  );
}
