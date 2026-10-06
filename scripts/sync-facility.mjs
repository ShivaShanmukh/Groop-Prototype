// Builds The Research Facility (prototype/phase-1) and copies it into the studio
// as static files: public/games/research-facility/. The studio embeds it from there.
// Run after changing the game:  npm run sync:facility
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";

const game = "prototype/phase-1";
const out = "public/games/research-facility";

if (!existsSync(`${game}/node_modules`)) execSync("npm install", { cwd: game, stdio: "inherit" });
execSync("npm run build", { cwd: game, stdio: "inherit" });
rmSync(out, { recursive: true, force: true });
cpSync(`${game}/dist`, out, { recursive: true });
console.log(`Copied ${game}/dist → ${out}`);
