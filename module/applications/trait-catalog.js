import { groupTraits, loadTraitCatalog, traitItemData } from "../data/trait-catalog.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

async function addTraitAction(_event, target) {
  const card = target.closest("[data-trait-id]");
  const sourceId = card?.dataset.traitId;
  const trait = (await loadTraitCatalog()).find((entry) => entry.sourceId === sourceId);
  if (!trait) return ui.notifications.error(game.i18n.localize("HRPG.TraitNotFound"));
  const ownedTraits = this.actor.items.filter((item) => item.type === "trait");
  const ownedIds = new Set(ownedTraits.map((item) => item.system.sourceId));
  const parentItemId = card.querySelector("[data-parent-choice]")?.value ?? "";
  const ownedCount = trait.kind === "subtrait"
    ? ownedTraits.filter((item) => item.system.sourceId === sourceId && (item.system.parentItemId ?? "") === parentItemId).length
    : ownedTraits.filter((item) => item.system.sourceId === sourceId).length;
  const repeatLimit = Number(card?.dataset.repeatLimit) || 1;
  if (trait.kind === "subtrait" && !ownedIds.has(trait.parentTrait)) {
    return ui.notifications.warn(game.i18n.localize("HRPG.TraitParentRequired"));
  }
  if (trait.kind === "subtrait" && !parentItemId) {
    return ui.notifications.warn(game.i18n.localize("HRPG.TraitParentRequired"));
  }
  if (trait.sourceId === "traits.krokha" && this.actor.system.secondary?.size !== "small") {
    return ui.notifications.warn(game.i18n.localize("HRPG.TraitRequiresSmallSize"));
  }
  if ((trait.kind === "subtrait" && ownedCount >= 1) || (trait.kind !== "subtrait" && ownedCount >= repeatLimit)) {
    return ui.notifications.warn(game.i18n.localize("HRPG.TraitAlreadyAdded"));
  }
  const social = card.querySelector("[data-social-choice]")?.value ?? "";
  await this.actor.createEmbeddedDocuments("Item", [traitItemData(trait, { social, parentItemId })]);
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
    const ownedTraits = this.actor.items.filter((item) => item.type === "trait");
    const ownedIds = new Set(ownedTraits.map((item) => item.system.sourceId));
    const ownedCounts = new Map();
    for (const trait of ownedTraits) ownedCounts.set(trait.system.sourceId, (ownedCounts.get(trait.system.sourceId) ?? 0) + 1);
    const parentChoices = new Map();
    const parentIndexes = new Map();
    for (const trait of ownedTraits.filter((item) => item.system?.kind !== "subtrait" && item.system?.sourceId)) {
      const sourceId = trait.system.sourceId;
      const index = (parentIndexes.get(sourceId) ?? 0) + 1;
      parentIndexes.set(sourceId, index);
      const list = parentChoices.get(sourceId) ?? [];
      list.push({ id: trait.id, label: `${trait.name}${index > 1 ? ` #${index}` : ""}` });
      parentChoices.set(sourceId, list);
    }
    context.categories = groupTraits(await loadTraitCatalog(), ownedIds, ownedCounts, parentChoices);
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
