import type { Vec } from "../geometry";
import { entitiesOfType, num, obj, points, rects, str, type Rect } from "../read";
import type { Blueprint } from "../types";

export interface GuardCfg {
  name: string;
  patrol: Vec[];
  speed: number;
  chaseSpeed: number;
  visionRange: number;
  /** Full cone width, radians. */
  visionAngle: number;
}

export interface RulesCfg {
  onLostSight: string;
  memorySeconds: number;
  investigateSeconds: number;
  caughtDistance: number;
}

export interface NightWatchCfg {
  width: number;
  height: number;
  timeLimit: number;
  player: Vec & { speed: number };
  key: Vec | null;
  door: Vec & { requires: string };
  guards: GuardCfg[];
  walls: Rect[];
  rules: RulesCfg;
}

/** Everything the runtime knows comes from here — and only from the blueprint. */
export function readConfig(bp: Blueprint): NightWatchCfg {
  const world = obj(bp, "world");
  const ents = obj(bp, "entities");
  const player = obj(ents, "player");
  const door = obj(ents, "door");
  const rules = obj(bp, "rules");
  const keyEnt = entitiesOfType(ents, "key")[0];

  return {
    width: num(world, "width", 640),
    height: num(world, "height", 400),
    timeLimit: num(world, "timeLimit", 90),
    player: { x: num(player, "x", 40), y: num(player, "y", 360), speed: num(player, "speed", 120) },
    key: keyEnt ? { x: num(keyEnt[1], "x", 0), y: num(keyEnt[1], "y", 0) } : null,
    door: { x: num(door, "x", 20), y: num(door, "y", 40), requires: str(door, "requires", "") },
    guards: entitiesOfType(ents, "guard").map(([name, g]) => ({
      name,
      patrol: points(g, "patrol"),
      speed: num(g, "speed", 55),
      chaseSpeed: num(g, "chaseSpeed", 100),
      visionRange: num(g, "visionRange", 150),
      visionAngle: (num(g, "visionAngle", 70) * Math.PI) / 180,
    })),
    walls: rects(bp, "walls"),
    rules: {
      onLostSight: str(rules, "onLostSight", "returnToPatrol"),
      memorySeconds: num(rules, "memorySeconds", 0),
      investigateSeconds: num(rules, "investigateSeconds", 0),
      caughtDistance: num(rules, "caughtDistance", 16),
    },
  };
}
