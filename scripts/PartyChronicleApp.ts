/**
 * PartyChronicleApp - Application for filling out chronicle sheets for all party members
 * 
 * This ApplicationV2-based form allows GMs to enter chronicle information once for
 * all party members, with both shared fields (applied to all) and unique fields
 * (per character). It integrates with the existing PdfGenerator infrastructure.
 * 
 * Requirements: party-chronicle-filling 1.2, 1.3, 1.4, 8.2
 */

import { layoutStore } from './LayoutStore.js';
import { loadPartyChronicleData, savePartyChronicleData } from './model/party-chronicle-storage.js';
import { FACTION_NAMES } from './model/faction-names.js';
import { 
  PartyMember,
  SharedFields,
  PartyChronicleData,
  PartyChronicleContext,
  ChronicleFormData,
  UniqueFields,
  LayoutSeason,
  LayoutEntry
} from './model/party-chronicle-types.js';
import { validateSharedFields, validateUniqueFields } from './model/party-chronicle-validator.js';
import { generateChroniclesFromPartyData } from './handlers/party-chronicle-handlers.js';
import { FlagActor, hasArchive } from './handlers/chronicle-exporter.js';
import { PartyActor } from './handlers/event-listener-helpers.js';
import { debug, warn } from './utils/logger.js';
import { getGameSystem, getGameSystemRoot } from './utils/game-system-detector.js';
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import FormDataExtended = foundry.applications.ux.FormDataExtended;

