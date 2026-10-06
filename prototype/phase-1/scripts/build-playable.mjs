// Turns the Vite build (dist/) into single, self-contained HTML files that a
// tester can open by double-clicking — no install, no server.
//   release/ResearchFacility.html           normal game
//   release/ResearchFacility-Playtest.html  same game + playtest recording (F9 panel)
// Each file carries a build stamp: version, build time and the SHA-256 of the game code.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const html = readFileSync("dist/index.html", "utf8");
const assets = readdirSync("dist/assets");
const jsFile = assets.find((f) => f.endsWith(".js"));
const cssFile = assets.find((f) => f.endsWith(".css"));
if (!jsFile || !cssFile) throw new Error("Run `vite build` first: dist/assets is missing the JS or CSS bundle.");

const js = readFileSync(`dist/assets/${jsFile}`, "utf8");
const css = readFileSync(`dist/assets/${cssFile}`, "utf8");
const sha = createHash("sha256").update(js).digest("hex");
// A literal "</script" inside the code would end the inline <script> early.
const safeJs = js.replace(/<\/script/gi, "<\\/script");

function make(playtest) {
  const stamp = { version: pkg.version, built: new Date().toISOString(), bundleSha256: sha, playtest };
  const boot = `<script>window.__BUILD__=${JSON.stringify(stamp)};${playtest ? "window.__PLAYTEST__=true;" : ""}</script>`;
  return html
    .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, () => `${boot}\n<script type="module">${safeJs}</script>`)
    .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, () => `<style>${css}</style>`);
}

mkdirSync("release", { recursive: true });
const normal = make(false);
const test = make(true);
if (normal.includes('src="./assets') || normal.includes('href="./assets')) throw new Error("Inlining failed: asset reference left in HTML.");
writeFileSync("release/ResearchFacility.html", normal);
writeFileSync("release/ResearchFacility-Playtest.html", test);
writeFileSync("release/BUILD.txt", `The Research Facility ${pkg.version}\nBuilt: ${new Date().toISOString()}\nGame code SHA-256: ${sha}\n`);
console.log(`release/ written · v${pkg.version} · code sha256 ${sha.slice(0, 12)}… · ${(normal.length / 1024).toFixed(0)} KB each`);
