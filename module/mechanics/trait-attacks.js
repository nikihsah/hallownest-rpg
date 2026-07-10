import { naturalWeaponQualityValue } from "./trait-quality.js";
import { selectedItemModification, selectedItemModificationEffects } from "../data/item-modifications.js";
import { classifyWeaponLike } from "./weapon-classifier.js";

const DAMAGE_PATTERNS = [
  /нанос(?:ит|ящее|ящий|ящие|ить)[^.]{0,80}?(\d+(?:[,.]\d+)?)\s*(?:единиц[а-яё]*\s+)?урон[а-яё]*/iu,
  /(\d+(?:[,.]\d+)?)\s*(?:единиц[а-яё]*\s+)?урон[а-яё]*/iu
];

export function quickAttackFromTrait(trait) {
  return quickAttackFromTraitWithSubtraits(trait, []);
}

function weaponQualityValue(weapon) {
  return Math.max(0, Math.floor(Number(weapon.system?.quality?.value ?? 1) || 0));
}

export function quickAttackFromWeapon(weapon) {
  if (!weapon || weapon.type !== "weapon" || weapon.system?.equipped !== true) return null;
  const text = [weapon.system.description, weapon.system.rawText].filter(Boolean).join("\n");
  const modification = selectedItemModification(weapon);
  const modificationEffects = selectedItemModificationEffects(weapon);
  const classification = classifyWeaponLike(weapon, { modificationEffects });
  return {
    itemId: weapon.id,
    name: weapon.name,
    damage: modifiedDamage(weapon.system.damage ?? "", modificationEffects.damageBonus),
    quality: weaponQualityValue(weapon),
    tooltip: attackTooltip(text || weapon.name),
    subtraits: [],
    itemType: weapon.system.itemType ?? "",
    range: weapon.system.range ?? "",
    grip: weapon.system.grip ?? "",
    weight: Math.max(0, (Number(weapon.system.weight) || 0) + (Number(modificationEffects.weightBonus) || 0)),
    modification: modification?.name ?? "",
    modificationEffects,
    classification,
    sourceType: "weapon"
  };
}

export function quickAttackFromTraitWithSubtraits(trait, subtraits = []) {
  if (!trait || trait.type !== "trait" || trait.system?.active === false) return null;
  if (trait.system?.category !== "weapons") return null;
  if (trait.system?.kind === "subtrait") return null;

  const text = [trait.system.description, ...(trait.system.rules ?? [])].filter(Boolean).join("\n");
  if (!looksLikeAttack(text)) return null;

  const activeSubtraits = subtraits.filter((subtrait) => subtrait?.system?.active !== false);
  const modification = selectedItemModification(trait);
  const modificationEffects = selectedItemModificationEffects(trait);
  const damage = modifiedDamage(applySubtraitDamage(extractDamage(text), activeSubtraits), modificationEffects.damageBonus);
  const quality = Math.max(0, Math.floor(naturalWeaponQualityValue(trait) + (Number(modificationEffects.qualityBonus) || 0)));
  const weight = Math.max(0, Number(modificationEffects.weightBonus) || 0);
  return {
    itemId: trait.id,
    name: trait.name,
    damage,
    quality,
    tooltip: attackTooltip([text, ...activeSubtraits.map((subtrait) => `${subtrait.name}: ${subtrait.system?.description ?? ""}`)].join("\n")),
    subtraits: activeSubtraits.map((subtrait) => subtrait.name),
    classification: classifyWeaponLike({
      name: trait.name,
      itemType: "Природное",
      range: "",
      weight,
      description: text
    }, { modificationEffects }),
    weight,
    modification: modification?.name ?? "",
    modificationEffects,
    sourceType: "trait"
  };
}

export function quickAttacksFromItems(items) {
  const traits = Array.from(items ?? []).filter((item) => item?.type === "trait" && item.system?.active !== false);
  const parentTraits = traits.filter((item) => item.system?.kind !== "subtrait");
  const parentsBySource = new Map();
  for (const parent of parentTraits.filter((item) => item.system?.sourceId)) {
    const list = parentsBySource.get(parent.system.sourceId) ?? [];
    list.push(parent);
    parentsBySource.set(parent.system.sourceId, list);
  }

  const subtraitsByParentItem = new Map();
  for (const item of traits.filter((entry) => entry.system?.kind === "subtrait" && entry.system?.parentTrait)) {
    const parentItemId = item.system.parentItemId || legacySingleParentId(parentsBySource, item.system.parentTrait);
    if (!parentItemId) continue;
    const list = subtraitsByParentItem.get(parentItemId) ?? [];
    list.push(item);
    subtraitsByParentItem.set(parentItemId, list);
  }

  const traitAttacks = parentTraits
    .map((item) => quickAttackFromTraitWithSubtraits(item, subtraitsByParentItem.get(item.id) ?? []))
    .filter(Boolean);
  const weaponAttacks = Array.from(items ?? [])
    .map((item) => quickAttackFromWeapon(item))
    .filter(Boolean);
  return [...traitAttacks, ...weaponAttacks];
}

function legacySingleParentId(parentsBySource, parentSourceId) {
  const parents = parentsBySource.get(parentSourceId) ?? [];
  return parents.length === 1 ? parents[0].id : "";
}

function looksLikeAttack(text) {
  const value = String(text ?? "");
  return /природн[а-яё]*\s+оруж/iu.test(value) || DAMAGE_PATTERNS.some((pattern) => pattern.test(value));
}

function extractDamage(text) {
  const value = String(text ?? "");
  for (const pattern of DAMAGE_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[1].replace(",", ".");
  }
  return "";
}

function applySubtraitDamage(baseDamage, subtraits) {
  let damage = Number(String(baseDamage).replace(",", "."));
  if (!Number.isFinite(damage)) return baseDamage;
  for (const subtrait of subtraits) {
    const text = String(subtrait.system?.description ?? "");
    if (/не\s+наносит\s+урон[а-яё]*/iu.test(text)) damage = 0;
    const replacement = text.match(/нанос[а-яё]*\s+(\d+(?:[,.]\d+)?)\s*(?:единиц[а-яё]*\s+)?урон[а-яё]*\s*,?\s*вместо/iu);
    if (replacement) damage = Number(replacement[1].replace(",", "."));
    const increase = text.match(/на\s+(\d+(?:[,.]\d+)?)\s+больше\s+урон/iu);
    if (increase) damage += Number(increase[1].replace(",", "."));
  }
  return Number.isInteger(damage) ? String(damage) : String(damage);
}

function modifiedDamage(baseDamage, bonus = 0) {
  const damage = Number(String(baseDamage).replace(",", "."));
  if (!Number.isFinite(damage)) return baseDamage;
  const result = Math.max(0, damage + (Number(bonus) || 0));
  return Number.isInteger(result) ? String(result) : String(result);
}

function attackTooltip(text) {
  const value = String(text ?? "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 220);
  return value.length === 220 ? `${value}…` : value;
}
