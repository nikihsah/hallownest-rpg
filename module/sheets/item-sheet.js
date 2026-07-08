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
    context.pathRankOptions = { 1: "1", 2: "2", 3: "3" };
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
    }
    return context;
  }

  get template() {
    return "systems/hallownest-rpg/templates/item/item-sheet.hbs";
  }
}

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}
