# Playtest guide: The Research Facility

**One question:** is the game actually good to play? Fun, understandable, fair, and the right difficulty.

The automated tests already show the mechanics *work*. A playtest shows whether a person *discovers, understands and enjoys* them, without being told.

---

## 1. Setup (facilitator, before the player arrives)

**You need:**
- a Windows or Mac computer with **Google Chrome or Microsoft Edge**
- a **keyboard and mouse** (a trackpad works but makes the game harder; note it if used)
- speakers or headphones (the game uses sound cues)
- the file **`release/ResearchFacility-Playtest.html`** (about 600 KB; nothing to install)

**Steps:**
1. Copy `ResearchFacility-Playtest.html` to the test computer, e.g. the desktop.
2. Double-click it. If it opens in a browser other than Chrome or Edge, right-click → **Open with → Google Chrome**.
3. Check the title screen reads **"The Research Facility"**.
4. Press **F9** to confirm playtest recording is on. A panel should show "Playtest data · session …". Press **F9** again to hide it. *The player should never see this panel.*
5. Leave the title screen showing. Don't click Start; the player does that.
6. Have a notes sheet or this file open on another screen. Start a timer when the player clicks Start.

**One session = one browser tab.**
- Every attempt, death and restart in that tab is recorded together.
- **Close and reopen the file for each new participant**, which starts a fresh session.
- Sessions are kept on that computer until you download them.

**Expected time.** This is an estimate, not yet measured with people:

| Part | Time |
|---|---|
| A successful run, once you know the way | about 3–6 min |
| First-time players | several deaths are normal (the scripted bots lost most runs) |
| **Play cap** | **25 minutes**, or until they escape |
| Interview afterwards | about 10 minutes |

---

## 2. Rules for the facilitator (read before every session)

**Do not lead the player.** We're testing whether the game teaches itself.

- **Don't explain any mechanic or strategy:** no mention of the generator, terminal, cameras, crouching, sprinting noise, guards' behaviour, the side doors or where anything is.
- **Don't answer "what do I do?"** Answer with: *"What do you think you should do?"* or *"What are you trying to do right now?"*
- **You may only help with technical problems:**
  - "Click inside the game to use the mouse."
  - "Press Esc to pause."
  - "Press R to play again."
- **Don't react** to deaths or near-misses: no sighs or "oh!". Neutral face.
- **If they're stuck with no progress for 5 minutes,** note the time and what they were doing. You may ask once: *"Tell me what you're thinking."* Still no hints.
- **Take notes on what they *do and say*,** not what you think they meant.

### What to say to the player (read this exactly)

> "This is a short game prototype. I'm testing the game, not you, so there are no wrong answers. Everything you need is on the start screen. Please think out loud while you play: say what you're noticing, what you're trying and anything that surprises or confuses you. I can't give hints, but I can help if something technical goes wrong. Play until you finish or until I say time's up. Start whenever you're ready."

The start screen already shows the controls and the objective. **Don't add to it.**

---

## 3. Observation checklist

Mark each with **Yes / Partly / No**, and write the evidence: what they did or said, and when. The "Recorded data" column says which recorded numbers to check afterwards (see section 5).

### Before playing (watch the start screen and the first minute)

| # | Question | Look for | Recorded data |
|---|---|---|---|
| 1 | **Did the player understand the objective?** | Can they say it in their own words after reading the start screen? Do they head for anything purposeful in the first minute? | `firstObjectiveDiscovery`, `keycardTaken` |
| 2 | **Did the player understand the controls?** | Moved, looked around and used E without asking. Any fumbling (mouse not captured, wrong keys)? | `firstMovement`, `firstInteraction` |

### During playing

