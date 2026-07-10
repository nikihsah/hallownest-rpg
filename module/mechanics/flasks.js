export function isFlaskItem(item) {
  return item?.type === "consumable" && item.system?.subtype === "flask";
}

export function flaskUses(item) {
  const value = Math.max(0, Math.floor(Number(item?.system?.uses?.value ?? 0) || 0));
  const max = Math.max(0, Math.floor(Number(item?.system?.uses?.max ?? value) || 0));
  return { value, max };
}

export function flaskEffectText(item) {
  return String(item?.system?.description || item?.system?.rawText || "").trim();
}

export function flaskSummary(item) {
  const uses = flaskUses(item);
  const effect = flaskEffectText(item);
  return {
    id: item.id,
    name: item.name,
    item,
    uses,
    effect,
    rarity: item.system?.rarity ?? "",
    potency: item.system?.potency ?? "",
    sourceId: item.system?.sourceId ?? "",
    canUse: uses.value > 0
  };
}

export function equippedFlasks(items) {
  return itemArray(items)
    .filter((item) => isFlaskItem(item) && item.system?.equipped === true)
    .map(flaskSummary);
}

export function flaskAttackContext(flask) {
  return {
    itemId: flask?.id ?? "",
    id: flask?.id ?? "",
    name: flask?.name ?? "",
    sourceType: "consumable",
    itemType: "Склянка",
    range: "Метательная",
    damage: "",
    weight: Number(flask?.system?.weight) || 0,
    classification: {
      melee: false,
      ranged: true,
      thrown: true,
      weight: Number(flask?.system?.weight) || 0,
      types: new Set(["vial", "flask", "throwing"])
    }
  };
}

export function spendFlaskUseUpdate(item) {
  const uses = flaskUses(item);
  if (uses.value <= 0) return null;
  return { "system.uses.value": uses.value - 1 };
}

function itemArray(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items.values === "function") return Array.from(items.values());
  return Array.from(items);
}
