import type { Blueprint, Check, ScriptedRequest } from "../types";

/** v1 — what GROOP "generates" from the starter prompt. */
export const blueprint: Blueprint = {
  world: { width: 640, height: 400, gravity: 1400, timeLimit: 60 },
  entities: {
    fox: { type: "player", x: 60, y: 310, runSpeed: 170, jumpPower: 520, airJumps: 0 },
    star: {
      type: "collectible",
      at: [
        [120, 300],
        [250, 260],
        [395, 210],
        [550, 160],
        [375, 100],
        [220, 60],
        [75, 130],
        [560, 40],
      ],
    },
  },
  islands: [
    [20, 330, 130, 18],
    [200, 290, 100, 18],
    [350, 240, 90, 18],
    [490, 190, 120, 18],
    [330, 130, 90, 18],
    [170, 90, 100, 18],
    [30, 160, 90, 18],
  ],
  rules: { collect: "star", toWin: 7, fallOffBottom: "lose" },
};

export const requests: ScriptedRequest[] = [
  {
    id: "double-jump",
    text: "Add a double jump",
    reply:
      "The fox gets one extra jump in mid-air. That should also make the high star above the right-hand island reachable.",
    ops: [{ op: "set", path: "entities.fox.airJumps", value: 1 }],
  },
  {
    id: "moon-gravity",
    text: "Make gravity lower, like the moon",
    reply: "Lowering gravity from 1400 to 600. Jumps will float about twice as high and fall more slowly.",
    ops: [{ op: "set", path: "world.gravity", value: 600 }],
  },
  {
    id: "spikes",
    text: "Add moving spikes",
    reply:
      "Adding three spike strips that slide back and forth along three islands. Touching one ends the run, so time your jumps.",
    ops: [
      {
        op: "set",
        path: "entities.spikes",
        value: {
          type: "hazard",
          speed: 50,
          paths: [
            [200, 300, 290],
            [490, 610, 190],
            [170, 270, 90],
          ],
        },
      },
    ],
  },
  {
    id: "collect-moon",
    text: "Make the fox collect the moon",
    reply: "Changing what the fox collects to the moon.",
    ops: [{ op: "set", path: "rules.collect", value: "moon" }],
  },
];

export const checks: Check[] = [
  {
    kind: "ref",
    from: "rules.collect",
    within: "entities",
    message:
      "There is no entity called “moon” in this level. The fox can only collect things that exist (right now: star), so the level would have nothing to collect.",
  },
];
