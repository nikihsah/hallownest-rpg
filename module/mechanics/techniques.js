import { isTechniqueType } from "../data/technique-catalog.js";
import { traitPromptEffects } from "./trait-effects.js";
import { itemPromptEffects } from "./item-effects.js";
import { classifyWeaponLike, weaponRequirementsMatch } from "./weapon-classifier.js";
import { techniqueRuleTriggers } from "./technique-rules.js";

const TRIGGER_TEXT = {
  attack: /атак|удар|урон|оруж|снаряд|цель|попад/u,
  parry: /парир|щит|дальн/u,
  dodge: /уклон|рывок|прыж|перемещ/u,
  absorption: /впитыв|панцир|получает.*урон|входящий удар/u,
  defense: /защит|реакц|парир|уклон|впитыв|щит/u,
  movement: /скорост|рывок|прыж|перемещ|клет/u
};

const SPELL_COMBAT_TEXT = /атак|урон|снаряд|пораж|взрыв|шар|шип|яд|стирани|аннигил|бур|визг|бах|рой|волна|запут/u;

export function techniquePromptOptions(actor, trigger = "", context = {}) {
  return preparedTechniques(actor?.items)
    .filter((technique) => techniqueApplies(actor, technique, trigger, context))
    .map((technique) => ({
      key: technique.id,
      itemId: technique.id,
      label: technique.name,
      itemName: technique.system?.pathName || technique.name,
      trigger,
      note: techniqueSummary(technique),
      cost: techniqueCost(technique),
      technique
    }));
}

export function techniqueNotesFromIds(actor, techniqueIds = [], trigger = "", context = {}) {
  const selected = new Set(techniqueIds ?? []);
  return techniquePromptOptions(actor, trigger, context)
    .filter((option) => selected.has(option.key))
    .flatMap((option) => [
      `${option.label}: ${option.note}`,
      ...techniqueSynergyNotes(actor, option.technique, trigger, context)
    ]);
}

export function selectedTechniqueCost(actor, techniqueIds = [], trigger = "", context = {}) {
  const selected = new Set(techniqueIds ?? []);
  return techniquePromptOptions(actor, trigger, context)
    .filter((option) => selected.has(option.key))
    .reduce((total, option) => addCosts(total, option.cost), emptyCost());
}

export function techniqueCost(technique) {
  return {
    stamina: normalizeCost(technique.system?.cost?.stamina),
    soul: normalizeCost(technique.system?.cost?.soul),
    essence: normalizeCost(technique.system?.cost?.essence),
    raw: technique.system?.cost?.raw ?? ""
  };
}

export function techniqueSummary(technique) {
  const system = technique.system ?? {};
  const triggers = techniqueRuleTriggers(technique);
  const parts = [
    system.cost?.raw ? `Стоимость: ${system.cost.raw}` : "",
    system.requirementLabel ? `Требования: ${system.requirementLabel}` : "",
    triggers.length ? `Тип применения: ${triggers.map(techniqueTriggerLabel).join(", ")}` : "",
    system.range ? `Дальность: ${system.range}` : "",
    system.duration ? `Длительность: ${system.duration}` : "",
    system.effectText || system.description || system.rawText || ""
  ].filter(Boolean);
  return parts.join("\n");
}

function techniqueTriggerLabel(trigger) {
  return {
    attack: "атака",
    defense: "защита",
    parry: "парирование",
    dodge: "уклонение",
    absorption: "впитывание",
    movement: "движение",
    utility: "утилити"
  }[trigger] ?? trigger;
}

export function preparedTechniques(items) {
  return Array.from(items ?? []).filter((item) => isTechniqueType(item.type) && item.system?.prepared === true);
}

export function techniqueSynergyNotes(actor, technique, trigger = "", context = {}) {
  const notes = [];
  const items = actor?.items ?? [];
  const text = techniqueSearchText(technique);
  if (technique.type === "art" && hasPath(actor, "paths.fang", 1) && /атак|искусств|урон/u.test(text)) {
    notes.push("Путь Клыка: если на атаку или Искусство потрачено минимум 3 Выносливости, проверьте бонус Силовой атаки.");
  }
  if (technique.type === "art" && hasPath(actor, "paths.needle", 2) && /рывок|прыж|уклон|перемещ/u.test(text)) {
    notes.push("Путь Иглы: движение от техники может дать Импульс для Боевого танца.");
  }
  if (technique.type === "spell") {
    const mysticRank = mysticPathRank(actor, technique.system?.pathId);
    notes.push(`Мистический ранг: ${mysticRank}; подготовленная сложность обычно до ${2 * mysticRank}.`);
  }
  notes.push(...traitPromptEffects(items, trigger, context).map((effect) => `${effect.label}: ${effect.note}`));
  notes.push(...itemPromptEffects(items, trigger, context).map((effect) => `${effect.label}: ${effect.note}`));
  return notes;
}

