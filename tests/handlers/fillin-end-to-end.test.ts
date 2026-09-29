/**
 * End-to-end fill-in flow with a real leaf layout.
 *
 * Renders rows from the real 1-07 leaf, types a value, extracts,
 * maps, spreads, and resolves exactly like generation does.
 *
 * @jest-environment jsdom
 */

import * as fx from 'fs';
import * as path from 'path';
import { updateLayoutSpecificFields } from '../../scripts/utils/layout-utils';
import { extractFormData } from '../../scripts/handlers/form-data-extraction';
import { mapToCharacterData } from '../../scripts/model/party-chronicle-mapper';
import { resolveValue } from '../../scripts/utils/pdf-element-utils';
import { createUniqueFields } from '../model/test-helpers';
import { createMockActor } from '../model/test-helpers';

const mockGetLayout = jest.fn();
const mockLoadPartyChronicleData = jest.fn();

jest.mock('../../scripts/LayoutStore', () => ({
  layoutStore: {
    getLayout: (...args: unknown[]) => mockGetLayout(...args),
  },
}));

jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  loadPartyChronicleData: (...args: unknown[]) => mockLoadPartyChronicleData(...args),
}));

describe('fill-in end to end with real leaf', () => {
  beforeAll(() => {
    (globalThis as unknown as { game: unknown }).game = {
      system: { id: 'pf2e' },
      modules: new Map(),
    };
  });

  afterAll(() => {
    delete (globalThis as unknown as { game?: unknown }).game;
  });

  it('should carry a typed value from the form to a resolved PDF value', async () => {
    const leafPath = path.join(
      __dirname, '..', '..', 'assets', 'layouts', 'sfs2', 'season1',
      'sfs2.s1-07-SeizeandDestroyChronicle.json'
    );
    const leaf = JSON.parse(fx.readFileSync(leafPath, 'utf-8'));
    const fieldNames: string[] = Object.keys(leaf.parameters?.['Fill-ins'] || {});
    expect(fieldNames.length).toBeGreaterThan(0);
    const fieldName = fieldNames[0];

    mockGetLayout.mockResolvedValue(leaf);
    mockLoadPartyChronicleData.mockResolvedValue({
      data: { shared: { adventureSummaryCheckboxes: [], strikeoutItems: [] } },
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <div id="adventure-summary-content">
        <div class="checkbox-choices"></div>
        <div class="fillin-fields"></div>
      </div>
      <div id="items-to-strike-out-content">
        <div class="strikeout-choices"></div>
      </div>
    `;
    await updateLayoutSpecificFields(container, 'sfs2.s1-07', jest.fn());

    const input = container.querySelector<HTMLInputElement>(
      `input[name="shared.fillIns.${fieldName}"]`
    );
    expect(input).not.toBeNull();
    input!.value = '17%';

    const data = extractFormData(container, []);
    expect(data.shared.fillIns).toEqual({ [fieldName]: '17%' });

    const unique = createUniqueFields({});
    const actor = createMockActor('actor-1', 'EA');
    const chronicleData = mapToCharacterData(data.shared, unique, actor);
    const pdfData = { ...chronicleData, ...chronicleData.fillIns };
    expect(resolveValue(`param:${fieldName}`, pdfData, 'text')).toBe('17%');
  });
});
