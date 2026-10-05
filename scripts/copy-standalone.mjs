// Next's standalone build leaves out static assets; copy them next to server.js.
// https://nextjs.org/docs/app/api-reference/config/next-config-js/output
import { cpSync, existsSync } from "node:fs";

const out = ".next/standalone";
if (!existsSync(out)) {
  console.error("No .next/standalone folder. Is output: 'standalone' set in next.config.ts?");
  process.exit(1);
}
cpSync(".next/static", `${out}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${out}/public`, { recursive: true });
