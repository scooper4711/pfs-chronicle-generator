import { layoutStore } from './LayoutStore.js';
import { PdfGenerator } from './PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import FormDataExtended = foundry.applications.ux.FormDataExtended;
import { ContentElement, Layout } from './model/layout.js';

// Placeholder data structure for level-based rewards
type PfsRewardData = {
  treasureBundleValue: {
    [level: number]: number;
  };
};

const PFS_REWARD_DATA: PfsRewardData = {
    // Treasure bundle gold value per level
    treasureBundleValue: {
        1: 1.4, 2: 2.2, 3: 3.8, 4: 6.4, 
        5: 10, 6: 15, 7: 22, 8: 30,
        9: 44, 10: 60, 11: 86, 12: 124,
        13: 188, 14: 274, 15: 408, 16: 620, 
        17: 960, 18: 1560, 19: 2660, 20: 3680
    }
};

const FACTION_NAMES: Record<string, string> = {
    'EA': 'Envoy\'s Alliance',
    'GA': 'Grand Archive',
    'HH': 'Horizon Hunters',
    'VS': 'Vigilant Seal',
    'RO': 'Radiant Oath',
    'VW': 'Verdant Wheel'
};

export class PFSChronicleGeneratorApp extends HandlebarsApplicationMixin(ApplicationV2) {

  actor: any;
  playerNumber: string | null;
  characterNumber: string | null;
  characterName: string | null;
  currentFaction: string | null;
  level: number | null;

  constructor(actor: any, options: any = {}) {
    super(options);
    this.actor = actor;
    this.playerNumber = actor.system.pfs.playerNumber;
    this.characterNumber = actor.system.pfs.characterNumber;
    this.characterName = actor.name;
    this.currentFaction = actor.system.pfs.currentFaction;
    this.level = actor.system.details.level.value;
  }

  static DEFAULT_OPTIONS = {
    id: "pfs-chronicle-generator",
    form: {
      handler: PFSChronicleGeneratorApp.#generatePDF,
      closeOnSubmit: true,
    },
    position: {
    },
    tag: "form",
    window: {
      title: "Pathfinder Society Chronicle Generator",
      icon: "fas fa-file-pdf",
      contentClasses: ["standard-form"],
    }
  }

  static async #generatePDF(this: PFSChronicleGeneratorApp, event: SubmitEvent|Event, form: HTMLFormElement, formData: FormDataExtended) : Promise<void> {
    const data : any = foundry.utils.expandObject(formData.object);
    console.log('[PFS Chronicle] Raw form data:', formData);
    console.log('[PFS Chronicle] Expanded form data:', data);
    
