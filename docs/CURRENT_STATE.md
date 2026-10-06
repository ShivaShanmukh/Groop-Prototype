# Groop: current state audit

Audited 2026-10-05 against commit `f4d9071` (local = GitHub `main` = the live Railway deployment).

**Labels used in this document:**

| Label | Meaning |
|---|---|
| **Verified** | I ran it and saw the result. |
| **Verified (sim)** | Checked by driving the real game-logic code headlessly, without rendering or a browser. |
| **Not verified** | I didn't run it. |
| **Mocked** | It's faked. |

**What I ran for this audit:**

- **Code and build:**
  - `tsc --noEmit` (strict): clean.
  - `tsc --noUnusedLocals --noUnusedParameters`: clean.
  - `npm audit`: 0 vulnerabilities.
  - Clean `npm run build`: 0 errors, 0 warnings.
- **Live site:** a Playwright-driven Chrome against https://groop-web-production-1732.up.railway.app, using real keyboard input.
- **Logic simulations:** the headless simulation scripts from the build sessions, re-run against current code.

---

## 1. Current architecture

```
Browser only. No backend logic, no database, no model calls, no network requests after page load.

Next.js 16 App Router ──► /                 home: prompt bar + 4 starter cards
  (server renders pages)  /studio/[game]    the studio (client component)

Studio (React, useReducer)
  ├─ reducer.ts          versions[], messages[], fake runs; planRequest() = apply + validate + diff
  ├─ useFakeGeneration   setTimeout ticks a run through 4 steps (625ms each)
  ├─ Conversation        chat, suggestion chips, composer
  ├─ GameView            canvas + Play/Restart, focus, touch buttons; builds a runtime per version
  ├─ BlueprintPanel      flattened blueprint rows, +/~/− vs previous version, JSON view
  └─ VersionStrip        thumbnails, Revert

Game layer
  games/meta.ts          names, prompts, keywords (server-safe)
  games/registry.ts      GameDef per game: blueprint v1, scripted requests, checks, create()
  games/shell.ts         shared loop + lifecycle: ready → playing → won/lost
  games/runtime2d.ts     Canvas 2D wrapper over shell
  games/<game>/config.ts blueprint → typed settings (the ONLY thing runtimes read)
  lib/apply.ts           apply ChangeOps to a structuredClone
  lib/validate.ts        2 declarative check kinds
  lib/diff.ts            flatten + diff two blueprints
```

**Stack and deploy:**

- **Code:** Next 16.3.8, React 19.3, TypeScript 5.9 (strict), plain CSS, `three` 0.186 (used only by Vault Run).
- **Build:** standalone output, plus `scripts/copy-standalone.mjs` (copies static files into the standalone folder) and `scripts/start.mjs` (starts the server).
- **Railway:**
  - Builder: Railpack, with Node 22 taken from `engines`.
  - Port: the service listens on 8080, which Railway injects.
  - Deploys automatically on every push to GitHub `main`.

**Asset handling:** there are none.
- No image, model, audio or font files in the repo.
- All game art is drawn in code: Canvas 2D shapes, or Three.js primitive shapes.
- Fonts come from Google Fonts through `next/font`, which downloads them at build time.
- Version thumbnails are PNG snapshots of the canvas, held in memory as data URLs.

---

## 2. Existing playable games

All four open, start and apply their scripted changes in the live browser. Verified on the live site: for each game, 3 scripted changes applied, 1 rejected, revert created v5, no console errors.

