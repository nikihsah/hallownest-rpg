import { classifyWeaponLike, weaponHasType } from "./weapon-classifier.js";

const ATTACK_EFFECTS = {
  "paths.nail": {
    1: [
      { key: "nail-defense-piercing", label: "Пробитие защиты", effect: { successThreshold: 4 }, note: "Если цель уже была атакована вами, 4 считаются успехами." }
    ]
  },
  "paths.needle": {
    1: [
      { key: "needle-grace", label: "Быстрые удары", effect: { attribute: "grace" }, note: "Атака использует Грацию вместо Мощи, если оружие подходит." },
      { key: "needle-lunge", label: "Резкий выпад", effect: { bonusDice: -1 }, note: "Штраф -1 кость, дальность атаки увеличена на 1." }
    ],
    2: [
      { key: "needle-momentum", label: "Боевой танец", effect: { noteOnly: true }, note: "Импульс можно потратить как дополнительную Выносливость после начала атаки." }
    ]
  },
  "paths.fang": {
    1: [
      { key: "fang-power-attack", label: "Силовая атака", effect: { noteOnly: true }, note: "Если на атаку/Искусство потрачено минимум 3 Выносливости, урон +1; тяжёлое/Клык оружие — +2." }
    ],
    3: [
      { key: "fang-controlled-force", label: "Контролируемая сила", effect: { taxAsDice: true }, note: "Налог Выносливости этой атаки считается вложенной Выносливостью и добавляет кубы." }
    ]
  },
  "paths.hook": {
    1: [
      { key: "hook-grace", label: "Тонкий серп", effect: { attribute: "grace" }, note: "Атака использует Грацию вместо Мощи, если оружие подходит." },
      { key: "hook-trick-bag", label: "Мешок трюков", effect: { noteOnly: true }, note: "Применена хитрость Пути Крюка; уточните эффект по рангу и ситуации." }
    ],
    2: [
      { key: "hook-clever-tricks", label: "Умные трюки", effect: { noteOnly: true }, note: "Применены Умные трюки; мастер выбирает подходящий ситуационный эффект." }
    ],
    3: [
      { key: "hook-win-by-deceit", label: "Обман ради победы", effect: { noteOnly: true }, note: "Применён Обман ради победы; проверьте условия способности." }
    ]
  },
  "paths.maw": {
    1: [{ key: "maw-frenzy", label: "Безумие", effect: { noteOnly: true }, note: "Применено Безумие Пути Чрева; проверьте условия способности." }],
    2: [{ key: "maw-burnout", label: "Выгорание", effect: { noteOnly: true }, note: "Применено Выгорание Пути Чрева; проверьте цену и эффект." }],
    3: [{ key: "maw-bloodlust", label: "Кровожадность", effect: { noteOnly: true }, note: "Кровожадность: убийство бойца восстанавливает ресурс по правилу пути." }]
  },
  "paths.shell": {
    1: [{ key: "shell-sliding-strikes", label: "Скользящие удары", effect: { noteOnly: true }, note: "Применены Скользящие удары; проверьте условие движения/позиции." }],
    3: [{ key: "shell-combat-defense", label: "Боевая защита", effect: { noteOnly: true }, note: "Применена Боевая защита; проверьте защитное условие ранга." }]
  },
  "paths.sling": {
    1: [
      { key: "sling-good-hand", label: "Хорошая рука", effect: { noteOnly: true }, note: "Применена Хорошая рука; проверьте условие дальнобойной атаки." },
      { key: "sling-long-shot", label: "Длинный выстрел", effect: { noteOnly: true }, note: "Дальность выстрела увеличена по правилу Пути Пращи." }
    ],
    2: [{ key: "sling-ricochet", label: "Отскок", effect: { noteOnly: true }, note: "Применён Отскок; выберите траекторию/цель по правилу пути." }],
    3: [{ key: "sling-bullseye", label: "В яблочко", effect: { noteOnly: true }, note: "Применено В яблочко; проверьте условие точного попадания." }]
  },
  "paths.vial": {
    1: [
      { key: "vial-light-throw", label: "Лёгкий бросок", effect: { noteOnly: true }, note: "Применён Лёгкий бросок Склянки." },
      { key: "vial-chemical-war", label: "Химическая война", effect: { noteOnly: true }, note: "Применена Химическая война; проверьте эффект выбранной склянки." }
    ],
    2: [{ key: "vial-controlled-blast", label: "Контролируемый взрыв", effect: { noteOnly: true }, note: "Применён Контролируемый взрыв." }],
    3: [{ key: "vial-admixture", label: "Химическая примесь", effect: { noteOnly: true }, note: "Применена Химическая примесь; выберите смешиваемый эффект." }]
  }
};

export function unlockedPathAttackOptions(actor) {
  const options = [];
  for (const path of actor?.items?.filter?.((item) => item.type === "path") ?? []) {
    const rank = Math.max(0, Math.floor(Number(path.system?.rank) || 0));
    const byRank = ATTACK_EFFECTS[path.system?.sourceId] ?? {};
    for (let level = 1; level <= rank; level += 1) {
      for (const option of byRank[level] ?? []) {
        options.push({ ...option, pathName: path.name, rank: level });
      }
    }
  }
  return options;
}

export function availablePathAttackOptions(actor, attack) {
  return unlockedPathAttackOptions(actor).filter((option) => pathAttackOptionApplies(option, attack));
}

export function applyPathAttackOptions(base, selectedOptions = []) {
  const result = {
    attribute: base.attribute,
    bonusDice: Number(base.bonusDice) || 0,
    successThreshold: Number(base.successThreshold) || 5,
    taxAsDice: false,
    notes: []
  };
  for (const option of selectedOptions) {
    const effect = option.effect ?? {};
    if (effect.attribute) result.attribute = effect.attribute;
    if (effect.bonusDice) result.bonusDice += Number(effect.bonusDice) || 0;
    if (effect.successThreshold) result.successThreshold = Math.min(result.successThreshold, Number(effect.successThreshold) || result.successThreshold);
    if (effect.taxAsDice) result.taxAsDice = true;
    result.notes.push(`${option.pathName}: ${option.label}. ${option.note}`);
  }
  return result;
}

function pathAttackOptionApplies(option, attack) {
  if (option.key === "needle-grace") return isNeedleGraceAttack(attack);
  if (option.key === "hook-grace") return isLightEquippedWeapon(attack);
  return true;
}

function isNeedleGraceAttack(attack) {
  if (attack?.sourceType !== "weapon") return false;
  const classification = attackClassification(attack);
  if (weaponHasType(classification, "needle")) return true;
  return isLightEquippedWeapon(attack) && isMeleeAttack(attack);
}

function isLightEquippedWeapon(attack) {
  return attack?.sourceType === "weapon" && (Number(attackClassification(attack).weight ?? attack.weight) || 0) <= 2;
}

function isMeleeAttack(attack) {
  return attackClassification(attack).melee;
}

function attackClassification(attack) {
  return attack?.classification ?? classifyWeaponLike(attack);
}
