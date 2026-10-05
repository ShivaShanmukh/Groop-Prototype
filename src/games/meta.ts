/** Lightweight game info, safe to import on the server (no runtimes). */
export interface GameMeta {
  id: string;
  name: string;
  genre: string;
  prompt: string;
  /** Words in a free-text home prompt that route to this game. */
  keywords: string[];
  ready: boolean;
}

export const GAMES: GameMeta[] = [
  {
    id: "sky-hopper",
    name: "Sky Hopper",
    genre: "2D platformer",
    prompt: "A platformer where a fox jumps between floating islands to collect stars.",
    keywords: ["platform", "fox", "jump", "island", "star"],
    ready: true,
  },
  {
    id: "night-watch",
    name: "Night Watch",
    genre: "2D stealth",
    prompt: "A stealth game: grab the key, avoid the guard, escape the door.",
    keywords: ["stealth", "guard", "sneak", "key"],
    ready: true,
  },
  {
    id: "brick-storm",
    name: "Brick Storm",
    genre: "2D breakout",
    prompt: "A breakout game with neon bricks.",
    keywords: ["breakout", "brick", "paddle", "neon", "arkanoid"],
    ready: true,
  },
  {
    id: "vault-run",
    name: "Vault Run",
    genre: "3D stealth",
    prompt:
      "A 3D game where I sneak through a vault, collect a key and escape past a patrolling drone.",
    keywords: ["3d", "vault", "drone"],
    ready: true,
  },
];

export function findGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

/** Match free text from the home prompt bar to a starter game. */
export function matchPrompt(text: string): GameMeta | undefined {
  const t = text.toLowerCase();
  // Most specific first: "3d" or "vault" beats the generic stealth words.
  const order = ["vault-run", "sky-hopper", "brick-storm", "night-watch"];
  return order
    .map((id) => GAMES.find((g) => g.id === id))
    .find((g): g is GameMeta => !!g && g.keywords.some((k) => t.includes(k)));
}
