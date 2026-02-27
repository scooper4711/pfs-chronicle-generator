/**
 * PartyChronicleApp - Application for filling out chronicle sheets for all party members
 * 
 * This ApplicationV2-based form allows GMs to enter chronicle information once for
 * all party members, with both shared fields (applied to all) and unique fields
 * (per character). It integrates with the existing PdfGenerator infrastructure.
 * 
 * Requirements: 1.2, 1.3, 1.4, 8.2
 */

import { layoutStore } from './LayoutStore.js';
import { loadPartyChronicleData, savePartyChronicleData, clearPartyChronicleData } from './model/party-chronicle-storage.js';
import { 
  PartyChronicleContext, 
  PartyMember,
  SharedFields,
  PartyChronicleData,
  GenerationResult
} from './model/party-chronicle-types.js';
import { Layout } from './model/layout.js';
import { mapToCharacterData } from './model/party-chronicle-mapper.js';
import { validateSharedFields, validateUniqueFields } from './model/party-chronicle-validator.js';
import { PdfGenerator } from './PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import FormDataExtended = foundry.applications.ux.FormDataExtended;

export class PartyChronicleApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Array of party member actors */
  partyActors: any[];

  /**
   * Constructs a new PartyChronicleApp instance
   * 
   * @param partyActors - Array of actor objects representing party members
   * @param options - Additional application options
   */
  constructor(partyActors: any[], options: any = {}) {
    super(options);
    this.partyActors = partyActors;
  }

  /**
   * Default application options
   * Defines the application's ID, form behavior, position, and window settings
   */
  static DEFAULT_OPTIONS = {
    id: "pfs-party-chronicle",
    form: {
      handler: PartyChronicleApp.#generateChronicles,
      closeOnSubmit: false,
    },
    position: {
      width: 800,
      height: "auto" as const,
    },
    tag: "form",
    window: {
      title: "Party Chronicle Filling",
      icon: "fas fa-users",
      contentClasses: ["standard-form", "pfs-party-chronicle"],
    }
  };

  /**
   * Template parts for the application
   * Defines the main content and footer templates
   */
  static PARTS = {
    main: {
      template: "modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /**
   * Prepares context data for the Handlebars template
   * 
   * This method:
   * - Extracts party member data (id, name, level, societyId)
   * - Loads saved party chronicle data from world flags
   * - Prepares season and layout dropdown data
   * - Returns PartyChronicleContext object
   * 
   * @returns Promise resolving to context object for template rendering
   * 
   * Requirements: 1.3, 1.4, 8.2
   */
  async _prepareContext(options?: any): Promise<object> {
    // Extract party member data - filter to only include character actors
    // Exclude: null actors, familiars, and NPCs
    const partyMembers: PartyMember[] = this.partyActors
      .filter(actor => actor && actor.type === 'character')
      .map(actor => ({
        id: actor.id,
        name: actor.name,
        img: actor.img,
        level: actor.system?.details?.level?.value ?? 1,
        societyId: actor.system?.pfs?.playerNumber && actor.system?.pfs?.characterNumber
          ? `${actor.system.pfs.playerNumber}-${actor.system.pfs.characterNumber}`
          : ''
      }));

    // Load saved party chronicle data from world flags
    const savedStorage = await loadPartyChronicleData();
    const savedData = savedStorage?.data ?? null;

    // Get GM PFS number and event details from settings
    const gmPfsNumber = game.settings.get('pfs-chronicle-generator', 'gmPfsNumber') as string || '';
    const eventName = game.settings.get('pfs-chronicle-generator', 'eventName') as string || '';
    const eventCode = game.settings.get('pfs-chronicle-generator', 'eventcode') as string || '';
    const eventDate = game.settings.get('pfs-chronicle-generator', 'eventDate') as string || new Date().toISOString().slice(0, 10);
    const blankChroniclePath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath') as string || '';

    // Prepare season and layout dropdown data
    const seasons = layoutStore.getSeasons();
    const settingSeasonId = game.settings.get('pfs-chronicle-generator', 'season') as string;
    const currentLayoutId = game.settings.get('pfs-chronicle-generator', 'layout') as string;

    let selectedSeasonId = savedData?.shared?.seasonId || settingSeasonId || (seasons.length > 0 ? seasons[0].id : '');
    let selectedLayoutId = savedData?.shared?.layoutId || currentLayoutId || '';

    // If a layout is set but doesn't belong to the selected season, adjust season accordingly
    if (selectedLayoutId) {
      const seasonWithLayout = seasons.find(season =>
        layoutStore.getLayoutsByParent(season.id).some(layout => layout.id === selectedLayoutId)
      );
      if (seasonWithLayout) selectedSeasonId = seasonWithLayout.id;
    }

    // Get layouts for the selected season
    const layoutsInSeason = layoutStore.getLayoutsByParent(selectedSeasonId);

    // If current layout isn't in the season, select first layout in season
    const effectiveLayoutId = layoutsInSeason.some(l => l.id === selectedLayoutId)
      ? selectedLayoutId
      : (layoutsInSeason.length > 0 ? layoutsInSeason[0].id : '');

    // Prepare shared fields context (use saved data if available, otherwise defaults)
    const shared: Partial<SharedFields> = {
      gmPfsNumber: savedData?.shared?.gmPfsNumber || gmPfsNumber,
      scenarioName: savedData?.shared?.scenarioName || eventName,
      eventCode: savedData?.shared?.eventCode || eventCode,
      eventDate: savedData?.shared?.eventDate || eventDate,
      xpEarned: savedData?.shared?.xpEarned ?? 4,
      adventureSummaryCheckboxes: savedData?.shared?.adventureSummaryCheckboxes || [],
      strikeoutItems: savedData?.shared?.strikeoutItems || [],
      treasureBundles: savedData?.shared?.treasureBundles ?? 0,
      layoutId: effectiveLayoutId,
      seasonId: selectedSeasonId,
      blankChroniclePath: savedData?.shared?.blankChroniclePath || blankChroniclePath,
      chosenFactionReputation: savedData?.shared?.chosenFactionReputation ?? 2,
      reputationValues: savedData?.shared?.reputationValues ?? {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      },
    };

    // Return PartyChronicleContext object
    return {
      partyMembers,
      shared,
      seasons,
      layoutsInSeason,
      selectedSeasonId,
      selectedLayoutId: effectiveLayoutId,
      savedData,
      buttons: [
        { type: "submit", icon: "fa-solid fa-file-pdf", label: "Generate Chronicles" }
      ]
    };
  }

  /**
   * Handles rendering lifecycle
   * Attaches event listeners for form interactions
   * 
   * @param context - The prepared context data
   * @param options - Render options
   * 
   * Requirements: 2.2, 2.5, 6.4, 8.1
   */
  async _onRender(context: any, options: any): Promise<void> {
    const html = $(this.element);

    // Attach event listeners for season dropdown changes
    html.find('#season').on('change', this._onSeasonChanged.bind(this));

    // Attach event listeners for layout dropdown changes
    html.find('#layout').on('change', this._onLayoutChanged.bind(this));

    // Attach event listeners for shared field changes
    html.find('input[name^="shared."], select[name^="shared."], textarea[name^="shared."]').on('change', this._onSharedFieldChanged.bind(this));

    // Attach event listeners for unique field changes
    html.find('input[name^="characters."], select[name^="characters."], textarea[name^="characters."]').on('change', this._onUniqueFieldChanged.bind(this));

    // Attach event listeners for action buttons
    html.find('#saveData').on('click', this._onSaveData.bind(this));
    html.find('#clearData').on('click', this._onClearData.bind(this));

    // Attach event listeners for portrait clicks (modern DOM API)
    // Get the actual DOM element from jQuery wrapper
    const element = html[0] as HTMLElement;
    const portraits = element.querySelectorAll('.actor-image img.actor-link');
    console.log('[PFS Chronicle] Found portrait images:', portraits.length);
    portraits.forEach((img, index) => {
      console.log(`[PFS Chronicle] Attaching click listener to portrait ${index}`);
      img.addEventListener('click', this._onPortraitClick.bind(this));
    });

    // Initial population of layout-specific fields
    await this._updateLayoutSpecificFields();

    // Update button states based on validation
    this._updateButtonStates();
  }
  /**
   * Handles portrait click events
   * Opens the corresponding actor sheet when a portrait is clicked
   *
   * @param event - The click event
   *
   * Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3
   */
  private _onPortraitClick(event: Event): void {
    console.log('[PFS Chronicle] Portrait clicked!', event.target);
    
    // Prevent default link behavior
    event.preventDefault();

    // Extract character ID from the closest .member-activity element's data-character-id attribute
    const memberActivity = (event.target as HTMLElement).closest('.member-activity');
    console.log('[PFS Chronicle] Member activity element:', memberActivity);
    
    const characterId = memberActivity?.getAttribute('data-character-id');
    console.log('[PFS Chronicle] Character ID:', characterId);

    if (!characterId) {
      console.warn('[PFS Chronicle] Portrait clicked but no character ID found');
      return;
    }

    // Find the corresponding actor in this.partyActors array
    const actor = this.partyActors.find(a => a?.id === characterId);
    console.log('[PFS Chronicle] Found actor:', actor);

    // If actor exists and has a sheet, call actor.sheet.render(true, { focus: true })
    // Use optional chaining to handle missing actor data gracefully
    if (actor?.sheet) {
      console.log('[PFS Chronicle] Opening actor sheet');
      actor.sheet.render(true, { focus: true });
    } else {
      console.warn('[PFS Chronicle] Actor or actor sheet not found');
    }
  }

  /**
   * Handles season dropdown changes
   * Updates layout dropdown to show only layouts in the selected season
   * 
   * @param event - The change event
   * 
   * Requirements: 2.5
   */
  private async _onSeasonChanged(event: any): Promise<void> {
    const seasonId = event.target.value;
    const layouts = layoutStore.getLayoutsByParent(seasonId);

    const layoutDropdown = this.element.querySelector('#layout') as HTMLSelectElement;
    if (layoutDropdown) {
      layoutDropdown.innerHTML = '';
      for (const layout of layouts) {
        const option = document.createElement('option');
        option.value = layout.id;
        option.innerText = layout.description;
        layoutDropdown.appendChild(option);
      }

      if (layouts.length > 0) {
        // Trigger layout changed event with first layout
        layoutDropdown.value = layouts[0].id;
        await this._onLayoutChanged({ target: layoutDropdown });
      }
    }

    // Auto-save after season change
    await this._autoSave();
  }

  /**
   * Handles layout dropdown changes
   * Updates layout-specific fields (checkboxes, strikeout items)
   * 
   * @param event - The change event
   * 
   * Requirements: 2.5
   */
  private async _onLayoutChanged(event: any): Promise<void> {
    const layoutId = event.target.value;
    
    // Update blank chronicle path if defaultChronicleLocation exists
    const layout = await layoutStore.getLayout(layoutId);
    if (layout?.defaultChronicleLocation) {
      try {
        const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
        if (response.ok) {
          const pathInput = this.element.querySelector('#blankChroniclePath') as HTMLInputElement;
          if (pathInput) {
            pathInput.value = layout.defaultChronicleLocation;
          }
        }
      } catch (error) {
        console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
      }
    }

    // Update layout-specific fields
    await this._updateLayoutSpecificFields();

    // Auto-save after layout change
    await this._autoSave();
  }

  /**
   * Updates layout-specific fields (checkboxes and strikeout items)
   * based on the currently selected layout
   * 
   * Requirements: 2.5
   */
  private async _updateLayoutSpecificFields(): Promise<void> {
    const layoutDropdown = this.element.querySelector('#layout') as HTMLSelectElement;
    if (!layoutDropdown) return;

    const layoutId = layoutDropdown.value;
    if (!layoutId) return;

    const layout = await layoutStore.getLayout(layoutId);
    
    // Get checkbox and strikeout choices from layout
    const checkboxChoices = this._findCheckboxChoices(layout);
    const strikeoutChoices = this._findStrikeoutChoices(layout);

    // Load saved data to determine which items are selected
    const savedStorage = await loadPartyChronicleData();
    const savedCheckboxes = savedStorage?.data?.shared?.adventureSummaryCheckboxes || [];
    const savedStrikeouts = savedStorage?.data?.shared?.strikeoutItems || [];

    // Update adventure summary checkboxes
    const checkboxContainer = this.element.querySelector('#adventureSummaryCheckboxes .checkbox-choices');
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
    const strikeoutContainer = this.element.querySelector('#strikeoutItems .strikeout-choices');
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
    const html = $(this.element);
    html.find('#adventureSummaryCheckboxes input, #strikeoutItems input').on('change', this._onSharedFieldChanged.bind(this));
  }

  /**
   * Extracts checkbox choices from layout parameters
   * 
   * @param layout - The layout object
   * @returns Array of checkbox choice strings
   */
  private _findCheckboxChoices(layout: Layout): string[] {
    const params = layout.parameters?.Checkboxes?.summary_checkbox;
    if (params && params.choices && Array.isArray(params.choices)) {
      return params.choices as string[];
    }
    return [];
  }

  /**
   * Extracts strikeout item choices from layout parameters
   * 
   * @param layout - The layout object
   * @returns Array of strikeout item strings
   */
  private _findStrikeoutChoices(layout: Layout): string[] {
    const params = layout.parameters?.Items?.strikeout_item_lines;
    if (params && params.choices && Array.isArray(params.choices)) {
      return params.choices as string[];
    }
    return [];
  }

  /**
   * Handles shared field changes
   * When a shared field changes, updates all character chronicle data and auto-saves
   * 
   * @param event - The change event
   * 
   * Requirements: 2.2, 8.1
   */
  private async _onSharedFieldChanged(event: any): Promise<void> {
    console.log('[PFS Chronicle] Shared field changed:', event.target.name);
    
    // Auto-save the updated data
    await this._autoSave();
    
    // Update button states based on validation
    this._updateButtonStates();
  }

  /**
   * Handles unique field changes
   * When a unique field changes, updates only that character's data and auto-saves
   * 
   * @param event - The change event
   * 
   * Requirements: 3.2, 8.1
   */
  /**
   * Handles unique field changes for individual characters
   * When a unique field changes, updates only that character's data and auto-saves
   * 
   * The form structure ensures isolation: each character's fields are namespaced
   * with characters.{actorId}.{fieldName}, so extracting form data naturally
   * maintains per-character isolation.
   * 
   * @param event - The change event from the unique field input
   * 
   * Requirements: 3.2, 8.1
   */
  private async _onUniqueFieldChanged(event: any): Promise<void> {
    console.log('[PFS Chronicle] Unique field changed:', event.target.name);
    
    // Auto-save the updated data
    // The _extractFormData() method correctly isolates each character's data by actor ID
    await this._autoSave();
    
    // Update button states based on validation
    this._updateButtonStates();
  }

  /**
   * Auto-saves form data to world flags
   * 
   * Requirements: 8.1
   */
  private async _autoSave(): Promise<void> {
    try {
      const formData = this._extractFormData();
      await savePartyChronicleData(formData);
      console.log('[PFS Chronicle] Auto-saved party chronicle data');
    } catch (error) {
      console.error('[PFS Chronicle] Auto-save failed:', error);
      ui.notifications?.warn('Failed to auto-save chronicle data');
    }
  }

  /**
   * Extracts form data into PartyChronicleData structure
   * 
   * @returns The extracted party chronicle data
   */
  private _extractFormData(): PartyChronicleData {
    const form = this.element as HTMLFormElement;
    const formData = new FormData(form);
    
    // Extract shared fields
    const shared: any = {
      gmPfsNumber: formData.get('shared.gmPfsNumber') as string || '',
      scenarioName: formData.get('shared.scenarioName') as string || '',
      eventCode: formData.get('shared.eventCode') as string || '',
      eventDate: formData.get('shared.eventDate') as string || '',
      xpEarned: parseInt(formData.get('shared.xpEarned') as string) || 0,
      treasureBundles: parseInt(formData.get('shared.treasureBundles') as string) || 0,
      layoutId: formData.get('shared.layoutId') as string || '',
      seasonId: formData.get('shared.seasonId') as string || '',
      blankChroniclePath: formData.get('shared.blankChroniclePath') as string || '',
      adventureSummaryCheckboxes: formData.getAll('shared.adventureSummaryCheckboxes') as string[],
      strikeoutItems: formData.getAll('shared.strikeoutItems') as string[],
    };

    // Extract character-specific fields
    const characters: any = {};
    this.partyActors.forEach(actor => {
      const actorId = actor.id;
      characters[actorId] = {
        characterName: formData.get(`characters.${actorId}.characterName`) as string || actor.name,
        societyId: formData.get(`characters.${actorId}.societyId`) as string || '',
        level: parseInt(formData.get(`characters.${actorId}.level`) as string) || 1,
        incomeEarned: parseFloat(formData.get(`characters.${actorId}.incomeEarned`) as string) || 0,
        goldEarned: parseFloat(formData.get(`characters.${actorId}.goldEarned`) as string) || 0,
        goldSpent: parseFloat(formData.get(`characters.${actorId}.goldSpent`) as string) || 0,
        notes: formData.get(`characters.${actorId}.notes`) as string || '',
        reputation: formData.get(`characters.${actorId}.reputation`) as string || '',
      };
    });

    return { shared, characters };
  }

  /**
   * Handles save button click
   * Manually triggers save operation
   * 
   * @param event - The click event
   */
  private async _onSaveData(event: any): Promise<void> {
    event.preventDefault();
    await this._autoSave();
    ui.notifications?.info('Chronicle data saved successfully');
  }

  /**
   * Handles clear data button click
   * Clears all saved data and resets the form
   * 
   * @param event - The click event
   */
  private async _onClearData(event: any): Promise<void> {
    event.preventDefault();
    
    const confirmed = await Dialog.confirm({
      title: 'Clear Chronicle Data',
      content: '<p>Are you sure you want to clear all saved chronicle data? This cannot be undone.</p>',
    });

    if (confirmed) {
      await clearPartyChronicleData();
      ui.notifications?.info('Chronicle data cleared');
      await this.render(true);
    }
  }

  /**
   * Updates button states based on validation
   * 
   * Requirements: 6.4
   */
  private _updateButtonStates(): void {
    const formData = this._extractFormData();
    const sharedValidation = this.validateSharedFields(formData.shared);
    const uniqueValidation = this.validateUniqueFields(formData.characters);
    
    const isValid = sharedValidation.valid && uniqueValidation.valid;
    
    // Update generate button state (from footer)
    const generateButton = this.element.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (generateButton) {
      generateButton.disabled = !isValid;
    }
  }

  /**
   * Static method to generate chronicles for all party members
   * Will be implemented in task 7.1
   * 
   * This method:
   * - Extracts form data using FormDataExtended
   * - Validates all shared and unique fields
   * - For each party member: maps data, calls PdfGenerator, attaches PDF to actor flags
   * - Collects GenerationResult for each character
   * - Displays success/failure notifications with summary
   * - Clears saved data on successful generation
   * 
   * @param event - The form submit event
   * @param form - The HTML form element
   * @param formData - The extracted form data
   */
  static async #generateChronicles(
    this: PartyChronicleApp,
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    console.log('[PFS Chronicle] Generate chronicles called', formData);
    
    // Extract and expand form data
    const data: any = foundry.utils.expandObject(formData.object);
    console.log('[PFS Chronicle] Expanded form data:', data);
    
    // Validate shared fields
    const sharedValidation = this.validateSharedFields(data);
    if (!sharedValidation.valid) {
      ui.notifications?.error(`Validation failed: ${sharedValidation.errors.join(', ')}`);
      return;
    }
    
    // Validate unique fields for all characters
    const uniqueValidation = this.validateUniqueFields(data);
    if (!uniqueValidation.valid) {
      ui.notifications?.error(`Validation failed: ${uniqueValidation.errors.join(', ')}`);
      return;
    }
    
    // Collect generation results for all characters
    const results: GenerationResult[] = [];
    let allSucceeded = true;
    
    // Get the selected layout
    const layoutId = data.shared?.layoutId || game.settings.get('pfs-chronicle-generator', 'layout');
    let layout: Layout;
    try {
      layout = await layoutStore.getLayout(layoutId as string);
    } catch (error) {
      ui.notifications?.error(`Failed to load layout: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    
    // Get the blank chronicle path
    const blankChroniclePath = data.shared?.blankChroniclePath || game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');
    if (!blankChroniclePath || typeof blankChroniclePath !== 'string') {
      ui.notifications?.error("Blank chronicle PDF path is not set.");
      return;
    }
    
    // Process each party member
    for (const actor of this.partyActors) {
      const characterId = actor.id;
      const characterName = actor.name;
      
      try {
        // Extract shared fields
        const sharedFields: SharedFields = {
          gmPfsNumber: data.shared?.gmPfsNumber || '',
          scenarioName: data.shared?.scenarioName || '',
          eventCode: data.shared?.eventCode || '',
          eventDate: data.shared?.eventDate || '',
          xpEarned: Number(data.shared?.xpEarned) || 0,
          adventureSummaryCheckboxes: Array.isArray(data.shared?.adventureSummaryCheckboxes) 
            ? data.shared.adventureSummaryCheckboxes 
            : (data.shared?.adventureSummaryCheckboxes ? [data.shared.adventureSummaryCheckboxes] : []),
          strikeoutItems: Array.isArray(data.shared?.strikeoutItems)
            ? data.shared.strikeoutItems
            : (data.shared?.strikeoutItems ? [data.shared.strikeoutItems] : []),
          treasureBundles: Number(data.shared?.treasureBundles) || 0,
          layoutId: layoutId as string,
          seasonId: data.shared?.seasonId || '',
          blankChroniclePath: blankChroniclePath,
          chosenFactionReputation: Number(data.shared?.chosenFactionReputation) || 2,
          reputationValues: {
            EA: Number(data.shared?.reputationValues?.EA) || 0,
            GA: Number(data.shared?.reputationValues?.GA) || 0,
            HH: Number(data.shared?.reputationValues?.HH) || 0,
            VS: Number(data.shared?.reputationValues?.VS) || 0,
            RO: Number(data.shared?.reputationValues?.RO) || 0,
            VW: Number(data.shared?.reputationValues?.VW) || 0
          }
        };
        
        // Extract unique fields for this character
        const uniqueFields = data.characters?.[characterId] || {};
        const characterData = {
          characterName: uniqueFields.characterName || characterName,
          societyId: uniqueFields.societyId || '',
          level: Number(uniqueFields.level) || actor.system?.details?.level?.value || 1,
          incomeEarned: Number(uniqueFields.incomeEarned) || 0,
          goldEarned: Number(uniqueFields.goldEarned) || 0,
          goldSpent: Number(uniqueFields.goldSpent) || 0,
          notes: uniqueFields.notes || ''
        };
        
        // Map to chronicle data format
        const chronicleData = mapToCharacterData(sharedFields, characterData, actor);
        
        // Save chronicle data to actor flags
        await actor.setFlag('pfs-chronicle-generator', 'chronicleData', chronicleData);
        
        // Generate PDF
        const response = await fetch(blankChroniclePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch blank chronicle PDF: ${response.statusText}`);
        }
        
        const pdfBytes = await response.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.registerFontkit(fontkit);
        
        const generator = new PdfGenerator(pdfDoc, layout, chronicleData);
        await generator.generate();
        
        // Convert PDF to base64 and attach to actor
        const modifiedPdfBytes = await pdfDoc.save();
        let binary = '';
        const len = modifiedPdfBytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(modifiedPdfBytes[i]);
        }
        const base64String = btoa(binary);
        
        await actor.setFlag('pfs-chronicle-generator', 'chroniclePdf', base64String);
        
        // Record success
        results.push({
          characterId,
          characterName,
          success: true
        });
        
        console.log(`[PFS Chronicle] Successfully generated chronicle for ${characterName}`);
        
      } catch (error) {
        // Record failure
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          characterId,
          characterName,
          success: false,
          error: errorMessage
        });
        allSucceeded = false;
        console.error(`[PFS Chronicle] Failed to generate chronicle for ${characterName}:`, error);
      }
    }
    
    // Display summary notifications
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    if (allSucceeded) {
      ui.notifications?.info(`Successfully generated ${successCount} chronicle(s) for all party members.`);
      
      // Clear saved data after successful generation
      try {
        await clearPartyChronicleData();
        console.log('[PFS Chronicle] Cleared saved party chronicle data after successful generation');
      } catch (error) {
        console.error('[PFS Chronicle] Failed to clear saved data:', error);
        ui.notifications?.warn("Chronicles generated but failed to clear saved data.");
      }
    } else {
      const failedCharacters = results
        .filter(r => !r.success)
        .map(r => `${r.characterName}: ${r.error}`)
        .join('; ');
      
      ui.notifications?.warn(
        `Generated ${successCount} chronicle(s), but ${failureCount} failed: ${failedCharacters}`
      );
    }
  }

  /**
   * Validates shared fields using the validator module
   * 
   * @param data - The form data to validate
   * @returns ValidationResult indicating success or errors
   */
  private validateSharedFields(data: any): { valid: boolean; errors: string[] } {
    const shared = data.shared || {};
    return validateSharedFields(shared);
  }

  /**
   * Validates unique fields for all characters using the validator module
   * 
   * @param data - The form data to validate
   * @returns ValidationResult indicating success or errors
   */
  private validateUniqueFields(data: any): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];
    const characters = data.characters || {};
    
    // Validate each character's unique fields
    for (const [actorId, unique] of Object.entries(characters)) {
      const actor = this.partyActors.find(a => a.id === actorId);
      const characterName = actor?.name || actorId;
      const result = validateUniqueFields(unique as any, characterName);
      allErrors.push(...result.errors);
    }
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }
}
