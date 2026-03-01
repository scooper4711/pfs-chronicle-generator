/**
 * Unit tests for collapsible section handlers
 * 
 * Tests the event handlers and helper functions for collapsible sections.
 * 
 * @jest-environment jsdom
 */

import {
  handleSectionHeaderClick,
  handleSectionHeaderKeydown,
  toggleSectionCollapse,
  updateSectionSummary,
  updateAllSectionSummaries,
  initializeCollapseSections
} from './collapsible-section-handlers';

// Mock the storage module
jest.mock('../model/collapse-state-storage', () => ({
  saveCollapseState: jest.fn(),
  loadCollapseState: jest.fn(() => null),
  getDefaultCollapseState: jest.fn((sectionId: string) => {
    const defaults: Record<string, boolean> = {
      'event-details': true,
      'reputation': true,
      'shared-rewards': true,
      'adventure-summary': false,
      'items-to-strike-out': false
    };
    return defaults[sectionId] ?? false;
  })
}));

// Mock the summary utils module
jest.mock('../utils/summary-utils', () => ({
  generateEventDetailsSummary: jest.fn(() => 'Event Details - Test Scenario'),
  generateReputationSummary: jest.fn(() => 'Reputation - +2'),
  generateSharedRewardsSummary: jest.fn(() => 'Shared Rewards - 4 XP; 3 TB')
}));

