"use client";

import { pathLabel } from "./format";
import { STEPS, VALIDATE_STEP, type Run } from "./types";

interface Props {
  run: Run;
  onApply: () => void;
  onDiscard: () => void;
}

type Lifecycle = "pending" | "running" | "done" | "failed";

function lifecycle(run: Run): Lifecycle {
  if (run.done) return run.result.type === "rejected" ? "failed" : "done";
  return run.step === 0 ? "pending" : "running";
}

function stepState(run: Run, i: number): "done" | "active" | "failed" | "waiting" | "skipped" {
  const failed = run.result.type === "rejected";
  if (failed && run.done) {
    if (i < VALIDATE_STEP) return "done";
    return i === VALIDATE_STEP ? "failed" : "skipped";
  }
  if (i < run.step) return "done";
  return i === run.step ? "active" : "waiting";
}

const ICON = { done: "✓", active: "", failed: "✕", waiting: "·", skipped: "–" };

/** One fake generation run: lifecycle steps, then the outcome. */
export function ChangeCard({ run, onApply, onDiscard }: Props) {
  const life = lifecycle(run);
  const { result } = run;
  return (
    <div className={`run is-${life}`}>
      <div className="run-head">
        <span className="run-title">{result.type === "initial" ? "Generating game" : "Generating change"}</span>
        <span className={`pill pill-${life}`}>{life}</span>
      </div>
      <ol className="run-steps">
        {STEPS.map((label, i) => {
          const s = stepState(run, i);
          return (
            <li key={label} className={`step is-${s}`}>
              <span className="step-icon">{s === "active" ? <span className="spinner" /> : ICON[s]}</span>
              {label}
            </li>
          );
        })}
      </ol>

      {run.done && result.type === "initial" && (
        <p className="run-text">Built v1 from your prompt. Press Play, then click the game to control it.</p>
      )}

      {run.done && result.type === "noop" && (
        <div className="run-reject">
          <strong>Nothing was changed.</strong>
          <p>That&apos;s already in the current version.</p>
        </div>
      )}

      {run.done && result.type === "rejected" && (
        <div className="run-reject">
          <strong>Nothing was changed.</strong>
          <p>{result.reason}</p>
        </div>
      )}

      {run.done && result.type === "proposal" && (
        <div className="change">
          <p className="run-text">{result.reply}</p>
          <ul className="change-lines">
            {result.diff.map((d) => (
              <li key={d.path} className={`diff diff-${d.kind === "+" ? "add" : d.kind === "~" ? "mod" : "del"}`}>
                <span className="diff-mark">{d.kind === "-" ? "−" : d.kind}</span>
                <span className="diff-path">{pathLabel(d.path)}</span>
                <span className="diff-val">
                  {d.kind === "~" ? (
                    <>
                      <s>{d.before}</s> → {d.after}
                    </>
                  ) : (
                    (d.after ?? d.before)
                  )}
                </span>
              </li>
            ))}
          </ul>
          {run.resolution === "pending" && (
            <div className="change-actions">
              <button type="button" className="btn btn-accent" onClick={onApply}>
                Apply and play
              </button>
              <button type="button" className="btn" onClick={onDiscard}>
                Discard
              </button>
            </div>
          )}
          {run.resolution === "applied" && <p className="change-note">Applied as v{run.appliedAs}</p>}
          {run.resolution === "discarded" && <p className="change-note">Discarded. Nothing was changed.</p>}
        </div>
      )}
    </div>
  );
}
