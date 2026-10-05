"use client";

import { useMemo, useState } from "react";
import { diffBlueprints, flatten, type DiffKind } from "@/lib/diff";
import { splitPath, toJson } from "./format";
import type { Version } from "./types";

interface Props {
  version: Version | undefined;
}

interface Row {
  path: string;
  label: string;
  value: string;
  mark: DiffKind | null;
}

const MARK_CLASS: Record<DiffKind, string> = { "+": "add", "~": "mod", "-": "del" };

/** Right panel: the game's settings as readable rows, last change highlighted. */
export function BlueprintPanel({ version }: Props) {
  const [showJson, setShowJson] = useState(false);

  const sections = useMemo(() => {
    if (!version) return [];
    const marks = new Map(diffBlueprints(version.prev, version.blueprint).map((d) => [d.path, d]));
    const rows: (Row & { section: string })[] = [];
    for (const [path, value] of flatten(version.blueprint)) {
      rows.push({ path, ...splitPath(path), value, mark: marks.get(path)?.kind ?? null });
    }
    for (const d of marks.values()) {
      if (d.kind === "-") rows.push({ path: d.path, ...splitPath(d.path), value: d.before ?? "", mark: "-" });
    }
    const grouped = new Map<string, Row[]>();
    for (const r of rows) grouped.set(r.section, [...(grouped.get(r.section) ?? []), r]);
    return [...grouped.entries()];
  }, [version]);

  return (
    <div className="bp">
      <div className="panel-head">
        <span>Blueprint{version ? ` · v${version.n}` : ""}</span>
        <button type="button" className="btn btn-small" onClick={() => setShowJson((s) => !s)} disabled={!version}>
          {showJson ? "View rows" : "View JSON"}
        </button>
      </div>
      {version && version.prev && (
        <p className="bp-legend">
          Since v{version.n - 1}: <span className="diff-add">+ added</span>{" "}
          <span className="diff-mod">~ changed</span> <span className="diff-del">− removed</span>
        </p>
      )}
      {!version && <p className="bp-empty">The blueprint appears once the game is built.</p>}
      {version && showJson && <pre className="bp-json">{toJson(version.blueprint)}</pre>}
      {version && !showJson && (
        <div className="bp-rows">
          {sections.map(([section, rows]) => (
            <section key={section}>
              <h3>{section}</h3>
              <ul>
                {rows.map((r) => (
                  <li key={r.path} className={r.mark ? `bp-row diff-${MARK_CLASS[r.mark]}` : "bp-row"}>
                    <span className="diff-mark">{r.mark === "-" ? "−" : (r.mark ?? "")}</span>
                    <span className="bp-label">{r.label}</span>
                    <span className="bp-value">{r.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
