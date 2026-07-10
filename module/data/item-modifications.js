import { isNaturalWeaponTrait } from "../mechanics/trait-quality.js";

const WEAPON_MODIFICATIONS = [
  { key: "worn", name: "Изношенное", description: "Штраф -1 к Качеству. Может быть улучшено до стандартного Качества за половину стоимости оружия, тогда эта модификация снимается." },
  { key: "threaded", name: "Нитяное", description: "К оружию прикреплена нить или леска. Атакующий может притянуть оружие к себе за 1 Скорость. Может комбинироваться с другими модификациями." },
  { key: "extended", name: "Удлинённое", description: "Оружие получает свойство «досягаемость», +1Р, вес +1. Не может применяться на оружие с досягаемостью." },
  { key: "heavy", name: "Тяжёлое", description: "Штраф -1 к броску атаки, бонус +1 к урону. Вес увеличивается на 1." },
  { key: "lightened", name: "Облегчённое", description: "Штраф -1 к урону, бонус +1 к броску атаки. Вес уменьшается на 1." },
  { key: "graceful", name: "Изящное", description: "Оружие может выбросить на один успех больше при броске урона." },
  { key: "trick", name: "Обманка", description: "Выберите другое оружие. Ваше оружие может превращаться в него: один раз бесплатно и далее по цене Скорости, равной его весу, в течение раунда." },
  { key: "universal", name: "Универсальное", description: "Добавьте один тип оружия этому оружию для совместимости Боевых искусств, кроме Природного." },
  { key: "pipette", name: "Пипетка", description: "Оружие можно снарядить одной склянкой, которую можно использовать при попадании по цели; склянка расходуется." },
  { key: "arcane", name: "Чародейское", description: "Оружием можно наложить заклинание на первую цель атаки. Душа, потраченная на заклинание, добавляется к броску атаки." },
  { key: "blade", name: "Лезвие", description: "Оружие накладывает штраф -1 к Впитыванию при попытке впитать урон от него." },
  { key: "balanced", name: "Сбалансированное", description: "Если дальность оружия составляет 3 и выше, она повышается на 1. Оружие получает тип Праща, если не имело его до этого." },
  { key: "dream-forged", name: "Выкованное в Грезах", description: "Оружие может причинять обычный урон полуматериальным целям и духам. Пращи получают 3 Снаряда Грез." },
  { key: "beast-slayer", name: "Убийца зверей", description: "Оружие получает +2 к урону Зверям. Вес оружия увеличивается на 1." },
  { key: "cruel", name: "Жестокое", description: "Если цель использует дополнительную Выносливость, чтобы защититься, атака получает бонус +1 к урону. Захваченная цель получает 2 впитываемого урона при попытке выйти." },
  { key: "butcher", name: "Мясницкое", description: "Оружие получает бонус +1 к базовому урону против незащищённой плоти, но Впитывание против него считает 4+ успехом." }
];

const SHIELD_MODIFICATIONS = [
  { key: "worn", name: "Изношенный", description: "Штраф -1 к Качеству. Может быть улучшен до стандартного Качества за половину стоимости щита, тогда эта модификация снимается." },
  { key: "lightened", name: "Облегчённый", description: "Штраф -1 к весу и +1 к Качеству." },
  { key: "reinforced", name: "Укреплённый", description: "Бонус +1 к весу и +1 к Качеству." },
  { key: "spiked", name: "Шипованный", description: "Когда владелец парирует совершенную атаку, противник рискует получить урон, как от шипов черты Шипастый." },
  { key: "trick", name: "Обманка", description: "Щит может сменить форму на оружие с той же модификацией и обратно. Это стоит 1 Выносливость." },
  { key: "practical", name: "Практичный", description: "Щит также считается выбранным инструментом. Его Качество как инструмента равно Качеству щита, минимум 1." },
  { key: "balanced", name: "Сбалансированный", description: "Щит хорошо подходит для ударов: тяжёлые щиты наносят 4 урона, щиты весом 1 — 3 урона, лёгкие — 2 урона." },
  { key: "reflecting", name: "Отражающий", description: "Щит может парировать заклинания и прочие атаки заклинательного типа; владелец получает один повторный бросок при такой защите." }
];

