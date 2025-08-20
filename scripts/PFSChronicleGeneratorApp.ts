import { layoutStore } from './LayoutStore.js';
import { PdfGenerator } from './PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import FormDataExtended = foundry.applications.ux.FormDataExtended;

// Placeholder data structure for level-based rewards
type PfsRewardData = {
  treasureBundleValue: {
    [level: number]: number;
  };
  earnIncomeValue: {
    [level: number]: {
      [status: string]: number;
    };
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
    },
    // Earn Income gold value per level and success level
    earnIncomeValue: {
        1: { 
            'failure': 0.08, 
            'success-trained': 0.4, 
            'success-expert': 0.4, 
        },
        2: { 
            'failure': 0.08, 
            'success-trained': 0.4, 
            'success-expert': 0.4,
        },
        3: {
            'failure': 0.16, 
            'success-trained': 1.6,
            'success-expert': 1.6,
        },
        4: {
            'failure': 0.32, 
            'success-trained': 2.4,
            'success-expert': 2.4,
        },
        5: {
            'failure': 0.64, 
            'success-trained': 4,
            'success-expert': 4,
        },
        6: {
            'failure': 0.8, 
            'success-trained': 5.6,
            'success-expert': 6.4,
        },
        7: {
            'failure': 1.6, 
            'success-trained': 7.2,
            'success-expert': 8,
        },
        8: {
            'failure': 2.4, 
            'success-trained': 12,
            'success-expert': 16,
        },
        9: {
            'failure': 3.2, 
            'success-trained': 16,
            'success-expert': 20,
            'success-master': 20,
        },
        10: {
            'failure': 4, 
            'success-trained': 20,
            'success-expert': 24,
            'success-master': 24,
        },
        11: {
            'failure': 4.8, 
            'success-trained': 24,
            'success-expert': 32,
            'success-master': 32,
        },
        12: {
            'failure': 5.6, 
            'success-trained': 32,
            'success-expert': 40,
            'success-master': 48,
        },
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
    if (this.options.form)
      this.options.form.handler = this._onSubmit.bind(this);
  }

  static DEFAULT_OPTIONS = {
    id: "pfs-chronicle-generator",
    form: {
      handler: (event: SubmitEvent|Event, form: HTMLFormElement, formData: FormDataExtended) => {},
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
    html.find('[name="treasureBundles"], [name="earnIncomeStatus"], [name="daysOfDowntime"]').on('change', this._onRewardsChanged.bind(this));
  }

  _onRewardsChanged(event: any) {
    const form = this.form;
    if (!form) return;

    const treasureBundles = parseInt((form.elements.namedItem('treasureBundles') as HTMLInputElement).value) || 0;
    const earnIncomeStatus = (form.elements.namedItem('earnIncomeStatus') as HTMLSelectElement).value;
    const daysOfDowntime = parseInt((form.elements.namedItem('daysOfDowntime') as HTMLInputElement).value) || 0;

    let calculatedGold = 0;
    let earnIncomeGold = 0;

    if (this.level && PFS_REWARD_DATA.treasureBundleValue[this.level]) {
        calculatedGold += treasureBundles * PFS_REWARD_DATA.treasureBundleValue[this.level];
    }

    if (this.level && earnIncomeStatus && earnIncomeStatus !== 'none') {
      if (earnIncomeStatus.startsWith('critical-success')) {
        const proficiency = earnIncomeStatus.substring('critical-success-'.length);
        const successStatus = `success-${proficiency}`;
        let effectiveLevel = this.level + 1;
        if (this.level <= 2) {
          effectiveLevel = 3;
        }
        
        if (PFS_REWARD_DATA.earnIncomeValue[effectiveLevel] && PFS_REWARD_DATA.earnIncomeValue[effectiveLevel][successStatus]) {
          earnIncomeGold = PFS_REWARD_DATA.earnIncomeValue[effectiveLevel][successStatus];
        }

      } else {
        if (PFS_REWARD_DATA.earnIncomeValue[this.level] && PFS_REWARD_DATA.earnIncomeValue[this.level][earnIncomeStatus]) {
            earnIncomeGold = PFS_REWARD_DATA.earnIncomeValue[this.level][earnIncomeStatus];
        }
      }
    }

    calculatedGold += earnIncomeGold * daysOfDowntime;

    (form.elements.namedItem('goldEarned') as HTMLInputElement).value = calculatedGold.toFixed(2);
  }

  async _onSubmit(event: SubmitEvent|Event, form: HTMLFormElement, formData: FormDataExtended) {
    const data : any = foundry.utils.expandObject(formData.object);
    
    delete data.playerNumber;
    delete data.characterNumber;
    delete data.characterName;
    delete data.level;

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

                    const generator = new PdfGenerator(pdfDoc, layout, data);
                    await generator.generate();

                    const modifiedPdfBytes = await pdfDoc.save();
                    const base64String = btoa(String.fromCharCode(...new Uint8Array(modifiedPdfBytes)));

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

    // Log the submitted values to the console
    console.log("Submitted Player Number", this.playerNumber);
    console.log("Submitted Character Number", this.characterNumber);
    console.log("Submitted Character Name", this.characterName);
    console.log("Submitted GM Name:", data.gmName);
    console.log("Submitted GM PFS Number:", data.gmPfsNumber);
    console.log("Submitted Event Name:", data.eventName);
    console.log("Submitted Event Code:", data.eventCode);
    console.log("Submitted Event Date:", data.eventDate);
    console.log("Submitted XP Earned:", data.xpEarned);
    console.log("Submitted Treasure Bundles:", data.treasureBundles);
    console.log("Submitted Earn Income Status:", data.earnIncomeStatus);
    console.log("Submitted Days of Downtime:", data.daysOfDowntime);
    console.log("Submitted Gold Earned:", data.goldEarned);
    console.log("Submitted Gold Spent:", data.goldSpent);
    console.log("Submitted Notes:", data.notes);
    console.log("Submitted Reputation:", data.reputation);

    // Here you would continue to process the data, like generating a PDF
  }

  async _prepareContext(): Promise<object> {
    const savedData = this.actor.getFlag('pfs-chronicle-generator', 'chronicleData') || {};

    const gmName = game.settings.get('pfs-chronicle-generator', 'gmName');
    const gmPfsNumber = game.settings.get('pfs-chronicle-generator', 'gmPfsNumber');
    const eventName = game.settings.get('pfs-chronicle-generator', 'eventName');
    const eventCode = game.settings.get('pfs-chronicle-generator', 'eventCode');
    return {
      playerNumber: this.playerNumber,
      characterNumber: this.characterNumber,
      characterName: this.characterName,
      level: this.level,
      gmName: savedData.gmName ?? gmName,
      gmPfsNumber: savedData.gmPfsNumber ?? gmPfsNumber,
      eventName: savedData.eventName ?? eventName,
      eventCode: savedData.eventCode ?? eventCode,
      eventDate: savedData.eventDate ?? new Date().toISOString().slice(0, 10),
      xpEarned: savedData.xpEarned ?? 4,
      goldEarned: savedData.goldEarned ?? 0,
      goldSpent: savedData.goldSpent ?? 0,
      treasureBundles: savedData.treasureBundles ?? 0,
      earnIncomeStatus: savedData.earnIncomeStatus ?? "none",
      daysOfDowntime: savedData.daysOfDowntime ?? 1,
      notes: savedData.notes ?? "",
      reputation: savedData.reputation ?? (this.currentFaction ? `${this.currentFaction}: +4` : ""),
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
      ]
    };
  }
}
