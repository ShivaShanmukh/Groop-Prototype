// End-to-end checklist for The Research Facility, run in real Chrome.
// Every action uses real keyboard/mouse events. The ?debug hook is used only to
// READ state and to SET UP scenarios (teleport, place a guard, aim the view).
// Usage: npm run build && npm run preview  (in another terminal), then  npm run test:e2e
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const URL = process.env.GAME_URL ?? "http://localhost:4173/";
const results = [];
const errors = [];
const check = (name, pass, detail, how) => {
  results.push({ name, pass: !!pass, detail, how });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  —  ${detail}`);
};

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: !process.env.HEADED });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(10000);
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(`${m.text()} @ ${m.location()?.url ?? ""}`));
page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));

const D = (fn, ...args) => page.evaluate(([src, a]) => new Function("d", "a", `return (${src})(d, ...a)`)(window.__facility, a), [fn.toString(), args]);
const snap = () => D((d) => d.snapshot());
const wait = (ms) => page.waitForTimeout(ms);
const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await wait(ms);
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Speed in m/s measured between two samples taken while the keys are held (game time, so input lag doesn't count). */
async function measure(keys) {
  for (const k of keys) await page.keyboard.down(k);
  await wait(300);
  const s1 = await snap();
  await wait(700);
  const s2 = await snap();
  const posture = await page.textContent("#posture");
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
  await wait(150);
  return { speed: dist(s1.player.pos, s2.player.pos) / (s2.time - s1.time), posture, s2 };
}
const until = async (pred, ms = 15000, step = 100) => {
  for (let t = 0; t < ms; t += step) {
    const s = await snap();
    if (pred(s)) return s;
    await wait(step);
  }
  return null;
};
/** Autopilot: aim along the game's own A* path (setup) and walk with the real W key. */
async function walkTo(x, z, { tol = 0.7, maxMs = 30000, keys = ["KeyW"] } = {}) {
  for (let t = 0; t < maxMs; t += 150) {
    const s = await snap();
    if (dist(s.player.pos, { x, z }) < tol || s.outcome) return s;
    const path = (await D((d, x, z) => d.pathTo(x, z), x, z)) ?? [];
    const next = path.find((p) => dist(p, s.player.pos) > 0.35) ?? { x, z };
    await D((d, x, z) => d.face(x, z), next.x, next.z);
    await hold(keys, 150);
  }
  return snap();
}
/** Setup: move guards we're not testing far outside the building, where they can't see, hear or reach anything. */
const parkOthers = (keep) => D((d, keep) => [0, 1, 2].forEach((i) => i !== keep && d.placeGuard(i, -40 - i * 5, -40)), keep);

try {
  // 1. Launch
  await page.goto(`${URL}?debug`);
  await page.waitForFunction(() => window.__facility, null, { timeout: 20000 });
  const titleVisible = await page.isVisible("#title");
  await page.click("#start");
  await wait(500);
  const s0 = await snap();
  check("Game launches", titleVisible && (await D((d) => d.appState())) === "playing" && (await page.isVisible("#hud")), `title shown, Start → state "${await D((d) => d.appState())}", HUD visible`, "real click");
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 1000 ? requestAnimationFrame(f) : r(n); }; requestAnimationFrame(f); }));

  // 2. Move (W from the entrance)
  const walk = await measure(["KeyW"]);
  const walked = dist(s0.player.pos, walk.s2.player.pos);
  check("Player moves", walk.speed > 3.2 && walk.speed < 4, `W held → ${walk.speed.toFixed(2)} m/s (design 3.6), moved ${walked.toFixed(1)} m from the start`, "real keys");

  // 3. Camera: pointer-lock mouse look (or drag fallback) + arrow-key turn
  const locked = await page.evaluate(() => document.pointerLockElement === document.getElementById("game"));
  let y0 = (await snap()).player.yaw;
  if (locked) await page.mouse.move(700, 360, { steps: 5 });
  else {
    await page.mouse.move(640, 360);
    await page.mouse.down();
    await page.mouse.move(540, 360, { steps: 8 });
    await page.mouse.up();
  }
  const yMouse = (await snap()).player.yaw - y0;
  y0 = (await snap()).player.yaw;
  await hold(["ArrowLeft"], 500);
  const yKeys = (await snap()).player.yaw - y0;
  check("Camera works", Math.abs(yMouse) > 0.05 && yKeys > 0.5, `mouse ${locked ? "(pointer lock)" : "(drag)"} turned ${yMouse.toFixed(2)} rad; ← turned ${yKeys.toFixed(2)} rad`, "real mouse + keys");
  await page.keyboard.press("Escape").catch(() => undefined);
  await wait(200);
  if ((await D((d) => d.appState())) !== "playing") { await page.click("#resume"); await wait(300); }

  // 4. Sprint
  await D((d) => d.teleport(36, 20, Math.PI / 2)); // corridor, facing west
  await parkOthers(-1);
  const sprint = await measure(["ShiftLeft", "KeyW"]);
  check("Sprint works", sprint.speed > 5.4 && sprint.posture.includes("SPRINTING"), `Shift+W → ${sprint.speed.toFixed(2)} m/s (design 6.0); HUD "${sprint.posture}"`, "real keys");

  // 5. Crouch
  await D((d) => d.teleport(36, 20, Math.PI / 2));
  await page.keyboard.press("KeyC");
  await wait(400);
  const cs = await snap();
  const crouch = await measure(["KeyW"]);
  await page.keyboard.press("KeyC");
  await wait(400);
  const standEye = (await snap()).player.eye;
  check("Crouch works", cs.player.crouching && cs.player.eye < 1.1 && crouch.speed < 2.2 && standEye > 1.55 && crouch.posture.includes("CROUCHED"),
    `C → crouching, eye ${cs.player.eye.toFixed(2)} m, ${crouch.speed.toFixed(2)} m/s (design 1.9), HUD "${crouch.posture}"; C again → eye ${standEye.toFixed(2)} m`, "real keys");

  // 6–10: the objective route. Setup: guards parked outside, cameras off (the terminal test covers cameras).
  await D((d) => d.setCameras(false));
  // 6–7. Interaction + inventory (keycard on the lab back bench)
  await D((d) => d.teleport(30, 15, 0)); // just inside the lab, facing north
  await walkTo(37, 4.3);
  await D((d) => d.face(37, 2.6));
  await wait(200);
  const promptText = (await page.isVisible("#prompt")) ? await page.textContent("#prompt") : "(none)";
  await page.keyboard.press("KeyE");
  await wait(300);
  const afterE = await snap();
  check("Interaction works", promptText.includes("keycard") && afterE.inventory.includes("keycard"), `prompt "${promptText.trim()}" → E → inventory ${JSON.stringify(afterE.inventory)}`, "real keys");
  const slot = await page.textContent("#slots");
  await page.keyboard.press("Tab");
  await wait(300);
  const invPanel = (await page.isVisible("#inventory")) ? await page.textContent("#inv-list") : "";
  await page.keyboard.press("Tab");
  await wait(200);
  check("Inventory works", slot.includes("Security keycard") && invPanel.includes("Security keycard"), `HUD slot shows "Security keycard"; Tab opens panel listing it; Tab closes (state ${await D((d) => d.appState())})`, "real keys");
  check("Keycard works", afterE.inventory.includes("keycard") && (await snap()).objective.includes("Archive"), `picked up; objective now: "${(await snap()).objective}"`, "real keys");

  // 8. Door: without the keycard the security door stays shut (fresh run), with it the player gets through
  const secure = afterE.doors.find((d) => d.kind === "secure");
  await walkTo(38.6, 19);
  await D((d) => d.face(41, 19));
  await hold(["KeyW"], 1200);
  await walkTo(45, 19);
  const thru = await snap();
  const secureNow = thru.doors.find((d) => d.kind === "secure");
  check("Door works", secure.locked && !secureNow.locked && thru.player.pos.x > 42, `security door locked=${secure.locked} before; with keycard → unlocked, opened, player at x=${thru.player.pos.x.toFixed(1)} (inside restricted wing, x>42)`, "real keys");

  // 9. Objective + exit unlock
  await parkOthers(-1);
  await walkTo(49, 15.5);
  await walkTo(55, 11.6);
  await D((d) => d.face(55, 13));
  await wait(150);
  await page.keyboard.press("KeyE");
  await wait(300);
  const got = await snap();
  const exitDoor = got.doors.find((d) => d.kind === "exit");
  check("Objective works", got.inventory.includes("drive") && !exitDoor.locked, `E on pedestal → inventory ${JSON.stringify(got.inventory)}; exit locked=${exitDoor.locked}; objective: "${got.objective}"`, "real keys");

  // 10. Exit + win
  await D((d) => d.teleport(6, 19, Math.PI / 2));
  await walkTo(0.6, 19, { tol: 0.3, maxMs: 8000 }); // aim inside the doorway; the win line is x < 1.6
  const won = await until((s) => s.outcome, 4000);
  const endVisible = await page.isVisible("#end");
  const endTitle = endVisible ? await page.textContent("#end-title") : "";
  const exitState = won ? "" : ` [diagnostics: app state "${await D((d) => d.appState())}", player at ${JSON.stringify((await snap()).player.pos)}, pointer lock ${await page.evaluate(() => !!document.pointerLockElement)}]`;
  check("Exit works", won?.outcome?.result === "won", `walked into the opened emergency exit → outcome ${JSON.stringify(won?.outcome)}${exitState}`, "real keys");
  check("Win state works", endVisible && endTitle === "You escaped", `end screen "${endTitle}" with stats: ${(await page.textContent("#end-stats"))?.replace(/\s+/g, " ")}`, "real keys");
  await page.screenshot({ path: "screenshots/e2e-win.jpg", type: "jpeg", quality: 85 });
  await page.keyboard.press("KeyR");
  await wait(800);
  const restarted = await snap();
  check("Restart after win", restarted.outcome === null && restarted.inventory.length === 0, `R → new run, inventory empty, state ${await D((d) => d.appState())}`, "real keys");
  check("Frame rate", fps >= 30, `${fps} frames per second in this browser (headless Chrome, 1280×720)`, "measured");
} catch (e) {
  check("Script error", false, String(e), "-");
}

await import("./e2e-systems.mjs").then((m) => m.run({ page, D, snap, wait, hold, dist, until, walkTo, parkOthers, check }));

const pass = results.filter((r) => r.pass).length;
console.log(`\n${pass}/${results.length} checks passed. Console errors: ${errors.length ? errors.join(" | ") : "none"}`);
writeFileSync("tests/e2e-results.json", JSON.stringify({ when: new Date().toISOString(), url: URL, results, consoleErrors: errors }, null, 2));
await browser.close();
process.exit(pass === results.length && !errors.length ? 0 : 1);
