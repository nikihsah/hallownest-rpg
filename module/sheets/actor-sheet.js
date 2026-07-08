import { applySizeTemplate } from "../mechanics/size-templates.js";
import { attributeBreakdown, storedAttributeValue } from "../mechanics/attribute-state.js";
import { currentStatValue, statAdjustment } from "../mechanics/stat-adjustments.js";
import { restActor } from "../mechanics/rest.js";
import { quickAttacksFromItems } from "../mechanics/trait-attacks.js";
import { loadPathCatalog, pathItemData } from "../data/path-catalog.js";
import { TraitCatalogApplication } from "../applications/trait-catalog.js";

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
  if (type === "trait") {
    try {
      this.traitCatalog ??= new TraitCatalogApplication(this.actor, { id: `hrpg-trait-catalog-${this.actor.id}` });
      return await this.traitCatalog.render({ force: true });
    } catch (error) {
      console.error("Hallownest RPG | Failed to open trait catalog", error);
      return ui.notifications.error(game.i18n.localize("HRPG.TraitCatalogFailed"));
    }
  }
  const [created] = await this.actor.createEmbeddedDocuments("Item", [{
    name: game.i18n.localize(CONFIG.HRPG.itemTypes[type]),
    type
  }]);
  created?.sheet.render(true);
}

async function addPathAction(_event, target) {
  const select = target.closest(".paths-panel")?.querySelector("[data-path-select]");
  const sourceId = select?.value;
  if (!sourceId) return ui.notifications.warn(game.i18n.localize("HRPG.ChoosePathFirst"));
  if (this.actor.items.some((item) => item.type === "path" && item.system.sourceId === sourceId)) {
    return ui.notifications.warn(game.i18n.localize("HRPG.PathAlreadyAdded"));
  }
  const path = (await loadPathCatalog()).find((entry) => entry.sourceId === sourceId);
  if (!path) return ui.notifications.error(game.i18n.localize("HRPG.PathNotFound"));
  const [created] = await this.actor.createEmbeddedDocuments("Item", [pathItemData(path)]);
  created?.sheet.render(true);
}

function openItemAction(_event, target) {
  this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
}

async function deleteItemAction(event, target) {
  event.stopPropagation();
  const item = this.actor.items.get(target.dataset.itemId);
  if (!item) return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("HRPG.DeleteItem") },
    content: `<p>${game.i18n.format("HRPG.DeleteItemConfirm", { name: foundry.utils.escapeHTML(item.name) })}</p>`,
    modal: true
  });
  if (!confirmed) return;
  const ids = [item.id];
  if (item.type === "trait" && item.system.sourceId) {
    ids.push(...this.actor.items
      .filter((candidate) => candidate.type === "trait" && candidate.system.parentTrait === item.system.sourceId)
      .map((candidate) => candidate.id));
  }
  await this.actor.deleteEmbeddedDocuments("Item", ids);
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

async function rollTraitAttackAction(_event, target) {
  await this.actor.rollTraitAttack(target.dataset.itemId);
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
      "add-path": addPathAction,
      "open-item": openItemAction,
      "delete-item": deleteItemAction,
      "select-tab": selectTabAction,
      "roll-secondary": rollSecondaryAction,
      "roll-trait-attack": rollTraitAttackAction,
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
    const selectedMilestone = Number(system.advancement.milestone) || 0;
    context.milestoneOptions = Array.from({ length: 6 }, (_, value) => ({
      value,
      hint: game.i18n.localize(`HRPG.Milestone${value}`),
      selected: value === selectedMilestone
    }));
    context.milestoneTooltip = game.i18n.localize(`HRPG.Milestone${selectedMilestone}`);
    const activeTraits = this.actor.items.filter((item) => item.type === "trait" && item.system.active !== false);
    context.quickAttacks = quickAttacksFromItems(activeTraits);
    const activePaths = this.actor.items.filter((item) => item.type === "path");
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
    const ownedPathIds = new Set((context.itemsByType.path ?? []).map((item) => item.system.sourceId));
    context.pathCatalog = (await loadPathCatalog()).map((path) => ({
      ...path,
      disabled: ownedPathIds.has(path.sourceId)
    }));
    context.inventoryItemTypes = Object.fromEntries(
      Object.entries(CONFIG.HRPG.itemTypes).filter(([type]) => !["trait", "path", "skill", "charm", "art", "spell"].includes(type))
    );
    const adjustments = system.adjustments ?? {};
    const speedSpent = Number(system.combat?.speedSpent) || 0;
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
    const directBases = {
      speed: system.secondary.speed,
      hunger: system.secondary.hunger.value,
      appeal: system.secondary.appeal,
      dread: system.secondary.dread,
      marks: system.secondary.marks.max
    };
    const derivedFrom = {
      maneuver: ["HRPG.AttributeGrace", system.effective.attributes.grace.value, "HRPG.RoundedUp"],
      load: ["HRPG.AttributePower", system.effective.attributes.power.value, "HRPG.RoundedDown"],
      beltSize: ["HRPG.AttributeShell", system.effective.attributes.shell.value, "HRPG.RoundedDown"],
      techniqueSlots: ["HRPG.AttributeInsight", system.effective.attributes.insight.value, "HRPG.RoundedDown"]
    };
    context.secondaryRows = Object.entries(secondaryValues).map(([key, permanent]) => {
      const adjustment = Number(adjustments[key]) || 0;
      const current = currentStatValue(permanent, adjustment) - (key === "speed" ? speedSpent : 0);
      const lines = [];
      if (key in directBases) {
        lines.push(`${templateLabel}: ${signed(directBases[key])}`);
        for (const trait of activeTraits) {
          const value = Number(trait.system.modifiers?.[key]) || 0;
          if (value !== 0) lines.push(`${trait.name}: ${signed(value)}`);
        }
        if (key === "marks") {
          for (const path of activePaths) {
            const value = Number(path.system.rank) || 0;
            if (value !== 0) lines.push(`${path.name}: ${signed(value)}`);
          }
        }
      } else {
        const [sourceLabel, sourceValue, roundingLabel] = derivedFrom[key];
        lines.push(`${game.i18n.localize(sourceLabel)}: ${sourceValue}`);
        lines.push(`${game.i18n.localize(roundingLabel)}: ${permanent}`);
        if (key === "load") {
          for (const trait of activeTraits) {
            const value = Number(trait.system.modifiers?.load) || 0;
            if (value !== 0) lines.push(`${trait.name}: ${signed(value)}`);
          }
        }
      }
      lines.push(`${game.i18n.localize("HRPG.PermanentValue")}: ${permanent}`);
      if (adjustment !== 0) lines.push(`${game.i18n.localize("HRPG.TemporaryAdjustment")}: ${signed(adjustment)}`);
      if (key === "speed" && speedSpent !== 0) lines.push(`${game.i18n.localize("HRPG.SpeedSpent")}: -${speedSpent}`);
      lines.push(`${game.i18n.localize("HRPG.CurrentValue")}: ${current}`);
      return { key, label: labels[key], permanent, current, tooltip: lines.join("\n"), rollable: key === "speed" };
    });
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
        const spent = key === "speed" ? Number(this.actor.system.combat?.speedSpent) || 0 : 0;
        await this.actor.update({ [`system.adjustments.${key}`]: statAdjustment(current + spent, permanent) });
      });
    }
  }
}

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}
