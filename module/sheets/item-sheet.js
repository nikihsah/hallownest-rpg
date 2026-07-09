import { isNaturalWeaponTrait, naturalWeaponQualityMax, naturalWeaponQualityValue } from "../mechanics/trait-quality.js";
import { itemModificationOptions, selectedItemModification } from "../data/item-modifications.js";

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
    context.itemModificationOptions = itemModificationOptions(context.item)
      .map((modification) => ({ ...modification, selected: modification.key === context.system.modification }));
    context.selectedItemModification = selectedItemModification(context.item);
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
  }
}

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}
