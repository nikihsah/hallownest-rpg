import { rollDicePool } from "../mechanics/dice-pool.js";

export class HallownestActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type !== "bug") return;

    const system = this.system;
    system.derived = {
      load: Math.floor(Number(system.attributes.power?.value) || 0),
      beltSize: Math.floor(Number(system.attributes.shell?.value) || 0),
      techniqueSlots: Math.floor(Number(system.attributes.insight?.value) || 0),
      carriedWeight: this.items.reduce((total, item) => {
      const quantity = Number(item.system.quantity) || 0;
      const weight = Number(item.system.weight) || 0;
      return total + quantity * weight;
      }, 0)
    };

    system.resources.satiety.max = Math.max(Number(system.secondary.hunger.value) || 0, 10);
  }

  rollAttribute(attributeKey) {
    const value = Number(this.system.attributes?.[attributeKey]?.value) || 0;
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
      "system.secondary.socialBonus": selected.socialBonus
    });
  }
}
