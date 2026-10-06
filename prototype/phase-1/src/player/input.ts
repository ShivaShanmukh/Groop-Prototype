import type { PlayerInput } from "../world/types";

const MOUSE = 0.0022;
const KEY_TURN = 2.4; // rad/s for ← →

/**
 * Keyboard + mouse. Mouse look uses pointer lock (click the game);
 * if pointer lock isn't available, drag with the left button, or turn with ← →.
 */
export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private dx = 0;
  private dy = 0;
  enabled = true;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (["Tab", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    window.addEventListener("blur", () => this.held.clear());
    window.addEventListener("mousemove", (e) => {
      if (this.locked || (e.buttons & 1 && e.target === canvas)) {
        this.dx += e.movementX;
        this.dy += e.movementY;
      }
    });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  lock(): void {
    try {
      const r = this.canvas.requestPointerLock() as unknown;
      if (r instanceof Promise) r.catch(() => undefined);
    } catch {
      // Not available (e.g. some embedded browsers): drag-look still works.
    }
  }

  unlock(): void {
    if (this.locked) document.exitPointerLock();
  }

  /** True once per key press. */
  take(code: string): boolean {
    const had = this.pressed.has(code);
    this.pressed.delete(code);
    return had;
  }

  private down(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  /** Build this frame's player input and clear per-frame state. */
  frame(dt: number): PlayerInput {
    const on = this.enabled;
    const input: PlayerInput = {
      forward: on ? (this.down("KeyW", "ArrowUp") ? 1 : 0) - (this.down("KeyS", "ArrowDown") ? 1 : 0) : 0,
      strafe: on ? (this.down("KeyD") ? 1 : 0) - (this.down("KeyA") ? 1 : 0) : 0,
      sprint: on && this.down("ShiftLeft", "ShiftRight"),
      toggleCrouch: on && this.take("KeyC"),
      interact: on && (this.take("KeyE") || this.take("KeyF")),
      turn: on ? -this.dx * MOUSE + ((this.down("ArrowLeft") ? 1 : 0) - (this.down("ArrowRight") ? 1 : 0)) * KEY_TURN * dt : 0,
      pitch: on ? -this.dy * MOUSE : 0,
    };
    this.dx = 0;
    this.dy = 0;
    return input;
  }

  clearPresses(): void {
    this.pressed.clear();
  }
}
