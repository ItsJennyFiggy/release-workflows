import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      // index.ts is a thin process-bootstrap wrapper around run(); excluded so
      // the 85% gate focuses on src/main.ts business logic.
      exclude: ['src/index.ts'],
      thresholds: { statements: 85, branches: 85, functions: 85, lines: 85 },
    },
  },
});
