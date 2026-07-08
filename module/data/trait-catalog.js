let cachedTraits;

export async function loadTraitCatalog() {
  if (cachedTraits) return cachedTraits;
  const response = await fetch("systems/hallownest-rpg/data/traits.json");
  if (!response.ok) throw new Error(`Could not load trait catalog: ${response.status}`);
  cachedTraits = await response.json();
  return cachedTraits;
}

export function traitItemData(trait, { social = "", parentItemId = "" } = {}) {
  const modifiers = { ...trait.modifiers };
  if (trait.socialChoice?.includes(social)) modifiers[social] = Number(trait.socialValue) || 0;
  return {
    name: trait.name,
    type: "trait",
    system: {
      description: trait.description,
      kind: trait.kind,
      category: trait.category ?? "",
      parentTrait: trait.parentTrait ?? "",
      parentItemId,
      sourceId: trait.sourceId,
      active: true,
      modifiers,
      rules: trait.rules ?? [],
      costLabel: trait.costLabel ?? ""
    }
  };
}

export function groupTraits(traits, ownedSourceIds = new Set(), ownedCounts = new Map(), parentChoices = new Map()) {
  const categories = new Map();
  for (const trait of traits) {
    const parentChoiceList = trait.kind === "subtrait" ? parentChoices.get(trait.parentTrait) ?? [] : [];
    const repeatLimit = trait.kind === "subtrait" && parentChoiceList.length > 1 ? parentChoiceList.length : repeatLimitForTrait(trait);
    const ownedCount = ownedCounts.get(trait.sourceId) ?? (ownedSourceIds.has(trait.sourceId) ? 1 : 0);
    const owned = ownedCount >= repeatLimit;
    if (!categories.has(trait.category)) categories.set(trait.category, []);
    categories.get(trait.category).push({
      ...trait,
      repeatLimit,
      repeatLimitLabel: repeatLimit >= 99 ? "∞" : `${repeatLimit}`,
      ownedCount,
      owned,
      repeatable: repeatLimit > 1,
      parentChoices: parentChoiceList,
      parentMissing: trait.kind === "subtrait" && !ownedSourceIds.has(trait.parentTrait)
    });
  }
  return Array.from(categories, ([key, entries]) => ({ key, label: `HRPG.TraitCategory.${key}`, traits: entries }));
}

export function repeatLimitForTrait(trait) {
  if (trait?.sourceId === "traits.natural-projectile") return 99;
  const text = `${trait?.description ?? ""} ${(trait?.rules ?? []).join(" ")}`;
  if (/до\s+тр[её]х\s+раз|до\s+3\s+раз/iu.test(text)) return 3;
  if (/дважды|два\s+раза|до\s+2\s+раз/iu.test(text)) return 2;
  if (/несколько\s+раз|может\s+быть\s+взята\s+несколько\s+раз|можно\s+взять\s+несколько\s+раз/iu.test(text)) return 99;
  return 1;
}