| # | Question | Look for | Recorded data |
|---|---|---|---|
| 3 | **Did they understand that sprinting creates noise?** | Do they stop sprinting near guards? Do they comment when a guard turns toward a sprint? | `firstSprint`, `guardSightings` |
| 4 | **Did they understand that crouching is quieter?** | Do they crouch on purpose near guards or cameras, or never use it? | `firstCrouch` |
| 5 | **Did they discover the generator?** | Did they find it? Did they try to use it? Was it on purpose or by accident? | `firstSeen.generator`, `firstGeneratorCut`, `generatorCuts` |
| 6 | **Did they understand what happened when power was cut?** | After cutting it, can they say what changed (darkness, cameras off, terminal dead, guards coming)? Did they use the darkness? | `generatorCuts`, `generatorRestarts`, then behaviour |
| 7 | **Did they understand the security cameras?** | Did they notice the cones? Avoid them, time the sweep, or turn them off? Did they connect "camera saw me" to "alarm"? | `alarms`, `terminalCameraToggles` |
| 8 | **Did they understand the guard behaviour?** | Do they read the "?" and "!" icons? Do they predict patrols, hide, or break line of sight? Is getting caught a surprise or understandable? | `guardSightings`, `guardChases`, `deaths` |
| 9 | **Did they know where to go next?** | After each pickup, do they move with purpose? Do they use the minimap or signs? Do they wander or backtrack aimlessly? | `keycardTaken` → `archiveReached` → `driveTaken` → `escaped` (gaps between them) |

### After playing (interview; ask open questions, in this order)

Don't suggest answers. Use the wording below, then follow up with *"Why?"* or *"Can you give an example?"*

| # | Question to ask |
|---|---|
| 10 | "How easy or hard was it? Was it too easy?" |
| 11 | "Was it too difficult at any point? When?" |
| 12 | "Was anything frustrating?" |
| 13 | "Was anything confusing?" |
| 14 | "What was the most interesting part, or the thing you enjoyed most?" |
| 15 | "Was there anything that felt unnecessary, or that you didn't use?" |
| 16 | "If there were another level, would you play it? Why or why not?" |

Then, and only then, you may ask about things they *didn't* discover, e.g. "Did you notice anything in the Storage room?". Mark those answers as **prompted**.

---

## 4. After the session: collecting the data

1. Let the player leave the computer first.
2. Press **F9** in the game tab. The panel shows a summary of the session.
3. Click **Download all sessions (JSON)**. A file `research-facility-playtests-<date>.json` is saved.
4. Rename it with the participant code, e.g. `P03-research-facility.json`, and keep it with your notes.
5. Close the tab before the next participant.

The data stays on that computer (in the browser) until downloaded. Nothing is sent anywhere.

---

## 5. What is recorded

Recording is **observation only**. It never changes the game: the normal and playtest builds play identically, and the game rules, guard behaviour and difficulty are untouched.

**All times are seconds of active play since the player first clicked Start,** counted across all attempts. The title, pause and end screens are excluded.

| Field | Meaning |
|---|---|
| `firstMovement` | First frame the player actually moved |
| `firstInteraction` | First time E was pressed **on something usable**, and which thing. E pressed at nothing doesn't count. |
| `firstSeen.<landmark>` | First time each landmark (`keycard`, `generator`, `terminal`, `securityDoor`, `drive`, `exit`) was in view: within 10 m, within 45° of the centre of the screen, and not behind a wall. This approximates "saw it"; it can't know if they *noticed* it. |
| `firstObjectiveDiscovery` | = `firstSeen.keycard`: first sight of the first objective |
| `firstSprint`, `firstCrouch` | First use of sprint / crouch |
| `alarms` | Times a camera raised the alarm |
| `guardSightings` | Times a patrolling guard noticed the player ("?") |
| `guardChases` | Times a guard started chasing ("!") |
| `deaths` | Times caught |
| `generatorCuts`, `firstGeneratorCut`, `generatorRestarts` | Generator use |
| `terminalOpens` | Times the terminal menu was opened (only possible with power on) |
| `terminalCameraToggles`, `terminalAlarmResets` | Terminal actions used |
| `keycardTaken`, `archiveReached`, `driveTaken`, `escaped` | Progress milestones. `escaped` is the **time to completion**. |
| `attempts[]` | Every run: start, end, outcome (`won` / `lost` / `abandoned`) and the reason |
| `playSeconds` | Total active play time |
| `build` | Version, build time and code fingerprint (SHA-256) of the game being tested |

---

## 6. Known limitations (tell the player only if they hit one)

- **Hardware:** desktop only. A keyboard and mouse are required; there are no touch or controller controls.
- **Browsers:** tested in Chrome only. Edge should behave the same (same engine). Firefox and Safari are not verified.
- **Mouse capture:** the game captures the mouse when clicked. Esc releases it and pauses. If the browser refuses to capture it, the player can drag with the left button, or turn with ← →.
- **Mid-level saves:** none. A death means starting the level again (press R).
- **Graphics card:** on a weak one the game may run below 40 fps.
- **One level only,** with no difficulty settings.
- **Sound starts after the first click,** and M mutes it.