export class PartyChronicleApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Array of party member actors */
  partyActors: PartyActor[];

  /** The Party actor used for zip archive flag storage */
  partyActor?: FlagActor;

  /**
   * Constructs a new PartyChronicleApp instance
   * 
   * @param partyActors - Array of actor objects representing party members
   * @param options - Additional application options
   * @param partyActor - The Party actor for zip archive flag checks
   */
  constructor(partyActors: PartyActor[], options?: unknown, partyActor?: FlagActor) {
    // @ts-expect-error ApplicationV2 base class expects specific options type; unknown is safe here

    super(options);
    this.partyActors = partyActors;
    this.partyActor = partyActor;
  }

  /**
   * Default application options
   * Defines the application's ID, form behavior, position, and window settings
   */
  static readonly DEFAULT_OPTIONS = {
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
  static readonly PARTS = {
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
   * - Extracts party member data (id, name, level, playerNumber, characterNumber)
   * - Loads saved party chronicle data from world flags
   * - Prepares season and layout dropdown data
   * - Checks if chronicle path file exists
   * - Returns PartyChronicleContext object
   * 
   * @returns Promise resolving to context object for template rendering
   * 
   * Requirements: party-chronicle-filling 1.3, 1.4, 8.2, conditional-chronicle-path-visibility 5.1, 5.2, 5.5, 6.4
   */
  // @ts-expect-error Base class _prepareContext returns Promise<RenderContext>; our PartyChronicleContext is a superset but not structurally compatible
  async _prepareContext(_options?: unknown): Promise<PartyChronicleContext> {
      // Extract party member data - filter to only include character actors
      // Exclude: null actors, familiars, and NPCs
      const partyMembers: PartyMember[] = this.partyActors
        .filter(actor => actor?.type === 'character')
        .map(actor => PartyChronicleApp.mapActorToPartyMember(actor));

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

      // Check if chronicle path file exists and if layout has a default location
      let layoutDefaultChronicleLocation: string | undefined;
      if (effectiveLayoutId) {
        const selectedLayout = await layoutStore.getLayout(effectiveLayoutId);
        layoutDefaultChronicleLocation = selectedLayout?.defaultChronicleLocation;
      }

      // When the layout has a default chronicle location, use it as the authoritative
      // blank chronicle path. This ensures the correct game system's chronicle PDF is
      // used (e.g., Starfinder layout always uses the Starfinder chronicle, even if
      // saved data still references a Pathfinder chronicle from a previous session).
      if (layoutDefaultChronicleLocation) {
        shared.blankChroniclePath = layoutDefaultChronicleLocation;
      }

      const chroniclePath = shared.blankChroniclePath || '';
      debug(`_prepareContext: chroniclePath = "${chroniclePath}"`);
      const chroniclePathExists = await this.checkFileExists(chroniclePath);
      debug(`_prepareContext: chroniclePathExists = ${chroniclePathExists}`);
      
      const layoutHasDefault = !!layoutDefaultChronicleLocation;
      debug(`_prepareContext: layoutHasDefault = ${layoutHasDefault}`);
      
      // Field should be hidden only if:
      // 1. Layout has a default chronicle location, AND
      // 2. A valid file exists at the chronicle path
      // Otherwise, field should be visible so user can select/change the file
      const shouldHideChroniclePathField = layoutHasDefault && chroniclePathExists;
      debug(`_prepareContext: shouldHideChroniclePathField = ${shouldHideChroniclePathField}`);

      // Resolve GM character from saved data
      const { gmCharacter, gmCharacterFields } = await this.resolveGmCharacter(savedData);

      // Return PartyChronicleContext object
      return {
        partyMembers,
        shared,
        seasons,
        layoutsInSeason,
        selectedSeasonId,
        selectedLayoutId: effectiveLayoutId,
        savedData,
        gmCharacter,
        gmCharacterFields,
        chroniclePathExists: shouldHideChroniclePathField,
        hasChronicleZip: this.partyActor ? hasArchive(this.partyActor) : false,
        gameSystem: getGameSystem(),
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
  /**
   * Resolves a season ID to a valid composite key, handling migration from bare IDs.
   * Falls back to the first available season if no match is found.
   */
  private resolveSeasonId(
    candidateId: string,
    seasons: LayoutSeason[]
  ): string {
    if (!candidateId) return seasons.length > 0 ? seasons[0].id : '';
    if (seasons.some(s => s.id === candidateId)) return candidateId;

    // Migrate bare season IDs (e.g., "season1") to composite keys (e.g., "pfs2/season1")
    const match = seasons.find(s => s.id.endsWith(`/${candidateId}`));
    if (match) return match.id;

    return seasons.length > 0 ? seasons[0].id : '';
  }

  private loadPartyLayoutData(savedData: PartyChronicleData | null): {
    seasons: LayoutSeason[];
    layoutsInSeason: LayoutEntry[];
    selectedSeasonId: string;
    effectiveLayoutId: string;
  } {
    const seasons = layoutStore.getSeasons(getGameSystemRoot());

    const rawSeasonId = savedData?.shared?.seasonId || '';
    let selectedSeasonId = this.resolveSeasonId(rawSeasonId, seasons);
    const selectedLayoutId = savedData?.shared?.layoutId || '';

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
   * 
   * Requirements: party-chronicle-filling 1.3, 1.4, 8.2, multi-line-reputation-tracking 1.2, 1.3, 4.1, 4.2
   */
  // eslint-disable-next-line complexity -- Flat null-coalescing pattern is clearer than extraction
  private mapPartyFieldsToContext(
    savedData: PartyChronicleData | null,
    effectiveLayoutId: string,
    selectedSeasonId: string
  ): Partial<SharedFields> {
    return {
      gmPfsNumber: savedData?.shared?.gmPfsNumber || '',
      scenarioName: savedData?.shared?.scenarioName || '',
      eventCode: savedData?.shared?.eventCode || '',
      eventDate: savedData?.shared?.eventDate || new Date().toISOString().slice(0, 10),
      xpEarned: savedData?.shared?.xpEarned ?? 4,
      adventureSummaryCheckboxes: savedData?.shared?.adventureSummaryCheckboxes || [],
      strikeoutItems: savedData?.shared?.strikeoutItems || [],
      treasureBundles: savedData?.shared?.treasureBundles ?? 0,
      downtimeDays: savedData?.shared?.downtimeDays ?? 0,
      layoutId: effectiveLayoutId,
      seasonId: selectedSeasonId,
      blankChroniclePath: savedData?.shared?.blankChroniclePath || '',
      chosenFactionReputation: savedData?.shared?.chosenFactionReputation ?? 2,
      reputationValues: savedData?.shared?.reputationValues ?? {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      },
      reportingA: savedData?.shared?.reportingA ?? false,
      reportingB: savedData?.shared?.reportingB ?? false,
      reportingC: savedData?.shared?.reportingC ?? false,
      reportingD: savedData?.shared?.reportingD ?? false,
      gmCharacterActorId: savedData?.shared?.gmCharacterActorId,
    };
  }

  /**
   * Maps a PartyActor to a PartyMember display object.
   *
   * Extracts id, name, img, level, playerNumber, characterNumber, and faction
   * from the actor's system data. Used for both party members and the GM character.
   *
   * @param actor - The actor to map
   * @returns PartyMember object for template rendering
   */
  // eslint-disable-next-line complexity -- Flat null-coalescing pattern for optional actor system fields
  private static mapActorToPartyMember(actor: PartyActor): PartyMember {
    const factionKey = actor.system?.pfs?.currentFaction ?? '';
    return {
      id: actor.id,
      name: actor.name,
      img: actor.img,
      level: actor.system?.details?.level?.value ?? 1,
      playerNumber: actor.system?.pfs?.playerNumber?.toString() ?? '',
      characterNumber: actor.system?.pfs?.characterNumber?.toString() ?? '',
      faction: FACTION_NAMES[factionKey] ?? ''
    };
  }

  /**
   * Resolves the GM character from saved data.
   *
   * Reads `gmCharacterActorId` from saved shared fields and attempts to
   * resolve the actor via `game.actors.get()`. If the actor exists and is
   * a character type, returns the populated PartyMember and UniqueFields.
   * If the actor cannot be resolved (deleted/unavailable), clears the
   * stale ID from saved data and returns null.
   *
   * @param savedData - Previously saved party chronicle data (if any)
   * @returns Object with gmCharacter and gmCharacterFields (both null if not assigned)
   *
   * Requirements: gm-character-party-sheet 4.4, 8.1, 8.2, 8.3
   */
  private async resolveGmCharacter(savedData: PartyChronicleData | null): Promise<{
    gmCharacter: PartyMember | null;
    gmCharacterFields: UniqueFields | null;
  }> {
    const gmCharacterActorId = savedData?.shared?.gmCharacterActorId;
    if (!gmCharacterActorId) {
      return { gmCharacter: null, gmCharacterFields: null };
    }

    const actor = game.actors.get(gmCharacterActorId) as PartyActor | undefined;

    if (actor?.type === 'character') {
      const gmCharacter = PartyChronicleApp.mapActorToPartyMember(actor);
      const gmCharacterFields = savedData?.characters?.[gmCharacterActorId] ?? null;
      return { gmCharacter, gmCharacterFields };
    }

    // Actor not found or wrong type — clear stale ID from saved data
    warn(`GM character actor ID "${gmCharacterActorId}" could not be resolved; clearing from saved data`);
    if (savedData?.shared) {
      delete savedData.shared.gmCharacterActorId;
      await savePartyChronicleData(savedData);
    }
    return { gmCharacter: null, gmCharacterFields: null };
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
      const data = foundry.utils.expandObject(formData.object) as ChronicleFormData;
      debug('Expanded form data:', data);

      // Delegate to extracted handler function
      // Note: In the hybrid ApplicationV2 pattern, form submission is handled
      // by attachGenerateButtonListener which passes the real Party actor.
      // This fallback uses a no-op actor for the ApplicationV2 code path.
      const noOpPartyActor: FlagActor = {
        getFlag: () => undefined,
        setFlag: async () => {},
        unsetFlag: async () => {},
        update: async () => {},
      };
      const gmCharacterActorId = data.shared?.gmCharacterActorId;
      const gmCharacterActor = gmCharacterActorId
        ? game.actors.get(gmCharacterActorId) as PartyActor | undefined
        : undefined;
      await generateChroniclesFromPartyData(data, this.partyActors, noOpPartyActor, gmCharacterActor);
    }

  /**
   * Validates shared fields using the validator module
   * 
   * @param data - The form data to validate
   * @returns ValidationResult indicating success or errors
   */
  private validateSharedFields(data: ChronicleFormData): { valid: boolean; errors: string[] } {
    const shared = data.shared || {};
    return validateSharedFields(shared);
  }

  /**
   * Validates unique fields for all characters using the validator module
   * 
   * @param data - The form data to validate
   * @returns ValidationResult indicating success or errors
   */
  private validateUniqueFields(data: ChronicleFormData): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];
    const characters = data.characters || {};
    
    // Validate each character's unique fields
    for (const [actorId, unique] of Object.entries(characters)) {
      const actor = this.partyActors.find(a => a.id === actorId);
      const characterName = actor?.name || actorId;
      const result = validateUniqueFields(unique as UniqueFields, characterName);
      allErrors.push(...result.errors);
    }
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }

   /**
    * Checks if a file exists at the given path
    *
    * Uses Foundry's fetch API with HEAD request to verify file existence
    * without downloading the entire file.
    *
    * @param path - File path relative to Foundry data directory
    * @returns True if file exists and is accessible, false otherwise
    *
    * Requirements: conditional-chronicle-path-visibility 5.3, 5.4
    */
   private async checkFileExists(path: string): Promise<boolean> {
     if (!path) {
       debug('checkFileExists: empty path, returning false');
       return false;
     }

     try {
       debug(`checkFileExists: checking path "${path}"`);
       const response = await fetch(path, { method: 'HEAD' });
       debug(`checkFileExists: response.ok = ${response.ok}`);
       return response.ok;
     } catch (caughtError) {
       debug(`Chronicle path file not accessible: ${path}`, caughtError);
       return false;
     }
   }
}
