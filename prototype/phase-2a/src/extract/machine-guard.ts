import { GUARD_TIMING, SUSPICION } from "../../../phase-1/src/ai/guard-state";
import type { StateMachine, Transition } from "../schema";
import { and, eq, gt, gte, lte, neq, not, or, pred, ref, src, val } from "./dsl";

const G = "src/ai/guard.ts";
const mode = ref("$self.GuardBrain.mode");
const sees = pred("sees", ref("$self"), ref("player"));
const hears = pred("hears", ref("$self"));
/** The heard noise is more than noiseRetargetDistance from where the guard was already heading. */
const farNoise = not(pred("within", ref("$event.position"), ref("$self.GuardBrain.lastKnown"), val(GUARD_TIMING.noiseRetargetDistance)));
const t = (x: Omit<Transition, "fidelity"> & { fidelity?: Transition["fidelity"] }): Transition => ({ fidelity: "verified", ...x });

/**
 * Guard AI, extracted from updateGuard (src/ai/guard.ts) and alertGuard (src/ai/guard-state.ts).
 * Priority = the order the runtime checks things each frame: alarm alerts arrive first
 * (security update runs before guards), then the "suspicion full" check, then sight, then hearing,
 * then the per-state checks inside the switch.
 */
export const GUARD_MACHINE: StateMachine = {
  id: "sm_guard",
  name: "Guard AI",
  appliesTo: ["guard_01", "guard_02", "guard_03"],
  stateRef: "$self.GuardBrain.mode",
  initial: "PATROL",
  fidelity: "verified",
  source: [src(G, "updateGuard"), src("src/ai/guard-state.ts", "setMode")],
  states: [
    { id: "PATROL", behaviour: "Walks the route at patrolSpeed; stops patrolPause s at each waypoint, looking around." },
    { id: "SUSPICIOUS", behaviour: "Stands still and turns toward lastKnown. Suspicion keeps building while the player is in view." },
    { id: "INVESTIGATE", behaviour: "Walks to lastKnown at investigateSpeed." },
    { id: "CHASE", behaviour: `Frozen for reactionTime s ("!"), then runs at chaseSpeed toward the player (straight at them within ${GUARD_TIMING.directSteerDistance} m in view). Catches within catchDistance (rule R23).` },
    { id: "SEARCH", behaviour: `For searchTime s: walks to random reachable points within ${GUARD_TIMING.searchRadius} m of lastKnown, pausing ${GUARD_TIMING.searchPause} s to sweep the room.` },
    { id: "RETURN", behaviour: "Walks to the nearest waypoint of its route at returnSpeed." },
  ],
  transitions: [
    t({
      id: "T01_alarm_alert", from: "*", to: "INVESTIGATE", priority: 0,
      when: and(pred("event", ref("ev_alarm")), neq(mode, val("CHASE"))),
      actions: [{ do: "set", target: "$self.GuardBrain.lastKnown", value: ref("player.Transform.position") }],
      reason: "alarm raised", source: [src("src/ai/guard-state.ts", "alertGuard")],
    }),
    t({
      id: "T02_suspicion_full", from: "*", to: "CHASE", priority: 1,
      when: and(neq(mode, val("CHASE")), gte(ref("$self.GuardBrain.suspicion"), val(1))),
      actions: [{ do: "emit", event: "ev_spotted" }, { do: "set", target: "$self.GuardBrain.memory", value: ref("$self.GuardBrain.chaseMemory") }],
      reason: "spotted the intruder", source: [src(G, "spotted the intruder")],
    }),
    ...(["PATROL", "RETURN"] as const).map((from) => t({
      id: `T03_glimpse_${from.toLowerCase()}`, from, to: "SUSPICIOUS", priority: 2, when: sees,
      actions: [{ do: "set", target: "$self.GuardBrain.lastKnown", value: ref("player.Transform.position") }],
      reason: "glimpsed movement", source: [src(G, "glimpsed movement")],
    })),
    ...(["PATROL", "RETURN"] as const).map((from) => t({
      id: `T04_hear_${from.toLowerCase()}`, from, to: "SUSPICIOUS", priority: 3, when: and(not(sees), hears),
      actions: [{ do: "set", target: "$self.GuardBrain.lastKnown", value: ref("$event.position") }],
      reason: "heard {noise}", source: [src(G, "heard ${noise.source}")],
    })),
    t({
      id: "T05_hear_while_searching", from: "SEARCH", to: "INVESTIGATE", priority: 3,
      when: and(not(sees), hears, farNoise),
      actions: [{ do: "set", target: "$self.GuardBrain.lastKnown", value: ref("$event.position") }],
      reason: "heard {noise}", source: [src(G, "T.noiseRetargetDistance")],
    }),
    t({
      id: "T06_hear_while_investigating", from: "INVESTIGATE", to: "INVESTIGATE", priority: 3,
      when: and(not(sees), hears, farNoise),
      actions: [{ do: "set", target: "$self.GuardBrain.lastKnown", value: ref("$event.position") }],
      // setMode() is a no-op for the same state, so nothing is logged; only lastKnown (and the route) change.
      reason: null, source: [src(G, "T.noiseRetargetDistance"), src("src/ai/guard-state.ts", "if (g.mode === to) return")],
    }),
    t({
      id: "T07_lost_sight_suspicious", from: "SUSPICIOUS", to: "INVESTIGATE", priority: 4,
      when: gt(ref("$self.GuardBrain.unseen"), val(GUARD_TIMING.unseenBeforeInvestigate)),
      actions: [], reason: "going to check it out", source: [src(G, "going to check it out")],
    }),
    t({
      id: "T08_investigated", from: "INVESTIGATE", to: "SEARCH", priority: 4,
      when: or(eq(ref("$self.GuardBrain.lastKnown"), val(null)), pred("arrived", ref("$self"), ref("$self.GuardBrain.lastKnown"))),
      actions: [{ do: "set", target: "$self.GuardBrain.searchLeft", value: ref("$self.GuardBrain.searchTime") }],
      reason: "nothing here, searching", source: [src(G, "nothing here, searching")],
    }),
    t({
      id: "T09_lost_intruder", from: "CHASE", to: "SEARCH", priority: 4,
      when: and(not(sees), or(lte(ref("$self.GuardBrain.memory"), val(0)), and(pred("arrived", ref("$self"), ref("$self.GuardBrain.lastKnown")), gt(ref("$self.GuardBrain.unseen"), val(GUARD_TIMING.giveUpWhenUnseen))))),
      actions: [{ do: "set", target: "$self.GuardBrain.searchLeft", value: ref("$self.GuardBrain.searchTime") }, { do: "set", target: "$self.GuardBrain.suspicion", value: val(SUSPICION.afterChase) }],
      reason: "lost the intruder", source: [src(G, "lost the intruder")],
    }),
    t({
      id: "T10_search_over", from: "SEARCH", to: "RETURN", priority: 4,
      when: lte(ref("$self.GuardBrain.searchLeft"), val(0)), actions: [], reason: "giving up the search", source: [src(G, "giving up the search")],
    }),
    t({
      id: "T11_back_on_route", from: "RETURN", to: "PATROL", priority: 4,
      when: pred("arrived", ref("$self"), ref("$self.Patrol.route")), actions: [], reason: "back on patrol", source: [src(G, "back on patrol")],
    }),
  ],
};
