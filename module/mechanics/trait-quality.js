export function isNaturalWeaponTrait(itemOrSystem) {
  const system = itemOrSystem?.system ?? itemOrSystem ?? {};
  const type = itemOrSystem?.type;
  return (type === undefined || type === "trait")
    && system.category === "weapons"
    && system.kind !== "subtrait"
    && looksLikeQualityBearingNaturalWeapon(system);
}

export function naturalWeaponQualityData(itemOrSystem) {
  return isNaturalWeaponTrait(itemOrSystem) ? { value: 1, max: 1 } : { value: 0, max: 0 };
}

export function naturalWeaponQualityValue(itemOrSystem) {
  const system = itemOrSystem?.system ?? itemOrSystem ?? {};
  const fallback = naturalWeaponQualityData(itemOrSystem).value;
  return finiteNumber(system.quality?.value, fallback);
}

export function naturalWeaponQualityMax(itemOrSystem) {
  const system = itemOrSystem?.system ?? itemOrSystem ?? {};
  const fallback = naturalWeaponQualityData(itemOrSystem).max;
  return Math.max(0, finiteNumber(system.quality?.max, fallback));
}

export function naturalWeaponQualityRecoveryUpdates(items, fed = false) {
  const updates = [];
  for (const item of Array.from(items ?? [])) {
    if (!isNaturalWeaponTrait(item)) continue;
    const current = naturalWeaponQualityValue(item);
    const max = naturalWeaponQualityMax(item);
    let next = current;
    if (current < 0 && fed) next = 0;
    else if (current >= 0 && current < max) next = Math.min(max, current + 1);
    if (next !== current) updates.push({ _id: item.id, "system.quality.value": next });
  }
  return updates;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function looksLikeQualityBearingNaturalWeapon(system) {
  if (system.sourceId === "traits.natural-instrument") return true;
  const text = [system.description, ...(system.rules ?? [])].filter(Boolean).join("\n");
  return NATURAL_DAMAGE_PATTERNS.some((pattern) => pattern.test(text));
}

const NATURAL_DAMAGE_PATTERNS = [
  /(?:наносит|нанести|наносящ(?:ее|ий|ие)?)[^.]{0,120}?урон/iu,
  /РЅР°РЅРѕСЃ(?:РёС‚|СЏС‰РµРµ|СЏС‰РёР№|СЏС‰РёРµ|РёС‚СЊ)[^.]{0,120}?СѓСЂРѕРЅ/iu
];
