import type { Blueprint, BpObject, BpValue, ChangeOp } from "@/games/types";

export function isObject(value: BpValue | undefined): value is BpObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getPath(bp: Blueprint, path: string): BpValue | undefined {
  let node: BpValue | undefined = bp;
  for (const key of path.split(".")) {
    if (!isObject(node)) return undefined;
    node = node[key];
  }
  return node;
}

/**
 * Apply ops to a deep COPY of the blueprint. The input is never mutated,
 * so every version in history stays exactly as it was.
 */
export function applyOps(bp: Blueprint, ops: ChangeOp[]): Blueprint {
  const next = structuredClone(bp);
  for (const op of ops) {
    const keys = op.path.split(".");
    const last = keys.pop();
    if (last === undefined) continue;
    let parent: BpObject = next;
    for (const key of keys) {
      const child = parent[key];
      if (isObject(child)) {
        parent = child;
      } else {
        const created: BpObject = {};
        parent[key] = created;
        parent = created;
      }
    }
    if (op.op === "set") parent[last] = structuredClone(op.value);
    else delete parent[last];
  }
  return next;
}
