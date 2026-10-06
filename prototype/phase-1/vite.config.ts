import { defineConfig } from "vite";

// base "./" makes the built game work from any folder or static host.
export default defineConfig({
  base: "./",
  build: { outDir: "dist", target: "es2022", chunkSizeWarningLimit: 900 },
  // Phase 2B: the game imports its parameters from the Blueprint in ../phase-2a.
  server: { fs: { allow: [".."] } },
});
