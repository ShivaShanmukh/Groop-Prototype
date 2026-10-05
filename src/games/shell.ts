import type { Input } from "./input";
import { startLoop } from "./loop";
import type { GameRuntime, GameState, RuntimeHooks } from "./types";

export interface Outcome {
  status: "won" | "lost";
  title: string;
  detail: string;
}

export interface World {
  /** Advance one frame. Return an outcome to end the round. */
  update: (dt: number) => Outcome | null;
}

export interface ShellOptions<W extends World> {
  input: Input;
  hooks: RuntimeHooks;
  intro: { title: string; detail: string };
  makeWorld: () => W;
  render: (world: W, dt: number) => void;
  snapshot: () => string;
  dispose?: () => void;
}

/**
 * Shared lifecycle for every game, 2D or 3D: owns the loop, play/restart and
 * ready → playing → won/lost. Each game supplies a world and a renderer.
 */
export function runShell<W extends World>(o: ShellOptions<W>): GameRuntime {
  let world = o.makeWorld();
  let status: GameState["status"] = "ready";

  const emit = (state: GameState): void => {
    status = state.status;
    o.hooks.onState(state);
  };

  const stop = startLoop((dt) => {
    if (status === "playing") {
      const outcome = world.update(dt);
      if (outcome) emit(outcome);
    }
    o.render(world, dt);
    o.input.endFrame();
  });

  const restart = (): void => {
    world = o.makeWorld();
    o.input.reset();
    emit({ status: "playing", title: "", detail: "" });
  };

  emit({ status: "ready", ...o.intro });
  o.render(world, 0);

  return {
    play: () => {
      if (status === "ready") emit({ status: "playing", title: "", detail: "" });
      else if (status !== "playing") restart();
    },
    restart,
    destroy: () => {
      stop();
      o.dispose?.();
    },
    snapshot: o.snapshot,
  };
}
