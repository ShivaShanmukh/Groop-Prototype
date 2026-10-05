import type { Blueprint, ChangeOp } from "@/games/types";
import type { DiffLine } from "@/lib/diff";

export const STEPS = ["Reading request", "Proposing change", "Validating", "Building"] as const;
/** Index of the step where a rejected request stops. */
export const VALIDATE_STEP = 2;
export const STEP_MS = 625;

export interface Version {
  n: number;
  blueprint: Blueprint;
  /** Blueprint of the version before this one, for highlighting changes. */
  prev: Blueprint | null;
  label: string;
  thumb: string | null;
  /** Start playing as soon as this version is built. */
  autoplay: boolean;
}

export type RunResult =
  | { type: "initial" }
  | { type: "proposal"; ops: ChangeOp[]; next: Blueprint; diff: DiffLine[]; reply: string }
  | { type: "rejected"; reason: string }
  | { type: "noop" };

export type Resolution = "pending" | "applied" | "discarded";

export interface Run {
  /** Steps completed so far (0..STEPS.length). */
  step: number;
  done: boolean;
  result: RunResult;
  resolution: Resolution;
  /** Version created when this run was applied. */
  appliedAs?: number;
}

export type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "groop"; text: string }
  | { id: number; role: "run"; run: Run };

export interface StudioState {
  versions: Version[];
  messages: Message[];
  nextId: number;
}

export type Action =
  | { type: "send"; text: string }
  | { type: "tick"; id: number }
  | { type: "apply"; id: number }
  | { type: "discard"; id: number }
  | { type: "revert"; n: number }
  | { type: "thumb"; n: number; url: string };
