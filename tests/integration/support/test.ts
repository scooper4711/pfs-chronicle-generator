/**
 * The suite's `test`: the kit's fixtures (coverage, no scene canvas, a
 * reused Gamemaster session in `gmPage`) plus the Society form page object.
 */
import { test as kitTest, expect } from '@scooper4711/foundry-test-kit';
import { SocietyForm } from './society-form.js';

export { expect };

export const test = kitTest.extend<{ form: SocietyForm }>({
  form: async ({ gmPage }, use) => {
    await use(new SocietyForm(gmPage));
  },
});
