"use client";

import { useEffect, useRef } from "react";
import type { Version } from "./types";

interface Props {
  versions: Version[];
  disabled: boolean;
  onRevert: (n: number) => void;
}

/** Bottom strip: every version ever built. Revert adds a new version on the end. */
export function VersionStrip({ versions, disabled, onRevert }: Props) {
  const current = versions[versions.length - 1]?.n;
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the newest version in view as the strip grows.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [versions.length]);

  return (
    <div className="strip">
      <span className="strip-title">Versions</span>
      <ol className="strip-list" ref={listRef}>
        {versions.length === 0 && <li className="strip-empty">Building v1…</li>}
        {versions.map((v) => (
          <li key={v.n} className={`ver ${v.n === current ? "is-current" : ""}`}>
            <div className="ver-thumb">
              {v.thumb ? <img src={v.thumb} alt={`v${v.n} preview`} /> : <span className="spinner" />}
            </div>
            <div className="ver-meta">
              <span className="ver-n">v{v.n}</span>
              <span className="ver-label" title={v.label}>
                {v.label}
              </span>
            </div>
            {v.n === current ? (
              <span className="ver-live">Live</span>
            ) : (
              <button type="button" className="btn btn-small" disabled={disabled} onClick={() => onRevert(v.n)}>
                Revert
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
