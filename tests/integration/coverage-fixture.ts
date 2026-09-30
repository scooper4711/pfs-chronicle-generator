/**
 * Coverage auto-fixture: records V8 JS coverage for every spec that
 * imports { test } from here instead of @playwright/test.
 */
import { test as base, expect } from '@playwright/test';
import { startCoverage, stopCoverage } from './helpers.js';

export { expect };

export const test = base.extend<{ __coverage: void }>({
  __coverage: [
    async ({ page }, use, testInfo) => {
      await startCoverage(page);
      await use();
      // The project prefix keeps specs that run in both projects apart.
      const name = `${testInfo.project.name}-${testInfo.file.split('/').pop() ?? 'spec'}-${testInfo.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60)}`;
      await stopCoverage(page, name);
    },
    { auto: true },
  ],
});
