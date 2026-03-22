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
} from '../../scripts/handlers/collapsible-section-handlers';

// Mock the storage module
jest.mock('../../scripts/model/collapse-state-storage', () => ({
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
jest.mock('../../scripts/utils/summary-utils', () => ({
  generateEventDetailsSummary: jest.fn(() => 'Session Reporting - Test Scenario'),
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
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        expect.stringContaining('Invalid section ID')
      );
      consoleSpy.mockRestore();
    });

    it('should handle missing section element gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      toggleSectionCollapse('adventure-summary', container);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        expect.stringContaining('Could not find section element')
      );
      consoleSpy.mockRestore();
    });

    it('should handle missing header element gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      // Create a section with valid ID but no header
      const sectionNoHeader = document.createElement('div');
      sectionNoHeader.className = 'collapsible-section';
      sectionNoHeader.setAttribute('data-section-id', 'shared-rewards');
      container.appendChild(sectionNoHeader);

      toggleSectionCollapse('shared-rewards', container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Could not find header element for section: "shared-rewards"'
      );
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

    it('should warn when parent section element is not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const orphanHeader = document.createElement('header');
      orphanHeader.className = 'collapsible-header';

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: orphanHeader, writable: false });

      handleSectionHeaderClick(event, container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Section header click: could not find parent section element'
      );
      consoleSpy.mockRestore();
    });

    it('should warn when section is missing data-section-id', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const sectionNoId = document.createElement('div');
      sectionNoId.className = 'collapsible-section';
      const headerNoId = document.createElement('header');
      headerNoId.className = 'collapsible-header';
      sectionNoId.appendChild(headerNoId);
      container.appendChild(sectionNoId);

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: headerNoId, writable: false });

      handleSectionHeaderClick(event, container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Section header click: section missing data-section-id attribute'
      );
      consoleSpy.mockRestore();
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

    it('should warn when parent section element is not found on keydown', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const orphanHeader = document.createElement('header');
      orphanHeader.className = 'collapsible-header';

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: orphanHeader, writable: false });

      handleSectionHeaderKeydown(event, container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Section header keydown: could not find parent section element'
      );
      consoleSpy.mockRestore();
    });

    it('should warn when section is missing data-section-id on keydown', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const sectionNoId = document.createElement('div');
      sectionNoId.className = 'collapsible-section';
      const headerNoId = document.createElement('header');
      headerNoId.className = 'collapsible-header';
      sectionNoId.appendChild(headerNoId);
      container.appendChild(sectionNoId);

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      Object.defineProperty(event, 'currentTarget', { value: headerNoId, writable: false });

      handleSectionHeaderKeydown(event, container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Section header keydown: section missing data-section-id attribute'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('updateSectionSummary', () => {
    it('should update summary text for event-details section', () => {
      const section = container.querySelector('[data-section-id="event-details"]') as HTMLElement;
      const summaryElement = section.querySelector('.section-summary') as HTMLElement;
      
      updateSectionSummary('event-details', container);
      
      expect(summaryElement.textContent).toBe('Session Reporting - Test Scenario');
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

    it('should warn when section element is not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // 'shared-rewards' has summary but no DOM element in our container
      updateSectionSummary('shared-rewards', container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Could not find section element for ID: "shared-rewards"'
      );
      consoleSpy.mockRestore();
    });

    it('should warn when summary element is not found in section', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a shared-rewards section without a summary element
      const section = document.createElement('div');
      section.className = 'collapsible-section';
      section.setAttribute('data-section-id', 'shared-rewards');
      container.appendChild(section);

      updateSectionSummary('shared-rewards', container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Could not find summary element for section: "shared-rewards"'
      );
      consoleSpy.mockRestore();
    });

    it('should warn when summary generator throws an error', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Override the mock to throw
      const summaryUtils = require('../../scripts/utils/summary-utils');
      summaryUtils.generateEventDetailsSummary.mockImplementationOnce(() => {
        throw new Error('test error');
      });

      updateSectionSummary('event-details', container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Failed to generate summary for section "event-details":',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('updateAllSectionSummaries', () => {
    it('should update all section summaries', () => {
      updateAllSectionSummaries(container);
      
      const eventDetailsSummary = container.querySelector('[data-section-id="event-details"] .section-summary') as HTMLElement;
      const reputationSummary = container.querySelector('[data-section-id="reputation"] .section-summary') as HTMLElement;
      
      expect(eventDetailsSummary.textContent).toBe('Session Reporting - Test Scenario');
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
      
      expect(eventDetailsSummary.textContent).toBe('Session Reporting - Test Scenario');
      expect(reputationSummary.textContent).toBe('Reputation - +2');
    });

    it('should warn and skip when section element is not found in loop', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Use an empty container — no sections exist
      const emptyContainer = document.createElement('div');
      initializeCollapseSections(emptyContainer);

      // Should warn for each VALID_SECTION_ID that's missing
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Could not find section element for ID: "event-details"'
      );
      consoleSpy.mockRestore();
    });

    it('should warn and skip when header is missing in a section', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a section without a header
      const sectionNoHeader = document.createElement('div');
      sectionNoHeader.className = 'collapsible-section';
      sectionNoHeader.setAttribute('data-section-id', 'adventure-summary');
      container.appendChild(sectionNoHeader);

      initializeCollapseSections(container);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Missing header for section: "adventure-summary"'
      );
      consoleSpy.mockRestore();
    });

    it('should apply expanded state for sections that default to not collapsed', () => {
      // adventure-summary defaults to false (not collapsed)
      const section = document.createElement('div');
      section.className = 'collapsible-section collapsed'; // start collapsed
      section.setAttribute('data-section-id', 'adventure-summary');
      const header = document.createElement('header');
      header.className = 'collapsible-header';
      header.setAttribute('aria-expanded', 'false');
      section.appendChild(header);
      container.appendChild(section);

      initializeCollapseSections(container);

      // adventure-summary defaults to NOT collapsed, so collapsed class should be removed
      expect(section.classList.contains('collapsed')).toBe(false);
      expect(header.getAttribute('aria-expanded')).toBe('true');
    });
  });
});

