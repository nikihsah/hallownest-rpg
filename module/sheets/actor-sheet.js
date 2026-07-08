import { applySizeTemplate } from "../mechanics/size-templates.js";
import { attributeBreakdown, storedAttributeValue } from "../mechanics/attribute-state.js";
import { currentStatValue, statAdjustment } from "../mechanics/stat-adjustments.js";
import { restActor } from "../mechanics/rest.js";

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
  const [created] = await this.actor.createEmbeddedDocuments("Item", [{
    name: game.i18n.localize(CONFIG.HRPG.itemTypes[type]),
    type
  }]);
  created?.sheet.render(true);
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

async function rollSecondaryAction(_event, target) {
  await this.actor.rollSecondary(target.dataset.secondary);
}

async function restAction() {
  const result = await restActor(this.actor);
  ui.notifications.info(game.i18n.format("HRPG.RestComplete", { satiety: result.nextSatiety }));
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
      "select-tab": selectTabAction,
      "roll-secondary": rollSecondaryAction,
      "rest": restAction
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
    context.milestoneOptions = {
      0: game.i18n.localize("HRPG.Milestone0"),
      1: game.i18n.localize("HRPG.Milestone1"),
      2: game.i18n.localize("HRPG.Milestone2"),
      3: game.i18n.localize("HRPG.Milestone3"),
      4: game.i18n.localize("HRPG.Milestone4"),
      5: game.i18n.localize("HRPG.Milestone5")
    };
    const activeTraits = this.actor.items.filter((item) => item.type === "trait" && item.system.active !== false);
    const templateLabel = game.i18n.format("HRPG.TemplateSource", {
      template: game.i18n.localize(CONFIG.HRPG.sizes[system.secondary.size])
    });
    context.attributeRows = Object.entries(system.attributes).map(([key, attribute]) => {
      const maximum = system.effective?.attributes?.[key]?.max ?? attribute.max ?? attribute.value;
      const traitSources = activeTraits
        .map((trait) => ({ name: trait.name, value: Number(trait.system.modifiers?.[key]) || 0 }))
        .filter((source) => source.value !== 0);
      return {
        key,
        label: CONFIG.HRPG.attributes[key],
        current: system.effective?.attributes?.[key]?.value ?? attribute.value,
        maximum,
        breakdown: attributeBreakdown({
          templateLabel, base: attribute.max ?? attribute.value, traits: traitSources,
          total: maximum, totalLabel: game.i18n.localize("HRPG.Total")
        })
      };
    });
    context.itemsByType = Object.groupBy(this.actor.items, (item) => item.type);
    context.inventoryItemTypes = Object.fromEntries(
      Object.entries(CONFIG.HRPG.itemTypes).filter(([type]) => !["trait", "path", "skill", "charm", "art", "spell"].includes(type))
    );
    const adjustments = system.adjustments ?? {};
    const secondaryValues = {
      speed: system.effective.secondary.speed,
      hunger: system.effective.secondary.hunger,
      appeal: system.effective.secondary.appeal,
      dread: system.effective.secondary.dread,
      marks: system.effective.secondary.marks,
      maneuver: system.derived.maneuver,
      load: system.derived.load,
      beltSize: system.derived.beltSize,
      techniqueSlots: system.derived.techniqueSlots
    };
    const labels = {
      speed: "HRPG.Speed", hunger: "HRPG.Hunger", appeal: "HRPG.Appeal",
      dread: "HRPG.Dread", marks: "HRPG.Marks", maneuver: "HRPG.Maneuver",
      load: "HRPG.Load", beltSize: "HRPG.BeltSize", techniqueSlots: "HRPG.TechniqueSlots"
    };
    context.secondaryRows = Object.entries(secondaryValues).map(([key, permanent]) => ({
      key, label: labels[key], permanent, current: currentStatValue(permanent, adjustments[key]), rollable: key === "speed"
    }));
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const input of this.element.querySelectorAll("[data-current-attribute]")) {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const key = event.currentTarget.dataset.currentAttribute;
        const modifier = this.actor.system.effective?.modifiers?.[key] ?? 0;
        const stored = storedAttributeValue(event.currentTarget.value, modifier);
        await this.actor.update({ [`system.attributes.${key}.value`]: stored });
      });
    }
    for (const input of this.element.querySelectorAll("[data-current-secondary]")) {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const key = event.currentTarget.dataset.currentSecondary;
        const permanent = Number(event.currentTarget.dataset.permanent) || 0;
        const current = Number(event.currentTarget.value);
        if (!Number.isFinite(current)) return;
        await this.actor.update({ [`system.adjustments.${key}`]: statAdjustment(current, permanent) });
      });
    }
  }
}
