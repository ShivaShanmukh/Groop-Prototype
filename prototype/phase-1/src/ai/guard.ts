import { randomNear } from "../world/path";
import { dist, type GameEvent } from "../world/types";
import { faceToward, goTo, steer } from "./move";
import { ALARM_SPEED_MULTIPLIER, CATCH_DISTANCE, GUARD_TIMING as T, REACTION_TIME, SUSPICION as S, guardSpeed, setMode, type Guard } from "./guard-state";

export { alertGuard, makeGuard, setMode, type Guard, type GuardMode, type Transition } from "./guard-state";
import { guardSees, hears, type Senses } from "./perception";

/** One frame of the guard's brain. Returns true if the guard caught the player. */
export function updateGuard(g: Guard, dt: number, s: Senses, time: number, events: GameEvent[]): boolean {
  g.modeTime += dt;
  const sight = guardSees(g.pos, g.yaw, s);
  g.seesPlayer = sight.seen;
  const alert = g.mode === "INVESTIGATE" || g.mode === "SEARCH" ? S.alertMultiplier : 1;
  if (sight.seen) {
    g.lastKnown = { ...s.player.pos };
    g.unseen = 0;
    const close = sight.distance < S.closeDistance ? S.closeMultiplier : 1;
    g.suspicion = Math.min(1, g.suspicion + S.rate * sight.strength * (s.alarm ? S.alarmMultiplier : 1) * alert * close * dt);
  } else {
    g.unseen += dt;
    if (g.mode !== "CHASE") g.suspicion = Math.max(0, g.suspicion - S.decay * dt);
  }

  if (g.mode !== "CHASE" && g.suspicion >= 1) {
    setMode(g, "CHASE", "spotted the intruder", time, events);
    events.push({ type: "spotted", by: g.id });
    g.memory = T.chaseMemory;
  } else if (sight.seen && (g.mode === "PATROL" || g.mode === "RETURN")) {
    setMode(g, "SUSPICIOUS", "glimpsed movement", time, events);
  } else if (!sight.seen && g.mode !== "CHASE") {
    const noise = hears(g.pos, s);
    if (noise && (g.mode === "PATROL" || g.mode === "RETURN")) {
      g.lastKnown = { ...noise.pos };
      setMode(g, "SUSPICIOUS", `heard ${noise.source}`, time, events);
    } else if (noise && (g.mode === "SEARCH" || g.mode === "INVESTIGATE") && dist(noise.pos, g.lastKnown ?? g.pos) > T.noiseRetargetDistance) {
      g.lastKnown = { ...noise.pos };
      setMode(g, "INVESTIGATE", `heard ${noise.source}`, time, events);
    }
  }

  const speed = guardSpeed(g.mode, s.params) * (s.alarm ? ALARM_SPEED_MULTIPLIER : 1);
  switch (g.mode) {
    case "PATROL": {
      if (g.pause > 0) {
        g.pause -= dt;
        g.yaw += Math.sin(g.modeTime * 1.5) * dt * 0.9; // look around at the stop
        g.moving = false;
        if (g.pause <= 0) g.routeIdx = (g.routeIdx + 1) % g.route.length;
      } else if (goTo(g, g.route[g.routeIdx], speed, dt, s.grid, 2)) {
        g.pause = T.patrolPause;
      }
      break;
    }
    case "SUSPICIOUS":
      g.moving = false;
      if (g.lastKnown) faceToward(g, g.lastKnown, 4, dt);
      if (g.unseen > T.unseenBeforeInvestigate) setMode(g, "INVESTIGATE", "going to check it out", time, events);
      break;
    case "INVESTIGATE":
      if (!g.lastKnown || goTo(g, g.lastKnown, speed, dt, s.grid, 2)) {
        setMode(g, "SEARCH", "nothing here, searching", time, events);
        g.searchLeft = s.alarm ? T.searchDuringAlarm : T.search;
      }
      break;
    case "CHASE": {
      if (sight.seen) g.memory = T.chaseMemory;
      else g.memory -= dt;
      const target = sight.seen ? s.player.pos : g.lastKnown ?? g.pos;
      // The "!" moment: a freshly alerted guard freezes briefly, giving the player a chance to run.
      if (g.modeTime < REACTION_TIME) {
        g.moving = false;
        faceToward(g, target, 8, dt);
        break;
      }
      // Close and in plain view: run straight at the player instead of following cells.
      const arrived = sight.seen && sight.distance < T.directSteerDistance ? steer(g, target, speed, dt, s.grid) : goTo(g, target, speed, dt, s.grid, 0.3);
      if (sight.seen && sight.distance < CATCH_DISTANCE) return true;
      if (!sight.seen && (g.memory <= 0 || (arrived && g.unseen > T.giveUpWhenUnseen))) {
        setMode(g, "SEARCH", "lost the intruder", time, events);
        g.searchLeft = s.alarm ? T.searchDuringAlarm : T.search;
        g.suspicion = S.afterChase;
      }
      break;
    }
    case "SEARCH": {
      g.searchLeft -= dt;
      if (g.searchLeft <= 0) {
        setMode(g, "RETURN", "giving up the search", time, events);
        break;
      }
      if (g.pause > 0) {
        g.pause -= dt;
        g.yaw += 2.2 * dt; // sweep the room
        g.moving = false;
      } else if (!g.searchTarget || goTo(g, g.searchTarget, speed, dt, s.grid, 2)) {
        g.searchTarget = randomNear(s.grid, g.lastKnown ?? g.pos, T.searchRadius, s.rand);
        g.pathGoal = null;
        g.pause = T.searchPause;
      }
      break;
    }
    case "RETURN": {
      if (g.modeTime < dt * 1.5) {
        g.routeIdx = g.route.reduce((best, p, i) => (dist(g.pos, p) < dist(g.pos, g.route[best]) ? i : best), 0);
      }
      if (goTo(g, g.route[g.routeIdx], speed, dt, s.grid, 2)) setMode(g, "PATROL", "back on patrol", time, events);
      break;
    }
  }
  return false;
}