describe('collapsible-section-handlers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a mock container with a collapsible section
    container = document.createElement('div');
    container.innerHTML = `
      <div class="collapsible-section" data-section-id="event-details">
        <header class="collapsible-header" role="button" tabindex="0" aria-expanded="false">
          <span class="chevron">▶</span>
          <span class="section-title">Event Details</span>
          <span class="section-summary"></span>
        </header>
        <div class="collapsible-content" id="event-details-content">
          <input type="text" id="eventName" value="Test Scenario" />
        </div>
      </div>
      <div class="collapsible-section" data-section-id="reputation">
        <header class="collapsible-header" role="button" tabindex="0" aria-expanded="false">
          <span class="chevron">▶</span>
          <span class="section-title">Reputation</span>
          <span class="section-summary"></span>
        </header>
        <div class="collapsible-content" id="reputation-content">
          <input type="number" id="chosenFactionReputation" value="2" />
        </div>
      </div>
    `;
  });

  describe('toggleSectionCollapse', () => {
    it('should toggle section from collapsed to expanded', () => {
      const section = container.querySelector('.collapsible-section') as HTMLElement;
      section.classList.add('collapsed');
      
      toggleSectionCollapse('event-details', container);
      
      expect(section.classList.contains('collapsed')).toBe(false);
      const header = section.querySelector('.collapsible-header') as HTMLElement;
      expect(header.getAttribute('aria-expanded')).toBe('true');
    });

    it('should toggle section from expanded to collapsed', () => {
      const section = container.querySelector('.collapsible-section') as HTMLElement;
      section.classList.remove('collapsed');
      
      toggleSectionCollapse('event-details', container);
      
      expect(section.classList.contains('collapsed')).toBe(true);
      const header = section.querySelector('.collapsible-header') as HTMLElement;
      expect(header.getAttribute('aria-expanded')).toBe('false');
    });

    it('should handle invalid section ID gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      toggleSectionCollapse('invalid-section', container);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid section ID'));
      consoleSpy.mockRestore();
    });

    it('should handle missing section element gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      toggleSectionCollapse('adventure-summary', container);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not find section element'));
      consoleSpy.mockRestore();
    });
  });

  describe('handleSectionHeaderClick', () => {
    it('should toggle section when header is clicked', () => {
      const section = container.querySelector('.collapsible-section') as HTMLElement;
      const header = section.querySelector('.collapsible-header') as HTMLElement;
      section.classList.add('collapsed');
      
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: header, writable: false });
      
      handleSectionHeaderClick(event, container);
      
      expect(section.classList.contains('collapsed')).toBe(false);
    });
  });

  describe('handleSectionHeaderKeydown', () => {
    it('should toggle section when Enter key is pressed', () => {
      const section = container.querySelector('.collapsible-section') as HTMLElement;
      const header = section.querySelector('.collapsible-header') as HTMLElement;
      section.classList.add('collapsed');
      
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: header, writable: false });
      
      handleSectionHeaderKeydown(event, container);
      
      expect(section.classList.contains('collapsed')).toBe(false);
    });

    it('should toggle section when Space key is pressed', () => {
      const section = container.querySelector('.collapsible-section') as HTMLElement;
      const header = section.querySelector('.collapsible-header') as HTMLElement;
      section.classList.add('collapsed');
      
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: header, writable: false });
      
      handleSectionHeaderKeydown(event, container);
      
      expect(section.classList.contains('collapsed')).toBe(false);
    });

    it('should not toggle section for other keys', () => {
      const section = container.querySelector('.collapsible-section') as HTMLElement;
      const header = section.querySelector('.collapsible-header') as HTMLElement;
      section.classList.add('collapsed');
      
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: header, writable: false });
      
      handleSectionHeaderKeydown(event, container);
      
      expect(section.classList.contains('collapsed')).toBe(true);
    });
  });

  describe('updateSectionSummary', () => {
    it('should update summary text for event-details section', () => {
      const section = container.querySelector('[data-section-id="event-details"]') as HTMLElement;
      const summaryElement = section.querySelector('.section-summary') as HTMLElement;
      
      updateSectionSummary('event-details', container);
      
      expect(summaryElement.textContent).toBe('Event Details - Test Scenario');
    });

    it('should update summary text for reputation section', () => {
      const section = container.querySelector('[data-section-id="reputation"]') as HTMLElement;
      const summaryElement = section.querySelector('.section-summary') as HTMLElement;
      
      updateSectionSummary('reputation', container);
      
      expect(summaryElement.textContent).toBe('Reputation - +2');
    });

    it('should not update summary for sections without summary text', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      updateSectionSummary('adventure-summary', container);
      
      // Should not throw or log warnings for sections without summary
      consoleSpy.mockRestore();
    });
  });

  describe('updateAllSectionSummaries', () => {
    it('should update all section summaries', () => {
      updateAllSectionSummaries(container);
      
      const eventDetailsSummary = container.querySelector('[data-section-id="event-details"] .section-summary') as HTMLElement;
      const reputationSummary = container.querySelector('[data-section-id="reputation"] .section-summary') as HTMLElement;
      
      expect(eventDetailsSummary.textContent).toBe('Event Details - Test Scenario');
      expect(reputationSummary.textContent).toBe('Reputation - +2');
    });
  });

  describe('initializeCollapseSections', () => {
    it('should initialize sections with default collapse states', () => {
      initializeCollapseSections(container);
      
      const eventDetailsSection = container.querySelector('[data-section-id="event-details"]') as HTMLElement;
      const reputationSection = container.querySelector('[data-section-id="reputation"]') as HTMLElement;
      
      // Event details defaults to collapsed
      expect(eventDetailsSection.classList.contains('collapsed')).toBe(true);
      const eventDetailsHeader = eventDetailsSection.querySelector('.collapsible-header') as HTMLElement;
      expect(eventDetailsHeader.getAttribute('aria-expanded')).toBe('false');
      
      // Reputation defaults to collapsed
      expect(reputationSection.classList.contains('collapsed')).toBe(true);
      const reputationHeader = reputationSection.querySelector('.collapsible-header') as HTMLElement;
      expect(reputationHeader.getAttribute('aria-expanded')).toBe('false');
    });

    it('should initialize summary text for all sections', () => {
      initializeCollapseSections(container);
      
      const eventDetailsSummary = container.querySelector('[data-section-id="event-details"] .section-summary') as HTMLElement;
      const reputationSummary = container.querySelector('[data-section-id="reputation"] .section-summary') as HTMLElement;
      
      expect(eventDetailsSummary.textContent).toBe('Event Details - Test Scenario');
      expect(reputationSummary.textContent).toBe('Reputation - +2');
    });
  });
});

