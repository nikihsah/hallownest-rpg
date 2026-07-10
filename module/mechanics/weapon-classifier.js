const TYPE_MATCHERS = {
  nail: [/гвозд/u, /nail/u],
  needle: [/игл/u, /needle/u],
  fang: [/клык/u, /fang/u],
  hook: [/крюк/u, /серп/u, /hook/u, /sickle/u],
  sling: [/пращ/u, /рогат/u, /болт/u, /метател/u, /shot/u, /sling/u],
  vial: [/склян/u, /flask/u, /vial/u],
  shield: [/щит/u, /shield/u],
  natural: [/природ/u, /natural/u]
};

const PATH_BY_WEAPON_TYPE = {
  nail: "paths.nail",
  needle: "paths.needle",
  fang: "paths.fang",
  hook: "paths.hook",
  sling: "paths.sling",
  vial: "paths.vial",
  shield: "paths.shell"
};

export function classifyWeaponLike(source, { modificationEffects = null } = {}) {
  const system = source?.system ?? source ?? {};
  const sourceId = system.sourceId ?? source?.sourceId ?? "";
  const weight = Math.max(0, (Number(system.weight ?? source?.weight) || 0) + (Number(modificationEffects?.weightBonus) || 0));
  const range = String(system.range ?? source?.range ?? "");
  const grip = String(system.grip ?? source?.grip ?? "");
  const text = normalize([
    source?.name,
    system.name,
    system.itemType,
    source?.itemType,
    system.subtype,
    source?.subtype,
    range,
    grip,
    system.description,
    system.rawText,
    sourceId
  ].filter(Boolean).join(" "));

  const types = new Set();
  for (const [type, matchers] of Object.entries(TYPE_MATCHERS)) {
    if (matchers.some((matcher) => matcher.test(text))) types.add(type);
  }

  const shield = source?.type === "armor" && system.subtype === "shield" || types.has("shield");
  if (shield) types.add("shield");
  const magicFocus = system.subtype === "magic-focus" || sourceId.startsWith("equipment.magic-focus.");
  const ranged = /дальн|снаряд|метател|пращ|рогат|болт|shot|ranged/u.test(text);
  const melee = /ближ|melee/u.test(text) || !ranged || /считаться как ближн/u.test(text);
  const reach = /досяг|reach/u.test(text);
  const paired = /парн|пару|pair/u.test(text);
  const unarmed = /без оруж|безоруж|unarmed/u.test(text);
  const natural = types.has("natural") || unarmed;
  const heavy = /тяж[её]л|heavy/u.test(text) || weight >= 2;
  const light = /л[её]гк|light/u.test(text) || weight <= 0;

  return {
    types: Array.from(types),
    pathIds: Array.from(new Set(Array.from(types).map((type) => PATH_BY_WEAPON_TYPE[type]).filter(Boolean))),
    weight,
    range,
    grip,
    melee,
    ranged,
    reach,
    paired,
    unarmed,
    natural,
    shield,
    magicFocus,
    heavy,
    light,
    sourceId,
    text
  };
}

export function weaponHasType(classification, type) {
  return classification?.types?.includes?.(type) ?? false;
}

export function weaponHasAnyType(classification, types = []) {
  return types.some((type) => weaponHasType(classification, type));
}

export function weaponMatchesRequirement(classification, requirement) {
  const value = normalize(String(requirement?.value ?? requirement ?? ""));
  if (!value || value === "martial path") return true;
  if (/оружие ближнего боя с досягаемостью/u.test(value)) return classification?.melee && classification?.reach;
  if (/оружие ближнего боя/u.test(value)) return classification?.melee;
  if (/тяж[её]лое оружие/u.test(value)) return classification?.heavy;
  if (/парное оружие/u.test(value)) return classification?.paired;
  if (/без оружия|безоруж/u.test(value)) return classification?.unarmed || classification?.natural;
  if (/природ/u.test(value)) return classification?.natural;
  if (/сеть/u.test(value)) return classification?.text?.includes?.("сет") ?? false;
  if (/ловуш/u.test(value)) return true;
  for (const [type, matchers] of Object.entries(TYPE_MATCHERS)) {
    if (matchers.some((matcher) => matcher.test(value))) return weaponHasType(classification, type);
  }
  return true;
}

export function weaponRequirementsMatch(classification, requirements = []) {
  return Array.from(requirements ?? [])
    .filter((requirement) => requirement?.type === "weapon_or_condition" || typeof requirement === "string")
    .every((requirement) => weaponMatchesRequirement(classification, requirement));
}

export function normalizeWeaponTypeLabel(value) {
  const classification = classifyWeaponLike({ itemType: value });
  return classification.types[0] ?? normalize(value);
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("ru").replace(/ё/gu, "е").trim();
}
