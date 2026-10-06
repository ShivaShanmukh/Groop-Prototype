import type { Action, Blueprint, Expr, SourceRef, Value } from "../../../prototype/phase-2a/src/schema";

const OPS: Record<string, string> = { eq: "=", neq: "≠", lt: "<", lte: "≤", gt: ">", gte: "≥" };

/** Human-readable rendering of a blueprint expression. */
export function exprText(e: Expr | undefined): string {
  if (!e) return "always";
  if ("ref" in e) return e.ref;
  if ("value" in e) return JSON.stringify(e.value);
  if ("pred" in e) return `${e.pred}(${e.args.map(exprText).join(", ")})`;
  if (e.op === "not") return `NOT ${exprText(e.args[0])}`;
  if (e.op === "and" || e.op === "or") return e.args.map((a) => ("op" in a && (a.op === "and" || a.op === "or") ? `(${exprText(a)})` : exprText(a))).join(e.op === "and" ? " AND " : " OR ");
  return `${exprText(e.args[0])} ${OPS[e.op]} ${exprText(e.args[1])}`;
}

export function actionText(a: Action): string {
  switch (a.do) {
    case "set": return `set ${a.target} ← ${exprText(a.value)}`;
    case "scale": return `scale ${a.target} × ${exprText(a.by)}`;
    case "replace": return `use ${exprText(a.with)} instead of ${a.target}`;
    case "give": return `give ${a.item} to ${a.to}`;
    case "emit": return `emit ${a.event}`;
    case "noise": return `noise at ${a.at}, radius ${exprText(a.radius)} (${a.source})`;
    case "alertGuards": return `alert all guards (source: ${a.source})`;
    case "endGame": return `end game: ${a.outcome} — "${a.reason}"`;
    case "message": return `message: "${a.text}"`;
    case "feedback": return `${a.channel}: ${a.cue}`;
  }
}

/** `bp` resolves `{ $param }` bindings to the Blueprint parameter's value. */
export function valueText(v: Value, bp?: Blueprint): string {
  if (v === null) return "—";
  if (typeof v === "object" && !Array.isArray(v) && "$param" in v) {
    const p = bp?.parameters.find((x) => x.id === v.$param);
    return p ? `${p.value} ← parameter ${p.id}` : `parameter ${v.$param}`;
  }
  if (typeof v === "object" && !Array.isArray(v)) return `(${v.x}, ${v.z})`;
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object" && v[0] !== null && !Array.isArray(v[0])) return v.map((x) => valueText(x, bp)).join(" → ");
    if (v.length > 6) return `${v.length} items`;
    return v.length ? v.map((x) => valueText(x, bp)).join(", ") : "none";
  }
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  return String(v);
}

export const sourceText = (s: SourceRef): string => `prototype/phase-1/${s.file} · ${s.symbol}`;
