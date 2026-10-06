# Test report: The Research Facility, Phase 1

**Date:** 2026-10-06
**Build:** `prototype/phase-1`, production build (`npm run build`), served by `vite preview`.
**Browser:** Google Chrome, headless, 1280×720.
**GPU:** Intel UHD Graphics (Direct3D 11 via ANGLE).

## How "manual" verification was done

I couldn't sit at the game with a mouse in my hand. Instead, every checklist item was checked in a **real Chrome browser driving the real game build with real keyboard and mouse events**, scripted with Playwright (`tests/e2e.mjs`, `tests/e2e-systems.mjs`).

| Method label | Meaning |
|---|---|
| **real keys / mouse** | The action was performed by pressing keys or moving the mouse, exactly as a player would. The test then read the game state to confirm the result. |
| **setup + real time** | A test hook (`?debug`) placed the player or a guard to stage the scene, e.g. "stand 7 m in front of a guard". The game then ran normally in real time; nothing was forced. |

The hook never changes the rules or the outcome. It reads state, teleports, places guards, aims the view and turns cameras off; the last one is equivalent to the terminal, and only used where cameras would interfere with another test.

**What this can't tell you:** whether the game *feels* good and is *fun*. That needs a human playtest; see the end of this report.

## Checklist (all 21 required items)

Latest run: **25/25 checks passed, no console errors**. The full suite was also run three times in a row, all 25/25.

| # | Requirement | Result | How | Evidence (from `tests/e2e-results.json`) |
|---|---|---|---|---|
| 1 | Game launches | ✅ Pass | real click | Title screen shown; Start → state `playing`, HUD visible |
| 2 | Player moves | ✅ Pass | real keys | W held → **3.60 m/s** (design 3.6) |
| 3 | Camera works | ✅ Pass | real mouse + keys | Mouse under pointer lock turned the view; ← turned 1.5 rad |
| 4 | Sprint works | ✅ Pass | real keys | Shift+W → **6.00 m/s** (design 6.0); HUD "SPRINTING · loud" |
| 5 | Crouch works | ✅ Pass | real keys | C → eye 1.65 → **1.00 m**, **1.90 m/s**, HUD "CROUCHED · quiet"; C again → stands |
| 6 | Interaction works | ✅ Pass | real keys | Prompt "[E] Take security keycard" → E → picked up |
| 7 | Inventory works | ✅ Pass | real keys | HUD slot shows the keycard; Tab opens a panel listing it; Tab closes |
| 8 | Keycard works | ✅ Pass | real keys | In inventory; objective advances to the Archive |
| 9 | Door works | ✅ Pass | real keys | Security door locked before; with keycard → unlocks, opens, player walks into the restricted wing |
| 10 | Generator works | ✅ Pass | real keys | E → power off, **all 4 cameras off**, terminal shows "(no power)", a guard heard it and investigated; E again → power and cameras back |
| 11 | Camera detection works | ✅ Pass | setup + real time | Standing in CAM-02's cone → detection 1.00 → alarm in under 4 s |
| 12 | Alarm works | ✅ Pass | real keys | Alarm chip "ALARM · 60s"; **3/3 guards** switch to INVESTIGATE ("alarm raised"); terminal key 2 resets it |
| 13 | Guard patrol works | ✅ Pass | real time | Guard walked 5.5 m in 3 s in PATROL |
| 14 | Guard detects player | ✅ Pass | setup + real time | Logged transitions **SUSPICIOUS → CHASE** |
| 15 | Guard chases player | ✅ Pass | real time | In CHASE, closing distance on the player |
| 16 | Guard searches | ✅ Pass | setup + real time | After losing sight: **CHASE → SEARCH** |
| 17 | Guard returns to patrol | ✅ Pass | real time | **SEARCH → RETURN ("giving up the search") → PATROL ("back on patrol")** |
| 18 | Objective works | ✅ Pass | real keys | E on the pedestal → drive in inventory; exit unlocks; objective switches to the exit |
| 19 | Exit works | ✅ Pass | real keys | Walked through the opened emergency exit → outcome `won` |
| 20 | Win state works | ✅ Pass | real keys | End screen "You escaped" with time, times spotted and alarms. R starts a fresh run. |
| 21 | Loss state works | ✅ Pass | setup + real time | Guard caught the player → outcome `lost`, end screen "Caught" |