| | **Sky Hopper** | **Night Watch** | **Brick Storm** | **Vault Run** |
|---|---|---|---|---|
| Dimension | 2D (Canvas) | 2D (Canvas) | 2D (Canvas) | **3D (Three.js)** |
| Player can | run ←→, jump; collect 7 of 8 stars; die on fall/spikes/timer | move 8-way; grab key; avoid guard(s); exit door; timer | move paddle, launch ball; 3 levels of the same 27-brick layout; 3 lives; score | move 8-way in a 3D room; grab key; avoid drone; exit; timer |
| Win in browser | **Not verified** (needs precise platforming) | **Verified**: 1 escape + 3 catches out of 6 scripted runs | **Not verified** in browser | **Verified**: 2 of 5 scripted runs escaped; 3 were "Spotted!" |
| Win in logic sim | Verified (sim): all 6 island hops and all 7 required stars reachable in v1 | Verified (sim): guard patrol, chase, investigate, memory | Verified (sim): a bot clears all 3 levels in every version | Verified (sim): key → exit route wins in v1 and with pillars + dark |
| Change requests | double jump · moon gravity · moving spikes | investigate last seen · 10s memory · second guard | multi-ball · paddle shrinks per level · 2-hit bricks | drone chases · pillars block sight · dark + flashlight |
| What each change does | Jump height measured in the browser: v1 92px → double jump 148px → moon gravity 263px | Each request gives the guard different behaviour (sim) | Paddle widths 110/85/60; balls capped at 6; score 1620 (sim) | Alarm vs chase, and pillars hide the player (sim); cone and flashlight seen in screenshots |
| Rejected request | "collect the moon" | "remove the key" | "through walls and bounce" | "guard exit and leave room" |

**Simulated or simplified parts (all games):**

- **One hand-made level per game.** The prompt doesn't generate anything (see section 5).
- **Night Watch:** the guard has no pathfinding. It walks straight lines, slides along walls, and skips a waypoint if stuck for 0.8s.
- **Vault Run:** the drone works the same way, straight lines only.
- **Brick Storm:** power-up drops use `Math.random`, so runs aren't reproducible.
- **Sky Hopper:** stars just above an island need a small hop. Walking under them isn't enough.

**Not verified at all:**

- Real phones and tablets. Mobile was only checked in Chrome's phone emulation, with touch events that I sent in through Chrome's DevTools protocol. They worked there.
- Safari and Firefox.
- Low-end GPUs.

---

## 3. Current 3D prototype (Vault Run)

**Can you open it and play it? Yes.** It's live at `/studio/vault-run`. Three.js loads, the scene renders at 61 fps (WebGL 2) in headless Chrome, and keyboard input moves the player. Both the win screen ("Escaped the vault!") and the lose screen ("Spotted!") happen in real play. Verified.

**Scene:** one 24 × 16 m room built entirely from Three.js primitive shapes (boxes, cylinders, spheres, tori), with no loaded models.

| Element | What it is |
|---|---|
| Floor and grid | Grid squashed to the room's shape |
| Walls | 4 walls; the one nearest the camera is low so it doesn't block the view |
| Player | Orange cylinder with a head and a visor |
| Key | Spinning gold torus with a point light |
| Exit | Wall panel: red while locked, green once you hold the key |
| Drone | Hovering sphere with a ring and a red eye |
| Vision cone | Flat fan shape rebuilt every frame by casting rays |
| HUD | Bar across the top, drawn from a 2D canvas used as a texture |

**How it's built:**

- **Logic and rendering are separate.** `vault-run/logic.ts` is plain 2D maths on the floor plane, with no Three.js. `scene.ts` builds the meshes and `view.ts` copies the logic state onto them each frame. This split is why the logic can be tested headlessly.
- **Movement:** circles against rectangles (player and drone vs pillars and room bounds). No physics engine.
- **Drone vision:** a distance check, an angle check, and an optional line-of-sight check against pillars. Room walls never block sight; that was deliberate.
- **Camera:** a fixed-angle follow camera, kept inside the room's bounds.
- **Loading:** Three.js is loaded lazily as a 544 KB chunk, only when Vault Run opens. Verified: it isn't in the initial scripts of the 2D pages.

**Limitations:**

- **Dark mode is only lighting.** The drone still sees the player at the same range in the dark.
- **Fixed render size.** The renderer is always 640×400 (×2 for sharp screens) and CSS scales it. It doesn't adapt to the panel's real size.
- **No context-loss handling.** A new renderer is created on the same canvas for every version, and nothing handles the browser dropping the WebGL context.
- **One room, one drone,** no pathfinding, no audio, no animation beyond bobbing and spinning.
- **Hand play not verified.** I haven't played a full round by hand. Behaviour after each change is verified by the logic sims and screenshots, and by a full scripted browser playthrough for v1 only.

---

## 4. Current blueprint system

**What it is:** a plain JSON object for each game: `world`, `entities`, `rules` and lists such as `walls`, `islands` and `pillars`. Each runtime's `config.ts` reads it into typed settings, and the game code reads only those settings. That holds for all four games (checked by reading the code).

