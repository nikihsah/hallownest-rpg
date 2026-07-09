import { selectedItemModificationEffects } from "../data/item-modifications.js";

const MODIFIER_KEYS = ["power", "insight", "shell", "grace", "heart", "stamina", "soul", "speed", "hunger", "appeal", "dread", "marks", "load"];

const PASSIVE_EFFECTS = {
  "charms.general.velikoe-serdtse": { modifiers: { heart: 1 }, note: "Максимум Сердец +1." },
  "charms.general.lovkach": { modifiers: { speed: 2 }, initiativeRerolls: 1, note: "Скорость +2; +1 повторный бросок инициативы." },
  "charms.general.zapasnoe-snaryazhenie": { customResources: { supplies: 1 }, note: "Максимум Припасов +1." },
  "charms.general.serdtse-zhivokrovi": { tempResources: { heart: 2 }, note: "После Отдыха даёт 2 Сердца Живокрови." },
  "charms.general.blestyashchaya-dusha": { gloryResources: { soul: 1 }, note: "После Отдыха даёт 1 Душу Славы." },
  "charms.general.siyayushchaya-dusha": { gloryResources: { soul: 3 }, note: "После Отдыха даёт 3 Души Славы." },
  "charms.general.serdtse-slavy": { gloryResources: { stamina: 2 }, note: "После Отдыха даёт 2 Выносливости Славы." },
  "charms.general.yadro-slavy": { gloryResources: { stamina: 4 }, note: "После Отдыха даёт 4 Выносливости Славы." },
  "charms.general.vooruzhenie-dukha": { spiritArmament: true, note: "Вес оружия и брони носителя уменьшается на 1." },
  "equipment.treasure.patrontash-rasshiryaet-kolichestvo-yacheek-poyasa-na-1-za-kazhdye-50-geo-potrachennykh-na-patrontash-naryadnaya-odezhda": {
    modifiers: { appeal: 0.5 },
    note: "Привлекательность +0.5."
  },
  "equipment.armor.bronya-bronya-maksimalnaya-prochnost-ponizhenie-urona-ves-tsena-legkaya-bronya-5": {
    absorptionBonus: 1,
    absorptionRerolls: 1,
    note: "Впитывание +1; +1 повторный бросок Впитывания."
  },
  "equipment.armor.srednyaya-bronya": {
    absorptionBonus: 1,
    dashJumpDistancePenalty: 1,
    note: "Впитывание +1; Рывок и Прыжок короче на 1."
  },
  "equipment.armor.tyazhelaya-bronya": {
    absorptionBonus: 1,
    dashJumpDistancePenalty: 1,
    defenseStaminaPenalty: 1,
    note: "Впитывание +1; Рывок и Прыжок короче на 1; Уклонение и Парирование стоят +1 Выносливость."
  },
  "charms.combat.fast-udar": {
    attackTaxReduction: 1,
    note: "Налог Выносливости на повторную атаку в ход уменьшается на 1."
  }
};

const WEAPON_INITIATIVE_BONUSES = {
  "equipment.weapon.igla": 2,
  "equipment.weapon.pero-kryuk": 2,
  "equipment.weapon.shpilka": 1,
  "equipment.weapon.shtopalnaya-igla-igla": 1
};

