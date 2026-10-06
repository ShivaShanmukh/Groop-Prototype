# Changelog

## 0.1.1 — 2026-10-06 · Phase 1.5: playtest preparation

**No gameplay changes.** The game rules, guard AI, level and difficulty are untouched (`src/world`, `src/ai`, `src/level` not modified). The bot results are identical to 0.1.0.

### Added

- **Double-click builds** (`npm run build:playable` → `release/`): single self-contained HTML files that run from disk, with no install or server. `ResearchFacility.html` is the normal game; `ResearchFacility-Playtest.html` is the same game with recording on. Each is stamped with a version, build time and code SHA-256.
- **Playtest recording** (`src/playtest/`): a read-only observer of play.
  - It records time to first movement, first interaction and first sight of the objective; alarms, guard sightings and chases, deaths and attempts; generator, terminal, keycard, archive and drive milestones; escape time; and sprint/crouch use.
  - It's saved in the browser on that computer.
  - It's on only in the playtest build or with `?playtest`; the normal build records nothing.
- **Facilitator panel (F9):** a session summary, download as JSON, copy.
- **`tests/playtest.mjs`:** checks the double-click builds and the recorder (11 checks).
- **Docs:** `PLAYTEST.md` (facilitator guide and checklist), `PLAYTEST_BASELINE.md` (what's being tested), `release/README.txt` (player sheet).

## 0.1.0 — 2026-10-06 · Phase 1: playable 3D game

First playable build of **The Research Facility**.

### Added

- **Level:** eight connected areas (Entrance, Reception, Corridor, Security, Laboratory, Storage, Restricted wing, Archive) and an emergency exit.
  - It's built from an ASCII floor plan, with 39 furniture pieces (each built from several shapes), 23 signs, room-coloured floors and lighting, and procedural textures.
- **Player:**
  - first-person movement with head bob
  - mouse look (pointer lock, with drag and ← → fallbacks)
  - sprint (loud) and crouch (silent, lower eye height)
  - interaction prompts and a two-slot inventory, with a Tab panel
- **Objects:**
  - keycard
  - security door that needs the keycard
  - generator with power state
  - 4 sweeping security cameras with visible detection cones
  - security terminal: cameras on/off, alarm reset
  - alarm: lights, siren, guard alert, 60 s timeout
  - research drive
  - emergency exit that unlocks with the drive
- **Guards:**
  - three guards running a PATROL / SUSPICIOUS / INVESTIGATE / CHASE / SEARCH / RETURN state machine
  - vision cone and line of sight, plus hearing for footsteps and the generator
  - A* navigation, flashlights, walk animation and alert icons
- **HUD:** objective, location, minimap, status chips (posture, power, cameras, alarm), detection meter, toasts and inventory.
- **Screens:** title, pause, terminal, inventory, win (with stats) and caught.
- **Audio:** synthesised footsteps, doors, pickups, siren, generator hum and clunk, alert sting, win/lose stings.
- **Tests:**
  - 12 unit tests of the rules
  - a 25-check browser suite driven by real keyboard and mouse input
  - a bot-based difficulty probe
  - a screenshot script

### Changed during tuning (and why)

| Change | Reason |
|---|---|
| Guards freeze 0.6 s after spotting you, before they chase | Bumping into a guard at a doorway was an instant loss with no chance to react. |
| Guard navigation moved from a 2 m to a 1 m grid; a chasing guard steers straight at a player within 3 m | A player pressed against the reception desk stood in a "blocked" cell, so guards chased forever without catching. A regression test now covers this. |
| A* uses a binary heap and typed arrays; props are bucketed by cell | The finer grid made path-finding slow (8 ms → under 5 ms per cross-map route, covered by a test). |
| Added two loop doors: Reception ↔ Storage, Security ↔ Lab | The corridor was the only route between rooms, so its guard was unavoidable. |
| The corridor guard patrols only the west half and Reception; the east end is covered by its camera | Same reason. |
| Guard sight 13 → 11 m, field of view 110° → 100°, slower suspicion build-up and faster decay, chase speed 4.4 → 4.0 m/s | Every bot was caught; even a scripted "careful" player never won. |
| Camera detection 0.9 → 1.5 s | Gives time to step out of a cone once it starts turning red. |
| Crouched and still in the dark halves sight range again | Rewards the generator plan and makes hiding a real option. |
| Emergency lighting brighter | With power off the corridor was close to pitch black. |
| Static props merged into one mesh per material; matte surfaces use cheaper Lambert shading; 12 → 9 room lights | Frame rate on Intel UHD graphics rose from 30–41 fps to 41–52 fps. |
| Plant pot moved away from the exit | It physically blocked the way out. A unit test caught it. |
| Crouch key is C only (Ctrl removed) | Ctrl+W closes the browser tab. |
| Keycard and drive are larger and glow | They were hard to spot across a room. |

### Not included (by design, Phase 2+)

AI generation, natural-language editing, the blueprint system, touch/mobile controls, save games.
