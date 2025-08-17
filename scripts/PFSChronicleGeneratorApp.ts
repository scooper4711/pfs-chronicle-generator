
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;


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
      icon: "fas fa-dice-d20",
      contentClasses: ["standard-form"],
    }
  }

  static PARTS = {
    foo: {
      template: "modules/hello-world/templates/pfs-chronicle-generator.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  }

  static #onSubmit(event: any, form: any, formData: any) {
    const settings = foundry.utils.expandObject(formData.object);
    console.log(settings);
    console.log(form);
    console.log(event);
    console.log(formData);
  }

  async _prepareContext(): Promise<object> {
    const settingValue = game.settings.get('hello-world', 'someSetting');
    return {
      settingValue,
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
      ]
    };
  }
}
