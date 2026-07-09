import { rollDicePool } from "../mechanics/dice-pool.js";
import { applySizeTemplate } from "../mechanics/size-templates.js";
import { calculateAttributeState } from "../mechanics/attribute-state.js";
import { maneuverFromGrace } from "../mechanics/stat-adjustments.js";
import { quickAttacksFromItems } from "../mechanics/trait-attacks.js";
import { naturalWeaponQualityValue } from "../mechanics/trait-quality.js";
import { applyPathAttackOptions } from "../mechanics/path-abilities.js";

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
    const labels = { speed: "HRPG.Speed", appeal: "HRPG.Appeal", dread: "HRPG.Dread" };
    if (!(secondaryKey in labels)) return null;
    const speedPenalty = secondaryKey === "speed" ? Number(this.system.combat?.speedSpent) || 0 : 0;
    const value = Math.max(0,
      (Number(this.system.effective.secondary[secondaryKey]) || 0)
      + (Number(this.system.adjustments?.[secondaryKey]) || 0)
      - speedPenalty
    );
    return rollDicePool({ actor: this, dice: Math.floor(value), label: game.i18n.localize(labels[secondaryKey]) });
  }

  async spendCombatStamina(cost = 0) {
    const spent = Math.max(0, Math.floor(Number(cost) || 0));
    if (spent <= 0) return true;
    const current = Number(this.system.resources?.stamina?.value) || 0;
    const next = Math.max(0, current - spent);
    await this.update({ "system.resources.stamina.value": next });
    if (current < spent) ui.notifications.warn(game.i18n.localize("HRPG.StaminaExceeded"));
    return current >= spent;
  }

  async spendAttackStamina({ invested = 0, taxAsDice = false } = {}) {
    const inCombat = Boolean(game.combat?.started);
    const tax = inCombat ? Math.max(0, Math.floor(Number(this.system.combat?.attackTax) || 0)) : 0;
    const base = 1;
    const investedStamina = Math.max(0, Math.floor(Number(invested) || 0));
    await this.spendCombatStamina(base + investedStamina + tax);
    if (inCombat) await this.update({ "system.combat.attackTax": tax + 1 });
    return {
      base,
      invested: investedStamina,
      tax,
      dice: investedStamina + (taxAsDice ? tax : 0),
      totalCost: base + investedStamina + tax
    };
  }

  async rollDefenseAction(actionKey, { bonusDice = 0, staminaCost = 0, attribute = "" } = {}) {
    const actions = {
      protection: { label: "HRPG.DefenseAction", attribute: "" },
      dodge: { label: "HRPG.Dodge", attribute: "grace" },
      parry: { label: "HRPG.Parry", attribute: "power" },
      absorption: { label: "HRPG.DamageAbsorption", attribute: "shell" }
    };
    const action = actions[actionKey];
    if (!action) return null;
    await this.spendCombatStamina(staminaCost);
    const attributeKey = attribute || action.attribute;
    if (!action.attribute) {
      return ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: `<strong>${foundry.utils.escapeHTML(game.i18n.localize(action.label))}</strong><br>${foundry.utils.escapeHTML(game.i18n.localize("HRPG.DefenseActionHint"))}`
      });
    }
    return this.rollAttributeDefense(attributeKey, {
      label: game.i18n.localize(action.label),
      bonusDice,
      notes: [game.i18n.format("HRPG.DefenseStaminaSpent", { cost: Math.max(0, Math.floor(Number(staminaCost) || 0)) })]
    });
  }

  rollAttributeDefense(attributeKey, { label, bonusDice = 0, notes = [] } = {}) {
    const isSecondary = ["speed", "appeal", "dread"].includes(attributeKey);
    const value = isSecondary
      ? Math.max(0, (Number(this.system.effective?.secondary?.[attributeKey]) || 0) + (Number(this.system.adjustments?.[attributeKey]) || 0) - (attributeKey === "speed" ? Number(this.system.combat?.speedSpent) || 0 : 0))
      : Number(this.system.effective?.attributes?.[attributeKey]?.value) || 0;
    const dice = Math.floor(value) + Math.floor(Number(bonusDice) || 0);
    const attributeLabel = game.i18n.localize(CONFIG.HRPG.attributes?.[attributeKey] ?? secondaryDefenseLabels[attributeKey] ?? attributeKey);
    return rollDicePool({
      actor: this,
      dice,
      reroll: value % 1 >= 0.5,
      label: game.i18n.format("HRPG.DefenseRoll", {
        action: label ?? game.i18n.localize(CONFIG.HRPG.attributes[attributeKey] ?? attributeKey),
        attribute: attributeLabel
      }),
      notes: [
        game.i18n.format("HRPG.DefenseAttributeUsed", { attribute: attributeLabel, dice }),
        ...notes
      ]
    });
  }

  rollAbsorption(attributeKey = "shell", options = {}) {
    return this.rollAttributeDefense(attributeKey, {
      label: game.i18n.localize("HRPG.Absorption"),
      bonusDice: options.bonusDice
    });
  }

  async rollTraitAttack(itemId, { investedStamina = 0, pathOptions = [] } = {}) {
    const item = this.items.get(itemId);
    if (!item) return null;
    const baseAttack = baseAttackConfig(this, item);
    const attackOptions = applyPathAttackOptions({ attribute: baseAttack.attribute, successThreshold: 5 }, pathOptions);
    const stamina = await this.spendAttackStamina({ invested: investedStamina, taxAsDice: attackOptions.taxAsDice });
    const attributeKey = attackOptions.attribute;
    const value = Number(this.system.effective?.attributes?.[attributeKey]?.value) || 0;
    const quality = item.type === "weapon" ? weaponQualityValue(item) : Math.max(0, Math.floor(naturalWeaponQualityValue(item)));
    const damage = quickAttacksFromItems(this.items).find((attack) => attack.itemId === itemId)?.damage ?? "";
    const label = game.i18n.format("HRPG.TraitAttackRoll", {
      name: item.name,
      damage: damage ? game.i18n.format("HRPG.DamageValue", { damage }) : game.i18n.localize("HRPG.DamageUnspecified")
    });
    return rollDicePool({
      actor: this,
      dice: Math.floor(value) + quality + stamina.dice + attackOptions.bonusDice,
      reroll: value % 1 >= 0.5,
      successThreshold: attackOptions.successThreshold,
      label,
      notes: [
        game.i18n.format("HRPG.AttackStaminaSpent", { base: stamina.base, invested: stamina.invested, tax: stamina.tax, total: stamina.totalCost }),
        game.i18n.format("HRPG.AttackAttributeUsed", { attribute: game.i18n.localize(CONFIG.HRPG.attributes[attributeKey] ?? attributeKey) }),
        ...baseAttack.notes,
        ...attackOptions.notes
      ]
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

const secondaryDefenseLabels = { speed: "HRPG.Speed", appeal: "HRPG.Appeal", dread: "HRPG.Dread" };

function baseAttackConfig(actor, item) {
  if (item.type !== "weapon") return { attribute: "power", notes: [] };
  const weight = Number(item.system?.weight) || 0;
  const weaponText = [item.name, item.system?.itemType, item.system?.subtype, item.system?.description, item.system?.rawText]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  if (hasPath(actor, "paths.needle", 1) && (weight <= 2 || /игл|needle/u.test(weaponText))) {
    return { attribute: "grace", notes: [game.i18n.localize("HRPG.NeedlePathWeaponGrace")] };
  }
  if (hasPath(actor, "paths.hook", 1) && weight <= 2 && /крюк|hook|серп|sickle/u.test(weaponText)) {
    return { attribute: "grace", notes: [game.i18n.localize("HRPG.HookPathWeaponGrace")] };
  }
  return { attribute: "power", notes: [] };
}

function hasPath(actor, sourceId, minimumRank = 1) {
  return actor.items.some((item) => item.type === "path"
    && item.system?.sourceId === sourceId
    && Math.floor(Number(item.system?.rank) || 0) >= minimumRank);
}

function weaponQualityValue(item) {
  return Math.max(0, Math.floor(Number(item.system?.quality?.value ?? 1) || 0));
}
