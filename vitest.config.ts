import { defineConfig } from 'vitest/config';
// long simulations (100–200 sim-years) run several seconds each; under a parallel full run
// the 5s default made them flaky
export default defineConfig({ test: { include: ['src/**/*.test.ts'], testTimeout: 60000, passWithNoTests: true } });
