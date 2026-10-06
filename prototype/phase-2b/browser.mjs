// Phase 2B browser checks: the real game (built) and the studio inspector.
// Needs: game preview on :4173 (cd prototype/phase-1 && npx vite preview --port 4173)
//        studio on :3000 (npm run build && npm start, in the repo root)
// Run: node prototype/phase-2b/browser.mjs [screenshotDir]
import { createRequire } from "node:module";

const { chromium } = createRequire(new URL("../phase-1/package.json", import.meta.url))("playwright-core");
const GAME = "http://localhost:4173/";
const STUDIO = "http://localhost:3000/studio/research-facility";
const shots = process.argv[2];
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const b = await chromium.launch({ channel: "chrome", headless: true });
const page = async (url) => {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  await p.goto(url);
  await p.waitForTimeout(600);
  return p;
};

// 1. Unchanged Blueprint: the running game holds the Blueprint's values.
{
  const p = await page(`${GAME}?debug&autostart`);
  const snap = await p.evaluate(() => window.__facility.snapshot());
  const prov = await p.evaluate(() => window.__facility.provenance());
  check("game runs with the Blueprint values", JSON.stringify(snap.params) === JSON.stringify({ guardSightRange: 11, guardChaseSpeed: 4, sprintNoiseRadius: 9, alarmDuration: 60, cameraRange: 13 }), JSON.stringify(snap.params));
  check("provenance: every value from the Blueprint, with a pointer and consumers", prov.length === 5 && prov.every((x) => x.source === "blueprint" && x.pointer.startsWith("/parameters/") && x.consumers.length), prov.map((x) => `${x.id}@${x.pointer}`).join(" "));
  check("no page errors", !p.errors.length, p.errors.join("; "));
  await p.close();
}

// 2. Title screen states where the parameters came from.
{
  const p = await page(GAME);
  const line = await p.textContent("#bp-source");
  check("title screen names the parameter source", line.includes("5 from research-facility.blueprint.json (validated)"), line);
  if (shots) await p.screenshot({ path: `${shots}/2b-title.png` });
  await p.close();
}

// 3. Invalid value → the game refuses to start and says exactly why.
{
  const p = await page(`${GAME}?debug&bp.guardSightRange=999`);
  const visible = await p.isVisible("#bp-error");
  const titleHidden = await p.isHidden("#title");
  const text = await p.textContent("#bp-error-list");
  const started = await p.evaluate(() => window.__facility !== undefined);
  check("invalid value: error screen shown, title hidden", visible && titleHidden);
  check("invalid value: message names parameter, value, type and range", text.includes("guardSightRange: supplied 999 — expected number, minimum 1, maximum 50."), text);
  check("invalid value: the game did not start (no debug hook, no loop)", !started);
  if (shots) await p.screenshot({ path: `${shots}/2b-rejected.png` });
  await p.close();
  const q = await page(`${GAME}?bp.cameraRange=far`);
  check("wrong type rejected by name", (await q.textContent("#bp-error-list")).includes('cameraRange: supplied "far" — expected number'));
  await q.close();
}

// 4. A trial override reaches the running game and is labelled as unsaved.
{
  const p = await page(`${GAME}?debug&autostart&bp.guardSightRange=6`);
  const snap = await p.evaluate(() => window.__facility.snapshot());
  const line = await p.textContent("#bp-source");
  check("override reaches the runtime", snap.params.guardSightRange === 6 && snap.params.cameraRange === 13);
  check("override labelled 'not saved'", line.includes("not saved: guardSightRange 11 → 6"), line);
  await p.close();
}

// 5. Studio inspector: Parameters view, validation, and Play-with-value.
{
  const p = await page(STUDIO);
  await p.click(".tabs button:has-text('Blueprint')");
  await p.click(".bpi-link:has-text('Parameters')");
  const rows = await p.locator(".bpi-param").count();
  const first = (await p.locator(".bpi-param").first().textContent()).replace(/\s+/g, " ");
  check("inspector lists 5 parameters", rows === 5, `${rows} rows`);
  check("row shows value, type, range, source pointer, consumer, status", ["11 m", "number", "1 – 50 m", "/parameters/0/value", "s.params.guardSightRange", "VALID"].every((s) => first.includes(s)), first.slice(0, 220));
  const input = p.locator("input[aria-label='Trial value for guardSightRange']");
  await input.fill("0.5");
  const err = await p.locator(".bpi-param").first().locator(".bpi-param-err").textContent();
  check("inspector rejects out-of-range trial value (same validator)", err.includes("guardSightRange: supplied 0.5 — expected number, minimum 1, maximum 50."), err);
  check("Play disabled while invalid", await p.locator(".bpi-btn:has-text('Play with')").isDisabled());
  if (shots) await p.screenshot({ path: `${shots}/2b-inspector-invalid.png` });
  await input.fill("6");
  await p.click(".bpi-btn:has-text('Play with 1 trial value')");
  await p.waitForTimeout(1200);
  const src = await p.getAttribute("iframe.embed-frame", "src");
  const frame = p.frames().find((f) => f.url().includes("/games/research-facility/"));
  const line = frame ? await frame.textContent("#bp-source") : "";
  check("Play reloads the embedded game with the trial value", src.includes("bp.guardSightRange=6") && line.includes("guardSightRange 11 → 6"), `${src} | ${line}`);
  if (shots) await p.screenshot({ path: `${shots}/2b-studio-trial.png` });
  await p.click(".tabs button:has-text('Blueprint')");
  await p.click(".bpi-link:has-text('camera_01')");
  const camText = (await p.locator(".bpi-main").textContent()).replace(/\s+/g, " ");
  check("entity view shows bound value + parameter", camText.includes("13 ← parameter cameraRange"));
  await p.click(".bpi-link:has-text('Parameters')");
  await p.click(".bpi-btn:has-text('Reset')");
  await p.waitForTimeout(800);
  check("Reset returns the game to the Blueprint values", !(await p.getAttribute("iframe.embed-frame", "src")).includes("bp."));
  check("no studio page errors", !p.errors.length, p.errors.join("; "));
  await p.close();
}

await b.close();
console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll browser checks passed.");
process.exit(failed ? 1 : 0);
