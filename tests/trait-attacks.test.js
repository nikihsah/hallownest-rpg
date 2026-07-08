import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { quickAttackFromTrait, quickAttacksFromItems } from "../module/mechanics/trait-attacks.js";

const catalogUrl = new URL("../data/traits.json", import.meta.url);

test("natural weapon traits become quick attacks", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const jaws = traits.find((trait) => trait.sourceId === "traits.drobyashchie-chelyusti");
  const attack = quickAttackFromTrait({
    id: "jaws",
    name: jaws.name,
    type: "trait",
    system: { ...jaws, active: true }
  });

  assert.equal(attack.name, "Дробящие Челюсти");
  assert.equal(attack.damage, "2");
  assert.match(attack.tooltip, /природное оружие/u);
});

test("weapon subtraits do not create duplicate quick attacks", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const hugeJaws = traits.find((trait) => trait.sourceId === "traits.drobyashchie-chelyusti.huge-chelyusti");
  const attack = quickAttackFromTrait({
    id: "huge-jaws",
    name: hugeJaws.name,
    type: "trait",
    system: { ...hugeJaws, active: true }
  });

  assert.equal(attack, null);
});

test("subtraits modify their parent quick attack", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const jaws = traits.find((trait) => trait.sourceId === "traits.drobyashchie-chelyusti");
  const hugeJaws = traits.find((trait) => trait.sourceId === "traits.drobyashchie-chelyusti.huge-chelyusti");
  const projectile = traits.find((trait) => trait.sourceId === "traits.natural-projectile");
  const heavyShot = traits.find((trait) => trait.sourceId === "traits.natural-projectile.heavy-shot");
  const attacks = quickAttacksFromItems([
    { id: "jaws", name: jaws.name, type: "trait", system: { ...jaws, active: true } },
    { id: "huge-jaws", name: hugeJaws.name, type: "trait", system: { ...hugeJaws, active: true } },
    { id: "projectile", name: projectile.name, type: "trait", system: { ...projectile, active: true } },
    { id: "heavy-shot", name: heavyShot.name, type: "trait", system: { ...heavyShot, active: true } }
  ]);

  assert.equal(attacks.find((attack) => attack.itemId === "jaws").damage, "3");
  assert.deepEqual(attacks.find((attack) => attack.itemId === "jaws").subtraits, ["Огромные Челюсти"]);
  assert.equal(attacks.find((attack) => attack.itemId === "projectile").damage, "3");
  assert.deepEqual(attacks.find((attack) => attack.itemId === "projectile").subtraits, ["Тяжелый выстрел"]);
  assert.equal(attacks.length, 2);
});

test("quick attacks only include active attack-like weapon traits", () => {
  const attacks = quickAttacksFromItems([
    { id: "horn", name: "Рог", type: "trait", system: { active: true, kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 2 единицы урона." } },
    { id: "inactive", name: "Жало", type: "trait", system: { active: false, kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 3 единицы урона." } },
    { id: "lore", name: "Талант", type: "trait", system: { active: true, kind: "trait", category: "lifestyle", description: "Красиво рассказывает истории." } }
  ]);

  assert.deepEqual(attacks.map((attack) => attack.itemId), ["horn"]);
});
