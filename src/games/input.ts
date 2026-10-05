import type { ControlKey } from "./types";

const KEYMAP: Record<string, ControlKey> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "action",
};

/**
 * Keyboard + on-screen button state. Keyboard listens only on the focused
 * game element, so typing in the composer never moves the player.
 */
export class Input {
  private held = new Set<ControlKey>();
  private pressedThisFrame = new Set<ControlKey>();

  attach(el: HTMLElement): () => void {
    const down = (e: KeyboardEvent): void => {
      const key = KEYMAP[e.code];
      if (!key) return;
      e.preventDefault();
      if (!e.repeat) this.press(key);
    };
    const up = (e: KeyboardEvent): void => {
      const key = KEYMAP[e.code];
      if (key) this.release(key);
    };
    const blur = (): void => this.held.clear();
    el.addEventListener("keydown", down);
    el.addEventListener("keyup", up);
    el.addEventListener("blur", blur);
    return () => {
      el.removeEventListener("keydown", down);
      el.removeEventListener("keyup", up);
      el.removeEventListener("blur", blur);
    };
  }

  press(key: ControlKey): void {
    if (!this.held.has(key)) this.pressedThisFrame.add(key);
    this.held.add(key);
  }

  release(key: ControlKey): void {
    this.held.delete(key);
  }

  isDown(key: ControlKey): boolean {
    return this.held.has(key);
  }

  /** True only on the frame the key went down (for jumps, launches). */
  wasPressed(key: ControlKey): boolean {
    return this.pressedThisFrame.has(key);
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
  }

  reset(): void {
    this.held.clear();
    this.pressedThisFrame.clear();
  }
}
