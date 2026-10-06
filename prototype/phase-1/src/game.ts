import * as THREE from "three";
import { Sfx } from "./audio/sfx";
import { Input } from "./player/input";
import { renderBlueprintSource, type Boot } from "./blueprint/boot";
import { View } from "./render/view";
import { Hud } from "./ui/hud";
import { onClick, renderEnd, renderTerminal, setInventory, showScreen, type AppState } from "./ui/screens";
import { Facility } from "./world/facility";
import type { GameEvent } from "./world/types";
import { installDebug } from "./debug";
import { startPlaytest } from "./playtest";

/** The game itself. Only called once the Blueprint parameters are valid (see main.ts). */
export function startGame(boot: Extract<Boot, { ok: true }>): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const input = new Input(canvas);
  const hud = new Hud();
  const sfx = new Sfx();
  let f = new Facility(Date.now() % 100000, boot.params);
  let view = new View(renderer, f);
  let state: AppState = "title";
  let usedLock = false;
  let started = false;
  // Playtest mode only observes; it never changes the game.
  const playtest = startPlaytest();

  function setState(next: AppState): void {
    state = next;
    showScreen(next);
    hud.show(next !== "title");
    input.enabled = next === "playing";
    if (next === "terminal") renderTerminal(f);
    if (next === "inventory") setInventory(hud.inventoryList(f));
    if (next === "ended") {
      renderEnd(f);
      input.unlock();
    }
  }

  function play(): void {
    if (!started) {
      started = true;
      playtest?.attempt(f);
    }
    sfx.start();
    input.lock();
    setState("playing");
  }

  function restart(): void {
    view.dispose();
    f = new Facility(Date.now() % 100000, boot.params);
    view = new View(renderer, f);
    playtest?.attempt(f);
    sfx.setAlarm(false);
    sfx.setHum(true);
    play();
  }

  onClick("start", play);
  onClick("resume", play);
  onClick("restart-p", restart);
  onClick("again", restart);
  onClick("t-close", () => setState("playing"));
  onClick("t-cams", () => {
    f.setCameras(!f.camerasEnabled);
    sfx.beep();
    renderTerminal(f);
  });
  onClick("t-alarm", () => {
    f.resetAlarm();
    sfx.beep();
    renderTerminal(f);
  });
  canvas.addEventListener("click", () => state === "playing" && !input.locked && input.lock());
  document.addEventListener("pointerlockchange", () => {
    if (input.locked) usedLock = true;
    else if (usedLock && state === "playing") setState("paused");
  });
  window.addEventListener("resize", () => view.resize());

  function handle(e: GameEvent): void {
    switch (e.type) {
      case "toast": return hud.toast(e.text);
      case "pickup": return sfx.pickup();
      case "alarm": return sfx.setAlarm(e.on);
      case "power": return sfx.setHum(e.on);
      case "generator": return sfx.clunk();
      case "door": return sfx.door();
      case "step": return sfx.step(e.loud);
      case "spotted": return sfx.spotted();
      case "terminal":
        input.unlock();
        return setState("terminal");
      case "end":
        sfx.setAlarm(false);
        sfx.end(e.outcome === "won");
        return setState("ended");
      default:
        return;
    }
  }

  function keys(): void {
    if (input.take("KeyM")) sfx.setMuted(!sfx.muted);
    if (state === "ended" && input.take("KeyR")) return restart();
    if (state === "terminal") {
      if (input.take("Digit1")) document.getElementById("t-cams")?.click();
      if (input.take("Digit2")) document.getElementById("t-alarm")?.click();
      if (input.take("Escape")) play();
    }
    if (input.take("Tab")) {
      if (state === "playing") setState("inventory");
      else if (state === "inventory") setState("playing");
    }
    if (state === "playing" && !usedLock && input.take("Escape")) setState("paused");
  }

  let last = performance.now();
  function loop(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    keys();
    if (state === "playing" || state === "terminal" || state === "inventory") {
      const frameInput = input.frame(dt);
      if (playtest && frameInput.interact) {
        const target = f.focus();
        if (target) playtest.interacted(target.item.id);
      }
      f.update(dt, frameInput);
      const events = f.drain();
      for (const e of events) handle(e);
      playtest?.frame(dt, events);
      if (state === "terminal") renderTerminal(f);
    } else {
      input.frame(dt);
    }
    hud.update(f);
    view.render(f, dt);
    requestAnimationFrame(loop);
  }

  setState("title");
  renderBlueprintSource(boot.provenance);
  installDebug(() => f, () => state, play, boot.provenance);
  requestAnimationFrame(loop);
}
