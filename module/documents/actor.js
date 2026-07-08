import { rollDicePool } from "../mechanics/dice-pool.js";

export class HallownestActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type !== "bug") return;

    const system = this.system;
    const modifierKeys = ["power", "insight", "shell", "grace", "heart", "stamina", "soul", "speed", "hunger", "appeal", "dread", "marks"];
    const modifiers = Object.fromEntries(modifierKeys.map((key) => [key, 0]));
    for (const trait of this.items.filter((item) => item.type === "trait" && item.system.active !== false)) {
      for (const key of modifierKeys) modifiers[key] += Number(trait.system.modifiers?.[key]) || 0;
    }

    const effectiveAttributes = Object.fromEntries(
      ["power", "insight", "shell", "grace"].map((key) => [key, {
        value: (Number(system.attributes[key]?.value) || 0) + modifiers[key]
      }])
    );
    const effectiveResources = Object.fromEntries(
      ["heart", "stamina", "soul"].map((key) => [key, {
        value: Number(system.resources[key]?.value) || 0,
        max: (Number(system.resources[key]?.max) || 0) + modifiers[key]
      }])
    );
    const effectiveSecondary = {
      speed: (Number(system.secondary.speed) || 0) + modifiers.speed,
      hunger: (Number(system.secondary.hunger.value) || 0) + modifiers.hunger,
      appeal: (Number(system.secondary.appeal) || 0) + modifiers.appeal,
      dread: (Number(system.secondary.dread) || 0) + modifiers.dread,
      marks: (Number(system.secondary.marks.max) || 0) + modifiers.marks
    };

    system.effective = { attributes: effectiveAttributes, resources: effectiveResources, secondary: effectiveSecondary, modifiers };
    system.derived = {
      load: Math.floor(effectiveAttributes.power.value),
      beltSize: Math.floor(effectiveAttributes.shell.value),
      techniqueSlots: Math.floor(effectiveAttributes.insight.value),
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

  async applySizeTemplate(size) {
    const templates = {
      small: { attributes: [2, 3, 3, 4], heart: 6, speed: 7, hunger: [-1, 15], appeal: 1.5, dread: 1, socialBonus: 1 },
      medium: { attributes: [3, 3, 3, 3], heart: 7, speed: 6, hunger: [4, 20], appeal: 1, dread: 1, socialBonus: 1.5 },
      large: { attributes: [4, 3, 4, 2], heart: 8, speed: 5, hunger: [9, 25], appeal: 1, dread: 1.5, socialBonus: 1 }
    };
    const selected = templates[size];
    if (!selected) throw new Error(`Unknown size template: ${size}`);
    const [power, insight, shell, grace] = selected.attributes;
    return this.update({
      "system.attributes.power.value": power,
      "system.attributes.insight.value": insight,
      "system.attributes.shell.value": shell,
      "system.attributes.grace.value": grace,
      "system.resources.heart.value": selected.heart,
      "system.resources.heart.max": selected.heart,
      "system.resources.stamina.value": 3,
      "system.resources.stamina.max": 3,
      "system.resources.soul.value": 3,
      "system.resources.soul.max": 3,
      "system.secondary.size": size,
      "system.secondary.speed": selected.speed,
      "system.secondary.hunger.value": selected.hunger[0],
      "system.secondary.hunger.max": selected.hunger[1],
      "system.secondary.appeal": selected.appeal,
      "system.secondary.dread": selected.dread,
      "system.secondary.socialBonus": selected.socialBonus,
      "system.creation.templateApplied": true
    });
  }
}
