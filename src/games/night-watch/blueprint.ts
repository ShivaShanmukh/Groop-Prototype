import type { Blueprint, Check, ScriptedRequest } from "../types";

/** v1 — what GROOP "generates" from the starter prompt. */
export const blueprint: Blueprint = {
  world: { width: 640, height: 400, timeLimit: 90 },
  entities: {
    player: { type: "player", x: 40, y: 360, speed: 120 },
    key: { type: "key", x: 590, y: 50 },
    door: { type: "door", x: 22, y: 45, requires: "key" },
    guard_1: {
      type: "guard",
      patrol: [
        [400, 320],
        [400, 60],
        [610, 240],
      ],
      speed: 55,
      chaseSpeed: 100,
      visionRange: 150,
      visionAngle: 70,
    },
  },
  walls: [
    [130, 0, 20, 120],
    [110, 240, 170, 20],
    [300, 110, 20, 150],
    [470, 330, 110, 16],
    [530, 90, 40, 40],
  ],
  rules: {
    onSeen: "chase",
    onLostSight: "returnToPatrol",
    memorySeconds: 0,
    caughtDistance: 16,
  },
};

export const requests: ScriptedRequest[] = [
  {
    id: "investigate",
    text: "Make the guard investigate where it last saw me",
    reply:
      "When the guard loses sight of you, it will walk to the spot where it last saw you and search there for 4 seconds before going back to its route.",
    ops: [
      { op: "set", path: "rules.onLostSight", value: "investigateLastSeen" },
      { op: "set", path: "rules.investigateSeconds", value: 4 },
    ],
  },
  {
    id: "memory",
    text: "Give the guard a 10-second memory",
    reply:
      "The guard will keep tracking you for 10 seconds after you break line of sight, so ducking behind a wall won't shake it straight away.",
    ops: [{ op: "set", path: "rules.memorySeconds", value: 10 }],
  },
  {
    id: "second-guard",
    text: "Add a second guard",
    reply:
      "I'll add guard_2 with its own route through the left half of the room, using the same vision and speed settings as guard_1.",
    ops: [
      {
        op: "set",
        path: "entities.guard_2",
        value: {
          type: "guard",
          patrol: [
            [60, 190],
            [270, 190],
            [270, 60],
            [270, 190],
          ],
          speed: 50,
          chaseSpeed: 95,
          visionRange: 130,
          visionAngle: 70,
        },
      },
    ],
  },
  {
    id: "remove-key",
    text: "Remove the key",
    reply: "Removing the key entity from the level.",
    ops: [{ op: "remove", path: "entities.key" }],
  },
];

export const checks: Check[] = [
  {
    kind: "ref",
    from: "entities.door.requires",
    within: "entities",
    message:
      "The door needs the key to open (door → requires: key). Without a key nobody could finish the level, so I kept the blueprint as it was.",
  },
];