const MODIFICATION_EFFECTS = {
  worn: { qualityBonus: -1, note: "Изношенное: Качество -1." },
  extended: { weightBonus: 1, note: "Удлинённое: вес +1, оружие получает Досягаемость." },
  heavy: { attackBonusDice: -1, damageBonus: 1, weightBonus: 1, note: "Тяжёлое: -1 кость к атаке, +1 к урону, вес +1." },
  lightened: { attackBonusDice: 1, damageBonus: -1, weightBonus: -1, note: "Облегчённое: +1 кость к атаке, -1 к урону, вес -1." },
  blade: { targetAbsorptionPenalty: -1, note: "Лезвие: Впитывание против урона от этого оружия получает -1." },
  "beast-slayer": { weightBonus: 1, note: "Убийца зверей: вес +1; против Зверей урон +2." },
  butcher: { note: "Мясницкое: против незащищённой плоти урон +1, но Впитывание против него считает 4+ успехом." },
  cruel: { note: "Жестокое: если цель вкладывает дополнительную Выносливость в защиту, атака получает +1 к урону." },
  graceful: { note: "Изящное: при броске урона можно выбрать на один успех больше." },
  balanced: { note: "Сбалансированное: дальность 3+ увеличивается на 1; оружие получает тип Праща, если не имело его." },
  threaded: { note: "Нитяное: оружие можно притянуть к себе за 1 Скорость." },
  trick: { note: "Обманка: оружие или щит может менять форму по правилу модификации." },
  universal: { note: "Универсальное: добавляет один тип оружия для совместимости Боевых искусств." },
  pipette: { note: "Пипетка: можно снарядить одной склянкой и применить её при попадании." },
  arcane: { note: "Чародейское: можно наложить заклинание на первую цель атаки; потраченная Душа добавляется к броску." },
  "dream-forged": { note: "Выкованное в Грёзах: может наносить обычный урон полуматериальным целям и духам." },
  reinforced: { qualityBonus: 1, weightBonus: 1, note: "Укреплённый: Качество +1, вес +1." },
  spiked: { note: "Шипованный: при полном парировании противник рискует получить урон как от Шипастого." },
  practical: { note: "Практичный: щит также считается выбранным инструментом." },
  reflecting: { note: "Отражающий: может парировать заклинательные атаки и даёт один повторный бросок при такой защите." }
};

export function itemModificationOptions(item) {
  if (item?.type === "weapon") return WEAPON_MODIFICATIONS;
  if (isNaturalWeaponTrait(item)) return WEAPON_MODIFICATIONS.filter((modification) => modification.key !== "worn");
  if (item?.type === "armor" && item.system?.subtype === "shield") return SHIELD_MODIFICATIONS;
  return [];
}

export function selectedItemModification(item) {
  const key = item?.system?.modification ?? "";
  return itemModificationOptions(item).find((modification) => modification.key === key) ?? null;
}

export function selectedItemModificationEffects(item) {
  const modification = selectedItemModification(item);
  if (!modification) return { key: "", name: "", attackBonusDice: 0, damageBonus: 0, qualityBonus: 0, weightBonus: 0, note: "" };
  const shieldEffects = item?.type === "armor" && item.system?.subtype === "shield" ? shieldModificationEffects(modification.key) : {};
  return {
    key: modification.key,
    name: modification.name,
    attackBonusDice: 0,
    damageBonus: 0,
    qualityBonus: 0,
    weightBonus: 0,
    note: modification.description,
    ...(MODIFICATION_EFFECTS[modification.key] ?? {}),
    ...shieldEffects
  };
}

function shieldModificationEffects(key) {
  if (key === "lightened") return { attackBonusDice: 0, damageBonus: 0, qualityBonus: 1, weightBonus: -1, note: "Облегчённый щит: вес -1, Качество +1." };
  if (key === "reinforced") return { qualityBonus: 1, weightBonus: 1, note: "Укреплённый щит: вес +1, Качество +1." };
  return {};
}
