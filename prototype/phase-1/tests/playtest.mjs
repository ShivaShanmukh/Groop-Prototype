// Verifies the double-click builds in release/ (opened from disk via file://):
// the game runs, the playtest build records what the player does, the F9 panel
// shows it, and the normal build records nothing.  Run: npm run build:playable && node tests/playtest.mjs
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const fileUrl = (f) => pathToFileURL(resolve("release", f)).href;
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  —  ${detail}`);
};

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const wait = (ms) => page.waitForTimeout(ms);
const session = () => page.evaluate(() => JSON.parse(localStorage.getItem("research-facility-playtests") ?? "[]").at(-1));

// Playtest build, straight from disk.
await page.goto(fileUrl("ResearchFacility-Playtest.html"));
await wait(800);
const build = await page.evaluate(() => window.__BUILD__);
await page.click("#start");
await wait(400);
const locked = await page.evaluate(() => document.pointerLockElement === document.getElementById("game"));
check("Launches from file:// (double-click)", (await page.isVisible("#hud")) && build?.playtest === true, `HUD visible; build ${build?.version} sha ${build?.bundleSha256.slice(0, 12)}; pointer lock ${locked ? "captured" : "not captured"}`);

// Real play: walk into reception, turn toward the corridor door, keep walking.
await page.keyboard.down("KeyW");
await wait(2500);
await page.keyboard.up("KeyW");
await page.keyboard.down("ArrowLeft");
await wait(300);
await page.keyboard.up("ArrowLeft");
await page.keyboard.press("KeyE"); // nothing in reach: must NOT count as an interaction
await wait(300);
let s = await page.evaluate(() => {
  window.dispatchEvent(new Event("beforeunload"));
  return JSON.parse(localStorage.getItem("research-facility-playtests") ?? "[]").at(-1);
});
check("Records first movement", s && s.firstMovement !== null && s.firstMovement < 1, `firstMovement ${s?.firstMovement}s, play time ${s?.playSeconds.toFixed(1)}s`);
check("E with nothing in reach is not an interaction", s && s.firstInteraction === null, `firstInteraction ${JSON.stringify(s?.firstInteraction)}`);

// Staged checks use the same ?debug-free build, so use the recorder through normal play:
// sprint into the corridor until a guard catches us (a death), then restart with R.
await page.keyboard.down("ShiftLeft");
await page.keyboard.down("KeyW");
for (let i = 0; i < 40 && !(await page.isVisible("#end")); i++) await wait(250);
await page.keyboard.up("KeyW");
await page.keyboard.up("ShiftLeft");
for (let i = 0; i < 80 && !(await page.isVisible("#end")); i++) await wait(250);
const died = await page.isVisible("#end");
await page.keyboard.press("KeyR");
await wait(600);
s = await page.evaluate(() => {
  window.dispatchEvent(new Event("beforeunload"));
  return JSON.parse(localStorage.getItem("research-facility-playtests") ?? "[]").at(-1);
});
check("Records sprint in the double-click build", s.firstSprint !== null && (!died || (s.deaths === 1 && s.attempts.length === 2 && s.attempts[0].outcome === "lost")),
  `died=${died}; deaths ${s.deaths}; attempts ${s.attempts.map((a) => `#${a.n} ${a.outcome ?? "running"}`).join(", ")}; sprint at ${s.firstSprint}s; guard sightings/chases ${s.guardSightings}/${s.guardChases}; alarms ${s.alarms}`);

// F9 panel
await page.keyboard.press("F9");
await wait(300);
const panel = (await page.isVisible("#playtest-panel")) ? await page.textContent("#playtest-panel") : "";
check("F9 shows the facilitator panel", panel.includes("Attempts / deaths") && panel.includes("Escaped"), panel.replace(/\s+/g, " ").slice(0, 160) + "…");
const [download] = await Promise.all([page.waitForEvent("download"), page.click('#playtest-panel button[data-a="download"]')]);
const saved = await download.path();
check("Download all sessions (JSON)", !!saved && download.suggestedFilename().endsWith(".json"), download.suggestedFilename());
await page.keyboard.press("F9");

// Normal build records nothing and has no panel.
const page2 = await browser.newPage();
await page2.goto(fileUrl("ResearchFacility.html"));
await page2.waitForTimeout(600);
await page2.evaluate(() => localStorage.removeItem("research-facility-playtests"));
await page2.click("#start");
await page2.keyboard.down("KeyW");
await page2.waitForTimeout(800);
await page2.keyboard.up("KeyW");
await page2.keyboard.press("F9");
const noPanel = (await page2.locator("#playtest-panel").count()) === 0;
const stored = await page2.evaluate(() => localStorage.getItem("research-facility-playtests"));
check("Normal build records nothing", noPanel && stored === null, `panel present: ${!noPanel}; stored data: ${stored === null ? "none" : "yes"}`);

// Staged recorder checks: served build with ?playtest&debug (needs `npm run preview` running).
// The debug hook only positions the player/guards; the recorder observes normal play.
const url = process.env.GAME_URL ?? "http://localhost:4173/";
const p3 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p3.on("pageerror", (e) => errors.push(String(e)));
await p3.goto(`${url}?playtest&debug`);
await p3.waitForFunction(() => window.__facility);
await p3.evaluate(() => localStorage.removeItem("research-facility-playtests"));
await p3.click("#start");
const D = (fn, ...a) => p3.evaluate(([src, a]) => new Function("d", "a", `return (${src})(d, ...a)`)(window.__facility, a), [fn.toString(), a]);
await D((d) => [0, 1, 2].forEach((i) => d.placeGuard(i, -40 - i * 5, -40)));
await D((d) => { d.teleport(36.2, 4.1); d.face(37, 2.6); });
await p3.waitForTimeout(400);
await p3.keyboard.press("KeyE");
await p3.waitForTimeout(300); // let the game read the key before moving the player
await D((d) => { d.teleport(37.6, 31, Math.PI); });
await p3.waitForTimeout(300);
await p3.keyboard.press("KeyE"); // generator off
await p3.waitForTimeout(300);
await D((d) => { d.teleport(3.6, 4.8, 0); });
await p3.waitForTimeout(300);
await p3.keyboard.press("KeyE"); // terminal (no power) — counts as an interaction attempt, not an open
await D((d) => { d.teleport(50, 12, Math.PI / 2); });
await p3.waitForTimeout(300);
await D((d) => d.placeGuard(0, 20, 21, Math.PI / 2));
await D((d) => d.teleport(17.5, 21, -Math.PI / 2));
for (let i = 0; i < 40 && !(await p3.isVisible("#end")); i++) await p3.waitForTimeout(250);
await p3.keyboard.press("KeyR");
await p3.waitForTimeout(500);
const st = await p3.evaluate(() => {
  window.dispatchEvent(new Event("beforeunload"));
  return JSON.parse(localStorage.getItem("research-facility-playtests") ?? "[]").at(-1);
});
check("Recorder: interaction, keycard sighting + pickup", st.firstInteraction?.what === "keycard" && st.firstObjectiveDiscovery !== null && st.keycardTaken !== null,
  `first interaction ${JSON.stringify(st.firstInteraction)}; keycard seen ${st.firstSeen.keycard}s, taken ${st.keycardTaken}s`);
check("Recorder: generator discovered and cut", st.firstSeen.generator !== undefined && st.generatorCuts === 1, `seen ${st.firstSeen.generator}s, cuts ${st.generatorCuts}`);
check("Recorder: archive reached", st.archiveReached !== null, `archive at ${st.archiveReached}s`);
check("Recorder: death, guard chase, attempts", st.deaths === 1 && st.guardChases >= 1 && st.attempts.length === 2 && st.attempts[0].outcome === "lost",
  `deaths ${st.deaths}, chases ${st.guardChases}, attempts ${st.attempts.map((a) => `#${a.n} ${a.outcome ?? "running"}`).join(", ")}`);

const ok = results.every((r) => r.pass) && !errors.length;
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed. Console errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
process.exit(ok ? 0 : 1);
