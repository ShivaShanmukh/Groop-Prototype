"use client";

import { useState } from "react";
import { BlueprintInspector } from "./Inspector";
import type { Blueprint, ValidationError } from "./load";
import type { Overrides } from "./ParamView";

interface Props {
  src: string;
  title: string;
  blueprint: { blueprint: Blueprint; errors: ValidationError[] } | null;
}

/** Play the game, or inspect its Blueprint. The game stays loaded while you inspect. */
export function StageTabs({ src, title, blueprint }: Props) {
  const [tab, setTab] = useState<"play" | "blueprint">("play");
  // Temporary trial values for Blueprint parameters. The game validates them itself on load (?bp.<id>=<value>).
  const [overrides, setOverrides] = useState<Overrides>({});
  const query = Object.entries(overrides).map(([k, v]) => `bp.${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  const frameSrc = query ? `${src}${src.includes("?") ? "&" : "?"}${query}` : src;
  const play = (next: Overrides): void => {
    setOverrides(next);
    setTab("play");
  };
  return (
    <div className="stage-tabs">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "play"} className={tab === "play" ? "on" : ""} onClick={() => setTab("play")}>Play</button>
        {blueprint && (
          <button role="tab" aria-selected={tab === "blueprint"} className={tab === "blueprint" ? "on" : ""} onClick={() => setTab("blueprint")}>
            Blueprint {blueprint.errors.length ? `· ${blueprint.errors.length} errors` : ""}{query ? " · trial values" : ""}
          </button>
        )}
      </div>
      <iframe key={frameSrc} className="embed-frame" src={frameSrc} title={title} allow="fullscreen; autoplay" hidden={tab !== "play"} />
      {blueprint && tab === "blueprint" && <BlueprintInspector blueprint={blueprint.blueprint} errors={blueprint.errors} overrides={overrides} play={play} />}
    </div>
  );
}
