import type { Blueprint, Check, ScriptedRequest } from "../types";

/** v1 — what GROOP "generates" from the starter prompt. Units are metres; y is up. */
export const blueprint: Blueprint = {
  world: { width: 24, depth: 16, timeLimit: 120 },
  entities: {
    player: { type: "player", x: -10, z: 6, speed: 5 },
    key: { type: "key", x: 9, z: -6 },
    exit: { type: "exit", x: -11.6, z: -6, requires: "key" },
    drone: {
      type: "drone",
      patrol: [
        [-4, -4],
        [6, -4],
        [6, 4],
        [-4, 4],
      ],
      speed: 2.4,
      visionRange: 7,
      visionAngle: 60,
      onSeen: "alarm",
    },
  },
  pillars: [],
  lighting: { mode: "lit", ambient: 1 },
  rules: { lineOfSight: "angle+distance", catchDistance: 0.9 },
};

export const requests: ScriptedRequest[] = [
  {
    id: "chase",
    text: "Make the drone chase me when it sees me",
    reply:
      "Instead of sounding the alarm the moment it spots you, the drone chases you at 3.6 m/s (you run at 5). If it gets within 0.9 m you're caught. Survive 3 seconds and it gives up, ignoring you for 2 seconds while it returns to its route.",
    ops: [
      { op: "set", path: "entities.drone.onSeen", value: "chase" },
      { op: "set", path: "entities.drone.chaseSpeed", value: 3.6 },
      { op: "set", path: "entities.drone.chaseSeconds", value: 3 },
      { op: "set", path: "entities.drone.cooldownSeconds", value: 2 },
    ],
  },
  {
    id: "pillars",
    text: "Add pillars I can hide behind",
    reply:
      "Adding five stone pillars. They block movement, and I'm switching the drone's line-of-sight rule so it can't see through them.",
    ops: [
      {
        op: "set",
        path: "pillars",
        value: [
          [1, 0, 1.6],
          [-7.5, -2, 1.4],
          [8.6, 0, 1.4],
          [1, -6.5, 1.2],
          [1, 6.5, 1.2],
        ],
      },
      { op: "set", path: "rules.lineOfSight", value: "angle+distance+pillars" },
    ],
  },
  {
    id: "dark",
    text: "Make the vault dark with a flashlight",
    reply:
      "Turning the lights almost off and giving you a flashlight that points where you move. The drone's vision cone and the key still glow, so you can read the room.",
    ops: [
      { op: "set", path: "lighting.mode", value: "dark" },
      { op: "set", path: "lighting.ambient", value: 0.06 },
      { op: "set", path: "entities.player.flashlight", value: { range: 11, angle: 32 } },
    ],
  },
  {
    id: "guard-and-leave",
    text: "Make the drone guard the exit and also leave the room",
    reply: "Setting the drone to guard the exit and to leave the room.",
    ops: [
      { op: "set", path: "entities.drone.guardExit", value: true },
      { op: "set", path: "entities.drone.leaveRoom", value: true },
    ],
  },
];

export const checks: Check[] = [
  {
    kind: "exclusive",
    paths: ["entities.drone.guardExit", "entities.drone.leaveRoom"],
    message:
      "These patrol rules conflict: guarding the exit means staying beside it, and leaving the room means going away from it. The drone can only follow one patrol plan.",
  },
  {
    kind: "ref",
    from: "entities.exit.requires",
    within: "entities",
    message: "The exit needs the key, so the key can't be removed.",
  },
];