    if (this.actor) {
        // Convert form data array into strikeout_item_lines array
        data.strikeout_item_lines = Array.isArray(data.strikeout_item_lines) ? data.strikeout_item_lines : 
            (data.strikeout_item_lines ? [data.strikeout_item_lines] : []);
        console.log('[PFS Chronicle] Processed strikeout lines:', data.strikeout_item_lines);

        // Convert form data array into summary_checkbox array
        data.summary_checkbox = Array.isArray(data.summary_checkbox) ? data.summary_checkbox : 
            (data.summary_checkbox ? [data.summary_checkbox] : []);
        console.log('[PFS Chronicle] Processed checkboxes:', data.summary_checkbox);

        await this.actor.setFlag('pfs-chronicle-generator', 'chronicleData', data);

        try {
            const layoutId = game.settings.get('pfs-chronicle-generator', 'layout');
            const layout = await layoutStore.getLayout(layoutId as string);

            const pdfPath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');
            if (pdfPath && typeof pdfPath === 'string') {
                const response = await fetch(pdfPath);
                if (response.ok) {
                    const pdfBytes = await response.arrayBuffer();
                    const pdfDoc = await PDFDocument.load(pdfBytes);
                    pdfDoc.registerFontkit(fontkit);

                    const generator = new PdfGenerator(pdfDoc, layout, data);
                    await generator.generate();

                    const modifiedPdfBytes = await pdfDoc.save();
                    let binary = '';
                    const len = modifiedPdfBytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(modifiedPdfBytes[i]);
                    }
                    const base64String = btoa(binary);

                    await this.actor.setFlag('pfs-chronicle-generator', 'chroniclePdf', base64String);
                    ui.notifications?.info("Chronicle PDF generated and attached to actor.");
                } else {
                    ui.notifications?.error("Failed to fetch the blank chronicle PDF. Check the path in the settings.");
                }
            } else {
                ui.notifications?.error("Blank chronicle PDF path is not set in the settings.");
            }
        } catch (e) {
            console.error(e);
            ui.notifications?.error("An error occurred during chronicle generation.");
        }
    }
  }

  static PARTS = {
    main: {
      template: "modules/pfs-chronicle-generator/templates/pfs-chronicle-generator.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  }

  async _onRender(context: any, options: any) : Promise<void>{
    const html = $(this.element)
    html.find('[name="treasureBundles"], [name="income_earned"]').on('change', this._onRewardsChanged.bind(this));
    this._onRewardsChanged(null);
    
    // Add click handler for blank chronicle button
    html.find('#view-blank-chronicle').on('click', this._onViewBlankChronicle.bind(this));
    
    // Add change handlers for season and layout dropdowns
    html.find('#season').on('change', this._onSeasonChanged.bind(this));
    html.find('#layout').on('change', this._onLayoutChanged.bind(this));
    
    // Add lock/unlock handler for Event Details
    html.find('#lock-event-details').on('click', this._onToggleLock.bind(this));
  }

  async _onViewBlankChronicle(event: any) {
    event.preventDefault();
    const button = event.currentTarget;
    const pdfPath = button.dataset.path;
    
    if (pdfPath && typeof pdfPath === 'string') {
      try {
        const response = await fetch(pdfPath);
        if (response.ok) {
          const pdfBytes = await response.arrayBuffer();
          const blob = new Blob([pdfBytes], {type: 'application/pdf'});
          const chronicleFileName = pdfPath.split('/').pop() || 'chronicle.pdf';
          
          var FileSaver = require('file-saver');
          FileSaver.saveAs(blob, chronicleFileName);
        } else {
          ui.notifications?.error(`Failed to load blank chronicle: ${response.statusText}`);
        }
      } catch (error) {
        ui.notifications?.error(`Error loading blank chronicle: ${error}`);
        console.error('[PFS Chronicle] Error loading blank chronicle:', error);
      }
    }
  }

  async _onSeasonChanged(event: any) {
    const seasonId = event.target.value;
    await game.settings.set('pfs-chronicle-generator', 'season', seasonId);
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
        this._onLayoutChanged({ target: layoutDropdown });
      }
    }
  }

  async _onLayoutChanged(event: any) {
    const layoutId = event.target.value;
    await game.settings.set('pfs-chronicle-generator', 'layout', layoutId);
    const layout = await layoutStore.getLayout(layoutId);
    
    // Update checkboxes and strikeout items based on new layout
    await this.render(true);
    
    // Auto-populate blank chronicle path if defaultChronicleLocation exists and file is accessible
    if (layout?.defaultChronicleLocation) {
      try {
        const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
        if (response.ok) {
          await game.settings.set('pfs-chronicle-generator', 'blankChroniclePath', layout.defaultChronicleLocation);
          
          // Update the button
          const button = this.element.querySelector('#view-blank-chronicle') as HTMLButtonElement;
          if (button) {
            button.dataset.path = layout.defaultChronicleLocation;
            const fileName = layout.defaultChronicleLocation.split('/').pop() || 'chronicle.pdf';
            button.innerHTML = `<i class="fas fa-file-pdf"></i> ${fileName}`;
          }
        }
      } catch (error) {
        // File doesn't exist or isn't accessible, don't update the setting
        console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
      }
    }
  }

  _onToggleLock(event: any) {
    event.preventDefault();
    const button = event.currentTarget;
    const icon = button.querySelector('i');
    const eventDetails = this.element.querySelector('.event-details');
    
    if (!eventDetails) return;
    
    const isLocked = icon.classList.contains('fa-lock');
    
    if (isLocked) {
      // Unlock - enable all fields
      icon.classList.remove('fa-lock');
      icon.classList.add('fa-unlock');
      button.title = 'Lock to prevent changes';
      
      eventDetails.querySelectorAll('input, select, button').forEach((el: any) => {
        if (el.id !== 'lock-event-details') {
          el.disabled = false;
        }
      });
    } else {
      // Lock - disable all fields
      icon.classList.remove('fa-unlock');
      icon.classList.add('fa-lock');
      button.title = 'Unlock to edit';
      
      eventDetails.querySelectorAll('input, select, button').forEach((el: any) => {
        if (el.id !== 'lock-event-details') {
          el.disabled = true;
        }
      });
    }
  }

  _onRewardsChanged(event: any) {
    const form = this.form;
    if (!form) return;

    const treasureBundles = parseInt((form.elements.namedItem('treasureBundles') as HTMLInputElement).value) || 0;
    const incomeEarned = parseFloat((form.elements.namedItem('income_earned') as HTMLInputElement).value) || 0;

    let treasureBundlesGold = 0;
    if (this.level && PFS_REWARD_DATA.treasureBundleValue[this.level]) {
        treasureBundlesGold = treasureBundles * PFS_REWARD_DATA.treasureBundleValue[this.level];
    }

    const calculatedGold = treasureBundlesGold + incomeEarned;

    const goldDisplay = this.form?.querySelector('#gp_gained_display') as HTMLSpanElement;
    if (goldDisplay) {
        goldDisplay.innerText = calculatedGold.toFixed(2);
    }

    const treasureBundlesGpInput = this.form?.querySelector('[name="treasure_bundles_gp"]') as HTMLInputElement;
    if (treasureBundlesGpInput) {
        treasureBundlesGpInput.value = treasureBundlesGold.toFixed(2);
    }

    const gpGainedInput = this.form?.querySelector('[name="gp_gained"]') as HTMLInputElement;
    if (gpGainedInput) {
        gpGainedInput.value = calculatedGold.toFixed(2);
    }
  }

  private findStrikeoutChoices(layout: Layout): string[] {
    const params = layout.parameters?.Items?.strikeout_item_lines;
    if (params && params.choices && Array.isArray(params.choices)) {
      return params.choices as string[];
    }
    return [];
  }

  private findCheckboxChoices(layout: Layout): string[] {
    const params = layout.parameters?.Checkboxes?.summary_checkbox;
    if (params && params.choices && Array.isArray(params.choices)) {
      return params.choices as string[];
    }
    return [];
  }

  async _prepareContext(): Promise<object> {
    const savedData = this.actor.getFlag('pfs-chronicle-generator', 'chronicleData') || {};
    console.log('[PFS Chronicle] Saved chronicle data:', savedData);

    const gmPfsNumber = game.settings.get('pfs-chronicle-generator', 'gmPfsNumber');
    const eventName = game.settings.get('pfs-chronicle-generator', 'eventName');
    const eventcode = game.settings.get('pfs-chronicle-generator', 'eventcode');
    const blankChroniclePath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath') as string;
    const chronicleFileName = blankChroniclePath ? blankChroniclePath.split('/').pop() || 'chronicle.pdf' : 'chronicle.pdf';
    
    // Get seasons and determine selected season and layout
    const seasons = layoutStore.getSeasons();
    const settingSeasonId = game.settings.get('pfs-chronicle-generator', 'season') as string;
    const currentLayoutId = game.settings.get('pfs-chronicle-generator', 'layout') as string;
    
    let selectedSeasonId = settingSeasonId || (seasons.length > 0 ? seasons[0].id : '');
    let selectedLayoutId = currentLayoutId || '';
    
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
      : (layoutsInSeason.length > 0 ? layoutsInSeason[0].id : undefined);
    
    const layout = effectiveLayoutId ? await layoutStore.getLayout(effectiveLayoutId) : await layoutStore.getLayout(currentLayoutId);
    const strikeoutChoices = this.findStrikeoutChoices(layout);
    const checkboxChoices = this.findCheckboxChoices(layout);
    
    // Convert saved data into a map of selected items
    const savedStrikeouts = savedData.strikeout_item_lines || [];
    const selectedStrikeouts = savedStrikeouts.reduce((acc: Record<string, boolean>, item: string) => {
        acc[item] = true;
        return acc;
    }, {});

    // Convert saved checkbox data into a map of selected checkboxes
    const savedCheckboxes = savedData.summary_checkbox || [];
    const selectedCheckboxes = savedCheckboxes.reduce((acc: Record<string, boolean>, item: string) => {
        acc[item] = true;
        return acc;
    }, {});

    // Get full faction name from abbreviation
    const factionName = this.currentFaction && FACTION_NAMES[this.currentFaction] 
        ? FACTION_NAMES[this.currentFaction] 
        : this.currentFaction;

    return {
      event: eventName,
      eventcode: eventcode,
      date: savedData.date ?? new Date().toISOString().slice(0, 10),
      gmid: gmPfsNumber,
      char: this.actor.name,
      level: this.actor.system.details.level.value ?? 1,
      societyid: this.playerNumber+'-'+this.characterNumber,
      starting_xp: (savedData.starting_xp ?? ""),
      xp_gained: (savedData.xp_gained ?? "4"),
      total_xp: (savedData.total_xp ?? ""),
      starting_gp: (savedData.starting_gp ?? ""),
      treasureBundles: savedData.treasureBundles ?? 0,
      income_earned: (savedData.income_earned ?? 0).toFixed(2),
      treasure_bundles_gp: (savedData.treasure_bundles_gp ?? ""),
      gp_gained: (savedData.gp_gained ?? ""),
      gp_spent: (savedData.gp_spent ?? 0).toFixed(2),
      total_gp: (savedData.total_gp ?? ""),
      reputation: savedData.reputation ?? (factionName ? `${factionName}: +4` : ""),
      notes: savedData.notes ?? "",
      checkboxChoices: checkboxChoices,
      selectedCheckboxes: selectedCheckboxes,
      strikeoutChoices: strikeoutChoices,
      selectedStrikeouts: selectedStrikeouts,
      blankChroniclePath: blankChroniclePath,
      chronicleFileName: chronicleFileName,
      seasons: seasons,
      selectedSeasonId: selectedSeasonId,
      layoutsInSeason: layoutsInSeason,
      selectedLayoutId: effectiveLayoutId,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
      ]
    };
  }
}
