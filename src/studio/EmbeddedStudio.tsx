import Link from "next/link";
import type { GameMeta } from "@/games/meta";
import { loadBlueprint } from "./blueprint/load";
import { StageTabs } from "./blueprint/StageTabs";

interface Props {
  meta: GameMeta & { embed: string };
  prompt: string;
}

const CONTROLS: [string, string][] = [
  ["W A S D", "move"],
  ["Mouse", "look (click the game first)"],
  ["Shift", "sprint"],
  ["C", "crouch"],
  ["E", "interact"],
  ["Tab", "inventory"],
  ["Esc", "pause / release mouse"],
];

/**
 * Studio page for a complete game that isn't blueprint-driven yet.
 * The game runs as-is in an iframe; change requests are not available for it.
 */
export function EmbeddedStudio({ meta, prompt }: Props) {
  return (
    <div className="studio studio-embedded">
      <header className="studio-top">
        <Link href="/" className="mark" aria-label="GROOP home">
          GROOP
        </Link>
        <span className="top-sep">/</span>
        <span className="top-name">{meta.name}</span>
        <span className="pill pill-version">v1</span>
        <span className="top-tag">Full game · no change requests yet</span>
      </header>

      <aside className="panel panel-chat">
        <div className="chat">
          <div className="chat-list">
            <div className="msg msg-user">
              <p>{prompt}</p>
            </div>
            <div className="msg msg-groop">
              <span className="msg-who">GROOP</span>
              <p>
                {meta.name} is a complete, hand-built 3D game. Its <b>Blueprint</b> tab describes the running game, and five
                gameplay values (guard sight, chase speed, sprint noise, alarm length, camera range) now come from it: try one
                under Blueprint → Parameters. Changing anything else, or asking for changes in words, isn&apos;t available yet.
              </p>
            </div>
          </div>
          <div className="embed-controls">
            <span className="panel-head-label">Controls</span>
            <ul>
              {CONTROLS.map(([k, v]) => (
                <li key={k}>
                  <kbd>{k}</kbd> {v}
                </li>
              ))}
            </ul>
            <p className="embed-note">Needs a keyboard and mouse. Not playable on phones or tablets.</p>
            <a className="btn" href={meta.embed} target="_blank" rel="noreferrer">
              Open full screen ↗
            </a>
          </div>
        </div>
      </aside>

      <main className="panel panel-stage embed-stage">
        <StageTabs src={meta.embed} title={meta.name} blueprint={loadBlueprint(meta.id)} />
      </main>
    </div>
  );
}