const PROMPT_EFFECTS = {
  "charms.combat.vnimanie-duelyanta": {
    trigger: "attack",
    label: "Внимание Дуэлянта",
    note: "Если рядом только один противник, все боевые действия и реакции против него получают +1 кость."
  },
  "charms.combat.dan-ubiytse": {
    trigger: "attack",
    label: "Дань Убийце",
    note: "Можно пожертвовать 1 максимумом Выносливости до конца сцены, чтобы получить 2 автоуспеха на одну атаку."
  },
  "charms.combat.dlinnyy-gvozd": {
    trigger: "attack",
    label: "Длинный Гвоздь",
    note: "Любое оружие носителя получает Досягаемость."
  },
  "charms.combat.doblest-ulana-mark-gordosti": {
    trigger: "attack",
    label: "Доблесть Улана",
    note: "Любое рукопашное оружие носителя может атаковать на 1 клетку дальше."
  },
  "charms.combat.zashchita-tirana": {
    trigger: "attack",
    label: "Защита Тирана",
    note: "При полном запасе Сердец число успехов Впитывания против атак носителя понижается на 1."
  },
  "charms.combat.kradushchiysya-pauk": {
    trigger: "parry",
    label: "Крадущийся Паук",
    note: "Парирование можно делать Грацией. Успешное парирование Грацией может усилить первую атаку в ходу."
  },
  "charms.combat.prygayushchiy-kon": {
    trigger: "defense",
    label: "Прыгающий Конь",
    note: "Уклонение можно делать Мощью; после такого уклонения доступен бесплатный рывок или прыжок."
  },
  "charms.combat.heavy-vypad": {
    trigger: "attack",
    label: "Тяжёлый Выпад",
    note: "Если в попавшую атаку вложено больше Выносливости, чем требовалось, цель отбрасывается на это число клеток."
  },
  "charms.combat.udar-dushi": {
    trigger: "attack",
    label: "Удар Души",
    note: "Душа, потраченная в ход, может добавиться к следующей атаке выбранным оружием в пределах 4 клеток."
  },
  "charms.combat.khrabryy-gvozd-elegiya-kukolki": {
    trigger: "attack",
    label: "Храбрый Гвоздь",
    note: "При полном запасе Сердец рукопашное оружие может выпускать снаряды на 4 клетки с уроном на 1 меньше."
  },
  "charms.combat.yarost-pavshego": {
    trigger: "attack",
    label: "Ярость Павшего",
    note: "При 1 Сердце или меньше физический урон +1; заклинания могут получить 1 дополнительный успех для урона."
  },
  "charms.general.velikaya-sila": {
    trigger: "attack",
    label: "Великая Сила",
    note: "Когда атака наносит вероятный урон, она причиняет +1 урон."
  },
  "charms.general.lovkiy-instinkt": {
    trigger: "absorption",
    label: "Ловкий Инстинкт",
    note: "Можно Впитать любой вид урона Грацией вместо Панциря за 1 Выносливость."
  },
  "charms.general.spryatannaya-strekoza": {
    trigger: "defense",
    label: "Спрятанная Стрекоза",
    note: "Считается, что носитель имеет черту Прыгающий; если она уже есть, Прыжок стоит на 1 Выносливость меньше."
  },
  "charms.general.tryukach": {
    trigger: "movement",
    label: "Трюкач",
    note: "Каждый второй Рывок или Прыжок не тратит Выносливость."
  },
  "charms.general.krepkiy-shell": {
    trigger: "absorption",
    label: "Крепкий Панцирь",
    note: "После получения урона последующие Впитывания до начала следующего хода получают +1 кость."
  },
  "equipment.shield.shchity-shchit-knopka": {
    trigger: "parry",
    label: "Щит-кнопка",
    note: "Если Грация равна или выше Мощи, можно добавить +1 кубик при парировании щитом."
  },
  "equipment.shield.shchit-krylo": {
    trigger: "parry",
    label: "Щит-крыло",
    note: "Укрытие 1/4 от дальнобойных атак; нет штрафа на парирование дальнобойных атак."
  },
  "equipment.shield.pantsirnyy-shchit": {
    trigger: "parry",
    label: "Панцирный щит",
    note: "Может закрывать сторону клетки как стена; атаки против щита могут быть парированы им же."
  },
  "equipment.magic-focus.palochka": {
    trigger: "attack",
    scope: "self",
    label: "Палочка",
    note: "Атака палочкой использует Проницательность. Палочку парируют как дальнобойную атаку."
  },
  "equipment.weapon.bolt": {
    trigger: "attack",
    scope: "self",
    label: "Болт",
    note: "Игнорирует Понижение Урона 2 и Впитывание от брони."
  },
  "equipment.weapon.bulavka-igla": {
    trigger: "attack",
    scope: "self",
    label: "Булавка",
    note: "Может образовать пару с собой; против цели с меньшей Инициативой можно перебросить один кубик."
  },
  "equipment.weapon.bumerang-kryuk": {
    trigger: "attack",
    scope: "self",
    label: "Бумеранг",
    note: "После метательной атаки бросьте к6: если результат не выше Грации, оружие возвращается. Игнорирует укрытие и щиты."
  },
  "equipment.weapon.velikiy-gvozd-gvozd": {
    trigger: "attack",
    scope: "self",
    label: "Великий гвоздь",
    note: "Можно перебросить один проваленный бросок."
  },
  "equipment.weapon.velikiy-kryuk": {
    trigger: "attack",
    scope: "self",
    label: "Великий крюк",
    note: "При попадании можно потратить 1 Выносливость, чтобы снизить Панцирь цели на 2."
  },
  "equipment.weapon.vilka-igla": {
    trigger: "attack",
    scope: "self",
    label: "Вилка",
    note: "В двух руках даёт +2 базового урона. Подготовленные атаки не тратят Выносливость, но дают -1 Манёвренность на удар."
  },
  "equipment.weapon.vint-gvozd": {
    trigger: "attack",
    scope: "self",
    label: "Винт",
    note: "При нанесении урона можно потратить 1 Выносливость, чтобы создать 2 пункта кровотечения."
  },
  "equipment.weapon.gvozd": {
    trigger: "attack",
    scope: "self",
    label: "Гвоздь",
    note: "Можно перебросить один проваленный бросок."
  },
  "equipment.weapon.klyk": {
    trigger: "attack",
    scope: "self",
    label: "Клык",
    note: "Следующий бросок атаки или защиты поражённой цели получает -1 кость."
  },
  "equipment.weapon.knopka-igla": {
    trigger: "attack",
    scope: "self",
    label: "Кнопка",
    note: "Броски Впитывания против кнопки совершаются со штрафом -1."
  },
  "equipment.weapon.kryuk": {
    trigger: "attack",
    scope: "self",
    label: "Крюк",
    note: "При попадании можно потратить 1 Выносливость, чтобы снизить Панцирь цели на 1."
  },
  "equipment.weapon.metatelnyy-bolt-klyk": {
    trigger: "attack",
    scope: "self",
    label: "Метательный болт",
    note: "Игнорирует Понижение Урона 1 и Впитывание от брони."
  },
  "equipment.weapon.paryashchiy-prutik-igla": {
    trigger: "attack",
    scope: "self",
    label: "Парящий прутик",
    note: "Даёт +2 к вертикальному прыжку и +1 к дистанции Удара с отскоком."
  },
  "equipment.weapon.posokh-igla": {
    trigger: "attack",
    scope: "self",
    label: "Посох",
    note: "Создаёт 1 Дисбаланс за удар для одной цели один раз за ход."
  },
  "equipment.weapon.prashcha": {
    trigger: "attack",
    scope: "self",
    label: "Праща",
    note: "Атака рядом с противником провоцирует атаку от него."
  },
  "equipment.weapon.prashchepulta-klyk": {
    trigger: "attack",
    scope: "self",
    label: "Пращепульта",
    note: "Атака рядом с противником провоцирует атаку. Может атаковать из укрытия по дуге."
  },
  "equipment.weapon.rogatka": {
    trigger: "attack",
    scope: "self",
    label: "Рогатка",
    note: "Атака рядом с противником провоцирует атаку от него."
  },
  "equipment.weapon.set": {
    trigger: "attack",
    scope: "self",
    label: "Сеть",
    note: "Атака сетью считается захватом; выбраться можно успехами против её Качества."
  },
  "equipment.weapon.ultraklyk": {
    trigger: "attack",
    scope: "self",
    label: "Ультраклык",
    note: "Даёт Дисбаланс атакующему; если цель не увернулась, даёт Дисбаланс цели и -2 Скорости в следующем ходу."
  },
  "equipment.weapon.khlyst-igla": {
    trigger: "attack",
    scope: "self",
    label: "Хлыст",
    note: "Уклонение рядом со штрафом -1; парирование не рядом со штрафом -1."
  },
  "equipment.weapon.shpilka": {
    trigger: "attack",
    scope: "self",
    label: "Шпилька",
    note: "Против цели с меньшей Инициативой можно перебросить один проваленный бросок."
  },
  "equipment.weapon.shtopalnaya-igla-igla": {
    trigger: "attack",
    scope: "self",
    label: "Штопальная игла",
    note: "Атака сразу после Рывка, Прыжка или Удара с отскоком наносит +1 урон."
  }
};

