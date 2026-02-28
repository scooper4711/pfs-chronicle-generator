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
import { loadPartyChronicleData } from './model/party-chronicle-storage.js';
import { 
  PartyMember,
  SharedFields,
  PartyChronicleData
} from './model/party-chronicle-types.js';
import { validateSharedFields, validateUniqueFields } from './model/party-chronicle-validator.js';
import { generateChroniclesFromPartyData } from './handlers/party-chronicle-handlers.js';
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
  async _prepareContext(options?: any): Promise<any> {
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

      // Load layout data (seasons, layouts, selected IDs)
      const {
        seasons,
        layoutsInSeason,
        selectedSeasonId,
        effectiveLayoutId
      } = this.loadPartyLayoutData(savedData);

      // Map fields to context (merge saved data with defaults)
      const shared = this.mapPartyFieldsToContext(savedData, effectiveLayoutId, selectedSeasonId);

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
   * Load layout data including seasons, layouts, and selected season/layout IDs.
   * Handles season/layout selection logic and ensures selected layout belongs to selected season.
   *
   * @param savedData - Previously saved party chronicle data (if any)
   * @returns Object containing seasons, layouts, and selected IDs
   */
  private loadPartyLayoutData(savedData: PartyChronicleData | null): {
    seasons: any[];
    layoutsInSeason: any[];
    selectedSeasonId: string;
    effectiveLayoutId: string;
  } {
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

    return {
      seasons,
      layoutsInSeason,
      selectedSeasonId,
      effectiveLayoutId
    };
  }

  /**
   * Map party chronicle fields to context object.
   * Merges saved data with default values from game settings.
   *
   * @param savedData - Previously saved party chronicle data (if any)
   * @param effectiveLayoutId - The selected layout ID
   * @param selectedSeasonId - The selected season ID
   * @returns Partial SharedFields object for template context
   */
  private mapPartyFieldsToContext(
    savedData: PartyChronicleData | null,
    effectiveLayoutId: string,
    selectedSeasonId: string
  ): Partial<SharedFields> {
    const gmPfsNumber = game.settings.get('pfs-chronicle-generator', 'gmPfsNumber') as string || '';
    const eventName = game.settings.get('pfs-chronicle-generator', 'eventName') as string || '';
    const eventCode = game.settings.get('pfs-chronicle-generator', 'eventcode') as string || '';
    const blankChroniclePath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath') as string || '';

    return {
      gmPfsNumber: savedData?.shared?.gmPfsNumber || gmPfsNumber,
      scenarioName: savedData?.shared?.scenarioName || eventName,
      eventCode: savedData?.shared?.eventCode || eventCode,
      eventDate: savedData?.shared?.eventDate || new Date().toISOString().slice(0, 10),
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
      // Extract and expand form data
      const data: any = foundry.utils.expandObject(formData.object);
      console.log('[PFS Chronicle] Expanded form data:', data);

      // Delegate to extracted handler function
      await generateChroniclesFromPartyData(data, this.partyActors);
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