**What it actually controls:** the numbers, switches and entity lists for **behaviour that's already coded**. These are real settings:
- speeds, gravity, vision range and angle, time limits
- patrol routes, wall, island and pillar layouts
- entity positions
- rule modes, e.g. `onLostSight` = `returnToPatrol` or `investigateLastSeen`

**Key finding: every scripted change only switches on code that was written in advance.**
- Night Watch's "investigate" mode, Brick Storm's multi-ball and Vault Run's flashlight all already exist in the runtime code.
- The blueprint can't introduce a mechanic the runtime doesn't already implement.
- A request like "add a jetpack" has nothing to change.

**Weaknesses:**

- **No schema.**
  - The readers (`num`, `str`, `obj`, …) quietly fall back to defaults. A misspelt key or a wrong type is ignored, and the change "applies" with no visible effect.
  - Unknown keys are ignored.
  - Nothing describes which keys a game accepts.
- **Some keys do nothing.** Vault Run's `guardExit` and `leaveRoom` exist only so the rejection has something to reject; no code reads them.

---

## 5. Current AI system

**Mocked. There are no model calls anywhere.** A code search found no `fetch`, no SDK, no API route and no API key.

| What it looks like | What actually happens |
|---|---|
| "Generating game" from your prompt | **Mocked.** `matchPrompt()` routes your text by keywords (e.g. "stealth", "3d", "brick") to one of 4 fixed starter blueprints. Your text is only shown as the first chat message. Text that matches nothing gets a "pick a starter" note. |
| The 4 steps (Reading → Proposing → Validating → Building) | **Mocked.** A `setTimeout` advances one step every 625 ms. The result is decided before the animation starts. |
| GROOP proposing a change | **Mocked.** Each chip is a `ScriptedRequest` with hand-written edits and a hand-written reply. |
| Typing your own request | **Mocked.** A case-insensitive exact match against the chip texts. Anything else gets "In this mockup, try one of the suggestions." |
| Rejections | Real validation code runs (section 6), but each rejected request was **written to fail** a check. |

---

## 6. Current validation

**What runs:** `lib/validate.ts` runs after the edits are applied to a copy. It's real code, but it only has 2 kinds of check:

- **`ref`:** a value must name an existing key. Used for:
  - Night Watch: `door.requires` → entities
  - Sky Hopper: `rules.collect` → entities
  - Vault Run: `exit.requires` → entities
- **`exclusive`:** two settings can't both be on. Used for:
  - Brick Storm: `walls.bounce` vs `walls.passThrough`
  - Vault Run: `drone.guardExit` vs `drone.leaveRoom`

Also, a change that produces no difference is reported as "Nothing was changed. That's already in the current version." That's computed from the diff, not scripted.

**What it doesn't validate:**

- value types or ranges (gravity −5 or speed 10 000 would apply)
- unknown or misspelt keys
- whether the level is still possible to finish
- whether changes combine sensibly
- performance limits, such as entity counts

All verified by reading the code. The rejection paths were verified in the browser for all four games.

---

## 7. Current versioning

All verified in the browser.

- **Storage:** an in-memory list in the studio's React state. Each version is a full blueprint snapshot plus the previous blueprint (for highlighting), a label and a thumbnail.
- **Revert:** you can revert to **any** earlier version. Revert appends a copy as a new version (v1…v4 → v5 "Revert to v1"), and history is never rewritten.
- **Applying a change:** creates the next version, rebuilds the game from it and starts play straight away.
- **Pending changes:** a change card left unanswered is marked "Discarded" when you send a new request or revert.

**What it can't do:**

- survive a page reload: everything is lost
- persist, share, branch or name versions
- compare any two versions (only each version against the one before)
- undo a single change (you revert the whole blueprint)

---

## 8. Technical debt

