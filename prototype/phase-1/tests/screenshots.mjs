// Captures the screenshots in /screenshots. The ?debug hook only positions the
// player/guards for framing; everything shown is the real game rendering.
// Usage: npm run build && npm run preview (other terminal), then node tests/screenshots.mjs
import { chromium } from "playwright-core";

const URL = process.env.GAME_URL ?? "http://localhost:4173/";
const b = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
p.setDefaultTimeout(15000);
const D = (fn, ...a) => p.evaluate(([src, a]) => new Function("d", "a", `return (${src})(d, ...a)`)(window.__facility, a), [fn.toString(), a]);
const shot = (name) => p.screenshot({ path: `screenshots/${name}.jpg`, type: "jpeg", quality: 85 });
const wait = (ms) => p.waitForTimeout(ms);
const snap = () => D((d) => d.snapshot());
const until = async (pred, ms = 8000) => {
  for (let t = 0; t < ms; t += 100) {
    if (pred(await snap())) return true;
    await wait(100);
  }
  return false;
};
const park = () => D((d) => [0, 1, 2].forEach((i) => d.placeGuard(i, -40 - i * 5, -40)));
const view = async (x, z, lookX, lookZ, ms = 500) => {
  await D((d, x, z, lx, lz) => { d.teleport(x, z); d.face(lx, lz); }, x, z, lookX, lookZ);
  await wait(ms);
};
const fresh = async () => {
  await p.goto(`${URL}?debug`);
  await p.waitForFunction(() => window.__facility);
  await p.click("#start");
  await wait(300);
};

await p.goto(`${URL}?debug`);
await p.waitForFunction(() => window.__facility);
await wait(600);
await shot("01-title");
await p.click("#start");
await park();
await D((d) => d.setCameras(false));

await view(11, 41.2, 11, 30);
await shot("02-entrance");
await D((d) => d.setCameras(true));
await view(4.5, 35, 21.6, 24.4, 900);
await shot("03-reception-camera");
await D((d) => d.setCameras(false));
await view(3.5, 20, 40, 20);
await shot("04-corridor");
await view(36.2, 4.1, 37, 2.6);
await shot("05-lab-keycard-prompt");
await view(4.4, 5.6, 3.6, 2.9, 300);
await p.keyboard.press("KeyE");
await wait(400);
await shot("06-security-terminal");
await p.keyboard.press("Escape");
await wait(300);
await view(33, 30, 37.6, 34.6);
await shot("07-storage-generator");
await view(37.6, 31, 37.6, 32.8, 200);
await p.keyboard.press("KeyE");
await wait(500);
await view(13, 19.2, 36, 19, 600);
await shot("08-power-off-emergency-lighting");
await view(37.6, 31, 37.6, 32.8, 200);
await p.keyboard.press("KeyE");
await wait(300);
await view(34, 19.5, 41, 19);
await shot("09-restricted-door-locked");
await D((d) => d.give("keycard"));
await view(53.2, 11.2, 55, 13);
await shot("10-archive-research-drive");

// Guards: suspicion (?) then chase (!)
await fresh();
await D((d) => { d.placeGuard(1, -45, -40); d.placeGuard(2, -50, -40); d.setCameras(false); d.placeGuard(0, 24, 20, Math.PI / 2); });
await view(16, 20.5, 24, 20, 100);
await until((s) => s.guards[0].mode === "SUSPICIOUS" && s.guards[0].suspicion > 0.4);
await shot("11-guard-suspicious");
await until((s) => s.guards[0].mode === "CHASE");
await wait(250);
await shot("12-guard-chase");

// Alarm from a camera
await fresh();
await park();
await view(33, 21, 39.6, 21.6, 100);
await until((s) => s.alarm.active, 6000);
await wait(400);
await shot("13-alarm");
await p.keyboard.press("Tab");
await wait(300);
await D((d) => d.give("keycard"));
await p.keyboard.press("Tab");
await p.keyboard.press("Tab");
await wait(300);
await shot("14-inventory");
await p.keyboard.press("Tab");

// Win and loss screens
await fresh();
await park();
await D((d) => { d.give("keycard"); d.give("drive"); });
await view(4, 19, 0, 19, 100);
await p.keyboard.down("KeyW");
await until((s) => !!s.outcome, 6000);
await p.keyboard.up("KeyW");
await wait(500);
await shot("15-win");
await fresh();
await D((d) => { d.placeGuard(1, -45, -40); d.placeGuard(2, -50, -40); d.placeGuard(0, 20, 21, Math.PI / 2); });
await view(17.5, 21, 20, 21, 100);
await until((s) => !!s.outcome, 8000);
await wait(500);
await shot("16-caught");
await b.close();
console.log("screenshots written to /screenshots");
