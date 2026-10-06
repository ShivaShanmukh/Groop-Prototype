import type { Expr, Predicate, SourceRef } from "../schema";

/** Small builders so hand-written rules read close to the code they describe. */
export const ref = (r: string): Expr => ({ ref: r });
export const val = (v: number | string | boolean | null): Expr => ({ value: v });
export const eq = (a: Expr, b: Expr): Expr => ({ op: "eq", args: [a, b] });
export const neq = (a: Expr, b: Expr): Expr => ({ op: "neq", args: [a, b] });
export const lt = (a: Expr, b: Expr): Expr => ({ op: "lt", args: [a, b] });
export const lte = (a: Expr, b: Expr): Expr => ({ op: "lte", args: [a, b] });
export const gt = (a: Expr, b: Expr): Expr => ({ op: "gt", args: [a, b] });
export const gte = (a: Expr, b: Expr): Expr => ({ op: "gte", args: [a, b] });
export const and = (...args: Expr[]): Expr => ({ op: "and", args });
export const or = (...args: Expr[]): Expr => ({ op: "or", args });
export const not = (a: Expr): Expr => ({ op: "not", args: [a] });
export const pred = (p: Predicate, ...args: Expr[]): Expr => ({ pred: p, args });
export const isTrue = (r: string): Expr => eq(ref(r), val(true));
export const isFalse = (r: string): Expr => eq(ref(r), val(false));
/** "$event.target" equals an entity id. */
export const target = (id: string): Expr => eq(ref("$event.target"), val(id));
export const src = (file: string, symbol: string): SourceRef => ({ file, symbol });
