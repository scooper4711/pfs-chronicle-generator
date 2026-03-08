/**
 * Property-based tests for collapsible section handlers
 * 
 * These tests validate correctness properties across all valid inputs
 * using fast-check for property-based testing.
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { updateSectionSummary } from './collapsible-section-handlers';
import {
  generateEventDetailsSummary,
  generateReputationSummary,
  generateSharedRewardsSummary
} from '../utils/summary-utils';

describe('collapsible-section-handlers property tests', () => {
  describe('updateSectionSummary', () => {
    // Feature: collapsible-shared-sections, Property 14: Summary updates regardless of collapse state
    it('should update Event Details summary regardless of collapse state', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Random collapse state
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // Random layout/scenario name
          (isCollapsed, layoutName) => {
            // Create container with Event Details section
            const container = document.createElement('div');
            container.innerHTML = `
              <div class="collapsible-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="event-details">
                <header class="collapsible-header" role="button" tabindex="0" aria-expanded="${!isCollapsed}">
                  <span class="chevron"></span>
                  <span class="section-title">Event Details</span>
                  <span class="section-summary"></span>
                </header>
                <div class="collapsible-content" id="event-details-content">
                  <select id="layout">
                    <option value="1" selected>${layoutName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>
                  </select>
                </div>
              </div>
            `;
            
            // Update summary
            updateSectionSummary('event-details', container);
            
            // Get the summary element
            const summaryElement = container.querySelector('.section-summary') as HTMLElement;
            
            // Generate expected summary using the same function
            const expectedSummary = generateEventDetailsSummary(container);
            
            // Create a temporary element to extract text content from expected HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = expectedSummary;
            const expectedText = tempDiv.textContent || '';
            
            // Verify summary was updated regardless of collapse state (compare text content to avoid HTML escaping issues)
            expect(summaryElement.textContent).toBe(expectedText);
            expect(summaryElement.textContent).toContain('Event Details');
            
            // Verify collapse state was not changed
            const section = container.querySelector('.collapsible-section') as HTMLElement;
            expect(section.classList.contains('collapsed')).toBe(isCollapsed);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update Reputation summary regardless of collapse state', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Random collapse state
          fc.integer({ min: 1, max: 10 }), // Random chosen faction reputation
          fc.record({
            EA: fc.integer({ min: -2, max: 2 }),
            GA: fc.integer({ min: -2, max: 2 }),
            HH: fc.integer({ min: -2, max: 2 }),
            VS: fc.integer({ min: -2, max: 2 }),
            RO: fc.integer({ min: -2, max: 2 }),
            VW: fc.integer({ min: -2, max: 2 })
          }), // Random faction reputation values
          (isCollapsed, chosenValue, factionValues) => {
            // Create container with Reputation section
            const container = document.createElement('div');
            container.innerHTML = `
              <div class="collapsible-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="reputation">
                <header class="collapsible-header" role="button" tabindex="0" aria-expanded="${!isCollapsed}">
                  <span class="chevron"></span>
                  <span class="section-title">Reputation</span>
                  <span class="section-summary"></span>
                </header>
                <div class="collapsible-content" id="reputation-content">
                  <input type="number" id="chosenFactionReputation" value="${chosenValue}" />
                  <input type="number" id="reputation-EA" value="${factionValues.EA}" />
                  <input type="number" id="reputation-GA" value="${factionValues.GA}" />
                  <input type="number" id="reputation-HH" value="${factionValues.HH}" />
                  <input type="number" id="reputation-VS" value="${factionValues.VS}" />
                  <input type="number" id="reputation-RO" value="${factionValues.RO}" />
                  <input type="number" id="reputation-VW" value="${factionValues.VW}" />
                </div>
              </div>
            `;
            
            // Update summary
            updateSectionSummary('reputation', container);
            
            // Get the summary element
            const summaryElement = container.querySelector('.section-summary') as HTMLElement;
            
            // Generate expected summary using the same function
            const expectedSummary = generateReputationSummary(container);
            
            // Create a temporary element to extract text content from expected HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = expectedSummary;
            const expectedText = tempDiv.textContent || '';
            
            // Verify summary was updated regardless of collapse state (compare text content to avoid HTML escaping issues)
            expect(summaryElement.textContent).toBe(expectedText);
            expect(summaryElement.textContent).toContain('Reputation');
            expect(summaryElement.textContent).toContain(`+${chosenValue}`);
            
            // Verify collapse state was not changed
            const section = container.querySelector('.collapsible-section') as HTMLElement;
            expect(section.classList.contains('collapsed')).toBe(isCollapsed);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update Shared Rewards summary regardless of collapse state', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Random collapse state
          fc.integer({ min: 0, max: 100 }), // Random XP value
          fc.integer({ min: 0, max: 100 }), // Random treasure bundles value
          (isCollapsed, xpValue, tbValue) => {
            // Create container with Shared Rewards section
            const container = document.createElement('div');
            container.innerHTML = `
              <div class="collapsible-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="shared-rewards">
                <header class="collapsible-header" role="button" tabindex="0" aria-expanded="${!isCollapsed}">
                  <span class="chevron"></span>
                  <span class="section-title">Shared Rewards</span>
                  <span class="section-summary"></span>
                </header>
                <div class="collapsible-content" id="shared-rewards-content">
                  <input type="number" id="xpEarned" value="${xpValue}" />
                  <input type="number" id="treasureBundles" value="${tbValue}" />
                </div>
              </div>
            `;
            
            // Update summary
            updateSectionSummary('shared-rewards', container);
            
            // Get the summary element
            const summaryElement = container.querySelector('.section-summary') as HTMLElement;
            
            // Generate expected summary using the same function
            const expectedSummary = generateSharedRewardsSummary(container);
            
            // Create a temporary element to extract text content from expected HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = expectedSummary;
            const expectedText = tempDiv.textContent || '';
            
            // Verify summary was updated regardless of collapse state (compare text content to avoid HTML escaping issues)
            expect(summaryElement.textContent).toBe(expectedText);
            expect(summaryElement.textContent).toContain('Shared Rewards');
            expect(summaryElement.textContent).toContain(`${xpValue} XP`);
            expect(summaryElement.textContent).toContain(`${tbValue} TB`);
            
            // Verify collapse state was not changed
            const section = container.querySelector('.collapsible-section') as HTMLElement;
            expect(section.classList.contains('collapsed')).toBe(isCollapsed);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update all sections with summary text regardless of their individual collapse states', () => {
      fc.assert(
        fc.property(
          fc.record({
            eventDetails: fc.boolean(),
            reputation: fc.boolean(),
            sharedRewards: fc.boolean()
          }), // Random collapse states for each section
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), // Random layout/scenario name
          fc.integer({ min: 1, max: 10 }), // Random chosen faction reputation
          fc.integer({ min: 0, max: 50 }), // Random XP value
          fc.integer({ min: 0, max: 50 }), // Random treasure bundles value
          (collapseStates, layoutName, chosenValue, xpValue, tbValue) => {
            // Create container with all three sections
            const container = document.createElement('div');
            container.innerHTML = `
              <div class="collapsible-section ${collapseStates.eventDetails ? 'collapsed' : ''}" data-section-id="event-details">
                <header class="collapsible-header" role="button" tabindex="0" aria-expanded="${!collapseStates.eventDetails}">
                  <span class="chevron"></span>
                  <span class="section-title">Event Details</span>
                  <span class="section-summary"></span>
                </header>
                <div class="collapsible-content" id="event-details-content">
                  <select id="layout">
                    <option value="1" selected>${layoutName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>
                  </select>
                </div>
              </div>
              <div class="collapsible-section ${collapseStates.reputation ? 'collapsed' : ''}" data-section-id="reputation">
                <header class="collapsible-header" role="button" tabindex="0" aria-expanded="${!collapseStates.reputation}">
                  <span class="chevron"></span>
                  <span class="section-title">Reputation</span>
                  <span class="section-summary"></span>
                </header>
                <div class="collapsible-content" id="reputation-content">
                  <input type="number" id="chosenFactionReputation" value="${chosenValue}" />
                  <input type="number" id="reputation-EA" value="0" />
                  <input type="number" id="reputation-GA" value="0" />
                  <input type="number" id="reputation-HH" value="0" />
                  <input type="number" id="reputation-VS" value="0" />
                  <input type="number" id="reputation-RO" value="0" />
                  <input type="number" id="reputation-VW" value="0" />
                </div>
              </div>
              <div class="collapsible-section ${collapseStates.sharedRewards ? 'collapsed' : ''}" data-section-id="shared-rewards">
                <header class="collapsible-header" role="button" tabindex="0" aria-expanded="${!collapseStates.sharedRewards}">
                  <span class="chevron"></span>
                  <span class="section-title">Shared Rewards</span>
                  <span class="section-summary"></span>
                </header>
                <div class="collapsible-content" id="shared-rewards-content">
                  <input type="number" id="xpEarned" value="${xpValue}" />
                  <input type="number" id="treasureBundles" value="${tbValue}" />
                </div>
              </div>
            `;
            
            // Update each section's summary
            updateSectionSummary('event-details', container);
            updateSectionSummary('reputation', container);
            updateSectionSummary('shared-rewards', container);
            
            // Verify all summaries were updated (using innerHTML since summaries contain icon HTML)
            const eventDetailsSummary = container.querySelector('[data-section-id="event-details"] .section-summary') as HTMLElement;
            const reputationSummary = container.querySelector('[data-section-id="reputation"] .section-summary') as HTMLElement;
            const sharedRewardsSummary = container.querySelector('[data-section-id="shared-rewards"] .section-summary') as HTMLElement;
            
            // Use textContent for .toContain() checks (strips HTML)
            expect(eventDetailsSummary.textContent).toContain('Event Details');
            expect(reputationSummary.textContent).toContain('Reputation');
            expect(reputationSummary.textContent).toContain(`+${chosenValue}`);
            expect(sharedRewardsSummary.textContent).toContain('Shared Rewards');
            expect(sharedRewardsSummary.textContent).toContain(`${xpValue} XP`);
            expect(sharedRewardsSummary.textContent).toContain(`${tbValue} TB`);
            
            // Verify collapse states were not changed
            const eventDetailsSection = container.querySelector('[data-section-id="event-details"]') as HTMLElement;
            const reputationSection = container.querySelector('[data-section-id="reputation"]') as HTMLElement;
            const sharedRewardsSection = container.querySelector('[data-section-id="shared-rewards"]') as HTMLElement;
            
            expect(eventDetailsSection.classList.contains('collapsed')).toBe(collapseStates.eventDetails);
            expect(reputationSection.classList.contains('collapsed')).toBe(collapseStates.reputation);
            expect(sharedRewardsSection.classList.contains('collapsed')).toBe(collapseStates.sharedRewards);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
