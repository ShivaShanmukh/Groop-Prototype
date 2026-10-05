"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/games/input";
import type { GameDef, GameRuntime, GameState } from "@/games/types";
import { TouchControls } from "./TouchControls";
import type { Version } from "./types";

interface Props {
  def: GameDef;
  version: Version;
  onSnapshot: (n: number, url: string) => void;
}

/** Builds the game from the version's blueprint. A new version = a fresh build. */
export function GameView({ def, version, onSnapshot }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const [input] = useState(() => new Input());
  const [state, setState] = useState<GameState>({ status: "ready", title: "Loading…", detail: "" });
  const [focused, setFocused] = useState(false);
  const snapRef = useRef(onSnapshot);
  snapRef.current = onSnapshot;

  const { n, blueprint, autoplay } = version;
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    input.reset();
    const detach = input.attach(wrap);
    let rt: GameRuntime | null = null;
    let cancelled = false;
    let raf = 0;

    Promise.resolve()
      .then(() => def.create(canvas, blueprint, input, { onState: setState }))
      .then((created) => {
        if (cancelled) {
          created.destroy();
          return;
        }
        rt = created;
        runtimeRef.current = created;
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => snapRef.current(n, created.snapshot()));
        });
        if (autoplay) {
          created.play();
          wrap.focus();
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "lost", title: "Couldn't start the game", detail: "This browser may not support WebGL." });
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      rt?.destroy();
      detach();
      runtimeRef.current = null;
    };
  }, [def, n, blueprint, autoplay, input]);

  const start = (restart: boolean): void => {
    const rt = runtimeRef.current;
    if (!rt) return;
    if (restart) rt.restart();
    else rt.play();
    wrapRef.current?.focus();
  };

  const overlay = state.status !== "playing";
  return (
    <div className="stage">
      <div className="stage-bar">
        <button type="button" className="btn btn-accent" onClick={() => start(false)}>
          ▶ Play
        </button>
        <button type="button" className="btn" onClick={() => start(true)}>
          ↺ Restart
        </button>
        <span className="stage-hint">{def.controlsHint}</span>
      </div>
      <div
        ref={wrapRef}
        className={`game ${focused ? "is-focused" : ""}`}
        tabIndex={0}
        role="application"
        aria-label={`Game. ${def.controlsHint}.`}
        style={{ maxWidth: `calc(var(--stage-h) * ${def.width / def.height})` }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPointerDown={() => wrapRef.current?.focus()}
      >
        <canvas ref={canvasRef} width={def.width} height={def.height} />
        {overlay && (
          <div className={`game-overlay is-${state.status}`}>
            <p className="game-overlay-title">{state.title}</p>
            <p className="game-overlay-detail">{state.detail}</p>
            <button type="button" className="btn btn-accent" onClick={() => start(state.status !== "ready")}>
              {state.status === "ready" ? "▶ Play" : "↺ Play again"}
            </button>
          </div>
        )}
        {!overlay && !focused && <div className="game-focus-hint">Click the game to control it</div>}
      </div>
      <TouchControls controls={def.touch} input={input} />
    </div>
  );
}
