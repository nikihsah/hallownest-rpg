const SKILL_SLOTS = 4;
const MAX_SKILL_RANK_DICE = 3;
const MASTERY_BONUS = 1;

export function skillSlots() {
  return SKILL_SLOTS;
}

export function skillRowsForItem(item) {
  const rows = Array.from(item?.system?.skills ?? []);
  while (rows.length < SKILL_SLOTS) rows.push({ name: "" });
  return rows.slice(0, SKILL_SLOTS).map((row, index) => ({
    key: index,
    name: row?.name ?? ""
  }));
}

export function skillRank(item) {
  return Math.max(1, Math.min(3, Math.floor(Number(item?.system?.rank) || 1)));
}

export function skillTotals(items = []) {
  const totals = new Map();
  for (const item of Array.from(items ?? [])) {
    if (item?.type !== "skill") continue;
    const rank = skillRank(item);
    const masteryName = normalizeSkillName(item.system?.mastery);
    for (const row of skillRowsForItem(item)) {
      const key = normalizeSkillName(row.name);
      if (!key) continue;
      const entry = totals.get(key) ?? {
        key,
        name: String(row.name).trim(),
        rankDiceRaw: 0,
        rankDice: 0,
        masteryBonus: 0,
        total: 0,
        sources: [],
        masteries: []
      };
      entry.rankDiceRaw += rank;
      entry.sources.push({ itemId: item.id, name: item.name, rank });
      if (masteryName && masteryName === key) {
        entry.masteryBonus = Math.max(entry.masteryBonus, MASTERY_BONUS);
        entry.masteries.push(item.name);
      }
      totals.set(key, entry);
    }
  }
  for (const entry of totals.values()) {
    entry.rankDice = Math.min(MAX_SKILL_RANK_DICE, entry.rankDiceRaw);
    entry.total = entry.rankDice + entry.masteryBonus;
  }
  return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function skillTotal(items = [], skillName = "") {
  const key = normalizeSkillName(skillName);
  return skillTotals(items).find((entry) => entry.key === key) ?? null;
}

export function skillTotalForName(items = [], skillName = "") {
  return skillTotal(items, skillName)?.total ?? 0;
}

export function normalizeSkillName(value) {
  return String(value ?? "").toLocaleLowerCase("ru").replace(/ё/gu, "е").replace(/\s+/gu, " ").trim();
}

export function skillBreakdown(entry, { totalLabel = "Итого", masteryLabel = "Мастерство", cappedLabel = "Кап рангов" } = {}) {
  if (!entry) return "";
  const lines = entry.sources.map((source) => `${source.name}: +${source.rank}`);
  if (entry.rankDiceRaw > entry.rankDice) lines.push(`${cappedLabel}: ${entry.rankDiceRaw} → ${entry.rankDice}`);
  if (entry.masteryBonus) lines.push(`${masteryLabel}: +${entry.masteryBonus}`);
  lines.push(`${totalLabel}: ${entry.total}`);
  return lines.join("\n");
}
