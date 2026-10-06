# GROOP studio mockup: "Lovable for games"

A clickable mockup of how GROOP **would** feel. You describe a game, it appears and is playable, you ask for a change, the game changes, and you play again.

- **The AI is fake.** Every change is scripted, and the "thinking" is a 2.5-second animation.
- **The games are real.** Four tiny games run in the browser. Three are 2D (Canvas) and one is 3D (Three.js).
- **No backend.** There's no auth, database or API keys. History lives in the page and resets on reload.

## Run it locally

Needs Node 22.

```bash
npm install
npm run dev          # http://localhost:3000
```

To run a production build:

```bash
npm run build        # next build, then copies static assets into .next/standalone
npm start            # node scripts/start.mjs (uses PORT, default 3000)
```

## How it works

Each game is a **blueprint** (plain JSON-like data) plus a small **runtime** that reads it.

- **The runtime reads only the blueprint.** Each runtime has a `config.ts` that turns the blueprint into typed settings, and the game code uses nothing else.
- **A change request edits the blueprint, never game code.** Each request is a list of `ChangeOp`s, for example `{ op: "set", path: "entities.drone.onSeen", value: "chase" }`.
- **`src/lib/apply.ts` applies the ops to a copy.** Old versions are never changed.
- **`src/lib/validate.ts` checks the result.** It runs the game's declared checks: `ref` means "this value must name something that exists", and `exclusive` means "these two rules can't both be on". A failed check is a rejection, and nothing changes.
- **`src/lib/diff.ts` compares two blueprints.** The result drives the change card and the + / ~ / − highlights in the blueprint panel.
- **A new version is a fresh build.** Applying a change, or reverting, adds a version and rebuilds the game from that blueprint. Revert adds a new version, so history is never rewritten.

```
src/app/                 home page, /studio/[game]
src/home/                home prompt bar + card art
src/studio/              Studio layout, conversation + composer, change card,
                         blueprint panel, version strip, game view, touch controls,
                         reducer (versions + runs), useFakeGeneration (the 2.5s steps)
src/games/types.ts       Blueprint, ChangeOp, Check, ScriptedRequest, GameDef
src/games/meta.ts        names/prompts (server-safe)  ·  registry.ts: full game defs
src/games/shell.ts       shared ready → playing → won/lost lifecycle
src/games/<game>/        blueprint.ts (v1 + scripted requests + checks),
                         config.ts (blueprint → typed settings), runtime + drawing
src/lib/                 apply.ts · validate.ts · diff.ts
scripts/                 copy-standalone.mjs (post-build) · start.mjs (server start)
```

Three.js only loads when Vault Run opens, so the 2D games don't download it.

### The four games

| Game | Scripted requests | Rejected request (and why) |
|---|---|---|
| **Sky Hopper**: 2D platformer | Double jump · Moon gravity · Moving spikes | "Collect the moon": no entity called moon |
| **Night Watch**: 2D stealth | Guard investigates last-seen spot · 10-second memory · Second guard | "Remove the key": the door requires the key |
| **Brick Storm**: 2D breakout | Multi-ball power-up · Paddle shrinks per level · Two-hit bricks | "Through walls and bounce": contradictory wall rules |
| **Vault Run**: 3D (Three.js) | Drone chases on sight · Pillars that block line of sight · Dark vault with flashlight | "Guard the exit and leave the room": conflicting patrol rules |

Asking for a change that's already in the current version also returns "Nothing was changed."

### Fifth game: The Research Facility (embedded)

