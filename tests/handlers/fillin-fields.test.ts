/**
 * Unit tests for fill-in blank form handling.
 *
 * Covers reading fill-in inputs in form-data-extraction and passing
 * fill-in values through mapToCharacterData into ChronicleData.
 *
 * @jest-environment jsdom
 */

import { extractFormData } from '../../scripts/handlers/form-data-extraction';
import { extractSharedFields } from '../../scripts/handlers/chronicle-generation';
import { mapToCharacterData } from '../../scripts/model/party-chronicle-mapper';
import { createSharedFields, createUniqueFields } from '../model/test-helpers';
import { createMockActor } from '../model/test-helpers';

describe('fill-in blank form handling', () => {
  beforeAll(() => {
    (globalThis as unknown as { game: unknown }).game = {
      system: { id: 'pf2e' },
      modules: new Map(),
    };
  });

  afterAll(() => {
    delete (globalThis as unknown as { game?: unknown }).game;
  });

  it('should read fill-in inputs keyed by field name', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <input id="gmPfsNumber" value="">
      <input id="scenarioName" value="">
      <input id="eventCode" value="">
      <input id="eventDate" value="">
      <input id="layout" value="pfs2.printables">
      <input id="season" value="printables">
      <input id="blankChroniclePath" value="">
      <input name="shared.fillIns.Adventure Completed" value="Paizo Printables">
      <input name="shared.fillIns.%" value="50">
    `;

    const data = extractFormData(container, []);

    expect(data.shared.fillIns).toEqual({
      'Adventure Completed': 'Paizo Printables',
      '%': '50',
    });
  });

  it('should preserve fill-in values through the generate-path coercion', () => {
    const shared = extractSharedFields(
      { fillIns: { '%': '17%' } },
      'sfs2.s1-07',
      'blank.pdf'
    );

    expect(shared.fillIns).toEqual({ '%': '17%' });
  });

  it('should default fill-ins to empty when absent or malformed', () => {
    expect(extractSharedFields({}, 'x', 'y').fillIns).toEqual({});
    expect(
      extractSharedFields({ fillIns: 'nope' as unknown as Record<string, string> }, 'x', 'y').fillIns
    ).toEqual({});
  });

  it('should pass fill-in values through to ChronicleData', () => {
    const shared = createSharedFields({
      fillIns: { 'Adventure Completed': 'Paizo Printables' },
    });
    const unique = createUniqueFields({});
    const actor = createMockActor('actor-1', 'EA');

    const result = mapToCharacterData(shared, unique, actor);

    expect(result.fillIns).toEqual({ 'Adventure Completed': 'Paizo Printables' });
  });
});