1. **No tests in the repo.** All the simulations and browser tests behind this audit live in a temporary session folder, not in git. There's no `npm test`, and CI doesn't check anything before Railway auto-deploys.
2. **Scripted requests are tied into runtime code.** Each runtime contains branches that exist only to serve one scripted request.
3. **Each game repeats its own boilerplate.** Every game hand-writes a `config.ts` reader, its checks, and its runtime setup.
4. **The blueprint panel shows raw paths.** It formats any JSON generically, e.g. `entities · drone · chase seconds`. There are no human-friendly labels or units.
5. **Dead branches.** The `ready` flag is `true` for every game, so the "Coming next phase" branches in `page.tsx`, `studio/[game]/page.tsx` and `HomePrompt.tsx` can never run.
6. **`generateStaticParams` does nothing.** The studio page reads `searchParams`, which makes it dynamic, so the params are ignored.
7. **Railway config deadline.** `railway.json` (config-as-code) is deprecated by Railway and keeps working only until **2026-12-01**.
8. **Fixed resolution.** Every game uses a fixed 640×400 logical size.
9. **Unused keys in the blueprint.** Vault Run's `guardExit` and `leaveRoom` are never read by the runtime.

---

## 9. What should be preserved

- **The core loop UI:** conversation, change card, Apply/Discard, blueprint panel with diff highlights, version strip with copy-on-revert. It demonstrates "describe → change → play again" well, and all of it is verified working.
- **The rule that runtimes read only the blueprint.** All changes are edits applied to a copy, then validated, then diffed. This is the right seam for real AI to plug into.
- **`lib/apply.ts` and `lib/diff.ts`:** small, generic and correct for current use.
- **`games/shell.ts` lifecycle,** and Vault Run's **logic/render split.** That split makes the game testable without a browser.
- **Lazy loading Three.js,** the Railpack + standalone deploy, and Node 22 pinned through `engines`.

---

## 10. What should be replaced

- **The scripted "AI"** (`ScriptedRequest` lookup, exact-match free text, keyword routing) with a real model step that proposes edits.
- **The silent-default `read.ts` readers** with a real per-game schema. The schema should be both the reader and the validator: types, ranges, allowed keys and enums.
- **The 2 check kinds,** with schema validation plus playability checks. The simulations from this audit are a starting point; e.g. "is the key reachable?".
- **In-memory-only versions,** with at least local or URL-shareable persistence. Only once the AI step exists.
- **`railway.json`,** with Railway's newer config format before 2026-12-01.

---

## 11. Risks (ranked)

1. **The blueprint can only switch on features that are already coded.** A real model will be asked for mechanics that no runtime implements. With today's design, those requests can only be rejected or quietly do nothing, which breaks the "Lovable for games" promise. This is a product-level risk, not a bug.
2. **No schema, and validation that misses most mistakes.** Model-made edits with wrong keys or types would "apply" with no effect, or with nonsense values, and the UI would still say "Applied as vN". The two check kinds catch almost nothing.
3. **No automated tests, and auto-deploy on push to `main`.** A regression in any game or in the studio reaches the live URL unchecked. The only tests that exist are in a temporary folder.
4. **Untested real devices and browsers.** Real phones, Safari, Firefox and weaker GPUs are unchecked. The 3D game also has no recovery if the browser drops the WebGL context. A live demo on someone's iPhone is an unknown.
5. **Nothing survives a reload.** One refresh during a demo wipes the whole conversation and every version.

---

## 12. Recommended next step

**Build real AI change requests for one game: Vault Run.**

1. **Commit the existing tests.** Move the Vault Run logic simulation and the browser playthrough from the temporary folder into the repo, as `npm test`, so the next change has a safety net.
2. **Give Vault Run a typed schema** that lists every key the runtime understands, with types, ranges and enums. Use it as both the config reader and the validator. Keep the existing playability check (key and exit reachable).
3. **Add one server route** that sends the user's free text, the current blueprint and the schema to a Claude model, and gets edits back as structured output.
4. **Pass those edits through the existing apply → validate → diff → change card flow, unchanged.** If the request needs a mechanic the runtime doesn't have, the model must say so, and the UI shows "Nothing was changed" with that reason.
5. **Keep the scripted chips** as offline fallbacks.

**Why Vault Run:**
- It's the 3D flagship.
- Its logic is already separated from rendering, so it can be tested.
- Its blueprint is the smallest.

This step answers the biggest open question, risk 1, cheaply: how much can real requests change through the blueprint alone? We'd learn that before investing in more games or in runtime-generated code.

Needs: an API key as a Railway variable, which is the first backend piece.