Extra checks in the same run: the security terminal turns cameras off (key 1) ✅, the generator restarts ✅, restart after a win ✅, and frame rate ≥ 30 fps ✅ (41 fps in this run).

**About item 19 / 20.** That run shows "1 alarm". It came from an earlier step in the same session, the sprint test, which ran inside the corridor camera's view. The route itself (keycard → door → drive → exit) was walked with the other guards parked out of the way and cameras off, to isolate the objective flow. Whether a full run can be won *with* everything live is covered by the difficulty probe below.

## Unit tests: game rules without a browser (`npm test`, 12/12 pass)

Level:
- every floor cell is reachable from the entrance
- every guard can walk its whole route

Guard state machine:
- PATROL → SUSPICIOUS → CHASE → catch
- CHASE → SEARCH → RETURN → PATROL
- footsteps heard → SUSPICIOUS → INVESTIGATE → SEARCH
- crouching is silent

Regression:
- a player hugging furniture still gets caught

Performance:
- A* stays under 5 ms on a reachable route and under 15 ms on an unreachable one

World mechanics:
- generator off → cameras offline, terminal dead, guards hear it
- camera → alarm → guards alerted → terminal reset
- full route keycard → door → drive → exit → win
- without the keycard the security door stays shut

## Difficulty probe (`npm run test:difficulty`)

Bots play the whole level with **every guard and camera live**: 10 random seeds × 3 start delays = 30 runs each.

| Bot | Behaviour | Won |
|---|---|---|
| naive | walks the route, never reacts | 0/30 |
| careful | waits for guards to look away, flees when noticed | 0/30 |
| planned | the intended plan: sneak past the reception camera, cut the generator, hide while guards check it, then crouch-walk the route and back off when a guard faces it | **3/30**, all with **no alarm**, average 2 min 54 s |

**What this means:**
- **The level can be won** with nothing disabled and no help.
- **It rewards using the systems.** Only the bot that cut the power and hid ever won.
- **It's hard.** These bots can't see, judge distance or improvise, so a human should do much better. **How hard it *feels* is not verified** and is the main thing to judge in your playtest.

Every tuning change made along the way is listed with its reason in [CHANGELOG.md](CHANGELOG.md).

## Performance (Intel UHD integrated graphics, 1280×720)

| View | fps |
|---|---|
| Entrance | 42 |
| Laboratory | 52 |
| Corridor | 44 |

Memory stayed flat at 11–19 MB over a 60-second soak; no leaks seen.

## Not verified

- **Human playtest: fun, readability, difficulty feel.** Not done. This needs you.
- **Audio actually sounding right.** Sounds are generated and triggered (verified via events), but no one has listened to them.
- **Browsers other than Chrome:** Firefox, Safari and Edge not verified. Edge is the same engine as Chrome.
- **Other GPUs and resolutions.** Only Intel UHD at 1280×720 and 1600×900 was measured.
- **Fine mouse-look feel.** Sensitivity works, but whether it feels comfortable is untested.
- **Phones and tablets.** Not supported, by design.
- **One unexplained crash.** Early in development, one test run ended with Chrome's page crashing, during a run that also logged headless-audio-device errors. It never reproduced, across three full suite runs and two 60-second soaks (with and without audio running).

## Reproduce

```bash
cd prototype/phase-1 && npm install && npm run build
npm run preview          # terminal 1
npm test && npm run test:e2e && npm run test:difficulty    # terminal 2
```
