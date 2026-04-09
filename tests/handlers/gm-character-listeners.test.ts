/**
 * Unit tests for GM character event listener wiring.
 *
 * Tests that attachGmCharacterListeners() correctly wires dragover, dragleave,
 * drop, and click events to the appropriate DOM elements and delegates to
 * the handler functions in gm-character-handlers.ts.
 *
 * Feature: gm-character-party-sheet
 * Requirements: 1.3, 3.1, 4.3
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// --- Module mocks (must be before imports) ---

const mockHandleGmCharacterDrop = jest.fn();
const mockHandleGmCharacterClear = jest.fn();

jest.mock('../../scripts/handlers/gm-character-handlers', () => ({
    handleGmCharacterDrop: (...args: unknown[]) => mockHandleGmCharacterDrop(...args),
    handleGmCharacterClear: (...args: unknown[]) => mockHandleGmCharacterClear(...args),
}));

jest.mock('../../scripts/handlers/party-chronicle-handlers', () => ({
    handleSeasonChange: jest.fn(),
    handleLayoutChange: jest.fn(),
    handleFieldChange: jest.fn(),
    handlePortraitClick: jest.fn(),
    handleChroniclePathFilePicker: jest.fn(),
    extractFormData: jest.fn(() => ({ shared: {}, characters: {} })),
    saveFormData: jest.fn(),
    generateChroniclesFromPartyData: jest.fn(),
    updateAllTreasureBundleDisplays: jest.fn(),
    updateTreasureBundleDisplay: jest.fn(),
    updateAllEarnedIncomeDisplays: jest.fn(),
    updateDowntimeDaysDisplay: jest.fn(),
    updateChroniclePathVisibility: jest.fn(),
}));

jest.mock('../../scripts/handlers/collapsible-section-handlers', () => ({
    handleSectionHeaderClick: jest.fn(),
    handleSectionHeaderKeydown: jest.fn(),
}));

jest.mock('../../scripts/utils/earned-income-form-helpers', () => ({
    createEarnedIncomeChangeHandler: jest.fn(() => jest.fn()),
}));

jest.mock('../../scripts/model/party-chronicle-storage', () => ({
    clearPartyChronicleData: jest.fn(),
    savePartyChronicleData: jest.fn(),
}));

jest.mock('../../scripts/handlers/session-report-handler', () => ({
    handleCopySessionReport: jest.fn(),
}));

jest.mock('../../scripts/handlers/chronicle-exporter', () => ({
    clearArchive: jest.fn(),
    downloadArchive: jest.fn(),
    hasArchive: jest.fn().mockReturnValue(false),
    FlagActor: {},
}));

jest.mock('../../scripts/main', () => ({
    renderPartyChronicleForm: jest.fn(),
}));

jest.mock('../../scripts/utils/logger', () => ({
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

import { attachGmCharacterListeners } from '../../scripts/handlers/event-listener-helpers';
import type { PartyActor, PartySheetApp } from '../../scripts/handlers/event-listener-helpers';

// --- Helpers ---

function createContainer(options: { dropZone?: boolean; clearButton?: boolean } = {}): HTMLElement {
    const { dropZone = true, clearButton = true } = options;
    const container = document.createElement('div');
    const parts: string[] = [];

    if (dropZone) {
        parts.push('<div id="gmCharacterDropZone"></div>');
    }
    if (clearButton) {
        parts.push('<button id="clearGmCharacter">Clear</button>');
    }

    container.innerHTML = parts.join('');
    return container;
}

const mockPartySheet: PartySheetApp = {};
const emptyPartyActors: PartyActor[] = [];

// --- Tests ---

describe('attachGmCharacterListeners', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('drop zone dragover event', () => {
        it('calls preventDefault and adds .dragover class (Req 1.3)', () => {
            const container = createContainer();
            attachGmCharacterListeners(container, emptyPartyActors, mockPartySheet);

            const dropZone = container.querySelector('#gmCharacterDropZone');
            const event = new Event('dragover', { bubbles: true, cancelable: true });

            dropZone?.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
            expect(dropZone?.classList.contains('dragover')).toBe(true);
        });
    });

    describe('drop zone dragleave event', () => {
        it('removes .dragover class (Req 1.3)', () => {
            const container = createContainer();
            attachGmCharacterListeners(container, emptyPartyActors, mockPartySheet);

            const dropZone = container.querySelector('#gmCharacterDropZone');

            // First add the class via dragover
            dropZone?.classList.add('dragover');
            expect(dropZone?.classList.contains('dragover')).toBe(true);

            // Then trigger dragleave
            const event = new Event('dragleave', { bubbles: true });
            dropZone?.dispatchEvent(event);

            expect(dropZone?.classList.contains('dragover')).toBe(false);
        });
    });

    describe('drop zone drop event', () => {
        it('calls handleGmCharacterDrop and removes .dragover class (Req 1.3)', async () => {
            const container = createContainer();
            const partyActors: PartyActor[] = [];
            attachGmCharacterListeners(container, partyActors, mockPartySheet);

            const dropZone = container.querySelector('#gmCharacterDropZone');
            dropZone?.classList.add('dragover');

            const event = new Event('drop', { bubbles: true });
            dropZone?.dispatchEvent(event);

            // Let async handler settle
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(dropZone?.classList.contains('dragover')).toBe(false);
            expect(mockHandleGmCharacterDrop).toHaveBeenCalledTimes(1);
            expect(mockHandleGmCharacterDrop).toHaveBeenCalledWith(
                event,
                container,
                partyActors,
                mockPartySheet
            );
        });
    });

    describe('clear button click event', () => {
        it('calls handleGmCharacterClear with correct arguments (Req 3.1)', async () => {
            const container = createContainer();
            const partyActors: PartyActor[] = [];
            attachGmCharacterListeners(container, partyActors, mockPartySheet);

            const clearButton = container.querySelector<HTMLButtonElement>('#clearGmCharacter');
            clearButton?.click();

            // Let async handler settle
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockHandleGmCharacterClear).toHaveBeenCalledTimes(1);
            expect(mockHandleGmCharacterClear).toHaveBeenCalledWith(
                container,
                partyActors,
                mockPartySheet
            );
        });
    });

    describe('graceful handling when elements are missing', () => {
        it('does not throw when drop zone element is absent', () => {
            const container = createContainer({ dropZone: false });

            expect(() => {
                attachGmCharacterListeners(container, emptyPartyActors, mockPartySheet);
            }).not.toThrow();
        });

        it('does not throw when clear button element is absent', () => {
            const container = createContainer({ clearButton: false });

            expect(() => {
                attachGmCharacterListeners(container, emptyPartyActors, mockPartySheet);
            }).not.toThrow();
        });

        it('does not throw when both elements are absent', () => {
            const container = createContainer({ dropZone: false, clearButton: false });

            expect(() => {
                attachGmCharacterListeners(container, emptyPartyActors, mockPartySheet);
            }).not.toThrow();
        });

        it('does not call handlers when elements are missing', async () => {
            const container = createContainer({ dropZone: false, clearButton: false });
            attachGmCharacterListeners(container, emptyPartyActors, mockPartySheet);

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockHandleGmCharacterDrop).not.toHaveBeenCalled();
            expect(mockHandleGmCharacterClear).not.toHaveBeenCalled();
        });
    });
});
