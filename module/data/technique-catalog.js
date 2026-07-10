let cachedTechniques;

const TYPE_LABELS = {
  art: "HRPG.ItemArt",
  spell: "HRPG.ItemSpell"
};

const TECHNIQUE_TYPE_LABELS = {
  boost: "HRPG.TechniqueType.boost",
  normal: "HRPG.TechniqueType.normal",
  reaction: "HRPG.TechniqueType.reaction",
  special: "HRPG.TechniqueType.special",
  unique: "HRPG.TechniqueType.unique",
  secret: "HRPG.TechniqueType.secret"
};

const MARTIAL_REQUIREMENT_PATHS = {
  "гвоздь": "paths.nail",
  "игла": "paths.needle",
  "клык": "paths.fang",
  "крюк": "paths.hook",
  "праща": "paths.sling",
  "склянка": "paths.vial",
  "щит": "paths.shell",
  "тяжелое оружие": "paths.fang",
  "тяжёлое оружие": "paths.fang",
  "парное оружие": "paths.needle"
};

export async function loadTechniqueCatalog() {
  if (cachedTechniques) return cachedTechniques;
  const response = await fetch("systems/hallownest-rpg/data/techniques.json");
  if (!response.ok) throw new Error(`Could not load technique catalog: ${response.status}`);
  cachedTechniques = await response.json();
  return cachedTechniques;
}

export function isTechniqueType(type) {
  return type === "art" || type === "spell";
}

export function groupTechniques(techniques, { type = "", ownedSourceIds = new Set(), actor = null } = {}) {
  const filtered = type ? techniques.filter((technique) => technique.type === type) : techniques;
  const groups = new Map();
  for (const technique of filtered) {
    const pathIds = techniquePathIds(technique);
    const key = techniqueGroupKey(technique);
    if (!groups.has(key)) groups.set(key, []);
    const available = techniqueAvailable(actor, technique);
    groups.get(key).push({
      ...technique,
      pathIds,
      typeLabel: TYPE_LABELS[technique.type] ?? technique.type,
      typeName: techniqueTypeName(technique),
      owned: ownedSourceIds.has(technique.sourceId),
      available,
      warning: actor && !available ? techniqueMismatchWarning(technique) : "",
      meta: techniqueMeta(technique)
    });
  }
  return Array.from(groups, ([key, entries]) => ({
    key,
    label: groupLabel(entries[0]),
    preferred: entries.some((entry) => entry.available),
    items: entries.sort((left, right) => Number(right.available) - Number(left.available) || left.name.localeCompare(right.name, "ru"))
  })).sort((left, right) => Number(right.preferred) - Number(left.preferred) || String(left.label).localeCompare(String(right.label), "ru"));
}

export function techniqueItemData(technique) {
  return {
    name: technique.name,
    type: technique.type,
    system: {
      description: technique.description ?? "",
      sourceId: technique.sourceId,
      catalogType: technique.type,
      subtype: technique.subtype ?? "",
      rawText: technique.rawText ?? "",
      effectText: technique.effectText ?? "",
      prepared: Boolean(technique.prepared),
      pathFamily: technique.pathFamily ?? "",
      pathId: technique.pathId ?? "",
      pathIds: technique.pathIds ?? techniquePathIds(technique),
      pathName: technique.pathName ?? "",
      techniqueType: technique.techniqueType ?? "",
      requirementLabel: technique.requirementLabel ?? "",
      requirements: technique.requirements ?? [],
      effects: technique.effects ?? [],
      tags: technique.tags ?? [],
      range: technique.range ?? "",
      duration: technique.duration ?? "",
      page: technique.page ?? "",
      cost: {
        raw: technique.cost?.raw ?? "",
        stamina: technique.cost?.stamina ?? 0,
        soul: technique.cost?.soul ?? 0,
        essence: technique.cost?.essence ?? 0,
        difficulty: technique.cost?.difficulty ?? 0,
        focus: Boolean(technique.cost?.focus)
      },
      attachments: { one: "", two: "", three: "" }
    }
  };
}

export function customTechniqueData(type, name) {
  return {
    name,
    type,
    system: {
      catalogType: type,
      description: "",
      rawText: "",
      effectText: "",
      prepared: false,
      pathFamily: type === "spell" ? "mystic" : "martial",
      pathId: "",
      pathName: "",
      techniqueType: type === "spell" ? "secret" : "unique",
      requirementLabel: "",
      requirements: [],
      effects: [],
      tags: [],
      range: "",
      duration: "",
      cost: { raw: "", stamina: 0, soul: 0, essence: 0, difficulty: 0, focus: false },
      attachments: { one: "", two: "", three: "" }
    }
  };
}

