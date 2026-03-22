/**
 * @jest-environment jsdom
 */

/**
 * Tests for the session report click handler.
 *
 * Validates the orchestration flow: validate → build → serialize → clipboard → notify.
 * Covers success path, validation failure, clipboard failure, and Alt-key behavior.
 *
 * Requirements: paizo-session-reporting 4.1, 6.5, 7.1, 7.2, 7.3, 7.4, 8.5
 */

import { handleCopySessionReport } from '../../scripts/handlers/session-report-handler';

// Mock dependencies
jest.mock('../../scripts/handlers/form-data-extraction', () => ({
  extractFormData: jest.fn(),
}));

jest.mock('../../scripts/model/party-chronicle-validator', () => ({
  validateSessionReportFields: jest.fn(),
}));

jest.mock('../../scripts/model/session-report-builder', () => ({
  buildSessionReport: jest.fn(),
}));

jest.mock('../../scripts/model/session-report-serializer', () => ({
  serializeSessionReport: jest.fn(),
}));

import { extractFormData } from '../../scripts/handlers/form-data-extraction';
import { validateSessionReportFields } from '../../scripts/model/party-chronicle-validator';
import { buildSessionReport } from '../../scripts/model/session-report-builder';
import { serializeSessionReport } from '../../scripts/model/session-report-serializer';

const mockExtractFormData = extractFormData as jest.Mock;
const mockValidate = validateSessionReportFields as jest.Mock;
const mockBuild = buildSessionReport as jest.Mock;
const mockSerialize = serializeSessionReport as jest.Mock;

// Mock globals
const mockWriteText = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  Object.assign(navigator, {
    clipboard: { writeText: mockWriteText },
  });

  (global as any).ui = {
    notifications: { info: mockInfo, error: mockError },
  };
});

/**
 * Creates a minimal DOM container with the validation error panel.
 */
