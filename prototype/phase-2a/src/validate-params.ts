import type { Blueprint, Parameter } from "./schema";

export interface ParamError {
  code: "INVALID_PARAMETER" | "PARAMETER_OUT_OF_RANGE" | "DUPLICATE_ID" | "MISSING_PARAMETER";
  path: string;
  message: string;
}

const expected = (p: Parameter): string => `expected number, minimum ${p.min}, maximum ${p.max}`;
const shown = (v: unknown): string => (typeof v === "string" ? `"${v}"` : typeof v === "number" || v === undefined ? String(v) : JSON.stringify(v));

/**
 * Checks Blueprint-controlled parameters. Values outside their range are REJECTED, never clamped.
 * Messages name the parameter, the supplied value and the expected type/range.
 */
export function checkParameters(bp: Blueprint, required: string[] = []): ParamError[] {
  const errs: ParamError[] = [];
  if (!Array.isArray(bp.parameters)) return [{ code: "INVALID_PARAMETER", path: "parameters", message: "Blueprint has no parameters list." }];
  const seen = new Set<string>();
  bp.parameters.forEach((p, i) => {
    const path = `parameters[${i}](${p.id})`;
    if (seen.has(p.id)) errs.push({ code: "DUPLICATE_ID", path, message: `Duplicate parameter id "${p.id}".` });
    seen.add(p.id);
    if (p.type !== "number" || typeof p.min !== "number" || typeof p.max !== "number" || !(p.min < p.max)) {
      errs.push({ code: "INVALID_PARAMETER", path, message: `${p.id}: parameter must be type "number" with numeric min < max.` });
      return;
    }
    if (typeof p.value !== "number" || !Number.isFinite(p.value)) {
      errs.push({ code: "INVALID_PARAMETER", path, message: `${p.id}: supplied ${shown(p.value)} — ${expected(p)}.` });
    } else if (p.value < p.min || p.value > p.max) {
      errs.push({ code: "PARAMETER_OUT_OF_RANGE", path, message: `${p.id}: supplied ${p.value} — ${expected(p)}.` });
    }
    if (!p.consumers?.length) errs.push({ code: "INVALID_PARAMETER", path, message: `${p.id}: no runtime consumer listed.` });
  });
  for (const id of required) {
    if (!seen.has(id)) errs.push({ code: "MISSING_PARAMETER", path: "parameters", message: `${id}: required by the runtime but missing from the Blueprint.` });
  }
  return errs;
}
