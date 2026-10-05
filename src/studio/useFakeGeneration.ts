"use client";

import { useEffect, type Dispatch } from "react";
import { STEP_MS, type Action, type StudioState } from "./types";

/**
 * The fake AI's "thinking": advance the active run one step every STEP_MS
 * (4 steps ≈ 2.5s). The result was already decided by planRequest().
 */
export function useFakeGeneration(state: StudioState, dispatch: Dispatch<Action>): void {
  const active = state.messages.find((m) => m.role === "run" && !m.run.done);
  const id = active?.id;
  const step = active?.role === "run" ? active.run.step : -1;

  useEffect(() => {
    if (id === undefined) return;
    const t = window.setTimeout(() => dispatch({ type: "tick", id }), STEP_MS);
    return () => window.clearTimeout(t);
  }, [id, step, dispatch]);
}
