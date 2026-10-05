import type { Vec } from "../geometry";
import { num, obj, points, rects, str, type Rect } from "../read";
import type { Blueprint, BpValue } from "../types";

export interface SpikePath {
  x1: number;
  x2: number;
  y: number;
}

export interface SkyHopperCfg {
  width: number;
  height: number;
  gravity: number;
  timeLimit: number;
  fox: Vec & { runSpeed: number; jumpPower: number; airJumps: number };
  collect: string;
  collectibles: Vec[];
  toWin: number;
  islands: Rect[];
  spikes: { speed: number; paths: SpikePath[] } | null;
}

function triples(v: BpValue | undefined): SpikePath[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((p) =>
    Array.isArray(p) && p.length >= 3 && p.every((n) => typeof n === "number")
      ? [{ x1: Number(p[0]), x2: Number(p[1]), y: Number(p[2]) }]
      : [],
  );
}

/** Everything the runtime knows comes from here — and only from the blueprint. */
export function readConfig(bp: Blueprint): SkyHopperCfg {
  const world = obj(bp, "world");
  const ents = obj(bp, "entities");
  const fox = obj(ents, "fox");
  const rules = obj(bp, "rules");
  const collect = str(rules, "collect", "star");
  const collectibles = points(obj(ents, collect), "at");
  const spikes = obj(ents, "spikes");
  const spikePaths = triples(spikes.paths);

  return {
    width: num(world, "width", 640),
    height: num(world, "height", 400),
    gravity: num(world, "gravity", 1400),
    timeLimit: num(world, "timeLimit", 60),
    fox: {
      x: num(fox, "x", 60),
      y: num(fox, "y", 300),
      runSpeed: num(fox, "runSpeed", 170),
      jumpPower: num(fox, "jumpPower", 520),
      airJumps: num(fox, "airJumps", 0),
    },
    collect,
    collectibles,
    toWin: Math.min(num(rules, "toWin", collectibles.length), collectibles.length),
    islands: rects(bp, "islands"),
    spikes: spikePaths.length ? { speed: num(spikes, "speed", 50), paths: spikePaths } : null,
  };
}