export function techniqueTypeName(technique) {
  if (technique.type === "spell") return "HRPG.TechniqueType.secret";
  const first = String(technique.techniqueType ?? technique.subtype ?? "").split(",").map((part) => part.trim()).filter(Boolean)[0];
  return TECHNIQUE_TYPE_LABELS[first] ?? "HRPG.ItemArt";
}

export function techniqueMeta(technique) {
  const parts = [];
  if (technique.pathName) parts.push(technique.pathName);
  if (technique.cost?.raw) parts.push(technique.cost.raw);
  if (technique.requirementLabel) parts.push(technique.requirementLabel);
  if (technique.range) parts.push(`${localLabel("HRPG.Range")}: ${technique.range}`);
  if (technique.duration) parts.push(`${localLabel("HRPG.Duration")}: ${technique.duration}`);
  return parts.join(" · ");
}

export function preparedTechniqueCount(items) {
  return Array.from(items ?? []).filter((item) => isTechniqueType(item.type) && item.system?.prepared === true).length;
}

export function techniqueSlotsSummary(actor) {
  const maximum = Math.max(0, Math.floor(Number(actor?.system?.derived?.techniqueSlots) || 0));
  const used = preparedTechniqueCount(actor?.items);
  const prepared = Array.from(actor?.items ?? [])
    .filter((item) => isTechniqueType(item.type) && item.system?.prepared === true)
    .map((item) => item.name);
  return {
    used,
    maximum,
    remaining: Math.max(0, maximum - used),
    over: used > maximum,
    prepared
  };
}

export function techniqueAvailable(actor, technique) {
  if (!actor) return true;
  if (technique.pathFamily === "martial") {
    const pathIds = techniquePathIds(technique);
    if (!pathIds.length) return actor.items?.some?.((item) => item.type === "path" && item.system?.category === "martial" && Number(item.system?.rank) > 0) ?? false;
    return pathIds.some((pathId) => hasActorPath(actor, pathId));
  }
  if (technique.pathId) {
    const path = actor.items?.find?.((item) => item.type === "path" && item.system?.sourceId === technique.pathId);
    if (!path) return false;
    const difficulty = Number(technique.cost?.difficulty) || 0;
    return difficulty <= 2 * (Number(path.system?.rank) || 0);
  }
  return true;
}

export function techniqueMismatchWarning(technique) {
  return technique.type === "spell" ? "HRPG.TechniqueWrongMysticPath" : "HRPG.TechniqueWrongMartialPath";
}

export function techniquePathIds(technique) {
  if (technique.pathId) return [technique.pathId];
  const requirements = Array.isArray(technique.requirements) ? technique.requirements : technique.system?.requirements ?? [];
  const ids = new Set();
  for (const requirement of requirements) {
    const value = String(requirement?.value ?? "").toLocaleLowerCase("ru").trim();
    for (const [needle, pathId] of Object.entries(MARTIAL_REQUIREMENT_PATHS)) {
      if (value.includes(needle)) ids.add(pathId);
    }
  }
  return Array.from(ids);
}

function groupLabel(technique) {
  if (technique.type === "art") return techniqueTypeName(technique);
  const pathId = technique.pathIds?.[0];
  if (technique.pathFamily === "martial" && pathId) return `HRPG.TechniquePath.${pathId.replace("paths.", "")}`;
  if (technique.pathName) return technique.pathName;
  if (pathId) return `HRPG.TechniquePath.${pathId.replace("paths.", "")}`;
  if (technique.pathFamily === "martial") return "HRPG.PathMartial";
  if (technique.pathFamily === "mystic") return "HRPG.PathMystic";
  return TYPE_LABELS[technique.type] ?? technique.type;
}

function techniqueGroupKey(technique) {
  if (technique.type === "art") {
    return String(technique.techniqueType ?? technique.subtype ?? "art")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)[0] ?? "art";
  }
  return technique.pathId || technique.pathFamily || technique.subtype || technique.type;
}

function localLabel(key) {
  return globalThis.game?.i18n?.localize?.(key) ?? key;
}

function hasActorPath(actor, pathId) {
  return actor.items?.some?.((item) => item.type === "path"
    && item.system?.sourceId === pathId
    && Number(item.system?.rank) > 0) ?? false;
}
