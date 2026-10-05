import type { Vec } from "../geometry";
import { num, obj, points, str, type Rect } from "../read";
import type { Blueprint } from "../types";

/** Positions use x and z on the floor; Vec.y holds z for the 2D logic. */
export interface VaultCfg {
  width: number;
  depth: number;
  timeLimit: number;
  player: Vec & { speed: number };
  flashlight: { range: number; angle: number } | null;
  key: Vec;
  exit: Vec;
  drone: {
    patrol: Vec[];
    speed: number;
    chaseSpeed: number;
    visionRange: number;
    visionAngle: number;
    onSeen: string;
    /** 0 = chase forever. */
    chaseSeconds: number;
    cooldownSeconds: number;
  };
  pillars: (Rect & { size: number })[];
  dark: boolean;
  ambient: number;
  pillarsBlockSight: boolean;
  catchDistance: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Everything the runtime knows comes from here — and only from the blueprint. */
export function readConfig(bp: Blueprint): VaultCfg {
  const world = obj(bp, "world");
  const ents = obj(bp, "entities");
  const player = obj(ents, "player");
  const flash = obj(player, "flashlight");
  const key = obj(ents, "key");
  const exit = obj(ents, "exit");
  const drone = obj(ents, "drone");
  const lighting = obj(bp, "lighting");
  const rules = obj(bp, "rules");
  const rawPillars = Array.isArray(bp.pillars) ? bp.pillars : [];

  return {
    width: num(world, "width", 24),
    depth: num(world, "depth", 16),
    timeLimit: num(world, "timeLimit", 120),
    player: { x: num(player, "x", -10), y: num(player, "z", 6), speed: num(player, "speed", 5) },
    flashlight: "range" in flash ? { range: num(flash, "range", 10), angle: rad(num(flash, "angle", 30)) } : null,
    key: { x: num(key, "x", 9), y: num(key, "z", -6) },
    exit: { x: num(exit, "x", -11.6), y: num(exit, "z", -6) },
    drone: {
      patrol: points(drone, "patrol"),
      speed: num(drone, "speed", 2.4),
      chaseSpeed: num(drone, "chaseSpeed", num(drone, "speed", 2.4)),
      visionRange: num(drone, "visionRange", 7),
      visionAngle: rad(num(drone, "visionAngle", 60)),
      onSeen: str(drone, "onSeen", "alarm"),
      chaseSeconds: num(drone, "chaseSeconds", 0),
      cooldownSeconds: num(drone, "cooldownSeconds", 0),
    },
    pillars: rawPillars.flatMap((p) => {
      if (!Array.isArray(p) || p.length < 3) return [];
      const [x, z, s] = p.map(Number);
      return [{ x: x - s / 2, y: z - s / 2, w: s, h: s, size: s }];
    }),
    dark: str(lighting, "mode", "lit") === "dark",
    ambient: num(lighting, "ambient", 1),
    pillarsBlockSight: str(rules, "lineOfSight", "").includes("pillars"),
    catchDistance: num(rules, "catchDistance", 0.9),
  };
}
