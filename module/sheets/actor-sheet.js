import { applySizeTemplate } from "../mechanics/size-templates.js";
import { attributeBreakdown, storedAttributeValue } from "../mechanics/attribute-state.js";
import { currentStatValue, statAdjustment } from "../mechanics/stat-adjustments.js";
import { restActor } from "../mechanics/rest.js";
import { loadPathCatalog, pathItemData } from "../data/path-catalog.js";
import { TraitCatalogApplication } from "../applications/trait-catalog.js";
import { ItemCatalogApplication } from "../applications/item-catalog.js";
import { isNaturalWeaponTrait, naturalWeaponQualityMax, naturalWeaponQualityValue } from "../mechanics/trait-quality.js";
import { isTechniqueType, techniqueSlotsSummary } from "../data/technique-catalog.js";

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
  if (["weapon", "armor", "charm", "gear", "consumable", "art", "spell"].includes(type)) {
    try {
      this.itemCatalogs ??= {};
      this.itemCatalogs[type] ??= new ItemCatalogApplication(this.actor, {
        id: `hrpg-item-catalog-${this.actor.id}-${type}`,
        catalogType: type
      });
      return await this.itemCatalogs[type].render({ force: true });
    } catch (error) {
      console.error("Hallownest RPG | Failed to open item catalog", error);
      return ui.notifications.error(game.i18n.localize("HRPG.ItemCatalogFailed"));
    }
  }
  const [created] = await this.actor.createEmbeddedDocuments("Item", [{
    name: game.i18n.localize(CONFIG.HRPG.itemTypes[type]),
    type
  }]);
  renderDocumentSheet(created);
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
  renderDocumentSheet(created);
}

function openItemAction(_event, target) {
  const itemId = target.dataset.itemId ?? target.closest("[data-open-item-id]")?.dataset.openItemId ?? target.closest("[data-item-id]")?.dataset.itemId;
  openEmbeddedItem(this.actor, itemId);
}

function openEmbeddedItem(actor, itemId) {
  if (!itemId) return;
  renderDocumentSheet(actor.items.get(itemId));
}

function renderDocumentSheet(document) {
  const sheet = document?.sheet;
  if (!sheet) return;
  const ApplicationV2 = foundry.applications?.api?.ApplicationV2;
  if (ApplicationV2 && sheet instanceof ApplicationV2) return sheet.render({ force: true });
  return sheet.render(true);
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
      .filter((candidate) => candidate.type === "trait"
        && candidate.system.parentTrait === item.system.sourceId
        && (candidate.system.parentItemId ? candidate.system.parentItemId === item.id : true))
      .map((candidate) => candidate.id));
  }
  await this.actor.deleteEmbeddedDocuments("Item", ids);
}

function selectTabAction(_event, target) {
  const tab = target.dataset.tab;
  this.activeTab = tab;
  this.sheetScrollTop = 0;
  const root = target.closest("form");
  activateActorSheetTab(root, tab);
  root?.querySelector(".sheet-body")?.scrollTo({ top: 0 });
}

async function rollSecondaryAction(_event, target) {
  await this.actor.rollSecondary(target.dataset.secondary);
}

async function restAction() {
  const result = await restActor(this.actor);
  ui.notifications.info(game.i18n.format("HRPG.RestComplete", { satiety: result.nextSatiety }));
}

function choosePortraitAction() {
  openActorPortraitPicker(this.actor);
}

function openActorPortraitPicker(actor) {
  new FilePicker({
    type: "image",
    current: actor.img,
    callback: (path) => actor.update({ img: path })
  }).render(true);
}

