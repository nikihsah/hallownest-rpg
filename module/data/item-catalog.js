import { customTechniqueData, groupTechniques, isTechniqueType, loadTechniqueCatalog, techniqueItemData } from "./technique-catalog.js";
import { defaultItemIcon } from "./item-icons.js";

let cachedItems;

const TYPE_LABELS = {
  weapon: "HRPG.ItemWeapon",
  armor: "HRPG.ItemArmor",
  charm: "HRPG.ItemCharm",
  art: "HRPG.ItemArt",
  spell: "HRPG.ItemSpell",
  gear: "HRPG.ItemGear",
  consumable: "HRPG.ItemConsumable"
};

export async function loadItemCatalog() {
  if (cachedItems) return cachedItems;
  const response = await fetch("systems/hallownest-rpg/data/items.json");
  if (!response.ok) throw new Error(`Could not load item catalog: ${response.status}`);
  cachedItems = await response.json();
  return cachedItems;
}

export async function loadCatalogItems(type = "") {
  if (isTechniqueType(type)) return loadTechniqueCatalog();
  return loadItemCatalog();
}

export function itemCatalogTypes() {
  return TYPE_LABELS;
}

export function groupCatalogItems(items, { type = "", ownedSourceIds = new Set(), actor = null } = {}) {
  if (isTechniqueType(type)) return groupTechniques(items, { type, ownedSourceIds, actor });
  const filtered = type ? items.filter((item) => item.type === type) : items;
  const groups = new Map();
  for (const item of filtered) {
    const key = itemCatalogGroupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      ...item,
      typeLabel: TYPE_LABELS[item.type] ?? item.type,
      owned: ownedSourceIds.has(item.sourceId),
      meta: itemMeta(item)
    });
  }
  return Array.from(groups, ([key, entries]) => ({ key, label: itemSubtypeLabel(key), items: entries }));
}

export function catalogItemData(item) {
  if (isTechniqueType(item.type)) return techniqueItemData(item);
  const base = {
    name: item.name,
    type: item.type,
    img: item.img || defaultItemIcon(item.type, { subtype: item.subtype }),
    system: {
      description: item.description ?? "",
      sourceId: item.sourceId,
      catalogType: item.type,
      subtype: item.subtype ?? "",
      modification: item.modification ?? "",
      quantity: Number(item.quantity) || 1,
      weight: Number(item.weight) || 0,
      weightLabel: item.weightLabel ?? "",
      equipped: Boolean(item.equipped),
      price: item.price ?? "",
      rawText: item.rawText ?? ""
    }
  };
  if (item.type === "weapon") {
    Object.assign(base.system, {
      itemType: item.itemType ?? "",
      damage: item.damage ?? "",
      range: item.range ?? "",
      grip: item.grip ?? "",
      quality: item.quality ?? { value: 1, max: 1 }
    });
  }
  if (item.type === "armor") {
    Object.assign(base.system, {
      protection: Number(item.protection) || 0,
      damageReduction: Number(item.damageReduction) || 0,
      durability: Number(item.durability) || 0,
      quality: item.quality ?? { value: 0, max: 0 }
    });
  }
  if (item.type === "charm") {
    Object.assign(base.system, {
      notches: Number(item.notches) || 0,
      rarity: item.rarity ?? ""
    });
  }
  if (item.type === "consumable") {
    Object.assign(base.system, {
      uses: item.uses ?? { value: 1, max: 1 },
      potency: item.potency ?? "",
      rarity: item.rarity ?? "",
      satiety: item.satiety ?? "",
      reusable: item.reusable ?? ""
    });
  }
  return base;
}

export function customItemData(type, name) {
  if (isTechniqueType(type)) return customTechniqueData(type, name);
  const item = {
    name,
    type,
    img: defaultItemIcon(type),
    system: {
      catalogType: type,
      subtype: "",
      modification: "",
      description: "",
      rawText: "",
      attachments: { one: "", two: "", three: "" },
      quantity: 1,
      weight: 0,
      equipped: false
    }
  };
  if (type === "charm") {
    Object.assign(item.system, {
      notches: 1,
      rarity: ""
    });
  }
  return item;
}

function itemMeta(item) {
  const parts = [];
  if (item.type === "weapon") {
    if (item.itemType) parts.push(item.itemType);
    if (item.damage) parts.push(`урон ${item.damage}`);
    if (item.range) parts.push(item.range);
    if (item.grip) parts.push(item.grip);
  }
  if (item.type === "armor") {
    if (item.protection) parts.push(`защита ${item.protection}`);
    if (item.damageReduction) parts.push(`ПУ ${item.damageReduction}`);
  }
  if (item.type === "charm" && item.notches) parts.push(`метки ${item.notches}`);
  if (item.weightLabel || item.weight) parts.push(`вес ${item.weightLabel || item.weight}`);
  if (item.price) parts.push(`${item.price} гео`);
  return parts.join(" · ");
}

function itemSubtypeLabel(key) {
  return `HRPG.ItemSubtype.${key}`;
}

function itemCatalogGroupKey(item) {
  if (item.type === "charm") {
    const family = item.sourceId?.split(".")?.[1];
    if (family) return `charm-${family}`;
  }
  return item.subtype || item.type;
}
