import type { Input } from "../input";
import { thumbnail } from "../loop";
import { runShell } from "../shell";
import type { Blueprint, GameRuntime, RuntimeHooks } from "../types";
import { readConfig } from "./config";
import { makeVaultWorld } from "./logic";
import { buildScene, disposeScene } from "./scene";
import { buildHud, syncScene } from "./view";

/** Vault Run: logic.ts decides what happens, Three.js only draws it. */
export function createVaultRun(
  canvas: HTMLCanvasElement,
  bp: Blueprint,
  input: Input,
  hooks: RuntimeHooks,
): GameRuntime {
  const cfg = readConfig(bp);
  const view = buildScene(canvas, cfg);
  const hud = buildHud();

  const extras = [
    cfg.pillars.length ? `${cfg.pillars.length} pillars to hide behind.` : "",
    cfg.dark ? "It's dark: your flashlight points where you move." : "",
    cfg.drone.onSeen === "chase" ? "If the drone sees you, it chases." : "If the drone sees you, the alarm goes off.",
  ].filter(Boolean);

  return runShell({
    input,
    hooks,
    intro: { title: "Vault Run", detail: `Grab the key, reach the green exit. ${extras.join(" ")}` },
    makeWorld: () => makeVaultWorld(cfg, input),
    render: (world, dt) => {
      syncScene(view, world.state, dt);
      hud.draw(world.state);
      view.renderer.clear();
      view.renderer.render(view.scene, view.camera);
      view.renderer.clearDepth();
      view.renderer.render(hud.scene, hud.camera);
    },
    snapshot: () => thumbnail(canvas),
    dispose: () => disposeScene(view, [hud.scene]),
  });
}
