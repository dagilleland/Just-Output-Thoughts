// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  // Tell vite-node (used by Vitest) to treat ALL "node:*" built-ins as external.
  server: {
    deps: {
      external: [/^node:.*/],
    },
  },
  resolve: {
    conditions: ['node'],
  },
});