export class HallownestActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["hrpg", "sheet", "actor"],
    position: { width: 760, height: 720 },
    window: { resizable: true },
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
      "rest": restAction,
      "choose-portrait": choosePortraitAction
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
    const adjustments = system.adjustments ?? {};
    const ordinaryTraits = (context.itemsByType.trait ?? []).filter((item) => item.system?.kind !== "subtrait");
    context.traitCounter = {
      current: ordinaryTraits.length,
      max: Number(system.traits?.max) || 0
    };
    context.traitRows = (context.itemsByType.trait ?? []).map((trait) => ({
      id: trait.id,
      img: trait.img,
      name: trait.name,
      system: trait.system,
      qualityEditable: isNaturalWeaponTrait(trait),
      qualityValue: naturalWeaponQualityValue(trait),
      qualityMax: naturalWeaponQualityMax(trait)
    }));
    context.charmRows = (context.itemsByType.charm ?? []).map((item) => ({
      id: item.id,
      img: item.img,
      name: item.name,
      system: item.system,
      notches: Math.max(0, Number(item.system?.notches) || 0),
      equipped: item.system?.equipped === true
    }));
    const equippedCharmRows = context.charmRows.filter((item) => item.equipped);
    const usedCharmMarks = equippedCharmRows.reduce((total, item) => total + item.notches, 0);
    const maximumCharmMarks = Math.max(0, currentStatValue(system.effective.secondary.marks, Number(adjustments.marks) || 0));
    context.charmSlots = {
      used: usedCharmMarks,
      maximum: maximumCharmMarks,
      remaining: maximumCharmMarks - usedCharmMarks,
      overage: Math.max(0, usedCharmMarks - maximumCharmMarks),
      over: usedCharmMarks > maximumCharmMarks,
      tooltip: [
        `${game.i18n.localize("HRPG.CharmMarksUsed")}: ${usedCharmMarks}`,
        `${game.i18n.localize("HRPG.Marks")}: ${maximumCharmMarks}`,
        ...equippedCharmRows.map((item) => `• ${item.name}: ${item.notches}`)
      ].join("\n")
    };
    const techniqueSlots = techniqueSlotsSummary(this.actor);
    context.techniqueSlots = {
      ...techniqueSlots,
      tooltip: [
        `${game.i18n.localize("HRPG.TechniqueSlotsUsed")}: ${techniqueSlots.used}`,
        `${game.i18n.localize("HRPG.TechniqueSlots")}: ${techniqueSlots.maximum}`,
        `${game.i18n.localize("HRPG.TechniqueSlotsRemaining")}: ${techniqueSlots.remaining}`,
        ...techniqueSlots.prepared.map((name) => `• ${name}`)
      ].join("\n")
    };
    context.artRows = (context.itemsByType.art ?? []).map((item) => techniqueRow(item));
    context.spellRows = (context.itemsByType.spell ?? []).map((item) => techniqueRow(item));
    const ownedPathIds = new Set((context.itemsByType.path ?? []).map((item) => item.system.sourceId));
    context.pathCatalog = (await loadPathCatalog()).map((path) => ({
      ...path,
      disabled: ownedPathIds.has(path.sourceId)
    }));
    context.inventoryItemTypes = Object.fromEntries(
      Object.entries(CONFIG.HRPG.itemTypes).filter(([type]) => !["trait", "path", "skill", "charm", "art", "spell"].includes(type))
    );
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
      if (adjustment !== 0) lines.push(`${game.i18n.localize("HRPG.TemporaryAdjustment")}: ${signed(adjustment)}`);
      if (key === "speed" && speedSpent !== 0) lines.push(`${game.i18n.localize("HRPG.SpeedSpent")}: -${speedSpent}`);
      if (key === "hunger") lines.push(`${game.i18n.localize("HRPG.TemplateHungerLimit")}: ${system.secondary.hunger.max}`);
      return { key, label: labels[key], permanent, current, tooltip: lines.join("\n"), rollable: key === "speed" };
    });
    const carriedWeight = Number(system.derived.carriedWeight) || 0;
    const loadMaximum = Number(system.derived.load) || 0;
    context.loadSummary = {
      current: formatNumber(carriedWeight),
      maximum: formatNumber(loadMaximum),
      over: carriedWeight > loadMaximum,
      overage: formatNumber(Math.max(0, carriedWeight - loadMaximum)),
      tooltip: [
        `${game.i18n.localize("HRPG.CarriedWeight")}: ${formatNumber(carriedWeight)}`,
        `${game.i18n.localize("HRPG.LoadMaximum")}: ${formatNumber(loadMaximum)}`,
        ...(carriedWeight > loadMaximum ? [`${game.i18n.localize("HRPG.LoadOverage")}: ${formatNumber(carriedWeight - loadMaximum)}`] : [])
      ].join("\n")
    };
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const activeTab = this.activeTab ?? "overview";
    activateActorSheetTab(this.element, activeTab);
    const sheetBody = this.element.querySelector(".sheet-body");
    if (sheetBody) {
      sheetBody.scrollTop = this.sheetScrollTop ?? 0;
      sheetBody.addEventListener("scroll", () => {
        this.sheetScrollTop = sheetBody.scrollTop;
      }, { passive: true });
    }
    this.element.querySelector("[data-actor-portrait]")?.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      openActorPortraitPicker(this.actor);
    });
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
    for (const input of this.element.querySelectorAll("[data-trait-quality]")) {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const item = this.actor.items.get(event.currentTarget.dataset.traitQuality);
        if (!item) return;
        await item.update({ "system.quality.value": Number(event.currentTarget.value) || 0 });
      });
    }
    for (const input of this.element.querySelectorAll("[data-trait-quality-max]")) {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const item = this.actor.items.get(event.currentTarget.dataset.traitQualityMax);
        if (!item) return;
        await item.update({ "system.quality.max": Math.max(0, Number(event.currentTarget.value) || 0) });
      });
    }
    for (const input of this.element.querySelectorAll("[data-item-equipped]")) {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const item = this.actor.items.get(event.currentTarget.dataset.itemEquipped);
        if (!item) return;
        await item.update({ "system.equipped": event.currentTarget.checked });
      });
    }
    for (const input of this.element.querySelectorAll("[data-technique-prepared]")) {
      input.addEventListener("change", async (event) => {
        event.stopPropagation();
        const item = this.actor.items.get(event.currentTarget.dataset.techniquePrepared);
        if (!item || !isTechniqueType(item.type)) return;
        const summary = techniqueSlotsSummary(this.actor);
        if (event.currentTarget.checked && summary.used >= summary.maximum) {
          event.currentTarget.checked = false;
          return ui.notifications.warn(game.i18n.localize("HRPG.TechniqueSlotsFull"));
        }
        await item.update({ "system.prepared": event.currentTarget.checked });
      });
    }
    for (const row of this.element.querySelectorAll("[data-action='open-item'][data-item-id]")) {
      row.addEventListener("click", (event) => {
        if (event.target.closest("[data-action='delete-item']")) return;
        openEmbeddedItem(this.actor, row.dataset.itemId);
      });
    }
    this.element.addEventListener("click", (event) => {
      const row = event.target.closest("[data-open-item-id]");
      if (!row || event.target.closest("[data-action='delete-item'], input, select, textarea, button, a")) return;
      event.preventDefault();
      openEmbeddedItem(this.actor, row.dataset.openItemId);
    });
    this.element.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      if (event.target.closest("input, select, textarea, button, a")) return;
      const row = event.target.closest("[data-open-item-id]");
      if (!row) return;
      event.preventDefault();
      openEmbeddedItem(this.actor, row.dataset.openItemId);
    });
  }
}

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "");
}

function techniqueRow(item) {
  const cost = item.system?.cost ?? {};
  return {
    id: item.id,
    img: item.img,
    name: item.name,
    system: item.system,
    prepared: item.system?.prepared === true,
    costLabel: cost.raw || [
      Number(cost.stamina) ? `${cost.stamina} ${globalThis.game?.i18n?.localize?.("HRPG.ResourceStamina") ?? "stamina"}` : "",
      Number(cost.soul) ? `${cost.soul} ${globalThis.game?.i18n?.localize?.("HRPG.ResourceSoul") ?? "soul"}` : "",
      Number(cost.essence) ? `${cost.essence} ${globalThis.game?.i18n?.localize?.("HRPG.ResourceEssence") ?? "essence"}` : ""
    ].filter(Boolean).join(", "),
    meta: [item.system?.pathName, item.system?.techniqueType, item.system?.requirementLabel].filter(Boolean).join(" · ")
  };
}

function activateActorSheetTab(root, tab) {
  root?.querySelectorAll(".sheet-tabs [data-tab]").forEach((element) => element.classList.toggle("active", element.dataset.tab === tab));
  root?.querySelectorAll(".sheet-body > .tab").forEach((element) => element.classList.toggle("active", element.dataset.tab === tab));
}
