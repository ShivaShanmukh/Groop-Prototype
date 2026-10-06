# Playtest baseline: The Research Facility 0.1.1

This is the state of the game **before** human playtesting. It's what the playtest results will be compared against. **Change nothing here until playtest evidence says so.**

## 1. Exact build under test

| | |
|---|---|
| Version | **0.1.1** (Phase 1.5). Gameplay is identical to 0.1.0 (Phase 1). |
| Built | 2026-10-06T11:05:01Z |
| Game code SHA-256 | `804edfdb9ee5beef99f0e98c8faae2c1199040206cd03f12133529388e310b04` |
| Playtest file | `release/ResearchFacility-Playtest.html` (620,164 bytes; file SHA-256 starts `d8c84cbb8121e142`) |
| Normal file | `release/ResearchFacility.html` (620,140 bytes; file SHA-256 starts `719aedb4172b5189`) |
| Source | `prototype/phase-1/` working tree. **Not yet committed to git.** Commit before playtesting so this exact source can be recovered. |

The build stamp is embedded in each file. It's shown in the F9 panel data (`build`) and in `release/BUILD.txt`. Every downloaded playtest JSON records which build it came from.

## 2. Current mechanics and numbers

**Player**

| | Value |
|---|---|
| Walk / sprint / crouch speed | 3.6 / 6.0 / 1.9 m/s |
| Eye height standing / crouched | 1.65 / 1.0 m |
| Footstep noise | Walking heard within 3 m, sprinting within 9 m, crouching silent. Walls halve the distance. |
| Interaction reach | 2.4 m, roughly facing the object |

**Guards** (3: Reyes = corridor west half + reception, Okafor = lab + security, Lin = restricted wing + archive)

| | Value |
|---|---|
| Sight range | 11 m lit, 5.5 m with power off. ×0.65 crouched. ×0.5 more if crouched, still and in the dark. ×1.35 during an alarm. |
| Field of view | 100°, plus noticing a standing player within 1.8 m from the side |
| Suspicion | Builds at 1.0 × closeness per second: ×2 within 2.5 m, ×2 during an alarm, ×1.3 when already investigating or searching. Decays 0.25/s. |
| Reaction on spotting | Frozen 0.6 s, then chases |
| Speeds | Patrol 1.8 · investigate 2.6 · search 2.0 · return 2.0 · chase 4.0 m/s (×1.2 during an alarm) |
| Catch distance | 1.2 m, with line of sight |
| Chase memory after losing sight | 2.5 s |
| Search time | 9 s (15 s during an alarm) |
| Suspicious → investigate | After 1.4 s without seeing the player |
| Patrol stop | 2 s at each waypoint |

**Cameras** (4: reception, corridor east, restricted wing, archive)

| | Value |
|---|---|
| Range | 13 m (×0.75 crouched) |
| View cone | 50°, sweeping ±25–35° |
| Time to detect | 1.5 s of continuous sight (2.4 s crouched). Detection drains at 0.5/s. |

**World**

| | Value |
|---|---|
| Alarm | 60 s, or until reset at the terminal. Every guard investigates where you were seen. Lights flash red and the siren sounds. |
| Generator off | Emergency lighting. All cameras off. Terminal dead. Guard sight halved. Loud: heard up to 30 m (15 m through walls). |
| Terminal (needs power) | Cameras on/off; reset the alarm |
| Keycard | Unlocks the security door to the restricted wing |
| Research drive | Unlocks the emergency exit |
| Level | 8 areas, 2 loop doors (Reception ↔ Storage, Security ↔ Lab) |
| Win / lose | Win by walking out of the unlocked exit. Lose when a guard catches you. |

## 3. Difficulty evidence (bots, not humans)

`npm run test:difficulty`: 30 runs per bot, with every guard and camera live. The results are identical before and after the 0.1.1 changes.

| Bot | Strategy | Wins |
|---|---|---|
| Naive | Walks the route, never reacts | **0/30** |
| Careful | Waits for guards to look away, flees when noticed | **0/30** |
| Planned | Sneaks past the reception camera, cuts the generator, hides while guards investigate, crouch-walks the route, backs off when a guard faces it | **3/30** (all with 0 alarms; average 2 min 54 s) |

**Reading:**
- **Probably hard, not broken.** It's winnable with nothing disabled.
- **It rewards using the systems.** Only the power-cut plan ever won.
- **Bots are poor stand-ins.** They can't see, judge or improvise.

**Difficulty is not to be changed until human playtest data supports it.**

## 4. Automated test results (2026-10-06)

| Suite | Result |
|---|---|
| Type-check (`tsc --noEmit`, strict) | Clean |
| Unit tests (`npm test`) | **12/12** |
| End-to-end, real keyboard/mouse in Chrome (`npm run test:e2e`) | **25/25** in 5 consecutive runs, after a test fix (below) |
| Double-click builds + playtest recorder (`node tests/playtest.mjs`) | **11/11**, 3 runs in a row |
| Bot difficulty probe | See section 3 |
| Performance (Intel UHD integrated GPU, 1280×720) | 41–52 fps |
| Memory (60 s soak) | Flat, 11–19 MB |

**E2E reliability.** Before the fix, 3 of 15 runs failed at "Exit works" (and so at the two checks after it).

Diagnostics showed this was a **test** bug, not a game bug:
- The test's autopilot considered itself "arrived" 0.45 m from its target and stopped walking at x = 1.637.
- The exit triggers at x < 1.6, so it stopped 4 cm short.
- A human walks on through the door.

The autopilot now aims inside the doorway. No game code changed.

## 5. Known unverified areas

- **Fun, clarity, fairness and difficulty with real people:** the purpose of the playtest.
- **Whether players *notice* things:** `firstSeen` only says a landmark was within 10 m, roughly in front and not behind a wall.
- **Sound:** generated and triggered, but no one has listened to it.
- **Browsers other than Chrome:** Firefox, Safari and Edge not verified; Edge uses the same engine as Chrome.
- **Other GPUs, screen sizes and trackpads.**
- **Mouse-look comfort:** sensitivity is fixed at 0.0022 rad per pixel, with no setting.
- **Earlier crash:** one Chrome page crash during Phase 1 testing never reproduced.
