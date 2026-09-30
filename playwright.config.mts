import { defineFoundryConfig } from '@scooper4711/foundry-test-kit';

// One project per game system; foundry-test runs the one matching the world
// it starts (see foundry-test.config.json).
export default defineFoundryConfig({
  projects: [
    { name: 'pf2e', testIgnore: /starfinder\// },
    { name: 'sf2e', testMatch: /(starfinder\/.*|smoke)\.spec\.ts$/ },
  ],
});
