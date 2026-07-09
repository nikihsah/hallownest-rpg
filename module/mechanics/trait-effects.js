const TRAIT_PROMPT_EFFECTS = {
  "traits.tsivilizovannyy": {
    trigger: "attack",
    label: "Цивилизованный",
    note: "Если запас Сердец не полный, атаки и проверки Характеристик получают -1 кость."
  },
  "traits.podlyy": {
    trigger: "attack",
    label: "Подлый",
    note: "Когда у жука 1 Сердце или меньше, его отчаянные преимущества могут повлиять на бой; проверьте правило черты."
  },
  "traits.kollektivnyy-razum": {
    trigger: "attack",
    label: "Коллективный разум",
    note: "Если цель была поражена союзником с прошлого хода жука, можно получить +1 кость к атаке."
  },
  "traits.claws": {
    trigger: "attack",
    label: "Клешни",
    note: "Клешни получают +2 переброса к проверкам захвата и наносят больше урона уже схваченным ими жукам."
  },
  "traits.shchupaltse": {
    trigger: "attack",
    label: "Щупальце",
    note: "Щупальце может использоваться для захвата на расстоянии; для такого захвата Мощь считается равной 3."
  },
  "traits.bolshe-nog": {
    trigger: "defense",
    label: "Больше Ног",
    note: "Даёт +3 кубика к сопротивлению сбиванию с ног или смещению."
  },
  "traits.krokha": {
    trigger: "defense",
    label: "Кроха",
    note: "Крохи могут цепляться за больших жуков и иначе взаимодействовать с угрозами размера; проверьте условие сцены."
  },
  "traits.myagkoe-telo": {
    trigger: "absorption",
    label: "Мягкое Тело",
    note: "Жук не может добавлять Панцирь к Впитыванию, но имеет увеличенный запас Сердец."
  },
  "traits.blocking-arms": {
    trigger: "parry",
    label: "Блокирующие Руки",
    note: "Свободные руки считаются щитом с Качеством, равным половине Панциря, округлённой вверх."
  },
  "traits.defensive-curl": {
    trigger: "defense",
    label: "Защитный Клубок",
    note: "Защитное скручивание меняет позицию и защиту жука; проверьте выбранное действие и подчёрты."
  }
};

const CONDITIONAL_OPTIONS = {
  "ally-hit-target": {
    key: "ally-hit-target",
    sourceId: "traits.kollektivnyy-razum",
    trigger: "attack",
    label: "Цель поражал союзник",
    note: "Коллективный разум: +1 кость к атаке по цели, поражённой союзником с прошлого хода.",
    bonusDice: 1
  },
  "civilized-wounded": {
    key: "civilized-wounded",
    sourceId: "traits.tsivilizovannyy",
    trigger: "attack",
    label: "Сердца не полные",
    note: "Цивилизованный: -1 кость к атаке, пока запас Сердец не полный.",
    bonusDice: -1
  },
  "target-grappled-by-claws": {
    key: "target-grappled-by-claws",
    sourceId: "traits.claws",
    trigger: "attack",
    label: "Цель уже схвачена Клешнями",
    note: "Клешни: урон по уже схваченной ими цели выше; примените урон по правилу черты.",
    bonusDice: 0
  },
  "resist-forced-movement": {
    key: "resist-forced-movement",
    sourceId: "traits.bolshe-nog",
    trigger: "defense",
    label: "Сопротивление смещению",
    note: "Больше Ног: +3 кубика к сопротивлению сбиванию с ног или смещению.",
    bonusDice: 3
  }
};

export function traitPromptEffects(items, trigger = "", { itemId = "" } = {}) {
  const traits = activeTraits(items);
  const effects = [];
  for (const trait of traits) {
    const effect = TRAIT_PROMPT_EFFECTS[trait.system?.sourceId];
    if (effect && (!trigger || effect.trigger === trigger || effect.trigger === "defense" && ["dodge", "parry"].includes(trigger))) {
      effects.push({
        itemId: trait.id,
        itemName: trait.name,
        label: effect.label,
        trigger: effect.trigger,
        note: effect.note
      });
    }
  }

  if (trigger === "attack" && itemId) {
    const selected = traits.find((trait) => trait.id === itemId);
    if (selected?.type === "trait") {
      effects.push(...selectedTraitAttackEffects(selected, traits));
    }
  }
  return dedupeEffects(effects);
}

export function traitConditionalOptions(actor, trigger = "", { itemId = "" } = {}) {
  const traits = activeTraits(actor?.items);
  const selected = itemId ? traits.find((trait) => trait.id === itemId) : null;
  const options = [];
  for (const option of Object.values(CONDITIONAL_OPTIONS)) {
    if (option.trigger !== trigger && !(option.trigger === "defense" && ["dodge", "parry"].includes(trigger))) continue;
    if (!traits.some((trait) => trait.system?.sourceId === option.sourceId)) continue;
    if (option.sourceId === "traits.claws" && selected?.system?.sourceId !== "traits.claws") continue;
    options.push({ ...option });
  }
  return options;
}

export function applyTraitConditionalOptions(options = [], selectedKeys = []) {
  const selected = new Set(selectedKeys);
  const result = { bonusDice: 0, notes: [] };
  for (const option of options) {
    if (!selected.has(option.key)) continue;
    result.bonusDice += Number(option.bonusDice) || 0;
    result.notes.push(option.note);
  }
  return result;
}

export function traitNotesFromKeys(actor, trigger = "", selectedKeys = [], context = {}) {
  const options = traitConditionalOptions(actor, trigger, context);
  return applyTraitConditionalOptions(options, selectedKeys).notes;
}

function selectedTraitAttackEffects(selected, traits) {
  const effects = [];
  const parentText = [selected.system?.description, ...(selected.system?.rules ?? [])].filter(Boolean).join(" ");
  if (parentText) {
    effects.push({
      itemId: selected.id,
      itemName: selected.name,
      label: selected.name,
      trigger: "attack",
      note: summarize(parentText)
    });
  }
  for (const subtrait of boundSubtraits(selected, traits)) {
    effects.push({
      itemId: subtrait.id,
      itemName: subtrait.name,
      label: subtrait.name,
      trigger: "attack",
      note: summarize([subtrait.system?.description, ...(subtrait.system?.rules ?? [])].filter(Boolean).join(" "))
    });
  }
  return effects;
}

function boundSubtraits(parent, traits) {
  return traits.filter((trait) => trait.system?.kind === "subtrait"
    && trait.system?.parentTrait === parent.system?.sourceId
    && (!trait.system?.parentItemId || trait.system.parentItemId === parent.id));
}

function activeTraits(items) {
  return Array.from(items ?? []).filter((item) => item?.type === "trait" && item.system?.active !== false);
}

function summarize(text) {
  const value = String(text ?? "").replace(/\s+/gu, " ").trim();
  return value.length > 260 ? `${value.slice(0, 260)}…` : value;
}

function dedupeEffects(effects) {
  const seen = new Set();
  return effects.filter((effect) => {
    const key = `${effect.itemId}:${effect.label}:${effect.note}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
