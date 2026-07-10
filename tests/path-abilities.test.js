import test from "node:test";
import assert from "node:assert/strict";
import { applyPathAttackOptions, availablePathAttackOptions, unlockedPathAttackOptions } from "../module/mechanics/path-abilities.js";

test("path ranks expose their attack choices", () => {
  const actor = {
    items: [
      { type: "path", name: "Игла", system: { sourceId: "paths.needle", rank: 1 } },
      { type: "path", name: "Клык", system: { sourceId: "paths.fang", rank: 3 } }
    ]
  };
  const options = unlockedPathAttackOptions(actor);

  assert.ok(options.some((option) => option.key === "needle-grace"));
  assert.ok(options.some((option) => option.key === "needle-lunge"));
  assert.ok(options.some((option) => option.key === "fang-controlled-force"));
});

test("selected path attack choices modify attack math", () => {
  const options = [
    { pathName: "Игла", label: "Быстрые удары", note: "test", effect: { attribute: "grace" } },
    { pathName: "Игла", label: "Резкий выпад", note: "test", effect: { bonusDice: -1 } },
    { pathName: "Гвоздь", label: "Пробитие защиты", note: "test", effect: { successThreshold: 4 } },
    { pathName: "Клык", label: "Контролируемая сила", note: "test", effect: { taxAsDice: true } }
  ];
  const result = applyPathAttackOptions({ attribute: "power", successThreshold: 5 }, options);

  assert.equal(result.attribute, "grace");
  assert.equal(result.bonusDice, -1);
  assert.equal(result.successThreshold, 4);
  assert.equal(result.taxAsDice, true);
  assert.equal(result.notes.length, 4);
});

test("needle fast strikes are offered only for eligible weapons", () => {
  const actor = { items: [{ type: "path", name: "Игла", system: { sourceId: "paths.needle", rank: 1 } }] };
  const heavyRangedNeedle = { sourceType: "weapon", name: "Тяжёлая игла-снаряд", itemType: "игла", weight: 3, range: "Дальний (5)" };
  const lightMelee = { sourceType: "weapon", name: "Лёгкий клинок", itemType: "гвоздь", weight: 1, range: "Ближний" };
  const heavyMeleeNeedle = { sourceType: "weapon", name: "Штопальная игла", itemType: "игла", weight: 3, range: "Ближний" };
  const heavyMeleeFang = { sourceType: "weapon", name: "Тяжёлый клык", itemType: "клык", weight: 3, range: "Ближний" };
  const naturalMelee = { sourceType: "trait", name: "Острые когти", itemType: "природное", weight: 0, range: "Ближний" };

  assert.equal(availablePathAttackOptions(actor, heavyRangedNeedle).some((option) => option.key === "needle-grace"), false);
  assert.equal(availablePathAttackOptions(actor, lightMelee).some((option) => option.key === "needle-grace"), true);
  assert.equal(availablePathAttackOptions(actor, heavyMeleeNeedle).some((option) => option.key === "needle-grace"), true);
  assert.equal(availablePathAttackOptions(actor, heavyMeleeFang).some((option) => option.key === "needle-grace"), false);
  assert.equal(availablePathAttackOptions(actor, naturalMelee).some((option) => option.key === "needle-grace"), true);
});
