import { catalogItemData, customItemData, groupCatalogItems, itemCatalogTypes, loadItemCatalog } from "../data/item-catalog.js";

async function addCatalogItem(event, target) {
  event?.preventDefault?.();
  const sourceId = target.closest("[data-item-source-id]")?.dataset.itemSourceId;
  const item = (await loadItemCatalog()).find((entry) => entry.sourceId === sourceId);
  if (!item) return ui.notifications.error(game.i18n.localize("HRPG.ItemCatalogNotFound"));
  const [created] = await this.actor.createEmbeddedDocuments("Item", [catalogItemData(item)]);
  ui.notifications.info(game.i18n.format("HRPG.ItemCatalogAdded", { name: item.name }));
  renderDocumentSheet(created);
}

async function createCustomItem() {
  const type = this.catalogType || "gear";
  const [created] = await this.actor.createEmbeddedDocuments("Item", [
    customItemData(type, game.i18n.localize(CONFIG.HRPG.itemTypes[type] ?? "HRPG.ItemGear"))
  ]);
  renderDocumentSheet(created);
}

function renderDocumentSheet(document) {
  const sheet = document?.sheet;
  if (!sheet) return;
  const ApplicationV2 = foundry.applications?.api?.ApplicationV2;
  if (ApplicationV2 && sheet instanceof ApplicationV2) return sheet.render({ force: true });
  return sheet.render(true);
}

export class ItemCatalogApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.catalogType = options.catalogType ?? "";
  }

  static DEFAULT_OPTIONS = {
    id: "hrpg-item-catalog",
    classes: ["hrpg", "item-catalog"],
    tag: "section",
    position: { width: 760, height: 680 },
    window: { title: "HRPG.ItemCatalogTitle", resizable: true }
  };

  static PARTS = {
    form: { template: "systems/hallownest-rpg/templates/applications/item-catalog.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const items = await loadItemCatalog();
    const ownedSourceIds = new Set(this.actor.items.filter((item) => item.system?.sourceId).map((item) => item.system.sourceId));
    return {
      ...context,
      actor: this.actor,
      catalogType: this.catalogType,
      catalogTypeLabel: itemCatalogTypes()[this.catalogType] ?? "HRPG.ItemCatalogTitle",
      groups: groupCatalogItems(items, { type: this.catalogType, ownedSourceIds })
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector("[data-item-search]");
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      for (const card of this.element.querySelectorAll("[data-item-source-id]")) {
        card.hidden = query && !card.textContent.toLocaleLowerCase().includes(query);
      }
    for (const section of this.element.querySelectorAll("[data-item-category]")) {
        section.hidden = !section.querySelector("[data-item-source-id]:not([hidden])");
      }
    });
    for (const button of this.element.querySelectorAll("[data-action='add-catalog-item']")) {
      button.addEventListener("click", (event) => addCatalogItem.call(this, event, event.currentTarget));
    }
    this.element.querySelector("[data-action='create-custom-item']")
      ?.addEventListener("click", async (event) => {
        event.preventDefault();
        await createCustomItem.call(this);
      });
  }
}
