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

const catalogUrl = new URL("../data/techniques.json", import.meta.url);

function technique({ id = "art1", type = "art", prepared = true, cost = {}, text = "Атака наносит урон.", pathId = "" } = {}) {
  return {
    id,
    name: id,
    type,
    system: {
      prepared,
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

test("technique catalog creates Foundry art and spell items", async () => {
  const techniques = JSON.parse(await readFile(catalogUrl, "utf8"));
  const art = techniques.find((item) => item.type === "art");
  const spell = techniques.find((item) => item.type === "spell");

  assert.equal(techniqueItemData(art).type, "art");
  assert.equal(techniqueItemData(art).system.prepared, false);
  assert.equal(techniqueItemData(art).system.cost.stamina >= 0, true);
  assert.equal(techniqueItemData(spell).type, "spell");
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
    { sourceId: "combat-arts.fang", type: "art", name: "Клык", pathFamily: "martial", pathName: "Воинский путь", cost: {}, requirements: [{ value: "Клык" }] },
    { sourceId: "combat-arts.needle", type: "art", name: "Игла", pathFamily: "martial", pathName: "Воинский путь", cost: {}, requirements: [{ value: "Игла" }] }
  ], {
    type: "art",
    actor: { items: [{ type: "path", system: { sourceId: "paths.needle", category: "martial", rank: 1 } }] }
  });

  assert.equal(techniquePathIds(groups[0].items[0])[0], "paths.needle");
  assert.equal(groups[0].preferred, true);
  assert.equal(groups[0].items[0].available, true);
  assert.equal(groups[0].items[0].warning, "");
  assert.equal(groups[1].items[0].available, false);
  assert.equal(groups[1].items[0].warning, "HRPG.TechniqueWrongMartialPath");
  assert.equal(groups[0].label, "HRPG.TechniquePath.needle");
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

test("custom technique data keeps editable description attachments and costs", () => {
  const item = customTechniqueData("spell", "Контракт");

  assert.equal(item.type, "spell");
  assert.equal(item.system.description, "");
  assert.deepEqual(item.system.attachments, { one: "", two: "", three: "" });
  assert.equal(item.system.cost.soul, 0);
});
