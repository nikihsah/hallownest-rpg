import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  customTechniqueData,
  groupTechniques,
  preparedTechniqueCount,
  techniqueAvailable,
  techniqueItemData,
  techniqueMismatchWarning,
  techniquePathIds,
  techniqueSlotsSummary
} from "../module/data/technique-catalog.js";
import {
  selectedTechniqueCost,
  techniqueNotesFromIds,
  techniquePromptOptions,
  techniqueSummary
} from "../module/mechanics/techniques.js";
import { hasTechniqueRule, techniqueRuleTags, techniqueRuleTriggers } from "../module/mechanics/technique-rules.js";

const catalogUrl = new URL("../data/techniques.json", import.meta.url);

function technique({ id = "art1", type = "art", prepared = true, cost = {}, text = "Атака наносит урон.", pathId = "", sourceId = "" } = {}) {
  return {
    id,
    name: id,
    type,
    system: {
      prepared,
      sourceId,
      pathId,
      pathName: type === "spell" ? "Шпиль" : "Воинский путь",
      requirementLabel: type === "spell" ? "Шпиль" : "Martial Path",
      techniqueType: type === "spell" ? "secret" : "normal",
      cost: { raw: "", stamina: 0, soul: 0, essence: 0, difficulty: 0, ...cost },
      description: text,
      effectText: text
    }
  };
}

test("HK-Kit technique catalog contains combat arts and mysteries", async () => {
  const techniques = JSON.parse(await readFile(catalogUrl, "utf8"));
  const counts = Object.groupBy(techniques, (item) => item.type);

  assert.equal(techniques.length, 99);
  assert.equal(counts.art.length, 48);
  assert.equal(counts.spell.length, 51);
  assert.equal(new Set(techniques.map((item) => item.sourceId)).size, techniques.length);
  assert.ok(techniques.every((item) => item.description && item.rawText && item.effectText));
});

test("every catalog technique has an explicit structured combat rule", async () => {
  const techniques = JSON.parse(await readFile(catalogUrl, "utf8"));

  assert.deepEqual(techniques.filter((item) => !hasTechniqueRule(item.sourceId)).map((item) => item.sourceId), []);
  assert.ok(techniques.every((item) => techniqueRuleTriggers(item).length > 0));
  assert.ok(techniques.every((item) => techniqueRuleTags(item).length > 0));
});

test("technique catalog creates Foundry art and spell items", async () => {
  const techniques = JSON.parse(await readFile(catalogUrl, "utf8"));
  const art = techniques.find((item) => item.type === "art");
  const spell = techniques.find((item) => item.type === "spell");

  assert.equal(techniqueItemData(art).type, "art");
  assert.equal(techniqueItemData(art).img, "systems/hallownest-rpg/assets/icons/items/art.svg");
  assert.equal(techniqueItemData(art).system.prepared, false);
  assert.equal(techniqueItemData(art).system.cost.stamina >= 0, true);
  assert.equal(techniqueItemData(spell).type, "spell");
  assert.equal(techniqueItemData(spell).img, "systems/hallownest-rpg/assets/icons/items/spell.svg");
  assert.equal(techniqueItemData(spell).system.pathId.startsWith("paths."), true);
  assert.equal(techniqueItemData(spell).system.cost.soul, techniqueItemData(spell).system.cost.difficulty);
});

test("technique grouping marks path availability", () => {
  const groups = groupTechniques([
    { sourceId: "combat-arts.a", type: "art", name: "A", pathFamily: "martial", pathName: "Воинский путь", cost: {}, requirements: [] },
    { sourceId: "magic.spire.a", type: "spell", name: "S", pathFamily: "mystic", pathId: "paths.spire", pathName: "Шпиль", cost: { difficulty: 2 }, requirements: [] }
  ], {
    type: "spell",
    ownedSourceIds: new Set(["magic.spire.a"]),
    actor: { items: [{ type: "path", system: { sourceId: "paths.spire", category: "mystic", rank: 1 } }] }
  });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].items[0].owned, true);
  assert.equal(groups[0].items[0].available, true);
});

