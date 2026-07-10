import { isNaturalWeaponTrait, naturalWeaponQualityMax, naturalWeaponQualityValue } from "../mechanics/trait-quality.js";
import { itemModificationOptions, selectedItemModification } from "../data/item-modifications.js";
import { loadItemCatalog } from "../data/item-catalog.js";
import { isFluidsSubtrait, normalizeVialEffectSelection, vialEffectOptionsFromItems } from "../data/vial-effects.js";
import { skillRowsForItem } from "../mechanics/skills.js";

export class HallownestItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hrpg", "sheet", "item"],
      width: 560,
      height: 520,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = context.item.system ?? {};
    context.pathRankOptions = { 1: "1", 2: "2", 3: "3" };
    context.skillRankOptions = { 1: "1", 2: "2", 3: "3" };
    context.itemModificationOptions = itemModificationOptions(context.item)
      .map((modification) => ({ ...modification, selected: modification.key === context.system.modification }));
    context.selectedItemModification = selectedItemModification(context.item);
    context.isTechniqueItem = ["art", "spell"].includes(context.item.type);
    context.attachmentRows = Object.entries(context.system.attachments ?? { one: "", two: "", three: "" })
      .map(([key, value]) => ({ key, value }));
    if (context.isTechniqueItem) {
      context.techniqueTypeOptions = {
        boost: "HRPG.TechniqueType.boost",
        normal: "HRPG.TechniqueType.normal",
        reaction: "HRPG.TechniqueType.reaction",
        special: "HRPG.TechniqueType.special",
        unique: "HRPG.TechniqueType.unique",
        secret: "HRPG.TechniqueType.secret"
      };
    }
    if (context.item.type === "skill") {
      context.skillRows = skillRowsForItem(context.item);
      context.skillMasteryOptions = Object.fromEntries(
        context.skillRows
          .map((row) => String(row.name ?? "").trim())
          .filter(Boolean)
          .map((name) => [name, name])
      );
    }
    if (context.item.type === "trait") {
      const modifierLabels = {
        power: "HRPG.AttributePower",
        insight: "HRPG.AttributeInsight",
        shell: "HRPG.AttributeShell",
        grace: "HRPG.AttributeGrace",
        heart: "HRPG.ResourceHeart",
        stamina: "HRPG.ResourceStamina",
        soul: "HRPG.ResourceSoul",
        speed: "HRPG.Speed",
        hunger: "HRPG.Hunger",
        appeal: "HRPG.Appeal",
        dread: "HRPG.Dread",
        marks: "HRPG.Marks",
        load: "HRPG.Load"
      };
      context.traitModifierRows = Object.entries(context.system.modifiers ?? {})
        .map(([key, value]) => ({ key, value: Number(value) || 0, label: modifierLabels[key] ?? key }))
        .filter((modifier) => modifier.value !== 0)
        .map((modifier) => ({ ...modifier, signed: signed(modifier.value), positive: modifier.value > 0 }));
      context.traitCategoryLabel = context.system.category ? `HRPG.TraitCategory.${context.system.category}` : "";
      context.traitQualityEditable = isNaturalWeaponTrait(context.item);
      context.traitQualityValue = naturalWeaponQualityValue(context.item);
      context.traitQualityMax = naturalWeaponQualityMax(context.item);
      context.fluidVialEffectEditable = isFluidsSubtrait(context.item);
      if (context.fluidVialEffectEditable) {
        const options = vialEffectOptionsFromItems(await loadItemCatalog());
        this.fluidVialEffectOptions = options;
        context.fluidVialEffectOptions = options.map((option) => ({
          ...option,
          selected: option.sourceId === context.system.vialEffect?.sourceId
        }));
        context.selectedFluidVialEffect = options.find((option) => option.sourceId === context.system.vialEffect?.sourceId)
          ?? (context.system.vialEffect?.sourceId ? context.system.vialEffect : null);
      }
    }
    return context;
  }

  get template() {
    return "systems/hallownest-rpg/templates/item/item-sheet.hbs";
  }

  activateListeners(html) {
    super.activateListeners(html);
    const element = html?.[0];
    if (!element) return;
    element.scrollTop = this.sheetScrollTop ?? 0;
    element.addEventListener("scroll", () => {
      this.sheetScrollTop = element.scrollTop;
    }, { passive: true });
    for (const button of element.querySelectorAll("[data-attachment-picker]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const key = event.currentTarget.dataset.attachmentPicker;
        new FilePicker({
          type: "any",
          current: this.item.system?.attachments?.[key] ?? "",
          callback: (path) => this.item.update({ [`system.attachments.${key}`]: path })
        }).render(true);
      });
    }
    element.querySelector("[data-vial-effect-select]")?.addEventListener("change", async (event) => {
      const sourceId = event.currentTarget.value;
      const option = (this.fluidVialEffectOptions ?? []).find((entry) => entry.sourceId === sourceId);
      await this.item.update({ "system.vialEffect": normalizeVialEffectSelection(option) });
    });
  }
}

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}
