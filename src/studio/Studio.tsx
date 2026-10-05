"use client";

import Link from "next/link";
import { useCallback, useMemo, useReducer } from "react";
import type { GameMeta } from "@/games/meta";
import { getGameDef } from "@/games/registry";
import { BlueprintPanel } from "./BlueprintPanel";
import { Conversation } from "./Conversation";
import { GameView } from "./GameView";
import { initialState, isBusy, latest, makeReducer } from "./reducer";
import { useFakeGeneration } from "./useFakeGeneration";
import { VersionStrip } from "./VersionStrip";

interface Props {
  meta: GameMeta;
  prompt: string;
}

export function Studio({ meta, prompt }: Props) {
  const def = getGameDef(meta.id);
  if (!def) throw new Error(`No game definition for ${meta.id}`);

  const reducer = useMemo(() => makeReducer(def, prompt), [def, prompt]);
  const [state, dispatch] = useReducer(reducer, prompt, initialState);
  useFakeGeneration(state, dispatch);

  const current = latest(state);
  const busy = isBusy(state);
  const onSnapshot = useCallback((n: number, url: string) => dispatch({ type: "thumb", n, url }), []);

  return (
    <div className="studio">
      <header className="studio-top">
        <Link href="/" className="mark" aria-label="GROOP home">
          GROOP
        </Link>
        <span className="top-sep">/</span>
        <span className="top-name">{meta.name}</span>
        <span className="pill pill-version">{current ? `v${current.n}` : "building"}</span>
        <span className="top-tag">Mockup · scripted AI</span>
      </header>

      <aside className="panel panel-chat">
        <Conversation
          messages={state.messages}
          requests={def.requests}
          disabled={busy || !current}
          onSend={(text) => dispatch({ type: "send", text })}
          onApply={(id) => dispatch({ type: "apply", id })}
          onDiscard={(id) => dispatch({ type: "discard", id })}
        />
      </aside>

      <main className="panel panel-stage">
        {current ? (
          <GameView def={def} version={current} onSnapshot={onSnapshot} />
        ) : (
          <div className="stage-building">
            <span className="spinner spinner-lg" />
            <p>Generating {meta.name}…</p>
          </div>
        )}
      </main>

      <aside className="panel panel-bp">
        <BlueprintPanel version={current} />
      </aside>

      <footer className="panel panel-strip">
        <VersionStrip versions={state.versions} disabled={busy} onRevert={(n) => dispatch({ type: "revert", n })} />
      </footer>
    </div>
  );
}
