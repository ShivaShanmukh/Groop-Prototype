import type { Input } from "./input";

/** A blueprint is plain JSON-like data. Runtimes read it; requests edit it. */
export type Primitive = string | number | boolean;
export type BpValue = Primitive | BpValue[] | BpObject;
export interface BpObject {
  [key: string]: BpValue;
}
export type Blueprint = BpObject;

/** Paths are dotted keys, e.g. "entities.guard_1.speed". */
export type ChangeOp =
  | { op: "set"; path: string; value: BpValue }
  | { op: "remove"; path: string };

/** Declarative checks run by src/lib/validate.ts after ops are applied. */
export type Check =
  | {
      kind: "ref";
      /** Path whose string value must name a key inside `within`. */
      from: string;
      within: string;
      message: string;
    }
  | {
      kind: "exclusive";
      /** At most one of these paths may be truthy at once. */
      paths: string[];
      message: string;
    };

export interface ScriptedRequest {
  id: string;
  text: string;
  ops: ChangeOp[];
  /** What GROOP says when proposing the change. */
  reply: string;
}

export type GameStatus = "ready" | "playing" | "won" | "lost";

export interface GameState {
  status: GameStatus;
  title: string;
  detail: string;
}

export interface RuntimeHooks {
  onState: (state: GameState) => void;
}

export interface GameRuntime {
  play: () => void;
  restart: () => void;
  destroy: () => void;
  /** Small PNG data URL of the current frame, for the version strip. */
  snapshot: () => string;
}

export type ControlKey = "up" | "down" | "left" | "right" | "action";

export interface TouchControl {
  key: ControlKey;
  label: string;
}

export interface GameDef {
  id: string;
  blueprint: Blueprint;
  requests: ScriptedRequest[];
  checks: Check[];
  touch: TouchControl[];
  controlsHint: string;
  /** Logical canvas size; CSS scales it to fit. */
  width: number;
  height: number;
  /** May be async so heavy runtimes (Three.js) load only when needed. */
  create: (
    canvas: HTMLCanvasElement,
    blueprint: Blueprint,
    input: Input,
    hooks: RuntimeHooks,
  ) => GameRuntime | Promise<GameRuntime>;
}
