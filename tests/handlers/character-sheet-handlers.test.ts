/**
 * Unit tests for character-sheet-handlers.ts
 *
 * Tests the Download/Delete Chronicle button injection on character sheets.
 *
 * @jest-environment jsdom
 */

const mockSaveAs = jest.fn();
const mockConfirm = jest.fn();
const mockSettingsGet = jest.fn().mockReturnValue('');

(globalThis as any).game = {
  settings: { get: mockSettingsGet },
  user: { isGM: true },
};

(globalThis as any).foundry = {
  applications: {
    api: { DialogV2: { confirm: mockConfirm } },
  },
};

jest.mock('file-saver', () => ({ saveAs: mockSaveAs }), { virtual: true });

jest.mock('../../scripts/utils/filename-utils', () => ({
  generateChronicleFilename: jest.fn().mockReturnValue('chronicle.pdf'),
}));

// Suppress console noise
jest.spyOn(console, 'log').mockImplementation();

import { handleCharacterSheetRender } from '../../scripts/handlers/character-sheet-handlers';

function createMockSheet(flags: Record<string, unknown> = {}) {
  return {
    actor: {
      name: 'Valeros',
      getFlag: jest.fn((_mod: string, key: string) => flags[key]),
      unsetFlag: jest.fn().mockResolvedValue(undefined),
    },
    render: jest.fn(),
  };
}

function createMockHtml(hasPfsTab: boolean) {
  const container = document.createElement('div');
  if (hasPfsTab) {
    const tab = document.createElement('div');
    tab.classList.add('tab');
    tab.setAttribute('data-tab', 'pfs');
    container.appendChild(tab);
  }

  const jqueryLike = {
    find: jest.fn((selector: string) => {
      const elements = container.querySelectorAll(selector);
      return {
        length: elements.length,
        append: jest.fn((el: HTMLElement) => {
          if (elements.length > 0) elements[0].appendChild(el);
        }),
      };
    }),
  };
  return { jqueryLike, container };
}

describe('handleCharacterSheetRender', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (game as any).user.isGM = true;
  });

  it('does nothing when PFS tab is not present', () => {
    const sheet = createMockSheet();
    const { jqueryLike } = createMockHtml(false);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    expect(sheet.actor.getFlag).not.toHaveBeenCalled();
  });

  it('adds a disabled download button when no chronicle PDF exists', () => {
    const sheet = createMockSheet({});
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const buttons = pfsTab.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    const downloadBtn = buttons[0];
    expect(downloadBtn.disabled).toBe(true);
    expect(downloadBtn.innerHTML).toContain('Download Chronicle');
  });

  it('adds an enabled download button when chronicle PDF exists', () => {
    const sheet = createMockSheet({ chroniclePdf: btoa('fake-pdf') });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const downloadBtn = pfsTab.querySelectorAll('button')[0];
    expect(downloadBtn.disabled).toBe(false);
  });

  it('downloads the chronicle PDF when download button is clicked', () => {
    const pdfContent = 'test-pdf-content';
    const sheet = createMockSheet({ chroniclePdf: btoa(pdfContent) });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const downloadBtn = pfsTab.querySelectorAll('button')[0];
    downloadBtn.click();

    expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'chronicle.pdf');
  });

  it('does not download when click fires but no PDF exists', () => {
    const sheet = createMockSheet({});
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const downloadBtn = pfsTab.querySelectorAll('button')[0];
    downloadBtn.click();

    expect(mockSaveAs).not.toHaveBeenCalled();
  });

  it('adds a delete button for GM users', () => {
    const sheet = createMockSheet({ chroniclePdf: btoa('pdf') });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const buttons = pfsTab.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[1].innerHTML).toContain('Delete Chronicle');
  });

  it('does not add a delete button for non-GM users', () => {
    (game as any).user.isGM = false;
    const sheet = createMockSheet({ chroniclePdf: btoa('pdf') });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const buttons = pfsTab.querySelectorAll('button');
    expect(buttons).toHaveLength(1); // Only download button
  });

  it('deletes chronicle data when delete is confirmed', async () => {
    mockConfirm.mockResolvedValue(true);
    const sheet = createMockSheet({ chroniclePdf: btoa('pdf') });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const deleteBtn = pfsTab.querySelectorAll('button')[1];
    deleteBtn.click();

    // Wait for async handler
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(sheet.actor.unsetFlag).toHaveBeenCalledWith('pfs-chronicle-generator', 'chroniclePdf');
    expect(sheet.actor.unsetFlag).toHaveBeenCalledWith('pfs-chronicle-generator', 'chronicleData');
    expect(sheet.render).toHaveBeenCalledWith(true);
  });

  it('does not delete when confirmation is declined', async () => {
    mockConfirm.mockResolvedValue(false);
    const sheet = createMockSheet({ chroniclePdf: btoa('pdf') });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const deleteBtn = pfsTab.querySelectorAll('button')[1];
    deleteBtn.click();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(sheet.actor.unsetFlag).not.toHaveBeenCalled();
  });

  it('uses chronicleData flag for blank chronicle path when available', () => {
    const sheet = createMockSheet({
      chroniclePdf: btoa('pdf'),
      chronicleData: { blankChroniclePath: '/custom/path.pdf' },
    });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const downloadBtn = pfsTab.querySelectorAll('button')[0];
    downloadBtn.click();

    const { generateChronicleFilename } = require('../../scripts/utils/filename-utils');
    expect(generateChronicleFilename).toHaveBeenCalledWith('Valeros', '/custom/path.pdf');
  });

  it('falls back to empty string when no chronicle data flag exists', () => {
    const sheet = createMockSheet({ chroniclePdf: btoa('pdf') });
    const { jqueryLike, container } = createMockHtml(true);

    handleCharacterSheetRender(sheet as any, jqueryLike as any);

    const pfsTab = container.querySelector('.tab[data-tab="pfs"]')!;
    const downloadBtn = pfsTab.querySelectorAll('button')[0];
    downloadBtn.click();

    const { generateChronicleFilename } = require('../../scripts/utils/filename-utils');
    expect(generateChronicleFilename).toHaveBeenCalledWith('Valeros', '');
  });
});