function createContainer(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <div id="validationErrors" style="display:none">
      <ul id="validationErrorList"></ul>
    </div>
  `;
  return container;
}

/**
 * Creates a MouseEvent with optional altKey.
 */
function createMouseEvent(altKey = false): MouseEvent {
  return new MouseEvent('click', { altKey });
}

const validFormData = {
  shared: { eventDate: '2025-01-15', gmPfsNumber: '12345', layoutId: 'pfs2.s5-18' },
  characters: { 'actor-1': { characterName: 'Valeros', consumeReplay: false } },
};

const mockReport = { gameSystem: 'PFS2E', signUps: [] };
const mockPartyActors = [{ id: 'actor-1', name: 'Valeros' }] as any[];

describe('handleCopySessionReport', () => {
  describe('successful copy', () => {
    it('copies base64-encoded report to clipboard on normal click', async () => {
      mockExtractFormData.mockReturnValue(validFormData);
      mockValidate.mockReturnValue({ valid: true, errors: [] });
      mockBuild.mockReturnValue(mockReport);
      mockSerialize.mockReturnValue('base64encodedstring');
      mockWriteText.mockResolvedValue(undefined);

      const container = createContainer();
      await handleCopySessionReport(container, mockPartyActors, 'pfs2.s5-18', createMouseEvent());

      expect(mockSerialize).toHaveBeenCalledWith(mockReport, false);
      expect(mockWriteText).toHaveBeenCalledWith('base64encodedstring');
      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('base64'));
    });

    it('copies raw JSON to clipboard when Alt key is held', async () => {
      mockExtractFormData.mockReturnValue(validFormData);
      mockValidate.mockReturnValue({ valid: true, errors: [] });
      mockBuild.mockReturnValue(mockReport);
      mockSerialize.mockReturnValue('{"gameSystem":"PFS2E"}');
      mockWriteText.mockResolvedValue(undefined);

      const container = createContainer();
      await handleCopySessionReport(container, mockPartyActors, 'pfs2.s5-18', createMouseEvent(true));

      expect(mockSerialize).toHaveBeenCalledWith(mockReport, true);
      expect(mockWriteText).toHaveBeenCalledWith('{"gameSystem":"PFS2E"}');
      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('raw JSON'));
    });
  });

  describe('validation failure', () => {
    it('displays validation errors and does not copy', async () => {
      mockExtractFormData.mockReturnValue(validFormData);
      mockValidate.mockReturnValue({
        valid: false,
        errors: ['Event date is required', 'GM PFS number is required'],
      });

      const container = createContainer();
      await handleCopySessionReport(container, mockPartyActors, 'pfs2.s5-18', createMouseEvent());

      // Should not proceed to build/serialize/copy
      expect(mockBuild).not.toHaveBeenCalled();
      expect(mockSerialize).not.toHaveBeenCalled();
      expect(mockWriteText).not.toHaveBeenCalled();

      // Should display errors in the panel
      const errorPanel = container.querySelector('#validationErrors') as HTMLElement;
      expect(errorPanel.style.display).toBe('block');

      const errorItems = container.querySelectorAll('#validationErrorList li');
      expect(errorItems).toHaveLength(2);
      expect(errorItems[0].textContent).toBe('Event date is required');
      expect(errorItems[1].textContent).toBe('GM PFS number is required');
    });

    it('handles missing error panel gracefully', async () => {
      mockExtractFormData.mockReturnValue(validFormData);
      mockValidate.mockReturnValue({ valid: false, errors: ['Some error'] });

      // Container without the error panel elements
      const container = document.createElement('div');
      await handleCopySessionReport(container, mockPartyActors, 'pfs2.s5-18', createMouseEvent());

      // Should not throw, just silently skip display
      expect(mockBuild).not.toHaveBeenCalled();
    });
  });

  describe('clipboard failure', () => {
    it('displays error notification when clipboard write fails with Error', async () => {
      mockExtractFormData.mockReturnValue(validFormData);
      mockValidate.mockReturnValue({ valid: true, errors: [] });
      mockBuild.mockReturnValue(mockReport);
      mockSerialize.mockReturnValue('encoded');
      mockWriteText.mockRejectedValue(new Error('Permission denied'));

      const container = createContainer();
      await handleCopySessionReport(container, mockPartyActors, 'pfs2.s5-18', createMouseEvent());

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
      expect(mockInfo).not.toHaveBeenCalled();
    });

    it('displays error notification when clipboard write fails with non-Error', async () => {
      mockExtractFormData.mockReturnValue(validFormData);
      mockValidate.mockReturnValue({ valid: true, errors: [] });
      mockBuild.mockReturnValue(mockReport);
      mockSerialize.mockReturnValue('encoded');
      mockWriteText.mockRejectedValue('string error');

      const container = createContainer();
      await handleCopySessionReport(container, mockPartyActors, 'pfs2.s5-18', createMouseEvent());

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('string error'));
    });
  });

  describe('orchestration flow', () => {
    it('passes correct params through the pipeline', async () => {
      mockExtractFormData.mockReturnValue(validFormData);
      mockValidate.mockReturnValue({ valid: true, errors: [] });
      mockBuild.mockReturnValue(mockReport);
      mockSerialize.mockReturnValue('result');
      mockWriteText.mockResolvedValue(undefined);

      const container = createContainer();
      await handleCopySessionReport(container, mockPartyActors, 'pfs2.s5-18', createMouseEvent());

      expect(mockExtractFormData).toHaveBeenCalledWith(container, mockPartyActors);
      expect(mockValidate).toHaveBeenCalledWith({
        shared: validFormData.shared,
        partyActors: mockPartyActors,
      });
      expect(mockBuild).toHaveBeenCalledWith({
        shared: validFormData.shared,
        characters: validFormData.characters,
        partyActors: mockPartyActors,
        layoutId: 'pfs2.s5-18',
      });
    });
  });
});
