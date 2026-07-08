const DAMAGE_PATTERNS = [
  /нанос(?:ит|ящее|ящий|ящие|ить)[^.]{0,80}?(\d+(?:[,.]\d+)?)\s*(?:единиц[а-яё]*\s+)?урон[а-яё]*/iu,
  /(\d+(?:[,.]\d+)?)\s*(?:единиц[а-яё]*\s+)?урон[а-яё]*/iu
];

export function quickAttackFromTrait(trait) {
  return quickAttackFromTraitWithSubtraits(trait, []);
}

export function quickAttackFromTraitWithSubtraits(trait, subtraits = []) {
  if (!trait || trait.type !== "trait" || trait.system?.active === false) return null;
  if (trait.system?.category !== "weapons") return null;
  if (trait.system?.kind === "subtrait") return null;

  const text = [trait.system.description, ...(trait.system.rules ?? [])].filter(Boolean).join("\n");
  if (!looksLikeAttack(text)) return null;

  const activeSubtraits = subtraits.filter((subtrait) => subtrait?.system?.active !== false);
  const damage = applySubtraitDamage(extractDamage(text), activeSubtraits);
  return {
    itemId: trait.id,
    name: trait.name,
    damage,
    tooltip: attackTooltip([text, ...activeSubtraits.map((subtrait) => `${subtrait.name}: ${subtrait.system?.description ?? ""}`)].join("\n")),
    subtraits: activeSubtraits.map((subtrait) => subtrait.name)
  };
}

export function quickAttacksFromItems(items) {
  const traits = Array.from(items ?? []).filter((item) => item?.type === "trait" && item.system?.active !== false);
  const subtraitsByParent = new Map();
  for (const item of traits.filter((entry) => entry.system?.kind === "subtrait" && entry.system?.parentTrait)) {
    const list = subtraitsByParent.get(item.system.parentTrait) ?? [];
    list.push(item);
    subtraitsByParent.set(item.system.parentTrait, list);
  }
  return traits
    .filter((item) => item.system?.kind !== "subtrait")
    .map((item) => quickAttackFromTraitWithSubtraits(item, subtraitsByParent.get(item.system?.sourceId) ?? []))
    .filter(Boolean);
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

function attackTooltip(text) {
  const value = String(text ?? "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 220);
  return value.length === 220 ? `${value}…` : value;
}
