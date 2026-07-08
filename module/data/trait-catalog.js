let cachedTraits;

export async function loadTraitCatalog() {
  if (cachedTraits) return cachedTraits;
  const response = await fetch("systems/hallownest-rpg/data/traits.json");
  if (!response.ok) throw new Error(`Could not load trait catalog: ${response.status}`);
  cachedTraits = await response.json();
  return cachedTraits;
}

export function traitItemData(trait, { social = "" } = {}) {
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
      sourceId: trait.sourceId,
      active: true,
      modifiers,
      rules: trait.rules ?? [],
      costLabel: trait.costLabel ?? ""
    }
  };
}

export function groupTraits(traits, ownedSourceIds = new Set()) {
  const categories = new Map();
  for (const trait of traits) {
    if (!categories.has(trait.category)) categories.set(trait.category, []);
    categories.get(trait.category).push({
      ...trait,
      owned: ownedSourceIds.has(trait.sourceId),
      parentMissing: trait.kind === "subtrait" && !ownedSourceIds.has(trait.parentTrait)
    });
  }
  return Array.from(categories, ([key, entries]) => ({ key, label: `HRPG.TraitCategory.${key}`, traits: entries }));
}