test("martial arts tied to selected paths are listed before mismatched arts", () => {
  const groups = groupTechniques([
    { sourceId: "combat-arts.fang", type: "art", name: "Клык", subtype: "boost", techniqueType: "boost", pathFamily: "martial", pathName: "Воинский путь", cost: {}, requirements: [{ value: "Клык" }] },
    { sourceId: "combat-arts.needle", type: "art", name: "Игла", subtype: "boost", techniqueType: "boost", pathFamily: "martial", pathName: "Воинский путь", cost: {}, requirements: [{ value: "Игла" }] }
  ], {
    type: "art",
    actor: { items: [{ type: "path", system: { sourceId: "paths.needle", category: "martial", rank: 1 } }] }
  });

  assert.equal(groups.length, 1);
  assert.equal(techniquePathIds(groups[0].items[0])[0], "paths.needle");
  assert.equal(groups[0].preferred, true);
  assert.equal(groups[0].items[0].available, true);
  assert.equal(groups[0].items[0].warning, "");
  assert.equal(groups[0].items[1].available, false);
  assert.equal(groups[0].items[1].warning, "HRPG.TechniqueWrongMartialPath");
  assert.equal(groups[0].label, "HRPG.TechniqueType.boost");
});

test("martial arts are grouped by their art category instead of weapon requirement", () => {
  const groups = groupTechniques([
    { sourceId: "combat-arts.boost", type: "art", name: "Усиление", subtype: "boost", techniqueType: "boost", pathFamily: "martial", pathName: "Воинский путь", cost: {}, requirements: [{ value: "Гвоздь" }] },
    { sourceId: "combat-arts.reaction", type: "art", name: "Реакция", subtype: "reaction", techniqueType: "reaction", pathFamily: "martial", pathName: "Воинский путь", cost: {}, requirements: [{ value: "Гвоздь" }] }
  ], {
    type: "art",
    actor: { items: [{ type: "path", system: { sourceId: "paths.nail", category: "martial", rank: 1 } }] }
  });

  assert.deepEqual(groups.map((group) => group.key).sort(), ["boost", "reaction"]);
  assert.deepEqual(groups.map((group) => group.label).sort(), ["HRPG.TechniqueType.boost", "HRPG.TechniqueType.reaction"]);
});

test("mismatched mysteries keep warning text when path or rank is missing", () => {
  const mystery = { sourceId: "magic.spire.hard", type: "spell", name: "Тайна", pathFamily: "mystic", pathId: "paths.spire", pathName: "Шпиль", cost: { difficulty: 4 }, requirements: [] };
  const actor = { items: [{ type: "path", system: { sourceId: "paths.spire", category: "mystic", rank: 1 } }] };

  assert.equal(techniqueAvailable(actor, mystery), false);
  assert.equal(techniqueMismatchWarning(mystery), "HRPG.TechniqueWrongMysticPath");
});

test("prepared technique slots count down from derived slots", () => {
  const actor = {
    system: { derived: { techniqueSlots: 3 } },
    items: [
      technique({ id: "a" }),
      technique({ id: "b", type: "spell" }),
      technique({ id: "c", prepared: false })
    ]
  };

  assert.equal(preparedTechniqueCount(actor.items), 2);
  assert.deepEqual(techniqueSlotsSummary(actor), {
    used: 2,
    maximum: 3,
    remaining: 1,
    over: false,
    prepared: ["a", "b"]
  });
});

test("prepared techniques expose combat options and resource costs", () => {
  const actor = {
    items: [
      technique({ id: "art", cost: { raw: "2 Выносливости", stamina: 2 }, text: "Атака оружием наносит урон." }),
      technique({ id: "spell", type: "spell", cost: { soul: 1, difficulty: 1 }, text: "Заклинание поражает цель." }),
      technique({ id: "hidden", prepared: false, text: "Атака." })
    ]
  };

  assert.deepEqual(techniquePromptOptions(actor, "attack").map((option) => option.key), ["art", "spell"]);
  assert.deepEqual(selectedTechniqueCost(actor, ["art", "spell"], "attack"), { stamina: 2, soul: 1, essence: 0, raw: "2 Выносливости" });
  assert.match(techniqueNotesFromIds(actor, ["art"], "attack")[0], /Атака оружием/);
  assert.match(techniqueSummary(actor.items[0]), /Стоимость/);
});

