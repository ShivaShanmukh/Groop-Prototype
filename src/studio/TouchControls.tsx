"use client";

import type { Input } from "@/games/input";
import type { TouchControl } from "@/games/types";

interface Props {
  controls: TouchControl[];
  input: Input;
}

/** On-screen buttons for phones. Shown only on touch screens (see CSS). */
export function TouchControls({ controls, input }: Props) {
  const dpad = controls.some((c) => c.key === "up" || c.key === "down");
  return (
    <div className={`touch ${dpad ? "touch-dpad" : "touch-row"}`}>
      {controls.map((c) => (
        <button
          key={c.key}
          type="button"
          className={`touch-btn touch-${c.key}`}
          aria-label={c.key}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            input.press(c.key);
          }}
          onPointerUp={() => input.release(c.key)}
          onPointerCancel={() => input.release(c.key)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
