export class HallownestActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hrpg", "sheet", "actor"],
      width: 760,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  get template() {
    return "systems/hallownest-rpg/templates/actor/bug-sheet.hbs";
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.config = CONFIG.HRPG;
    context.itemsByType = Object.groupBy(this.actor.items, (item) => item.type);
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='roll-attribute']").on("click", (event) => {
      this.actor.rollAttribute(event.currentTarget.dataset.attribute);
    });
    html.find("[data-action='create-item']").on("click", async (event) => {
      const type = event.currentTarget.dataset.type;
      await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize(CONFIG.HRPG.itemTypes[type]), type }]);
    });
    html.find("[data-item-id]").on("dblclick", (event) => {
      this.actor.items.get(event.currentTarget.dataset.itemId)?.sheet.render(true);
    });
    html.find("[data-action='apply-size']").on("click", () => {
      this.actor.applySizeTemplate(this.actor.system.secondary.size);
    });
    html.find("[data-action='add-trait']").on("click", () => {
      const traits = foundry.utils.deepClone(this.actor.system.traits ?? []);
      traits.push({ id: foundry.utils.randomID(), name: game.i18n.localize("HRPG.NewTrait"), kind: "trait", description: "" });
      this.actor.update({ "system.traits": traits });
    });
    html.find("[data-action='delete-trait']").on("click", (event) => {
      const id = event.currentTarget.dataset.traitId;
      const traits = (this.actor.system.traits ?? []).filter((trait) => trait.id !== id);
      this.actor.update({ "system.traits": traits });
    });
    html.find("[data-trait-field]").on("change", (event) => {
      const traits = foundry.utils.deepClone(this.actor.system.traits ?? []);
      const trait = traits.find((entry) => entry.id === event.currentTarget.dataset.traitId);
      if (!trait) return;
      trait[event.currentTarget.dataset.traitField] = event.currentTarget.value;
      this.actor.update({ "system.traits": traits });
    });
  }
}
