const DAMAGE_PATTERNS = [
  /нанос(?:ит|ящее|ящий|ящие|ить)[^.]{0,80}?(\d+(?:[,.]\d+)?)\s*(?:единиц[а-яё]*\s+)?урон[а-яё]*/iu,
  /(\d+(?:[,.]\d+)?)\s*(?:единиц[а-яё]*\s+)?урон[а-яё]*/iu
];

export function quickAttackFromTrait(trait) {
  if (!trait || trait.type !== "trait" || trait.system?.active === false) return null;
  if (trait.system?.category !== "weapons") return null;
  if (trait.system?.kind === "subtrait") return null;

  const text = [trait.system.description, ...(trait.system.rules ?? [])].filter(Boolean).join("\n");
  if (!looksLikeAttack(text)) return null;

  const damage = extractDamage(text);
  return {
    itemId: trait.id,
    name: trait.name,
    damage,
    tooltip: attackTooltip(text)
  };
}

export function quickAttacksFromItems(items) {
  return Array.from(items ?? [])
    .map((item) => quickAttackFromTrait(item))
    .filter(Boolean);
}

function looksLikeAttack(text) {
  const value = String(text ?? "");
  return /природн\w*\s+оруж/iu.test(value) || DAMAGE_PATTERNS.some((pattern) => pattern.test(value));
}

function extractDamage(text) {
  const value = String(text ?? "");
  for (const pattern of DAMAGE_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[1].replace(",", ".");
  }
  return "";
}

function attackTooltip(text) {
  const value = String(text ?? "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 220);
  return value.length === 220 ? `${value}…` : value;
}
