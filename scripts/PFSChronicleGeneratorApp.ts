
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import FormDataExtended = foundry.applications.ux.FormDataExtended;



export class PFSChronicleGeneratorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pfs-chronicle-generator",
    form: {
      handler: PFSChronicleGeneratorApp.#onSubmit,
      closeOnSubmit: true,
    },
    position: {
      width: 400,
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

  static async #onSubmit(event: SubmitEvent|Event, form: HTMLFormElement, formData: FormDataExtended) {
    const data : any = foundry.utils.expandObject(formData.object);

    // Log the submitted values to the console
    console.log("Submitted GM Name:", data.gmName);
    console.log("Submitted GM PFS Number:", data.gmPfsNumber);
    console.log("Submitted Event Name:", data.eventName);
    console.log("Submitted Event Code:", data.eventCode);

    // Here you would continue to process the data, like generating a PDF
  }

  async _prepareContext(): Promise<object> {
    const gmName = game.settings.get('pfs-chronicle-generator', 'gmName');
    const gmPfsNumber = game.settings.get('pfs-chronicle-generator', 'gmPfsNumber');
    const eventName = game.settings.get('pfs-chronicle-generator', 'eventName');
    const eventCode = game.settings.get('pfs-chronicle-generator', 'eventCode');
    return {
      gmName,
      gmPfsNumber,
      eventName,
      eventCode,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
      ]
    };
  }
}
