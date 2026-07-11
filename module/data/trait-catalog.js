import { naturalWeaponQualityData } from "../mechanics/trait-quality.js";
import { defaultItemIcon } from "./item-icons.js";
import { EMPTY_VIAL_EFFECT, isFluidsSubtrait } from "./vial-effects.js";

let cachedTraits;

const BLOODSUCKER_SUBTRAITS = Object.freeze([
  {
    sourceId: "traits.krovosos.drobyashchie-chelyusti",
    parentTrait: "traits.drobyashchie-chelyusti",
    parentName: "Дробящие Челюсти"
  },
  {
    sourceId: "traits.krovosos.sharp-khobotok",
    parentTrait: "traits.sharp-khobotok",
    parentName: "Острый Хоботок"
  }
]);

const TRAIT_HUNGER_CHOICES = Object.freeze({
  "traits.pozhiratel": [
    { key: "heart", label: "Сердце (+4 Голод)", costLabel: "+4 Голод (Сердце)", hunger: 4 },
    { key: "soul", label: "Душа (+2 Голод)", costLabel: "+2 Голод (Душа)", hunger: 2 },
    { key: "stamina", label: "Выносливость (+1 Голод)", costLabel: "+1 Голод (Выносливость)", hunger: 1 }
  ]
});

export async function loadTraitCatalog() {
  if (cachedTraits) return cachedTraits;
  const response = await fetch("systems/hallownest-rpg/data/traits.json");
  if (!response.ok) throw new Error(`Could not load trait catalog: ${response.status}`);
  cachedTraits = expandedTraitCatalog(await response.json());
  return cachedTraits;
}

export function expandedTraitCatalog(traits) {
  const expanded = [...traits];
  const existingIds = new Set(expanded.map((trait) => trait.sourceId));
  const bloodsucker = traits.find((trait) => trait.sourceId === "traits.krovosos");
  if (!bloodsucker) return expanded;
  for (const subtrait of BLOODSUCKER_SUBTRAITS) {
    if (existingIds.has(subtrait.sourceId)) continue;
    expanded.push({
      ...bloodsucker,
      ...subtrait,
      kind: "subtrait",
      category: "weapons",
      description: `${bloodsucker.description}\n\nПодчерта для природного оружия: Кровосос работает только с выбранным оружием.`
    });
  }
  return expanded;
}

export function traitItemData(trait, { social = "", parentItemId = "", hungerChoice = "" } = {}) {
  const modifiers = { ...trait.modifiers };
  if (trait.socialChoice?.includes(social)) modifiers[social] = Number(trait.socialValue) || 0;
  const selectedHunger = selectedTraitHungerChoice(trait, hungerChoice);
  if (selectedHunger) modifiers.hunger = selectedHunger.hunger;
  const system = {
    description: trait.description,
    kind: trait.kind,
    category: trait.category ?? "",
    parentTrait: trait.parentTrait ?? "",
    parentItemId,
    sourceId: trait.sourceId,
    active: true,
    modifiers,
    quality: naturalWeaponQualityData(trait),
    rules: trait.rules ?? [],
    costLabel: selectedHunger?.costLabel ?? trait.costLabel ?? "",
    hungerChoice: selectedHunger?.key ?? ""
  };
  if (isFluidsSubtrait(trait)) system.vialEffect = { ...EMPTY_VIAL_EFFECT };
  return {
    name: trait.name,
    type: "trait",
    img: trait.img || defaultItemIcon("trait"),
    system
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
      hungerChoices: traitHungerChoices(trait),
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

function traitHungerChoices(trait) {
  return TRAIT_HUNGER_CHOICES[trait?.sourceId] ?? [];
}

function selectedTraitHungerChoice(trait, key) {
  const choices = traitHungerChoices(trait);
  if (!choices.length) return null;
  return choices.find((choice) => choice.key === key) ?? choices[0];
}
