import { rollDicePool } from "../mechanics/dice-pool.js";
import { applySizeTemplate } from "../mechanics/size-templates.js";
import { calculateAttributeState } from "../mechanics/attribute-state.js";
import { maneuverFromGrace } from "../mechanics/stat-adjustments.js";
import { quickAttacksFromItems } from "../mechanics/trait-attacks.js";
import { naturalWeaponQualityValue } from "../mechanics/trait-quality.js";
import { applyPathAttackOptions } from "../mechanics/path-abilities.js";
import { effectiveItemWeight, itemDefenseBonus, itemPassiveEffects, itemPromptEffects } from "../mechanics/item-effects.js";
import { applyTraitConditionalOptions, traitConditionalOptions, traitPromptEffects } from "../mechanics/trait-effects.js";
import { selectedItemModificationEffects } from "../data/item-modifications.js";
import { isTechniqueType } from "../data/technique-catalog.js";
import { selectedTechniqueCost, techniqueNotesFromIds, techniqueSummary, techniqueSynergyNotes } from "../mechanics/techniques.js";
import { classifyWeaponLike, weaponHasType } from "../mechanics/weapon-classifier.js";
import { expectedDamage } from "../mechanics/damage.js";

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
    const itemEffects = itemPassiveEffects(this.items);
    for (const key of modifierKeys) modifiers[key] += Number(itemEffects.modifiers?.[key]) || 0;
    const pathModifiers = { marks: 0, stamina: 0, soul: 0, supplies: 0, appeal: 0 };
    for (const path of this.items.filter((item) => item.type === "path")) {
      const rank = Math.max(0, Number(path.system.rank) || 0);
      pathModifiers.marks += rank;
      if (path.system.category === "mystic") pathModifiers.soul += rank;
      else pathModifiers.stamina += rank;
      pathModifiers.supplies += pathSupplyBonus(path.system?.sourceId, rank);
      pathModifiers.appeal += pathAppealBonus(path.system?.sourceId, rank);
    }

    const effectiveAttributes = calculateAttributeState(system.attributes, modifiers);
    const effectiveResources = Object.fromEntries(
      ["heart", "stamina", "soul"].map((key) => [key, {
        value: Number(system.resources[key]?.value) || 0,
        max: cappedResourceMax(key, (Number(system.resources[key]?.max) || 0) + modifiers[key] + (pathModifiers[key] || 0))
      }])
    );
    for (const key of ["supplies", "essence"]) {
      effectiveResources[key] = {
        value: Number(system.resources[key]?.value) || 0,
        max: (Number(system.resources[key]?.max) || 0)
          + (Number(itemEffects.customResources?.[key]) || 0)
          + (Number(pathModifiers[key]) || 0)
      };
    }
    const effectiveSecondary = {
      speed: (Number(system.secondary.speed) || 0) + modifiers.speed,
      hunger: (Number(system.secondary.hunger.value) || 0) + modifiers.hunger,
      appeal: (Number(system.secondary.appeal) || 0) + modifiers.appeal + pathModifiers.appeal,
      dread: (Number(system.secondary.dread) || 0) + modifiers.dread,
      marks: (Number(system.secondary.marks.max) || 0) + modifiers.marks + pathModifiers.marks
    };

    system.effective = { attributes: effectiveAttributes, resources: effectiveResources, secondary: effectiveSecondary, modifiers, pathModifiers, itemEffects };
    system.derived = {
      load: Math.floor(effectiveAttributes.power.value) + modifiers.load,
      beltSize: Math.floor(effectiveAttributes.shell.value),
      techniqueSlots: Math.floor(effectiveAttributes.insight.value),
      maneuver: maneuverFromGrace(effectiveAttributes.grace.value),
      carriedWeight: this.items.reduce((total, item) => {
      const quantity = Number(item.system.quantity) || 0;
      const weight = effectiveItemWeight(item, itemEffects);
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

  async spendSpeed(cost = 0) {
    const spent = Math.max(0, Math.floor(Number(cost) || 0));
    if (spent <= 0) return true;
    const currentSpent = Number(this.system.combat?.speedSpent) || 0;
    const available = Math.max(0,
      (Number(this.system.effective?.secondary?.speed) || 0)
      + (Number(this.system.adjustments?.speed) || 0)
      - currentSpent
    );
    await this.update({ "system.combat.speedSpent": currentSpent + spent });
    if (available < spent) ui.notifications.warn(game.i18n.localize("HRPG.SpeedExceeded"));
    return available >= spent;
  }

  async spendSoul(cost = 0) {
    const spent = Math.max(0, Math.floor(Number(cost) || 0));
    if (spent <= 0) return true;
    const current = Number(this.system.resources?.soul?.value) || 0;
    await this.update({ "system.resources.soul.value": Math.max(0, current - spent) });
    if (current < spent) ui.notifications.warn(game.i18n.format("HRPG.ResourceExceeded", {
      resource: game.i18n.localize("HRPG.ResourceSoul"),
      cost: spent
    }));
    return current >= spent;
  }

  async addImbalance(amount = 1) {
    const current = Number(this.system.combat?.imbalance) || 0;
    const next = Math.min(3, Math.max(0, current + Math.floor(Number(amount) || 0)));
    await this.update({ "system.combat.imbalance": next });
    return next;
  }

  async spendAttackStamina({ invested = 0, taxAsDice = false } = {}) {
    const inCombat = Boolean(game.combat?.started);
    const rawTax = inCombat ? Math.max(0, Math.floor(Number(this.system.combat?.attackTax) || 0)) : 0;
    const taxReduction = Math.min(rawTax, Math.max(0, Math.floor(Number(this.system.effective?.itemEffects?.attackTaxReduction) || 0)));
    const tax = rawTax - taxReduction;
    const base = 1;
    const investedStamina = Math.max(0, Math.floor(Number(invested) || 0));
    await this.spendCombatStamina(base + investedStamina + tax);
    if (inCombat) await this.update({ "system.combat.attackTax": rawTax + 1 });
    return {
      base,
      invested: investedStamina,
      tax,
      taxReduction,
      dice: investedStamina + (taxAsDice ? tax : 0),
      totalCost: base + investedStamina + tax
    };
  }

  async spendTechniqueResources(cost = {}) {
    const update = {};
    for (const key of ["stamina", "soul", "essence"]) {
      const spent = Math.max(0, Math.floor(Number(cost[key]) || 0));
      if (!spent) continue;
      const current = Number(this.system.resources?.[key]?.value) || 0;
      update[`system.resources.${key}.value`] = Math.max(0, current - spent);
      if (current < spent) ui.notifications.warn(game.i18n.format("HRPG.ResourceExceeded", { resource: game.i18n.localize(resourceLabels[key]), cost: spent }));
    }
    if (Object.keys(update).length) await this.update(update);
  }

  async useTechnique(itemId, { trigger = "", extraCost = {} } = {}) {
    const item = this.items.get(itemId);
    if (!item || !isTechniqueType(item.type)) return null;
    const cost = addTechniqueCosts(techniqueCostFromItem(item), extraCost);
    await this.spendTechniqueResources(cost);
    const notes = [
      techniqueSummary(item),
      ...techniqueSynergyNotes(this, item, trigger || techniqueDefaultTrigger(item), { itemId })
    ].filter(Boolean);
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `<strong>${foundry.utils.escapeHTML(game.i18n.format("HRPG.TechniqueUsed", { name: item.name }))}</strong>`,
      content: `<div class="hrpg-chat-notes">${notes.map((note) => `<p>${foundry.utils.escapeHTML(note)}</p>`).join("")}</div>`
    });
  }

  async useCombatAction(actionKey, options = {}) {
    if (actionKey === "damage-calculator") return this.postDamageCalculation(options);
    if (actionKey === "focus-soul") return this.focusSoul(options);

    const action = combatActionConfig(actionKey);
    if (!action) return null;
    const staminaCost = Math.max(0, Math.floor(Number(options.staminaCost ?? action.staminaCost ?? 0) || 0));
    const speedCost = Math.max(0, Math.floor(Number(options.speedCost ?? action.speedCost ?? 0) || 0));
    await this.spendCombatStamina(staminaCost);
    await this.spendSpeed(speedCost);
    if (action.imbalance) await this.addImbalance(action.imbalance);

    const notes = [
      game.i18n.localize(action.hint),
      staminaCost ? game.i18n.format("HRPG.CombatActionStaminaCost", { cost: staminaCost }) : "",
      speedCost ? game.i18n.format("HRPG.CombatActionSpeedCost", { cost: speedCost }) : "",
      action.imbalance ? game.i18n.format("HRPG.ImbalanceAdded", { value: action.imbalance }) : "",
      options.note ? String(options.note) : ""
    ].filter(Boolean);

    if (action.attribute) {
      return this.rollAttributeCheck(options.attribute || action.attribute, {
        label: game.i18n.localize(action.label),
        bonusDice: Number(options.bonusDice) || 0,
        notes
      });
    }

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `<strong>${foundry.utils.escapeHTML(game.i18n.localize(action.label))}</strong>`,
      content: `<div class="hrpg-chat-notes">${notes.map((note) => `<p>${foundry.utils.escapeHTML(note)}</p>`).join("")}</div>`
    });
  }

  async focusSoul({ soulCost = 1, note = "" } = {}) {
    const spentSoul = Math.max(0, Math.floor(Number(soulCost) || 0));
    if (spentSoul <= 0) return null;
    await this.spendSoul(spentSoul);
    const insight = Number(this.system.effective?.attributes?.insight?.value) || 0;
    return rollDicePool({
      actor: this,
      dice: spentSoul,
      rerolls: Math.floor(insight / 2),
      automaticSuccesses: Math.floor(spentSoul / 3),
      label: game.i18n.localize("HRPG.FocusSoul"),
      notes: [
        game.i18n.localize("HRPG.FocusActionHint"),
        game.i18n.format("HRPG.FocusSoulSpent", { cost: spentSoul }),
        game.i18n.format("HRPG.FocusSoulRerolls", { rerolls: Math.floor(insight / 2) }),
        note ? String(note) : ""
      ].filter(Boolean)
    });
  }

  postDamageCalculation(options = {}) {
    const result = expectedDamage(options);
    const lines = result.hit ? [
      game.i18n.format("HRPG.DamageCalcProbable", { value: result.probableDamage }),
      game.i18n.format("HRPG.DamageCalcAfterReduction", { value: result.afterReduction }),
      game.i18n.format("HRPG.DamageCalcAfterAbsorption", { value: result.afterAbsorptionRoll }),
      game.i18n.format("HRPG.DamageCalcAbsorptionPool", { value: result.absorbedByPool }),
      game.i18n.format("HRPG.DamageCalcFinal", { value: result.finalDamage })
    ] : [game.i18n.localize("HRPG.DamageCalcMiss")];
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `<strong>${foundry.utils.escapeHTML(game.i18n.localize("HRPG.DamageCalculator"))}</strong>`,
      content: `<div class="hrpg-chat-notes">${lines.map((line) => `<p>${foundry.utils.escapeHTML(line)}</p>`).join("")}</div>`
    });
  }

  async rollDefenseAction(actionKey, { bonusDice = 0, staminaCost = 0, attribute = "", traitOptions = [], techniqueOptions = [], dodgeMove = false } = {}) {
    const actions = {
      protection: { label: "HRPG.DefenseAction", attribute: "" },
      dodge: { label: "HRPG.Dodge", attribute: "grace" },
      parry: { label: "HRPG.Parry", attribute: "power" },
      absorption: { label: "HRPG.DamageAbsorption", attribute: "shell" }
    };
    const action = actions[actionKey];
    if (!action) return null;
    const techniqueCost = selectedTechniqueCost(this, techniqueOptions, actionKey);
    await this.spendCombatStamina(staminaCost + techniqueCost.stamina);
    await this.spendTechniqueResources({ soul: techniqueCost.soul, essence: techniqueCost.essence });
    const attributeKey = attribute || action.attribute;
    if (!action.attribute) {
      return ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: `<strong>${foundry.utils.escapeHTML(game.i18n.localize(action.label))}</strong><br>${foundry.utils.escapeHTML(game.i18n.localize("HRPG.DefenseActionHint"))}`
      });
    }
    const itemBonus = itemDefenseBonus(this, actionKey);
    const traitAdjustment = applyTraitConditionalOptions(traitConditionalOptions(this, actionKey), traitOptions);
    if (actionKey === "dodge" && dodgeMove) await this.addImbalance(1);
    return this.rollAttributeDefense(attributeKey, {
      label: game.i18n.localize(action.label),
      bonusDice: (Number(bonusDice) || 0)
        + (Number(itemBonus.bonusDice) || 0)
        + (Number(traitAdjustment.bonusDice) || 0)
        + (actionKey === "absorption" ? Number(this.system.effective?.itemEffects?.absorptionBonus) || 0 : 0),
      notes: [
        game.i18n.format("HRPG.DefenseStaminaSpent", { cost: Math.max(0, Math.floor(Number(staminaCost) || 0)) }),
        ...itemBonus.notes,
        ...itemPromptNotes(this.items, defensePromptTriggers(actionKey)),
        ...techniqueNotesFromIds(this, techniqueOptions, actionKey),
        ...traitPromptNotes(this.items, [actionKey]),
        ...traitAdjustment.notes,
        ...(actionKey === "absorption" ? itemEffectNotes(this.system.effective?.itemEffects, ["absorptionBonus", "absorptionRerolls"]) : []),
        ...(actionKey === "dodge" && dodgeMove ? [game.i18n.localize("HRPG.DodgeMoveImbalance")] : [])
      ]
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

  rollAttributeCheck(attributeKey, { label, bonusDice = 0, notes = [] } = {}) {
    const isSecondary = ["speed", "appeal", "dread"].includes(attributeKey);
    const value = isSecondary
      ? Math.max(0, (Number(this.system.effective?.secondary?.[attributeKey]) || 0) + (Number(this.system.adjustments?.[attributeKey]) || 0) - (attributeKey === "speed" ? Number(this.system.combat?.speedSpent) || 0 : 0))
      : Number(this.system.effective?.attributes?.[attributeKey]?.value) || 0;
    const attributeLabel = game.i18n.localize(CONFIG.HRPG.attributes?.[attributeKey] ?? secondaryDefenseLabels[attributeKey] ?? attributeKey);
    return rollDicePool({
      actor: this,
      dice: Math.floor(value) + Math.floor(Number(bonusDice) || 0),
      reroll: value % 1 >= 0.5,
      label: label ?? attributeLabel,
      notes: [
        game.i18n.format("HRPG.ActionAttributeUsed", { attribute: attributeLabel }),
        ...notes
      ]
    });
  }

  rollAbsorption(attributeKey = "shell", options = {}) {
    return this.rollAttributeDefense(attributeKey, {
      label: game.i18n.localize("HRPG.Absorption"),
      bonusDice: (Number(options.bonusDice) || 0) + (Number(this.system.effective?.itemEffects?.absorptionBonus) || 0),
      notes: itemEffectNotes(this.system.effective?.itemEffects, ["absorptionBonus", "absorptionRerolls"])
    });
  }

  async rollTraitAttack(itemId, { investedStamina = 0, pathOptions = [], traitOptions = [], techniqueOptions = [] } = {}) {
    const item = this.items.get(itemId);
    if (!item) return null;
    const baseAttack = baseAttackConfig(this, item);
    const attackOptions = applyPathAttackOptions({ attribute: baseAttack.attribute, successThreshold: 5 }, pathOptions);
    const traitAdjustment = applyTraitConditionalOptions(traitConditionalOptions(this, "attack", { itemId }), traitOptions);
    const modificationEffects = item.type === "weapon" ? selectedItemModificationEffects(item) : null;
    const techniqueCost = selectedTechniqueCost(this, techniqueOptions, "attack", { itemId });
    const stamina = await this.spendAttackStamina({ invested: investedStamina, taxAsDice: attackOptions.taxAsDice });
    await this.spendTechniqueResources(techniqueCost);
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
      dice: Math.floor(value) + quality + stamina.dice + attackOptions.bonusDice + traitAdjustment.bonusDice + (Number(modificationEffects?.attackBonusDice) || 0),
      reroll: value % 1 >= 0.5,
      successThreshold: attackOptions.successThreshold,
      label,
      notes: [
        game.i18n.format("HRPG.AttackStaminaSpent", { base: stamina.base, invested: stamina.invested, tax: stamina.tax, total: stamina.totalCost }),
        game.i18n.format("HRPG.AttackAttributeUsed", { attribute: game.i18n.localize(CONFIG.HRPG.attributes[attributeKey] ?? attributeKey) }),
        ...baseAttack.notes,
        ...itemPromptNotes(this.items, ["attack"], { itemId }),
        ...modificationNotes(modificationEffects),
        ...techniqueNotesFromIds(this, techniqueOptions, "attack", { itemId }),
        ...traitPromptNotes(this.items, ["attack"], { itemId }),
        ...traitAdjustment.notes,
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

function pathSupplyBonus(sourceId, rank) {
  if (["paths.hook", "paths.vial", "paths.thorn"].includes(sourceId)) return Math.max(0, Math.floor(Number(rank) || 0));
  return 0;
}

function pathAppealBonus(sourceId, rank) {
  if (sourceId === "paths.bloom" && Number(rank) >= 1) return 0.5;
  return 0;
}

const secondaryDefenseLabels = { speed: "HRPG.Speed", appeal: "HRPG.Appeal", dread: "HRPG.Dread" };
const resourceLabels = { stamina: "HRPG.ResourceStamina", soul: "HRPG.ResourceSoul", essence: "HRPG.ResourceEssence" };

function baseAttackConfig(actor, item) {
  if (item.type !== "weapon") return { attribute: "power", notes: [] };
  const modificationEffects = selectedItemModificationEffects(item);
  const classification = classifyWeaponLike(item, { modificationEffects });
  if (item.system?.sourceId === "equipment.magic-focus.palochka") {
    return { attribute: "insight", notes: [game.i18n.localize("HRPG.MagicFocusInsightAttack")] };
  }
  if (hasPath(actor, "paths.needle", 1) && (weaponHasType(classification, "needle") || (classification.weight <= 2 && classification.melee))) {
    return { attribute: "grace", notes: [game.i18n.localize("HRPG.NeedlePathWeaponGrace")] };
  }
  if (hasPath(actor, "paths.hook", 1) && classification.weight <= 2 && weaponHasType(classification, "hook")) {
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
  return Math.max(0, Math.floor((Number(item.system?.quality?.value ?? 1) || 0) + (Number(selectedItemModificationEffects(item).qualityBonus) || 0)));
}

function modificationNotes(effects) {
  if (!effects?.key) return [];
  const notes = [];
  if (effects.note) notes.push(`${effects.name}: ${effects.note}`);
  if (Number(effects.attackBonusDice) !== 0) notes.push(`${effects.name}: ${effects.attackBonusDice > 0 ? "+" : ""}${effects.attackBonusDice} кость к атаке.`);
  if (Number(effects.damageBonus) !== 0) notes.push(`${effects.name}: ${effects.damageBonus > 0 ? "+" : ""}${effects.damageBonus} к урону.`);
  if (Number(effects.qualityBonus) !== 0) notes.push(`${effects.name}: ${effects.qualityBonus > 0 ? "+" : ""}${effects.qualityBonus} к Качеству.`);
  return notes;
}

function itemEffectNotes(itemEffects, keys = []) {
  if (!itemEffects) return [];
  const notes = [];
  if (keys.includes("absorptionBonus") && Number(itemEffects.absorptionBonus) !== 0) {
    notes.push(game.i18n.format("HRPG.ItemEffectAbsorptionBonus", { value: itemEffects.absorptionBonus }));
  }
  if (keys.includes("absorptionRerolls") && Number(itemEffects.absorptionRerolls) !== 0) {
    notes.push(game.i18n.format("HRPG.ItemEffectAbsorptionRerolls", { value: itemEffects.absorptionRerolls }));
  }
  return notes;
}

function itemPromptNotes(items, triggers = [], options = {}) {
  return triggers.flatMap((trigger) => itemPromptEffects(items, trigger, options))
    .map((effect) => `${effect.label}: ${effect.note}`);
}

function traitPromptNotes(items, triggers = [], options = {}) {
  return triggers.flatMap((trigger) => traitPromptEffects(items, trigger, options))
    .map((effect) => `${effect.label}: ${effect.note}`);
}

function defensePromptTriggers(actionKey) {
  if (actionKey === "parry") return ["parry", "defense"];
  if (actionKey === "absorption") return ["absorption"];
  return ["defense"];
}

function techniqueCostFromItem(item) {
  return {
    stamina: Math.max(0, Math.floor(Number(item.system?.cost?.stamina) || 0)),
    soul: Math.max(0, Math.floor(Number(item.system?.cost?.soul) || 0)),
    essence: Math.max(0, Math.floor(Number(item.system?.cost?.essence) || 0))
  };
}

function addTechniqueCosts(left = {}, right = {}) {
  return {
    stamina: (Number(left.stamina) || 0) + (Number(right.stamina) || 0),
    soul: (Number(left.soul) || 0) + (Number(right.soul) || 0),
    essence: (Number(left.essence) || 0) + (Number(right.essence) || 0)
  };
}

function combatActionConfig(actionKey) {
  return {
    "opportunity-attack": {
      label: "HRPG.OpportunityAttack",
      hint: "HRPG.OpportunityAttackHint",
      staminaCost: 1
    },
    retreat: {
      label: "HRPG.Retreat",
      hint: "HRPG.RetreatHint",
      staminaCost: 1,
      speedCost: 2,
      imbalance: 1
    },
    "dash-jump": {
      label: "HRPG.DashJump",
      hint: "HRPG.DashJumpHint",
      staminaCost: 1,
      speedCost: 0
    },
    grapple: {
      label: "HRPG.Grapple",
      hint: "HRPG.GrappleHint",
      staminaCost: 1,
      attribute: "power"
    },
    "escape-grapple": {
      label: "HRPG.EscapeGrapple",
      hint: "HRPG.EscapeGrappleHint",
      staminaCost: 1,
      attribute: "power"
    },
    "skill-action": {
      label: "HRPG.SkillAction",
      hint: "HRPG.SkillActionHint",
      staminaCost: 1,
      attribute: "insight"
    },
    "minor-action": {
      label: "HRPG.MinorAction",
      hint: "HRPG.MinorActionHint",
      staminaCost: 0
    },
    "ready-action": {
      label: "HRPG.ReadyAction",
      hint: "HRPG.ReadyActionHint",
      staminaCost: 1
    },
    "delay-turn": {
      label: "HRPG.DelayTurn",
      hint: "HRPG.DelayTurnHint",
      staminaCost: 0
    }
  }[actionKey];
}

function techniqueDefaultTrigger(item) {
  const text = [item.system?.techniqueType, item.system?.effectText, item.system?.description, item.system?.rawText]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru");
  if (/парир|щит/u.test(text)) return "parry";
  if (/уклон/u.test(text)) return "dodge";
  if (/впитыв|панцир/u.test(text)) return "absorption";
  if (/атак|удар|урон|цель/u.test(text)) return "attack";
  return item.type === "spell" ? "attack" : "";
}
