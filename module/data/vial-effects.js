export const FLUIDS_SUBTRAIT_ID = "traits.natural-projectile.fluids";

export const EMPTY_VIAL_EFFECT = Object.freeze({
  sourceId: "",
  name: "",
  rarity: "",
  hungerCost: 0,
  description: ""
});

export function isFluidsSubtrait(source) {
  return source?.sourceId === FLUIDS_SUBTRAIT_ID || source?.system?.sourceId === FLUIDS_SUBTRAIT_ID;
}

export function vialEffectOptionsFromItems(items = []) {
  return Array.from(items)
    .filter((item) => item?.type === "consumable" && item.subtype === "flask")
    .map(vialEffectOption)
    .filter(Boolean)
    .sort((a, b) => a.hungerCost - b.hungerCost || a.name.localeCompare(b.name, "ru"));
}

export function fluidVialHungerModifier(item) {
  if (!isFluidsSubtrait(item)) return 0;
  return Math.max(0, Math.floor(Number(item?.system?.vialEffect?.hungerCost) || 0));
}

export function normalizeVialEffectSelection(option = null) {
  if (!option) return { ...EMPTY_VIAL_EFFECT };
  return {
    sourceId: option.sourceId ?? "",
    name: option.name ?? "",
    rarity: option.rarity ?? "",
    hungerCost: Math.max(0, Math.floor(Number(option.hungerCost) || 0)),
    description: option.description ?? ""
  };
}

function vialEffectOption(item) {
  const hungerCost = hungerCostFromRarity(item.rarity);
  if (hungerCost === null) return null;
  return {
    sourceId: item.sourceId,
    name: item.name,
    rarity: item.rarity ?? "",
    hungerCost,
    description: item.description ?? "",
    label: `${item.name}${hungerCost ? " (+2 Голод)" : ""}`
  };
}

function hungerCostFromRarity(rarity) {
  const value = String(rarity ?? "").toLocaleLowerCase("ru").replace(/ё/gu, "е");
  if (/необыч|uncommon/u.test(value)) return 2;
  if (/обыч|common/u.test(value)) return 0;
  return null;
}
