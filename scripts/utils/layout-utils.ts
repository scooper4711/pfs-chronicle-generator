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
  if (params?.choices && Array.isArray(params.choices)) {
    return params.choices;
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
  if (params?.choices && Array.isArray(params.choices)) {
    return params.choices;
  }
  return [];
}

/**
 * Extracts fill-in blank fields from layout parameters.
 *
 * Looks for text parameters in the layout's parameters under the path:
 * parameters["Fill-ins"]. Each entry maps a field name to its parameter,
 * whose description becomes the input tooltip.
 *
 * @param layout - The layout object to extract fill-ins from
 * @returns Array of field name/description pairs, or empty array if none found
 */
export function findFillInFields(layout: Layout): { name: string; description: string }[] {
  const group = layout?.parameters?.['Fill-ins'];
  if (!group || typeof group !== 'object') {
    return [];
  }
  return Object.entries(group).map(([name, param]) => ({
    name,
    description: typeof param?.description === 'string' ? param.description : name,
  }));
}

/**
 * Renders fill-in blank text inputs after the adventure checkboxes.
 *
 * Each field becomes a label/input row restoring any previously saved
 * value. Missing containers are skipped silently.
 *
 * @param container - HTMLElement containing the form
 * @param fields - Fill-in field names and descriptions from the layout
 * @param savedValues - Previously saved values keyed by field name
 * @param onChangeCallback - Callback function to attach to input change events
 */
function renderFillInFields(
  container: HTMLElement,
  fields: { name: string; description: string }[],
  savedValues: Record<string, string>,
  onChangeCallback: (event?: Event) => void | Promise<void>
): void {
  const fillinContainer = container.querySelector('#adventure-summary-content .fillin-fields');
  if (!fillinContainer) {
    return;
  }
  fillinContainer.innerHTML = '';
  fields.forEach((field, index) => {
    const div = document.createElement('div');
    div.className = 'form-group fillin-field';

    const label = document.createElement('label');
    label.htmlFor = `fillin-${index}`;
    label.textContent = field.name;
    label.setAttribute('data-tooltip', field.description);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `fillin-${index}`;
    input.name = `shared.fillIns.${field.name}`;
    input.value = savedValues[field.name] || '';
    input.setAttribute('data-tooltip', field.description);

    div.appendChild(label);
    div.appendChild(input);
    fillinContainer.appendChild(div);
  });
  fillinContainer.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', onChangeCallback as EventListener);
  });
}

/**
 * Renders a checkbox/label choice list into a container.
 *
 * Missing containers are skipped silently. Previously saved choices
 * render checked.
 */
function renderChoiceList(
  listContainer: Element | null,
  choices: string[],
  savedChoices: string[],
  idPrefix: string,
  inputName: string,
  rowClass: string,
  onChangeCallback: (event?: Event) => void | Promise<void>
): void {
  if (!listContainer) {
    return;
  }
  listContainer.innerHTML = '';
  choices.forEach((choice, index) => {
    const div = document.createElement('div');
    div.className = rowClass;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${idPrefix}-${index}`;
    checkbox.name = inputName;
    checkbox.value = choice;
    checkbox.checked = savedChoices.includes(choice);

    const label = document.createElement('label');
    label.htmlFor = `${idPrefix}-${index}`;
    label.textContent = choice;

    div.appendChild(checkbox);
    div.appendChild(label);
    listContainer.appendChild(div);
  });
  listContainer.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', onChangeCallback as EventListener);
  });
}

/**
 * Updates layout-specific fields (checkboxes, strikeout items, and
 * fill-in blanks) in the DOM.
 *
 * This function:
 * 1. Loads the layout definition for the given layoutId
 * 2. Extracts checkbox, strikeout, and fill-in choices from the layout
 * 3. Loads saved data to determine which items are currently selected
 * 4. Dynamically generates checkbox/label pairs and fill-in rows
 * 5. Attaches change event listeners to the new elements
 *
 * This is used when the layout dropdown changes or when the form is initially rendered.
 *
 * @param container - HTMLElement containing the form
 * @param layoutId - The ID of the layout to load choices from
 * @param onChangeCallback - Callback function to attach to checkbox change events
 */
export async function updateLayoutSpecificFields(
  container: HTMLElement,
  layoutId: string,
  onChangeCallback: (event?: any) => void | Promise<void>
): Promise<void> {
  if (!layoutId) return;

  const layout = await layoutStore.getLayout(layoutId);

  // Load saved data to determine which items are selected
  const savedStorage = await loadPartyChronicleData();
  const savedCheckboxes = savedStorage?.data?.shared?.adventureSummaryCheckboxes || [];
  const savedStrikeouts = savedStorage?.data?.shared?.strikeoutItems || [];
  const savedFillIns = savedStorage?.data?.shared?.fillIns || {};

  // Update adventure summary checkboxes
  renderChoiceList(
    container.querySelector('#adventure-summary-content .checkbox-choices'),
    findCheckboxChoices(layout),
    savedCheckboxes,
    'checkbox',
    'shared.adventureSummaryCheckboxes',
    'checkbox-choice',
    onChangeCallback
  );

  // Update strikeout items
  renderChoiceList(
    container.querySelector('#items-to-strike-out-content .strikeout-choices'),
    findStrikeoutChoices(layout),
    savedStrikeouts,
    'strikeout',
    'shared.strikeoutItems',
    'item-choice',
    onChangeCallback
  );

  // Update fill-in blank fields after the checkboxes
  renderFillInFields(container, findFillInFields(layout), savedFillIns, onChangeCallback);
}
