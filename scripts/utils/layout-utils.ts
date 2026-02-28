/**
 * Layout Utilities
 * 
 * This module provides utility functions for working with layout-specific fields
 * in the PFS Chronicle Generator. These functions extract and process checkbox
 * and strikeout choices from layout definitions, and handle the dynamic updating
 * of layout-specific form fields.
 * 
 * These utilities are shared between main.ts (manual rendering) and 
 * PartyChronicleApp.ts (ApplicationV2 context preparation).
 */

import { Layout } from '../model/layout.js';
import { layoutStore } from '../LayoutStore.js';
import { loadPartyChronicleData } from '../model/party-chronicle-storage.js';

/**
 * Extracts checkbox choices from layout parameters.
 * 
 * Looks for checkbox choices in the layout's parameters under the path:
 * parameters.Checkboxes.summary_checkbox.choices
 * 
 * @param layout - The layout object to extract choices from
 * @returns Array of checkbox choice strings, or empty array if none found
 */
export function findCheckboxChoices(layout: Layout): string[] {
  const params = layout?.parameters?.Checkboxes?.summary_checkbox;
  if (params && params.choices && Array.isArray(params.choices)) {
    return params.choices as string[];
  }
  return [];
}

/**
 * Extracts strikeout item choices from layout parameters.
 * 
 * Looks for strikeout choices in the layout's parameters under the path:
 * parameters.Items.strikeout_item_lines.choices
 * 
 * @param layout - The layout object to extract choices from
 * @returns Array of strikeout item strings, or empty array if none found
 */
export function findStrikeoutChoices(layout: Layout): string[] {
  const params = layout?.parameters?.Items?.strikeout_item_lines;
  if (params && params.choices && Array.isArray(params.choices)) {
    return params.choices as string[];
  }
  return [];
}

/**
 * Updates layout-specific fields (checkboxes and strikeout items) in the DOM.
 * 
 * This function:
 * 1. Loads the layout definition for the given layoutId
 * 2. Extracts checkbox and strikeout choices from the layout
 * 3. Loads saved data to determine which items are currently selected
 * 4. Dynamically generates checkbox/label pairs for each choice
 * 5. Attaches change event listeners to the new elements
 * 
 * This is used when the layout dropdown changes or when the form is initially rendered.
 * 
 * @param container - jQuery object or HTMLElement containing the form
 * @param layoutId - The ID of the layout to load choices from
 * @param onChangeCallback - Callback function to attach to checkbox change events
 */
export async function updateLayoutSpecificFields(
  container: JQuery | HTMLElement,
  layoutId: string,
  onChangeCallback: (event?: any) => void | Promise<void>
): Promise<void> {
  if (!layoutId) return;

  const layout = await layoutStore.getLayout(layoutId);

  // Get checkbox and strikeout choices from layout
  const checkboxChoices = findCheckboxChoices(layout);
  const strikeoutChoices = findStrikeoutChoices(layout);

  // Load saved data to determine which items are selected
  const savedStorage = await loadPartyChronicleData();
  const savedCheckboxes = savedStorage?.data?.shared?.adventureSummaryCheckboxes || [];
  const savedStrikeouts = savedStorage?.data?.shared?.strikeoutItems || [];

  // Determine if we're working with jQuery or native DOM
  const isJQuery = container && typeof (container as any).jquery !== 'undefined';

  if (isJQuery) {
    // jQuery implementation (used in main.ts)
    const $container = container as JQuery;

    // Update adventure summary checkboxes
    const checkboxContainer = $container.find('#adventureSummaryCheckboxes .checkbox-choices');
    checkboxContainer.empty();
    checkboxChoices.forEach((choice: string, index: number) => {
      const div = $('<div class="checkbox-choice"></div>');
      const checkbox = $(`<input type="checkbox" id="checkbox-${index}" name="shared.adventureSummaryCheckboxes" value="${choice}" ${savedCheckboxes.includes(choice) ? 'checked' : ''}>`);
      const label = $(`<label for="checkbox-${index}">${choice}</label>`);
      div.append(checkbox).append(label);
      checkboxContainer.append(div);
    });

    // Update strikeout items
    const strikeoutContainer = $container.find('#strikeoutItems .strikeout-choices');
    strikeoutContainer.empty();
    strikeoutChoices.forEach((choice: string, index: number) => {
      const div = $('<div class="item-choice"></div>');
      const checkbox = $(`<input type="checkbox" id="strikeout-${index}" name="shared.strikeoutItems" value="${choice}" ${savedStrikeouts.includes(choice) ? 'checked' : ''}>`);
      const label = $(`<label for="strikeout-${index}">${choice}</label>`);
      div.append(checkbox).append(label);
      strikeoutContainer.append(div);
    });

    // Re-attach change listeners to new checkboxes
    $container.find('#adventureSummaryCheckboxes input, #strikeoutItems input').on('change', onChangeCallback);
  } else {
    // Native DOM implementation (used in PartyChronicleApp.ts)
    const element = container as HTMLElement;

    // Update adventure summary checkboxes
    const checkboxContainer = element.querySelector('#adventureSummaryCheckboxes .checkbox-choices');
    if (checkboxContainer) {
      checkboxContainer.innerHTML = '';
      checkboxChoices.forEach((choice, index) => {
        const div = document.createElement('div');
        div.className = 'checkbox-choice';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `checkbox-${index}`;
        checkbox.name = 'shared.adventureSummaryCheckboxes';
        checkbox.value = choice;
        checkbox.checked = savedCheckboxes.includes(choice);

        const label = document.createElement('label');
        label.htmlFor = `checkbox-${index}`;
        label.textContent = choice;

        div.appendChild(checkbox);
        div.appendChild(label);
        checkboxContainer.appendChild(div);
      });
    }

    // Update strikeout items
    const strikeoutContainer = element.querySelector('#strikeoutItems .strikeout-choices');
    if (strikeoutContainer) {
      strikeoutContainer.innerHTML = '';
      strikeoutChoices.forEach((choice, index) => {
        const div = document.createElement('div');
        div.className = 'item-choice';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `strikeout-${index}`;
        checkbox.name = 'shared.strikeoutItems';
        checkbox.value = choice;
        checkbox.checked = savedStrikeouts.includes(choice);

        const label = document.createElement('label');
        label.htmlFor = `strikeout-${index}`;
        label.textContent = choice;

        div.appendChild(checkbox);
        div.appendChild(label);
        strikeoutContainer.appendChild(div);
      });
    }

    // Re-attach change listeners to new checkboxes
    const checkboxes = element.querySelectorAll('#adventureSummaryCheckboxes input, #strikeoutItems input');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', onChangeCallback as EventListener);
    });
  }
}
