import { rollDicePool } from "../mechanics/dice-pool.js";
import { applySizeTemplate } from "../mechanics/size-templates.js";
import { calculateAttributeState } from "../mechanics/attribute-state.js";
import { maneuverFromGrace } from "../mechanics/stat-adjustments.js";
import { quickAttackFromTrait } from "../mechanics/trait-attacks.js";

export class HallownestActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type !== "bug") return;

    const system = this.system;
    const modifierKeys = ["power", "insight", "shell", "grace", "heart", "stamina", "soul", "speed", "hunger", "appeal", "dread", "marks", "load"];
    const modifiers = Object.fromEntries(modifierKeys.map((key) => [key, 0]));
    for (const trait of this.items.filter((item) => item.type === "trait" && item.system.active !== false)) {
      for (const key of modifierKeys) modifiers[key] += Number(trait.system.modifiers?.[key]) || 0;
    }
    const pathModifiers = { marks: 0, stamina: 0, soul: 0 };
    for (const path of this.items.filter((item) => item.type === "path")) {
      const rank = Math.max(0, Number(path.system.rank) || 0);
      pathModifiers.marks += rank;
      if (path.system.category === "mystic") pathModifiers.soul += rank;
      else pathModifiers.stamina += rank;
    }

    const effectiveAttributes = calculateAttributeState(system.attributes, modifiers);
    const effectiveResources = Object.fromEntries(
      ["heart", "stamina", "soul"].map((key) => [key, {
        value: Number(system.resources[key]?.value) || 0,
        max: cappedResourceMax(key, (Number(system.resources[key]?.max) || 0) + modifiers[key] + (pathModifiers[key] || 0))
      }])
    );
    const effectiveSecondary = {
      speed: (Number(system.secondary.speed) || 0) + modifiers.speed,
      hunger: (Number(system.secondary.hunger.value) || 0) + modifiers.hunger,
      appeal: (Number(system.secondary.appeal) || 0) + modifiers.appeal,
      dread: (Number(system.secondary.dread) || 0) + modifiers.dread,
      marks: (Number(system.secondary.marks.max) || 0) + modifiers.marks + pathModifiers.marks
    };

    system.effective = { attributes: effectiveAttributes, resources: effectiveResources, secondary: effectiveSecondary, modifiers, pathModifiers };
    system.derived = {
      load: Math.floor(effectiveAttributes.power.value) + modifiers.load,
      beltSize: Math.floor(effectiveAttributes.shell.value),
      techniqueSlots: Math.floor(effectiveAttributes.insight.value),
      maneuver: maneuverFromGrace(effectiveAttributes.grace.value),
      carriedWeight: this.items.reduce((total, item) => {
      const quantity = Number(item.system.quantity) || 0;
      const weight = Number(item.system.weight) || 0;
      return total + quantity * weight;
      }, 0)
    };

    system.resources.satiety.max = Math.max(effectiveSecondary.hunger, 10);
  }

  rollAttribute(attributeKey) {
    const value = Number(this.system.effective?.attributes?.[attributeKey]?.value) || 0;
    const modifier = this.items
      .filter((item) => item.type === "condition")
      .reduce((total, item) => total + (Number(item.system.diceModifier) || 0), 0);

    return rollDicePool({
      actor: this,
      dice: Math.floor(value) + modifier,
      reroll: value % 1 >= 0.5,
      label: game.i18n.localize(CONFIG.HRPG.attributes[attributeKey] ?? attributeKey)
    });
  }

  rollSecondary(secondaryKey) {
    if (secondaryKey !== "speed") return null;
    const value = Math.max(0,
      (Number(this.system.effective.secondary.speed) || 0)
      + (Number(this.system.adjustments?.speed) || 0)
      - (Number(this.system.combat?.speedSpent) || 0)
    );
    return rollDicePool({ actor: this, dice: Math.floor(value), label: game.i18n.localize("HRPG.Speed") });
  }

  rollTraitAttack(itemId) {
    const item = this.items.get(itemId);
    if (!item) return null;
    const value = Number(this.system.effective?.attributes?.power?.value) || 0;
    const damage = quickAttackFromTrait(item)?.damage ?? "";
    const label = game.i18n.format("HRPG.TraitAttackRoll", {
      name: item.name,
      damage: damage ? game.i18n.format("HRPG.DamageValue", { damage }) : game.i18n.localize("HRPG.DamageUnspecified")
    });
    return rollDicePool({
      actor: this,
      dice: Math.floor(value),
      reroll: value % 1 >= 0.5,
      label
    });
  }

  async applySizeTemplate(size) {
    return applySizeTemplate(this, size);
  }
}

function cappedResourceMax(key, value) {
  const number = Number(value) || 0;
  return ["stamina", "soul"].includes(key) ? Math.min(7, number) : number;
}
