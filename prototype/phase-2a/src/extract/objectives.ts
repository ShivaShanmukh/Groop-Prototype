import type { Facility } from "../../../phase-1/src/world/facility";
import type { Blueprint, Objective, Outcome } from "../schema";
import { and, eq, gt, gte, isFalse, pred, ref, src, val } from "./dsl";

/** Objective texts are read from the runtime's own `objective` getter at each stage. */
export function objectives(texts: [string, string, string]): Objective[] {
  const s = [src("src/world/facility.ts", "get objective")];
  return [
    { id: "obj_1_keycard", order: 1, text: texts[0], completeWhen: pred("has", ref("player"), ref("keycard_01")), source: s },
    { id: "obj_2_research_drive", order: 2, text: texts[1], completeWhen: pred("has", ref("player"), ref("drive_01")), source: s },
    { id: "obj_3_escape", order: 3, text: texts[2], completeWhen: eq(ref("session.Session.appState"), val("ended")), source: [...s, src("src/world/facility.ts", "You escaped with the research.")] },
  ];
}

export function outcomes(): Outcome[] {
  return [
    {
      id: "out_win", result: "won", reason: "You escaped with the research.",
      when: and(isFalse("door_exit.Door.locked"), gt(ref("exit_zone.ExitZone.lineX"), ref("player.Transform.position.x"))),
      source: [src("src/world/facility.ts", "EXIT_LINE_X")],
    },
    {
      id: "out_caught", result: "lost", reason: "{guard} caught you.",
      when: and(eq(ref("@guard.GuardBrain.mode"), val("CHASE")), gte(ref("@guard.GuardBrain.modeTime"), ref("@guard.GuardBrain.reactionTime")), pred("sees", ref("@guard"), ref("player")), pred("within", ref("@guard"), ref("player"), ref("@guard.GuardBrain.catchDistance"))),
      source: [src("src/ai/guard.ts", "sight.distance < CATCH_DISTANCE")],
    },
  ];
}

/** Reads the three objective texts by putting a scratch runtime through each stage. */
export function objectiveTexts(make: () => Facility): [string, string, string] {
  const f = make();
  const a = f.objective;
  f.inventory.add("keycard");
  const b = f.objective;
  f.inventory.add("drive");
  return [a, b, f.objective];
}

export const NOT_REPRESENTED: Blueprint["notRepresented"] = [
  { item: "Path-finding (A* on a 1 m nav grid, path smoothing, stuck recovery)", why: "Algorithm, not game data. Guards' 'walk to X' is represented; how they route is not.", source: [src("src/world/path.ts", "findPath"), src("src/ai/move.ts", "goTo")] },
  { item: "Collision and line-of-sight geometry", why: "Represented only as the predicates `sees` and `within`; the ray marching and circle-vs-box maths are code.", source: [src("src/world/grid.ts", "lineOfSight"), src("src/world/grid.ts", "move(")] },
  { item: "Arithmetic in rules (suspicion build-up formula, sight-range formula, door easing)", why: "The expression language has no arithmetic yet. These rules are marked APPROXIMATION and their notes give the exact formula.", source: [src("src/ai/guard.ts", "S.rate * sight.strength")] },
  { item: "Player input mapping (keys, mouse, pointer lock) and 'sprinting stands you up'", why: "Input handling, not game rules.", source: [src("src/player/input.ts", "class Input"), src("src/world/player.ts", "Sprinting stands you up")] },
  { item: "Camera sweep motion and guard turning / look-around animation", why: "Motion detail (sine sweep, turn rates).", source: [src("src/world/cameras.ts", "Math.sin(c.phase)"), src("src/ai/move.ts", "faceToward")] },
  { item: "Random search-point choice", why: "Seeded randomness inside SEARCH.", source: [src("src/world/path.ts", "randomNear")] },
  { item: "Interaction focus choice (nearest usable thing in reach and view)", why: "Selection algorithm; only reach and view cone are represented.", source: [src("src/world/interact.ts", "export function focused")] },
  { item: "3D visuals: geometry, materials, textures, signs, props' appearance", why: "Presentation assets; the blueprint describes behaviour, not art.", source: [src("src/render/view.ts", "class View")] },
  { item: "Audio synthesis parameters", why: "Sound design detail; only which event plays which cue is represented.", source: [src("src/audio/sfx.ts", "class Sfx")] },
  { item: "HUD layout, minimap and screens' HTML", why: "UI layout.", source: [src("src/ui/hud.ts", "class Hud"), src("src/ui/minimap.ts", "drawMinimap")] },
  { item: "Run statistics (times spotted, alarms) and the playtest recorder", why: "Observation, not gameplay.", source: [src("src/world/facility.ts", "stats = {"), src("src/playtest/recorder.ts", "class Recorder")] },
  { item: "Live runtime state in the inspector", why: "The blueprint holds the INITIAL state read from a fresh runtime. It does not mirror a running game.", source: [src("src/world/facility.ts", "class Facility")] },
];
