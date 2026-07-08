import { groupTraits, loadTraitCatalog, traitItemData } from "../data/trait-catalog.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

async function addTraitAction(_event, target) {
  const card = target.closest("[data-trait-id]");
  const sourceId = card?.dataset.traitId;
  const trait = (await loadTraitCatalog()).find((entry) => entry.sourceId === sourceId);
  if (!trait) return ui.notifications.error(game.i18n.localize("HRPG.TraitNotFound"));
  const ownedIds = new Set(this.actor.items.filter((item) => item.type === "trait").map((item) => item.system.sourceId));
  if (ownedIds.has(sourceId)) return ui.notifications.warn(game.i18n.localize("HRPG.TraitAlreadyAdded"));
  if (trait.kind === "subtrait" && !ownedIds.has(trait.parentTrait)) {
    return ui.notifications.warn(game.i18n.localize("HRPG.TraitParentRequired"));
  }
  const social = card.querySelector("[data-social-choice]")?.value ?? "";
  await this.actor.createEmbeddedDocuments("Item", [traitItemData(trait, { social })]);
  ui.notifications.info(game.i18n.format("HRPG.TraitAdded", { name: trait.name }));
  await this.render({ force: true });
}

export class TraitCatalogApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    id: "hrpg-trait-catalog",
    classes: ["hrpg", "trait-catalog"],
    tag: "form",
    position: { width: 760, height: 720 },
    window: { title: "HRPG.TraitCatalogTitle", resizable: true }
  };

  static PARTS = {
    form: { template: "systems/hallownest-rpg/templates/applications/trait-catalog.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ownedIds = new Set(this.actor.items.filter((item) => item.type === "trait").map((item) => item.system.sourceId));
    context.categories = groupTraits(await loadTraitCatalog(), ownedIds);
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const search = this.element.querySelector("[data-trait-search]");
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase("ru");
      for (const card of this.element.querySelectorAll("[data-trait-id]")) {
        card.hidden = query && !card.textContent.toLocaleLowerCase("ru").includes(query);
      }
      for (const section of this.element.querySelectorAll("[data-trait-category]")) {
        section.hidden = !section.querySelector("[data-trait-id]:not([hidden])");
      }
    });
    for (const button of this.element.querySelectorAll("[data-action='add-trait']")) {
      button.addEventListener("click", (event) => addTraitAction.call(this, event, event.currentTarget));
    }
  }
}
