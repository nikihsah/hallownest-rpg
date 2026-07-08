import { applySizeTemplate } from "../mechanics/size-templates.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

async function applySizeAction(_event, target) {
  const size = target.closest("form")?.querySelector("[name='system.secondary.size']")?.value ?? "medium";
  try {
    await applySizeTemplate(this.actor, size);
    ui.notifications.info(game.i18n.format("HRPG.SizeApplied", {
      size: game.i18n.localize(CONFIG.HRPG.sizes[size])
    }));
  } catch (error) {
    console.error("Hallownest RPG | Failed to apply size template", error);
    ui.notifications.error(game.i18n.localize("HRPG.SizeApplyFailed"));
  }
}

async function rollAttributeAction(_event, target) {
  await this.actor.rollAttribute(target.dataset.attribute);
}

async function createItemAction(_event, target) {
  const type = target.dataset.type;
  await this.actor.createEmbeddedDocuments("Item", [{
    name: game.i18n.localize(CONFIG.HRPG.itemTypes[type]),
    type
  }]);
}

function openItemAction(_event, target) {
  this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
}

function selectTabAction(_event, target) {
  const tab = target.dataset.tab;
  const root = target.closest("form");
  root?.querySelectorAll(".sheet-tabs [data-tab]").forEach((element) => element.classList.toggle("active", element.dataset.tab === tab));
  root?.querySelectorAll(".sheet-body > .tab").forEach((element) => element.classList.toggle("active", element.dataset.tab === tab));
}

export class HallownestActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["hrpg", "sheet", "actor"],
    position: { width: 760, height: 720 },
    form: { closeOnSubmit: false, submitOnChange: true },
    actions: {
      "apply-size": applySizeAction,
      "roll-attribute": rollAttributeAction,
      "create-item": createItemAction,
      "open-item": openItemAction,
      "select-tab": selectTabAction
    }
  };

  static PARTS = {
    form: { template: "systems/hallownest-rpg/templates/actor/bug-sheet.hbs", root: true }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;
    context.actor = this.actor;
    context.system = system;
    context.config = CONFIG.HRPG;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    context.attributeRows = Object.entries(system.attributes).map(([key, attribute]) => ({
      key,
      label: CONFIG.HRPG.attributes[key],
      base: attribute.value,
      effective: system.effective?.attributes?.[key]?.value ?? attribute.value
    }));
    context.itemsByType = Object.groupBy(this.actor.items, (item) => item.type);
    context.inventoryItemTypes = Object.fromEntries(
      Object.entries(CONFIG.HRPG.itemTypes).filter(([type]) => !["trait", "path", "skill", "charm", "art", "spell"].includes(type))
    );
    return context;
  }
}
