import test from "node:test";
import assert from "node:assert/strict";
import { effectiveItemWeight, hasEquippedItem, itemDefenseBonus, itemPassiveEffects, itemPromptEffects } from "../module/mechanics/item-effects.js";

function item(sourceId, { type = "charm", equipped = true, weight = 0, id = sourceId } = {}) {
  return { id, name: sourceId, type, system: { sourceId, equipped, weight } };
}

test("equipped passive item effects become actor modifiers", () => {
  const effects = itemPassiveEffects([
    item("charms.general.velikoe-serdtse"),
    item("charms.general.lovkach"),
    item("charms.death.bezmolvnoe-bremya"),
    item("charms.social.dubovyy-lotos"),
    item("charms.social.mark-khishchnika"),
    item("equipment.treasure.patrontash-rasshiryaet-kolichestvo-yacheek-poyasa-na-1-za-kazhdye-50-geo-potrachennykh-na-patrontash-naryadnaya-odezhda", { type: "gear" }),
    item("charms.general.velikaya-sila", { equipped: false })
  ]);

  assert.equal(effects.modifiers.heart, 1);
  assert.equal(effects.modifiers.speed, 2);
  assert.equal(effects.modifiers.appeal, 1.5);
  assert.equal(effects.modifiers.dread, 1);
  assert.equal(effects.modifiers.load, 2);
  assert.equal(effects.initiativeRerolls, 1);
});

test("charm resource passives expose temporary and custom resource bonuses", () => {
  const effects = itemPassiveEffects([
    item("charms.general.yadro-zhivokrovi"),
    item("charms.path.nositel-dushi")
  ]);

  assert.equal(effects.tempResources.heart, 4);
  assert.equal(effects.customResources.essence, 1);
});

test("armor effects expose absorption and defense penalties", () => {
  const effects = itemPassiveEffects([
    item("equipment.armor.legkaya-bronya", { type: "armor", weight: 1 }),
    item("equipment.armor.tyazhelaya-bronya", { type: "armor", weight: 3 })
  ]);

  assert.equal(effects.absorptionBonus, 2);
  assert.equal(effects.absorptionRerolls, 1);
  assert.equal(effects.dashJumpDistancePenalty, 1);
  assert.equal(effects.defenseStaminaPenalty, 1);
});

test("weapon initiative bonuses use the best equipped weapon bonus", () => {
  const effects = itemPassiveEffects([
    item("equipment.weapon.igla", { type: "weapon" }),
    item("equipment.weapon.shpilka", { type: "weapon" })
  ]);

  assert.equal(effects.initiativeBonus, 2);
});

test("fast strike reduces paid attack tax without changing the tax counter", () => {
  const effects = itemPassiveEffects([item("charms.combat.fast-udar")]);

  assert.equal(effects.attackTaxReduction, 1);
});

test("prompt item effects are filtered by trigger", () => {
  const effects = itemPromptEffects([
    item("charms.general.velikaya-sila"),
    item("charms.general.lovkiy-instinkt"),
    item("charms.combat.doblest-dikarya"),
    item("equipment.shield.shchit-krylo", { type: "armor" })
  ], "attack");

  assert.deepEqual(effects.map((effect) => effect.label), ["Великая Сила", "Доблесть Дикаря"]);
});

test("audited charms expose combat reminder notes for common triggers", () => {
  assert.deepEqual(itemPromptEffects([
    item("charms.combat.otdacha"),
    item("charms.combat.radost-myasnika")
  ], "movement").map((effect) => effect.label), ["Отдача"]);

  assert.deepEqual(itemPromptEffects([
    item("charms.general.mark-soyuznika"),
    item("charms.general.pavshiy-zashchitnik"),
    item("charms.social.gratsiya-lepestka")
  ], "defense").map((effect) => effect.label), ["Павший Защитник", "Грация Лепестка"]);
});

test("weapon prompt effects can be scoped to the selected weapon", () => {
  const effects = itemPromptEffects([
    item("equipment.weapon.gvozd", { type: "weapon", id: "nail" }),
    item("equipment.weapon.kryuk", { type: "weapon", id: "hook" })
  ], "attack", { itemId: "hook" });

  assert.deepEqual(effects.map((effect) => effect.label), ["Крюк"]);
});

test("magic foci expose spellcasting prompt notes when selected", () => {
  const effects = itemPromptEffects([
    item("equipment.magic-focus.posokh", { type: "weapon", id: "staff" }),
    item("equipment.magic-focus.skipetr", { type: "weapon", id: "scepter" })
  ], "attack", { itemId: "scepter" });

  assert.deepEqual(effects.map((effect) => effect.label), ["Скипетр"]);
  assert.match(effects[0].note, /Качество скипетра/);
});

test("special weapons that were text-only expose prompt notes", () => {
  const effects = itemPromptEffects([
    item("equipment.weapon.velikiy-kolokol-klyk", { type: "weapon", id: "bell" }),
    item("equipment.weapon.polunozhnitsy-gvozd", { type: "weapon", id: "scissors-half" })
  ], "attack", { itemId: "bell" });

  assert.deepEqual(effects.map((effect) => effect.label), ["Великий колокол"]);
  assert.match(effects[0].note, /ближней, так и дальнобойной/);
});

test("shield button parry bonus requires grace at least equal to power", () => {
  const actor = {
    items: [item("equipment.shield.shchity-shchit-knopka", { type: "armor" })],
    system: { effective: { attributes: { grace: { value: 3 }, power: { value: 2 } } } }
  };
  const weakActor = {
    items: [item("equipment.shield.shchity-shchit-knopka", { type: "armor" })],
    system: { effective: { attributes: { grace: { value: 1 }, power: { value: 2 } } } }
  };

  assert.equal(itemDefenseBonus(actor, "parry").bonusDice, 1);
  assert.equal(itemDefenseBonus(weakActor, "parry").bonusDice, 0);
  assert.equal(itemDefenseBonus(actor, "dodge").bonusDice, 0);
});

test("spirit armament reduces carried weapon and armor weight", () => {
  const effects = itemPassiveEffects([item("charms.general.vooruzhenie-dukha")]);

  assert.equal(effectiveItemWeight({ type: "weapon", system: { weight: 2 } }, effects), 1);
  assert.equal(effectiveItemWeight({ type: "armor", system: { weight: 1 } }, effects), 0);
  assert.equal(effectiveItemWeight({ type: "gear", system: { weight: 2 } }, effects), 2);
});

test("item modification weight changes carried weight", () => {
  assert.equal(effectiveItemWeight({ type: "weapon", system: { weight: 2, modification: "heavy" } }), 3);
  assert.equal(effectiveItemWeight({ type: "weapon", system: { weight: 2, modification: "lightened" } }), 1);
  assert.equal(effectiveItemWeight({ type: "armor", system: { subtype: "shield", weight: 1, modification: "lightened" } }), 0);
});

test("hasEquippedItem ignores inventory copies", () => {
  assert.equal(hasEquippedItem([item("x", { equipped: false })], "x"), false);
  assert.equal(hasEquippedItem([item("x")], "x"), true);
});