A larger, hand-built 3D stealth game from `prototype/phase-1/` (see that folder's README).

- **How it's served:** the studio shows it as the fifth card. Its studio page runs the full game in a frame, with the controls alongside.
- **No change requests yet.** It isn't blueprint-driven, so its studio page says that instead of offering suggestions.
- **Where the files live:** its built files sit in `public/games/research-facility/`. After changing the game, refresh them with:

```bash
npm run sync:facility   # builds prototype/phase-1 and copies it into public/games/research-facility
```

**Its Blueprint tab** is a read-only inspector of `prototype/phase-2a/research-facility.blueprint.json`:
- **What it is:** a structured description of the running game (entities, rules, state machines, relationships, objectives), **generated from the runtime**.
- **Authority:** the runtime stays the single source of truth.
- **Details:** see `prototype/phase-2a/`. After changing the game, run `npm run build` and `npm test` there, which regenerate and check the blueprint.

### Adding a request

1. Add a `ScriptedRequest` to `requests` in that game's `blueprint.ts`, with its text, reply and ops.
2. If the new setting is something the runtime doesn't read yet, read it in that game's `config.ts` and use it in the runtime.
3. If the request should be rejected, add a `Check` to `checks`.

## Deploy to Railway

Checked against Railway's docs on 2026-10-05: [Next.js guide](https://docs.railway.com/guides/nextjs), [Railpack Node](https://railpack.com/languages/node), [domains](https://docs.railway.com/networking/domains/working-with-domains).

**What's already set up in this repo:**

- **`next.config.ts` has `output: "standalone"`.** Railway's Next.js guide asks for this.
- **`railway.json` sets the builder, commands and health check:**

  | Setting | Value |
  |---|---|
  | Builder | Railpack |
  | Build command | `npm run build` |
  | Start command | `npm start` |
  | Health check | `GET /` |
  | Restart policy | on failure |

- **`npm start` runs `scripts/start.mjs`.** It binds to `0.0.0.0` and the `PORT` that Railway injects. **Don't set `PORT` yourself.**
- **`package.json` pins `"engines": { "node": "22.x" }`.** Railpack reads this to choose the Node version.
- **No environment variables are needed.**

### Option A: from GitHub (auto-deploys on every push)

1. Push this folder to a new GitHub repo, for example `groop-mockup`.
2. In Railway, choose **New Project → Deploy from GitHub repo** and pick the repo.
3. Wait for the build. It runs `npm ci`, then `npm run build`, then `npm start`.
4. In the service, go to **Settings → Networking → Public Networking → Generate Domain**. You get a `*.up.railway.app` URL.
5. Open the URL and run the checklist below.

### Option B: from your machine with the CLI

```bash
npm i -g @railway/cli
railway login
railway init            # create a new project
railway up              # build + deploy this folder
railway domain          # generate a *.up.railway.app URL
```

**Build blocked with `SECURITY VULNERABILITIES DETECTED`?** Railway scans `package-lock.json` at build time and refuses HIGH-severity CVEs. Upgrade the package to the version Railway names, then redeploy. `npm audit` was clean on 2026-10-05.

### Later: put it on `play.thegroop.co.uk` (not done yet)

The `thegroop.co.uk` DNS is at **Hostinger**. Adding a subdomain doesn't touch the existing `thegroop.co.uk` / `www` records.

1. In Railway, open this service and go to **Settings → Public Networking → + Custom Domain**. Enter `play.thegroop.co.uk`.
2. When Railway asks for a **target port**, pick the port it lists for this service, which is the one the app is listening on.
3. Railway shows **two records. Both are required**, and the domain won't verify with only the CNAME:
   - a **CNAME** record, with name `play` and a target like `xxxxxx.up.railway.app`
   - a **TXT** record for verification. Use exactly the name and value Railway shows.
4. In **Hostinger hPanel**, go to **Domains → thegroop.co.uk → DNS / Nameservers → DNS records** and add:

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | CNAME | `play` | the CNAME target Railway shows | default |
   | TXT | the name Railway shows | the value Railway shows | default |

   If a `play` record already exists, delete it first. A name can't have a CNAME alongside other records.
5. Wait for Railway to show the domain as verified. The SSL certificate is issued automatically, usually within an hour of the DNS update.
6. If the domain is ever proxied through Cloudflare, set SSL/TLS to **Full**. **Full (Strict)** doesn't work with Railway.

## Manual test checklist

Run it on desktop Chrome, then repeat steps 2, 3 and 12 on a phone.

1. **Home:** type "a cooking sim" and press Enter. You see a note asking you to pick a starter, and you stay on the page.
2. **Home → studio:** type "a stealth game with a guard" and press Enter. Night Watch opens, and your text is the first chat message. The 4 steps tick through and v1 appears with a thumbnail in the version strip.
3. **Play:** press Play and click the game. The arrow keys move the player, and the page doesn't scroll. Walk into the guard's cone and you get "Caught!". Play again restarts.
4. **Change:** click the chip "Make the guard investigate where it last saw me". The steps run, then a change card lists `~ rules · on lost sight` and `+ rules · investigate seconds`.
5. **Apply:** click Apply and play. The pill shows v2 and the game restarts straight away. In the blueprint panel, those two rows are highlighted ~ yellow and + green. When the guard loses you, it walks to a yellow ✕ and searches there.
6. **Discard:** click "Add a second guard", then Discard. The card says "Discarded. Nothing was changed." The version stays at v2.
7. **Rejection:** click "Remove the key". The run stops at Validating with a red ✕ and says "Nothing was changed", with the reason. The version stays at v2.
8. **Already there:** apply "Add a second guard", then click it again. The second run says "Nothing was changed. That's already in the current version."
9. **Free text:** type "make it rain" in the studio composer. GROOP replies "In this mockup, try one of the suggestions."
10. **Revert:** in the version strip, click Revert on v1. A new version is added (for example v4 "Revert to v1") and the game returns to one guard. All the older versions are still listed.
11. **View JSON:** toggle View JSON / View rows in the blueprint panel.
12. **Sky Hopper:** press Space and note the jump height. Apply the double jump and a second jump works in mid-air. Apply moon gravity and the jump floats far higher. Apply moving spikes and touching one shows "Ouch!". "Collect the moon" is rejected.
13. **Brick Storm:** Space launches the ball. Apply two-hit bricks and they dim after the first hit. Apply multi-ball, then catch a ×3 capsule to get extra balls. Apply the shrinking paddle and it's narrower at level 2. The walls request is rejected.
14. **Vault Run:** "Loading…" shows briefly, then the 3D room. In v1 the drone's cone sets off the alarm ("Spotted!").
    - Apply the chase request: the drone chases, the cone turns red, then it gives up after 3 seconds.
    - Apply pillars: the cone visibly stops at the pillars, and you can hide behind them.
    - Apply dark: the vault goes dark and the flashlight follows your direction.
    - The guard-and-leave request is rejected.
15. **Phone:** the panels stack in this order: game, versions, chat, blueprint. There's no sideways scrolling. On-screen buttons appear (a D-pad, or ◀ ▶ plus Jump/Launch) and move the player.

## Credits

The studio layout ideas come from [wide-trace/open-higgsfield](https://github.com/wide-trace/open-higgsfield): a dark studio, one accent colour, a prompt composer, a run lifecycle, a gallery of runs, a viewer and undo. That repo had **no licence** as of 2026-10-05, so **no code or CSS was copied**. Everything here was written from scratch.