function techniqueApplies(actor, technique, trigger = "", context = {}) {
  if (!trigger) return true;
  if (trigger === "attack" && technique.type === "art" && !techniqueMatchesAttackContext(actor, technique, context)) return false;
  const explicitTriggers = techniqueTriggers(technique);
  if (explicitTriggers.length && (explicitTriggers.includes(trigger) || trigger === "defense" && explicitTriggers.some((item) => ["parry", "dodge", "absorption"].includes(item)))) return true;
  if (explicitTriggers.length && !explicitTriggers.includes("attack") && trigger === "attack") return false;
  const text = techniqueSearchText(technique);
  if (trigger === "attack") return technique.type === "spell" ? SPELL_COMBAT_TEXT.test(text) : TRIGGER_TEXT.attack.test(text);
  if (trigger === "parry") return TRIGGER_TEXT.parry.test(text) || (TRIGGER_TEXT.defense.test(text) && /щит|парир/u.test(text));
  if (trigger === "dodge") return TRIGGER_TEXT.dodge.test(text) || (TRIGGER_TEXT.defense.test(text) && /уклон/u.test(text));
  if (trigger === "absorption") return TRIGGER_TEXT.absorption.test(text);
  if (trigger === "defense") return TRIGGER_TEXT.defense.test(text);
  if (trigger === "movement") return TRIGGER_TEXT.movement.test(text);
  return text.includes(trigger);
}

function techniqueSearchText(technique) {
  return [
    technique.name,
    technique.system?.techniqueType,
    technique.system?.subtype,
    technique.system?.requirementLabel,
    technique.system?.description,
    technique.system?.effectText,
    technique.system?.rawText,
    ...(technique.system?.effects ?? []).map((effect) => effect?.text)
  ].filter(Boolean).join(" ").toLocaleLowerCase("ru");
}

function techniqueTriggers(technique) {
  const ruleTriggers = techniqueRuleTriggers(technique);
  if (ruleTriggers.length) return ruleTriggers;
  if (technique.type === "spell") return [];
  const firstType = String(technique.system?.techniqueType ?? technique.techniqueType ?? technique.system?.subtype ?? technique.subtype ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0];
  if (["boost", "normal", "special"].includes(firstType)) return ["attack"];
  if (firstType === "reaction") return ["defense"];
  return [];
}

function techniqueMatchesAttackContext(actor, technique, context = {}) {
  const requirements = technique.system?.requirements ?? technique.requirements ?? [];
  const attack = context.attack ?? attackForContext(actor, context.itemId);
  if (!attack) return true;
  const classification = attack.classification ?? classifyWeaponLike(attack);
  return weaponRequirementsMatch(classification, requirements);
}

function attackForContext(actor, itemId = "") {
  if (!actor || !itemId) return null;
  const item = actor.items?.get?.(itemId) ?? Array.from(actor.items ?? []).find((entry) => entry.id === itemId);
  if (!item) return null;
  return item;
}

function addCosts(left, right) {
  return {
    stamina: left.stamina + right.stamina,
    soul: left.soul + right.soul,
    essence: left.essence + right.essence,
    raw: [left.raw, right.raw].filter(Boolean).join("; ")
  };
}

function emptyCost() {
  return { stamina: 0, soul: 0, essence: 0, raw: "" };
}

function normalizeCost(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function hasPath(actor, sourceId, minimumRank = 1) {
  return actor?.items?.some?.((item) => item.type === "path"
    && item.system?.sourceId === sourceId
    && Math.floor(Number(item.system?.rank) || 0) >= minimumRank) ?? false;
}

function mysticPathRank(actor, pathId = "") {
  if (!pathId) return 0;
  const path = actor?.items?.find?.((item) => item.type === "path" && item.system?.sourceId === pathId);
  return Math.max(0, Math.floor(Number(path?.system?.rank) || 0));
}
