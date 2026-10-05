import type { Blueprint, GameDef, ScriptedRequest } from "@/games/types";
import { applyOps } from "@/lib/apply";
import { diffBlueprints } from "@/lib/diff";
import { validate } from "@/lib/validate";
import { STEPS, VALIDATE_STEP, type Action, type Message, type RunResult, type StudioState, type Version } from "./types";

export const FREE_TEXT_REPLY = "In this mockup, try one of the suggestions.";

/** The "AI": look up the scripted ops, apply to a copy, then validate. */
export function planRequest(def: GameDef, current: Blueprint, req: ScriptedRequest): RunResult {
  const next = applyOps(current, req.ops);
  const reason = validate(next, def.checks);
  if (reason) return { type: "rejected", reason };
  const diff = diffBlueprints(current, next);
  if (diff.length === 0) return { type: "noop" };
  return { type: "proposal", ops: req.ops, next, diff, reply: req.reply };
}

export function initialState(prompt: string): StudioState {
  return {
    versions: [],
    messages: [
      { id: 1, role: "user", text: prompt },
      { id: 2, role: "run", run: { step: 0, done: false, result: { type: "initial" }, resolution: "pending" } },
    ],
    nextId: 3,
  };
}

export function latest(state: StudioState): Version | undefined {
  return state.versions[state.versions.length - 1];
}

export function isBusy(state: StudioState): boolean {
  return state.messages.some((m) => m.role === "run" && !m.run.done);
}

function addVersion(state: StudioState, blueprint: Blueprint, label: string, autoplay: boolean): Version {
  const prev = latest(state);
  return { n: (prev?.n ?? 0) + 1, blueprint, prev: prev?.blueprint ?? null, label, thumb: null, autoplay };
}

/** Pending change cards become stale once the blueprint moves on. */
function discardPending(messages: Message[]): Message[] {
  return messages.map((m) =>
    m.role === "run" && m.run.done && m.run.resolution === "pending" && m.run.result.type === "proposal"
      ? { ...m, run: { ...m.run, resolution: "discarded" } }
      : m,
  );
}

function updateRun(state: StudioState, id: number, fn: (m: Extract<Message, { role: "run" }>) => Message): Message[] {
  return state.messages.map((m) => (m.id === id && m.role === "run" ? fn(m) : m));
}

export function makeReducer(def: GameDef, prompt: string) {
  return function reducer(state: StudioState, action: Action): StudioState {
    const id = state.nextId;
    switch (action.type) {
      case "send": {
        const text = action.text.trim();
        const current = latest(state);
        if (!text || !current || isBusy(state)) return state;
        const req = def.requests.find((r) => r.text.toLowerCase() === text.toLowerCase());
        const user: Message = { id, role: "user", text: req?.text ?? text };
        const reply: Message = req
          ? { id: id + 1, role: "run", run: { step: 0, done: false, result: planRequest(def, current.blueprint, req), resolution: "pending" } }
          : { id: id + 1, role: "groop", text: FREE_TEXT_REPLY };
        return { ...state, messages: [...discardPending(state.messages), user, reply], nextId: id + 2 };
      }
      case "tick": {
        const msg = state.messages.find((m) => m.id === action.id);
        if (!msg || msg.role !== "run" || msg.run.done) return state;
        const stopAt = msg.run.result.type === "rejected" ? VALIDATE_STEP + 1 : STEPS.length;
        const step = msg.run.step + 1;
        const done = step >= stopAt;
        const built = done && msg.run.result.type === "initial" ? addVersion(state, def.blueprint, prompt, false) : null;
        const messages = updateRun(state, action.id, (m) => ({
          ...m,
          run: built ? { ...m.run, step, done, resolution: "applied", appliedAs: built.n } : { ...m.run, step, done },
        }));
        return { ...state, messages, versions: built ? [...state.versions, built] : state.versions };
      }
      case "apply": {
        const msg = state.messages.find((m) => m.id === action.id);
        if (!msg || msg.role !== "run" || msg.run.result.type !== "proposal") return state;
        const userText = state.messages.find((m) => m.id === action.id - 1);
        const label = userText?.role === "user" ? userText.text : "Change";
        const v = addVersion(state, msg.run.result.next, label, true);
        const messages = updateRun(state, action.id, (m) => ({
          ...m,
          run: { ...m.run, resolution: "applied", appliedAs: v.n },
        }));
        return { ...state, messages, versions: [...state.versions, v] };
      }
      case "discard":
        return {
          ...state,
          messages: updateRun(state, action.id, (m) => ({ ...m, run: { ...m.run, resolution: "discarded" } })),
        };
      case "revert": {
        const target = state.versions.find((v) => v.n === action.n);
        if (!target || isBusy(state)) return state;
        const v = addVersion(state, target.blueprint, `Revert to v${target.n}`, true);
        const note: Message = {
          id,
          role: "groop",
          text: `Reverted to v${target.n}. Saved as a new version, v${v.n}, so nothing in the history was lost.`,
        };
        return { ...state, versions: [...state.versions, v], messages: [...discardPending(state.messages), note], nextId: id + 1 };
      }
      case "thumb":
        return {
          ...state,
          versions: state.versions.map((v) => (v.n === action.n && !v.thumb ? { ...v, thumb: action.url } : v)),
        };
    }
  };
}
