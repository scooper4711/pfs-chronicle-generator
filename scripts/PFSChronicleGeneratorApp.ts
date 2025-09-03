import { layoutStore } from './LayoutStore.js';
import { PdfGenerator } from './PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import FormDataExtended = foundry.applications.ux.FormDataExtended;

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
    
    if (this.actor) {
        

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
    html.find('[name="treasureBundles"], [name="incomeEarned"]').on('change', this._onRewardsChanged.bind(this));
  }

  _onRewardsChanged(event: any) {
    const form = this.form;
    if (!form) return;

    const treasureBundles = parseInt((form.elements.namedItem('treasureBundles') as HTMLInputElement).value) || 0;
    const incomeEarned = parseFloat((form.elements.namedItem('incomeEarned') as HTMLInputElement).value) || 0;

    let calculatedGold = 0;

    if (this.level && PFS_REWARD_DATA.treasureBundleValue[this.level]) {
        calculatedGold += treasureBundles * PFS_REWARD_DATA.treasureBundleValue[this.level];
    }

    calculatedGold += incomeEarned;

    const goldDisplay = this.form?.querySelector('#gp_gained_display') as HTMLSpanElement;
    if (goldDisplay) {
        goldDisplay.innerText = calculatedGold.toFixed(2);
    }
  }

  

  async _prepareContext(): Promise<object> {
    const savedData = this.actor.getFlag('pfs-chronicle-generator', 'chronicleData') || {};

    const gmPfsNumber = game.settings.get('pfs-chronicle-generator', 'gmPfsNumber');
    const eventName = game.settings.get('pfs-chronicle-generator', 'eventName');
    const eventcode = game.settings.get('pfs-chronicle-generator', 'eventcode');
    return {
      event: eventName,
      eventcode: eventcode,
      date: savedData.date ?? new Date().toISOString().slice(0, 10),
      gmid: gmPfsNumber,
      char: this.actor.name,
      level: this.actor.system.details.level.value ?? 1,
      societyid: this.playerNumber+'-'+this.characterNumber,
      starting_xp: (savedData.starting_xp ?? "-"),
      xp_gained: (savedData.xp_gained ?? "4"),
      total_xp: (savedData.total_xp ?? "-"),
      starting_gp: (savedData.starting_gp ?? "-"),
      treasureBundles: savedData.treasureBundles ?? 0,
      incomeEarned: savedData.incomeEarned ?? 0,
      gp_gained: (savedData.gp_gained ?? "0"),
      gp_spent: (savedData.gp_spent ?? "-"),
      total_gp: (savedData.total_gp ?? "-"),
      reputation: savedData.reputation ?? (this.currentFaction ? `${this.currentFaction}: +4` : ""),
      notes: savedData.notes ?? "",
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
      ]
    };
  }
}
