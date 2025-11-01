import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  outDir: "dist",
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  dts: false,
  banner: {
    js: "#!/usr/bin/env node"
  },
  target: "node20"
});
