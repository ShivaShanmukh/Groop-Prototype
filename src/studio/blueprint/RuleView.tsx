import type { Blueprint } from "./load";
import { actionText, exprText, sourceText } from "./format";

const Fid = ({ f }: { f: string }) => <span className={`bpi-fid ${f}`}>{f.toUpperCase()}</span>;

export function RuleView({ bp, id }: { bp: Blueprint; id: string }) {
  const r = bp.rules.find((x) => x.id === id);
  if (!r) return <p>Unknown rule {id}.</p>;
  return (
    <div>
      <p className="bpi-kicker">{r.category} rule</p>
      <h2>{r.title}</h2>
      <p><code>{r.id}</code> <Fid f={r.fidelity} /></p>
      <table className="bpi-table">
        <tbody>
          <tr><td>When</td><td>{r.trigger === "frame" ? "every frame" : `event ${r.trigger.event}`}</td></tr>
          <tr><td>If</td><td><code>{exprText(r.condition)}</code></td></tr>
          <tr><td>Then</td><td><ul className="bpi-plain">{r.actions.map((a, i) => <li key={i}><code>{actionText(a)}</code></li>)}</ul></td></tr>
          <tr><td>Affects</td><td>{r.affects.join(", ")}</td></tr>
        </tbody>
      </table>
      {r.note && <p className="bpi-note">{r.note}</p>}
      <h3>Implemented in</h3>
      <ul className="bpi-src">{r.source.map((s) => <li key={s.file + s.symbol}>{sourceText(s)}</li>)}</ul>
    </div>
  );
}

export function MachineView({ bp, id }: { bp: Blueprint; id: string }) {
  const m = bp.stateMachines.find((x) => x.id === id);
  if (!m) return <p>Unknown state machine {id}.</p>;
  return (
    <div>
      <p className="bpi-kicker">state machine</p>
      <h2>{m.name}</h2>
      <p><code>{m.id}</code> <Fid f={m.fidelity} /> · state lives in <code>{m.stateRef}</code> · initial <b>{m.initial}</b></p>
      <p className="bpi-note">Applies to: {m.appliesTo.join(", ")}</p>
      <h3>States</h3>
      <table className="bpi-table">
        <tbody>{m.states.map((s) => <tr key={s.id}><td><b>{s.id}</b></td><td>{s.behaviour}</td></tr>)}</tbody>
      </table>
      <h3>Transitions <small>(checked in priority order each frame)</small></h3>
      <table className="bpi-table bpi-trans">
        <thead><tr><th>#</th><th>From → To</th><th>When</th><th>Logged reason</th><th /></tr></thead>
        <tbody>
          {m.transitions.map((t) => (
            <tr key={t.id}>
              <td>{t.priority}</td>
              <td><b>{t.from}</b> → <b>{t.to}</b><br /><code>{t.id}</code></td>
              <td><code>{exprText(t.when)}</code>{t.actions.length > 0 && <ul className="bpi-plain">{t.actions.map((a, i) => <li key={i}><code>{actionText(a)}</code></li>)}</ul>}</td>
              <td>{t.reason ? `"${t.reason}"` : "—"}</td>
              <td><Fid f={t.fidelity} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Implemented in</h3>
      <ul className="bpi-src">{m.source.map((s) => <li key={s.file + s.symbol}>{sourceText(s)}</li>)}</ul>
    </div>
  );
}