export function itemPassiveEffects(items) {
  const modifiers = Object.fromEntries(MODIFIER_KEYS.map((key) => [key, 0]));
  const result = {
    modifiers,
    customResources: {},
    gloryResources: {},
    tempResources: {},
    absorptionBonus: 0,
    absorptionRerolls: 0,
    attackTaxReduction: 0,
    dashJumpDistancePenalty: 0,
    defenseStaminaPenalty: 0,
    initiativeBonus: 0,
    initiativeRerolls: 0,
    spiritArmament: false,
    notes: []
  };

  for (const item of equippedItems(items)) {
    const effect = PASSIVE_EFFECTS[item.system?.sourceId];
    if (effect) applyPassiveEffect(result, effect);
    result.initiativeBonus = Math.max(result.initiativeBonus, WEAPON_INITIATIVE_BONUSES[item.system?.sourceId] ?? 0);
  }
  return result;
}

export function itemPromptEffects(items, trigger = "", { itemId = "" } = {}) {
  return equippedItems(items)
    .flatMap((item) => promptEntriesForItem(item))
    .filter((entry) => entry.effect && (!trigger || entry.effect.trigger === trigger))
    .filter((entry) => !entry.effect.scope || entry.effect.scope !== "self" || !itemId || entry.item.id === itemId)
    .map((entry) => ({
      itemId: entry.item.id,
      itemName: entry.item.name,
      label: entry.effect.label,
      trigger: entry.effect.trigger,
      note: entry.effect.note
    }));
}