test("attack technique options respect selected weapon requirements", () => {
  const actor = {
    items: [
      {
        id: "needle-art",
        name: "Игла-искусство",
        type: "art",
        system: {
          prepared: true,
          sourceId: "combat-arts.needle",
          techniqueType: "normal",
          cost: { raw: "1 Выносливость", stamina: 1 },
          requirementLabel: "Игла",
          requirements: [{ type: "weapon_or_condition", value: "Игла" }],
          effectText: "Следующая атака получает преимущество."
        }
      },
      {
        id: "fang-art",
        name: "Клык-искусство",
        type: "art",
        system: {
          prepared: true,
          sourceId: "combat-arts.fang",
          techniqueType: "normal",
          cost: { raw: "1 Выносливость", stamina: 1 },
          requirementLabel: "Клык",
          requirements: [{ type: "weapon_or_condition", value: "Клык" }],
          effectText: "Следующая атака получает преимущество."
        }
      },
      {
        id: "needle-weapon",
        name: "Штопальная игла",
        type: "weapon",
        system: { itemType: "Игла", range: "Ближний", weight: 3 }
      }
    ]
  };

  assert.deepEqual(techniquePromptOptions(actor, "attack", { itemId: "needle-weapon" }).map((option) => option.key), ["needle-art"]);
});

test("utility mysteries stay out of attack options but combat mysteries remain", () => {
  const actor = {
    items: [
      technique({ id: "utility", type: "spell", text: "Заклинание позволяет переместиться домой вне боя.", cost: { soul: 1 } }),
      technique({ id: "blast", type: "spell", text: "Огненный шар наносит урон цели.", cost: { soul: 2 } })
    ]
  };

  assert.deepEqual(techniquePromptOptions(actor, "attack").map((option) => option.key), ["blast"]);
});

test("catalog spell trigger rules separate combat mysteries from utility mysteries", () => {
  const actor = {
    items: [
      {
        id: "teleport",
        name: "Телепорт",
        type: "spell",
        system: {
          sourceId: "magic.cloak.teleport",
          prepared: true,
          cost: { raw: "2 Душа", soul: 2 },
          effectText: "Перемещение в выбранное место."
        }
      },
      {
        id: "fireball",
        name: "Огненный шар",
        type: "spell",
        system: {
          sourceId: "magic.nightmares.ognennyy-shar",
          prepared: true,
          cost: { raw: "2 Душа", soul: 2 },
          effectText: "Снаряд наносит урон цели."
        }
      }
    ]
  };

  assert.deepEqual(techniquePromptOptions(actor, "attack").map((option) => option.key), ["fireball"]);
  assert.deepEqual(techniquePromptOptions(actor, "movement").map((option) => option.key), ["teleport"]);
  assert.match(techniqueSummary(actor.items[1]), /Тип применения: атака/);
});

test("explicit technique triggers do not bleed into defensive prompts by description text", () => {
  const actor = {
    items: [
      technique({
        id: "precise",
        sourceId: "combat-arts.tochnyy-udar",
        text: "Жук выбирает цель; его следующая атака получает бонус."
      }),
      technique({
        id: "charge",
        sourceId: "combat-arts.velikiy-zaryad",
        text: "Жук перемещается, прыгает и затем атакует."
      })
    ]
  };

  assert.deepEqual(techniquePromptOptions(actor, "dodge").map((option) => option.key), []);
  assert.deepEqual(techniquePromptOptions(actor, "defense").map((option) => option.key), []);
  assert.deepEqual(techniquePromptOptions(actor, "attack").map((option) => option.key), ["precise", "charge"]);
  assert.deepEqual(techniquePromptOptions(actor, "movement").map((option) => option.key), ["charge"]);
});

test("custom technique data keeps editable description attachments and costs", () => {
  const item = customTechniqueData("spell", "Контракт");

  assert.equal(item.type, "spell");
  assert.equal(item.img, "systems/hallownest-rpg/assets/icons/items/spell.svg");
  assert.equal(item.system.description, "");
  assert.deepEqual(item.system.attachments, { one: "", two: "", three: "" });
  assert.equal(item.system.cost.soul, 0);
});
