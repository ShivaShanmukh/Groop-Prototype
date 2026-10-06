# Running The Research Facility

## Requirements

- **Node.js 22.12 or newer**
- **A desktop browser with WebGL 2:** Chrome or Edge recommended. Firefox and Safari are not verified.
- **Keyboard and mouse.**

## Play it

```bash
cd prototype/phase-1
npm install
npm run dev            # http://localhost:5173, live-reloading
```

Click **Click to start**. The game captures your mouse; press **Esc** to get it back (this pauses the game).

## Double-click build (for playtesters)

```bash
npm run build:playable   # → release/ResearchFacility.html and release/ResearchFacility-Playtest.html
```

Each is a **single self-contained HTML file**: double-click it to play, with no install and no server. Send testers `ResearchFacility-Playtest.html` (it records play data; press **F9** to see or download it). See [PLAYTEST.md](PLAYTEST.md).

## Playable build (served)

```bash
npm run build          # type-checks, then writes the game to dist/
npm run preview        # serves dist/ at http://localhost:4173
```

`dist/` is a fully static site: one HTML file, one JS file and one CSS file, with no server code. Any static host can serve it, for example `npx serve dist`, Netlify, GitHub Pages, or a Railway static service.

**It can't be opened by double-clicking `index.html`.** Browsers block JavaScript modules loaded from `file://`, so it has to be served over http.

The build isn't deployed anywhere yet.

## Tests

The browser tests (`test:e2e`, `screenshots`) need the preview server running in another terminal (`npm run preview`). They use your installed Google Chrome; set `CHROME_CHANNEL=msedge` to use Edge instead.

```bash
npm test               # 12 unit tests of the game rules (Vitest, no browser)
npm run test:e2e       # 25 end-to-end checks in real Chrome, real keyboard/mouse input
                       # → prints PASS/FAIL, writes tests/e2e-results.json and screenshots/e2e-*.jpg
npm run test:difficulty   # bots play the full level 90 times; prints win rates (takes ~20 s)
npm run screenshots    # regenerates screenshots/01–16
node tests/playtest.mjs   # checks release/ files (file://) and the playtest recorder (11 checks)
```

Useful variables:
- `GAME_URL=…` points the browser tests at another address, e.g. a deployed build.
- `HEADED=1` shows the browser while `test:e2e` runs.

## Debug flags (for testing only)

- `?debug`: exposes `window.__facility` so automated tests can read game state and set up scenes (teleport, place a guard, turn cameras off). It changes nothing unless a test calls it.
- `?debug&autostart`: also skips the title screen.
- `?playtest`: turns on playtest recording in a served build. It's always on in `ResearchFacility-Playtest.html`. F9 opens the data panel.

Normal play URLs have neither flag.

## Troubleshooting

| Problem | Fix |
|---|---|
| The mouse doesn't turn the view | Click inside the game to capture the mouse. If your browser blocks pointer lock, drag with the left button, or turn with ← →. |
| No sound | Sound starts after your first click. Check the tab isn't muted, and press **M** to toggle mute. |
| Low frame rate | Close other heavy tabs and keep the window at normal size. Measured: 41–52 fps on Intel UHD integrated graphics at 1280×720. |
| `npm run test:e2e` fails to connect | Start `npm run preview` first, in another terminal. |
