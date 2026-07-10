import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSkillName, skillBreakdown, skillRowsForItem, skillSlotUpdateData, skillTotal, skillTotals } from "../module/mechanics/skills.js";

function skillItem(name, rank, skills, { mastery = "" } = {}) {
  return {
    id: name,
    name,
    type: "skill",
    system: {
      rank,
      mastery,
      skills: skills.map((skill) => ({ name: skill }))
    }
  };
}

test("skill rows always expose four editable slots", () => {
  assert.deepEqual(skillRowsForItem(skillItem("Scout", 1, ["Восприятие"])).map((row) => row.name), ["Восприятие", "", "", ""]);
});

test("matching skill names add ranks together but rank dice are capped at three", () => {
  const items = [
    skillItem("Караванный бегунок", 1, ["Восприятие", "Акробатика", "Выживание", "Общение"]),
    skillItem("Выживший из засады", 1, ["Скрытность", "Восприятие", "Выживание", "Воровство"]),
    skillItem("Солдат засады", 1, ["Скрытность", "Восприятие", "Тактика", "Акробатика"])
  ];

  assert.equal(skillTotal(items, "Восприятие").total, 3);
  assert.equal(skillTotal(items, "Акробатика").total, 2);
  assert.equal(skillTotal(items, "Выживание").total, 2);
  assert.equal(skillTotal(items, "Общение").total, 1);
});

test("skill slot update writes the whole skills array for embedded item persistence", () => {
  assert.deepEqual(skillSlotUpdateData(skillItem("Scout", 1, ["A", "B"]), 2, " Stealth "), {
    "system.skills": [
      { name: "A" },
      { name: "B" },
      { name: "Stealth" },
      { name: "" }
    ]
  });
});

test("skill rank cap applies before mastery bonus", () => {
  const items = [
    skillItem("Охотник", 3, ["Восприятие", "Акробатика", "Выживание", "Общение"], { mastery: "Восприятие" }),
    skillItem("Разведчик", 2, ["Восприятие", "Скрытность", "Тактика", "Воровство"])
  ];
  const perception = skillTotal(items, "восприятие");

  assert.equal(perception.rankDiceRaw, 5);
  assert.equal(perception.rankDice, 3);
  assert.equal(perception.masteryBonus, 1);
  assert.equal(perception.total, 4);
  assert.match(skillBreakdown(perception), /5 → 3/);
});

test("skill names are normalized for ё case and spacing", () => {
  const items = [skillItem("Test", 1, ["  Полёт  "])];

  assert.equal(normalizeSkillName("полет"), normalizeSkillName("Полёт"));
  assert.equal(skillTotals(items)[0].key, "полет");
});
