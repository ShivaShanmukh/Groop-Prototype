import type { Blueprint, ValidationError } from "./load";
import { exprText, sourceText } from "./format";

interface Props {
  bp: Blueprint;
  errors: ValidationError[];
  view: "relationships" | "objectives" | "events" | "missing" | "validation";
  open: (id: string) => void;
}

/** List views: relationships, objectives/outcomes, events, what is not represented, validation. */
export function GraphView({ bp, errors, view, open }: Props) {
  if (view === "relationships") {
    const cross = bp.relationships.filter((r) => !["connects", "contains", "patrols"].includes(r.type));
    const rows = (list: Blueprint["relationships"]) => list.map((r) => (
      <tr key={r.id}>
        <td><button className="bpi-inline" onClick={() => open(r.from)}>{r.from}</button></td>
        <td><b>{r.type}</b></td>
        <td><button className="bpi-inline" onClick={() => open(r.to)}>{r.to}</button></td>
        <td>{r.label}{r.fidelity === "approximation" && <em> · APPROXIMATION</em>}</td>
        <td><code>{r.via.join(", ")}</code></td>
      </tr>
    ));
    return (
      <div>
        <h2>Relationships <small>({bp.relationships.length})</small></h2>
        <h3>Cross-system ({cross.length})</h3>
        <table className="bpi-table"><tbody>{rows(cross)}</tbody></table>
        <h3>Level structure ({bp.relationships.length - cross.length})</h3>
        <table className="bpi-table"><tbody>{rows(bp.relationships.filter((r) => !cross.includes(r)))}</tbody></table>
      </div>
    );
  }
  if (view === "objectives") {
    return (
      <div>
        <h2>Objectives</h2>
        <table className="bpi-table"><tbody>{bp.objectives.map((o) => <tr key={o.id}><td>{o.order}</td><td>&ldquo;{o.text}&rdquo;</td><td><code>{exprText(o.completeWhen)}</code></td></tr>)}</tbody></table>
        <h2>Outcomes</h2>
        <table className="bpi-table"><tbody>{bp.outcomes.map((o) => <tr key={o.id}><td><b>{o.result}</b></td><td>&ldquo;{o.reason}&rdquo;</td><td><code>{exprText(o.when)}</code></td></tr>)}</tbody></table>
      </div>
    );
  }
  if (view === "events") {
    return (
      <div>
        <h2>Events <small>({bp.events.length})</small></h2>
        <table className="bpi-table"><tbody>{bp.events.map((e) => <tr key={e.id}><td><code>{e.id}</code></td><td>{e.description}</td><td>{e.runtimeType ? `GameEvent "${e.runtimeType}"` : "internal"}</td><td>{e.payload.join(", ")}</td></tr>)}</tbody></table>
      </div>
    );
  }
  if (view === "missing") {
    return (
      <div>
        <h2>Not represented</h2>
        <p className="bpi-note">Things in the running game that this Blueprint deliberately does not describe.</p>
        <table className="bpi-table"><tbody>{bp.notRepresented.map((n) => <tr key={n.item}><td><b>{n.item}</b></td><td>{n.why}<ul className="bpi-src">{n.source.map((s) => <li key={s.symbol}>{sourceText(s)}</li>)}</ul></td></tr>)}</tbody></table>
      </div>
    );
  }
  return (
    <div>
      <h2>Validation</h2>
      {errors.length === 0 ? <p className="bpi-badge ok">VALID: no errors.</p> : (
        <table className="bpi-table"><tbody>{errors.map((e, i) => <tr key={i}><td><b>{e.code}</b></td><td><code>{e.path}</code></td><td>{e.message}</td></tr>)}</tbody></table>
      )}
      <p className="bpi-note">The validator checks ids, references, component types, required properties, value types, rule targets, transitions and relationships. It reports problems and never repairs data.</p>
    </div>
  );
}
