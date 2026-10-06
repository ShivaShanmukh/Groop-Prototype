// Live-edit check: with the DEV server running (cd prototype/phase-1 && npx vite --port 5179),
// edit the Blueprint FILE, reload the game, and read the value from the running runtime. Restores the file.
// Run: node prototype/phase-2b/dev-reload.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(new URL("../phase-1/package.json", import.meta.url))("playwright-core");
const BP = new URL("../phase-2a/research-facility.blueprint.json", import.meta.url);
const URL_ = "http://localhost:5179/?debug&autostart";
const original = readFileSync(BP, "utf8");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();
const read = async () => {
  await p.goto(URL_);
  await p.waitForFunction(() => window.__facility, null, { timeout: 30000 });
  return p.evaluate(() => ({ params: window.__facility.snapshot().params, source: document.getElementById("bp-source")?.textContent }));
};
const out = {};
try {
  out.before = await read();
  writeFileSync(BP, original.replace(/("id": "guardChaseSpeed",[\s\S]*?"value": )4,/, (_, head) => `${head}7,`));
  await p.waitForTimeout(800);
  out.edited = await read();
  writeFileSync(BP, original.replace(/("id": "guardChaseSpeed",[\s\S]*?"value": )4,/, (_, head) => `${head}999,`));
  await p.waitForTimeout(800);
  await p.goto(URL_);
  await p.waitForTimeout(1500);
  out.invalid = { errorShown: await p.isVisible("#bp-error"), started: await p.evaluate(() => window.__facility !== undefined), text: await p.textContent("#bp-error-list") };
} finally {
  writeFileSync(BP, original);
}
await p.waitForTimeout(800);
out.restored = await read();
out.fileRestored = sha(readFileSync(BP, "utf8")) === sha(original);
console.log(JSON.stringify(out, null, 2));
await b.close();
const ok = out.before.params.guardChaseSpeed === 4 && out.edited.params.guardChaseSpeed === 7 && out.invalid.errorShown && !out.invalid.started && out.restored.params.guardChaseSpeed === 4 && out.fileRestored;
console.log(ok ? "PASS  dev server: Blueprint file edit → running game, invalid edit → refused, restore → baseline" : "FAIL");
process.exit(ok ? 0 : 1);
