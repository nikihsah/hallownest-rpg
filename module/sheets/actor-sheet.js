import { applySizeTemplate } from "../mechanics/size-templates.js";

export class HallownestActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hrpg", "sheet", "actor"],
      width: 760,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "overview" }]
    });
  }

  get template() {
    return "systems/hallownest-rpg/templates/actor/bug-sheet.hbs";
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.config = CONFIG.HRPG;
    context.attributeRows = Object.entries(this.actor.system.attributes).map(([key, attribute]) => ({
      key,
      label: CONFIG.HRPG.attributes[key],
      base: attribute.value,
      effective: this.actor.system.effective?.attributes?.[key]?.value ?? attribute.value
    }));
    context.itemsByType = Object.groupBy(this.actor.items, (item) => item.type);
    context.inventoryItemTypes = Object.fromEntries(
      Object.entries(CONFIG.HRPG.itemTypes).filter(([type]) => !["trait", "path", "skill", "charm", "art", "spell"].includes(type))
    );
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='roll-attribute']").on("click", async (event) => {
      event.preventDefault();
      await this.actor.rollAttribute(event.currentTarget.dataset.attribute);
    });
    html.find("[data-action='create-item']").on("click", async (event) => {
      const type = event.currentTarget.dataset.type;
      await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize(CONFIG.HRPG.itemTypes[type]), type }]);
    });
    html.find("[data-item-id]").on("dblclick", (event) => {
      this.actor.items.get(event.currentTarget.dataset.itemId)?.sheet.render(true);
    });
    html.find(".hrpg-apply-size-template").on("click", async () => {
      const size = html.find("[name='system.secondary.size']")?.val?.() ?? "medium";
      console.info(`Hallownest RPG | Applying ${size} bug template to ${this.actor.name}`);
      try {
        await applySizeTemplate(this.actor, size);
        ui.notifications.info(game.i18n.format("HRPG.SizeApplied", {
          size: game.i18n.localize(CONFIG.HRPG.sizes[size])
        }));
      } catch (error) {
        console.error("Hallownest RPG | Failed to apply size template", error);
        ui.notifications.error(game.i18n.localize("HRPG.SizeApplyFailed"));
      }
    });
  }
}