function promptEntriesForItem(item) {
  const entries = [{ item, effect: PROMPT_EFFECTS[item.system?.sourceId] }];
  const modification = selectedItemModificationEffects(item);
  if (modification.key && modification.note) {
    entries.push({
      item,
      effect: {
        trigger: item.type === "armor" && item.system?.subtype === "shield" ? "parry" : "attack",
        scope: item.type === "weapon" ? "self" : "",
        label: modification.name,
        note: modification.note
      }
    });
  }
  return entries;
}

export function hasEquippedItem(items, sourceId) {
  return equippedItems(items).some((item) => item.system?.sourceId === sourceId);
}

export function itemDefenseBonus(actor, actionKey) {
  if (actionKey !== "parry") return { bonusDice: 0, notes: [] };
  if (!hasEquippedItem(actor?.items, "equipment.shield.shchity-shchit-knopka")) return { bonusDice: 0, notes: [] };
  const grace = Number(actor?.system?.effective?.attributes?.grace?.value) || 0;
  const power = Number(actor?.system?.effective?.attributes?.power?.value) || 0;
  if (grace < power) return { bonusDice: 0, notes: [] };
  return { bonusDice: 1, notes: ["Щит-кнопка: +1 кость к парированию, потому что Грация не ниже Мощи."] };
}

export function effectiveItemWeight(item, effects = null) {
  const weight = Number(item?.system?.weight) || 0;
  const modificationWeight = Number(selectedItemModificationEffects(item).weightBonus) || 0;
  const spiritArmament = effects?.spiritArmament ?? false;
  return Math.max(0, weight + modificationWeight - (spiritArmament && ["weapon", "armor"].includes(item?.type) ? 1 : 0));
}

function applyPassiveEffect(result, effect) {
  for (const [key, value] of Object.entries(effect.modifiers ?? {})) result.modifiers[key] += Number(value) || 0;
  addObjectValues(result.customResources, effect.customResources);
  addObjectValues(result.gloryResources, effect.gloryResources);
  addObjectValues(result.tempResources, effect.tempResources);
  result.absorptionBonus += Number(effect.absorptionBonus) || 0;
  result.absorptionRerolls += Number(effect.absorptionRerolls) || 0;
  result.attackTaxReduction += Number(effect.attackTaxReduction) || 0;
  result.dashJumpDistancePenalty += Number(effect.dashJumpDistancePenalty) || 0;
  result.defenseStaminaPenalty += Number(effect.defenseStaminaPenalty) || 0;
  result.initiativeRerolls += Number(effect.initiativeRerolls) || 0;
  result.spiritArmament ||= Boolean(effect.spiritArmament);
  if (effect.note) result.notes.push(effect.note);
}

function addObjectValues(target, source = {}) {
  for (const [key, value] of Object.entries(source)) target[key] = (Number(target[key]) || 0) + (Number(value) || 0);
}

function equippedItems(items) {
  return Array.from(items ?? []).filter((item) => item.system?.equipped === true);
}
