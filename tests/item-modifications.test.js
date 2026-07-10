import test from "node:test";
import assert from "node:assert/strict";
import { itemModificationOptions, selectedItemModification, selectedItemModificationEffects } from "../module/data/item-modifications.js";

test("weapons expose weapon modifications", () => {
  const options = itemModificationOptions({ type: "weapon", system: {} });

  assert.ok(options.some((option) => option.key === "heavy"));
  assert.ok(options.some((option) => option.key === "balanced"));
  assert.ok(options.some((option) => option.key === "threaded"));
});

test("natural weapon traits expose weapon modifications except worn", () => {
  const options = itemModificationOptions({
    type: "trait",
    system: {
      kind: "trait",
      category: "weapons",
      description: "Это природное оружие, которое наносит 2 урона."
    }
  });

  assert.ok(options.some((option) => option.key === "heavy"));
  assert.ok(options.some((option) => option.key === "lightened"));
  assert.ok(options.some((option) => option.key === "extended"));
  assert.equal(options.some((option) => option.key === "worn"), false);
});

test("shields expose shield modifications", () => {
  const options = itemModificationOptions({ type: "armor", system: { subtype: "shield" } });

  assert.ok(options.some((option) => option.key === "reinforced"));
  assert.ok(options.some((option) => option.key === "reflecting"));
  assert.ok(options.some((option) => option.key === "practical"));
});

test("ordinary armor does not show shield modifications", () => {
  assert.deepEqual(itemModificationOptions({ type: "armor", system: { subtype: "armor" } }), []);
});

test("selected modification resolves its description", () => {
  const item = { type: "weapon", system: { modification: "heavy" } };
  const modification = selectedItemModification(item);

  assert.equal(modification.name, "Тяжёлое");
  assert.match(modification.description, /урону/u);
});

test("selected weapon modification exposes mechanical effects", () => {
  const effects = selectedItemModificationEffects({ type: "weapon", system: { modification: "heavy" } });

  assert.equal(effects.attackBonusDice, -1);
  assert.equal(effects.damageBonus, 1);
  assert.equal(effects.weightBonus, 1);
});

test("selected natural weapon trait modification uses weapon effects", () => {
  const effects = selectedItemModificationEffects({
    type: "trait",
    system: {
      kind: "trait",
      category: "weapons",
      description: "Это природное оружие, которое наносит 2 урона.",
      modification: "lightened"
    }
  });

  assert.equal(effects.attackBonusDice, 1);
  assert.equal(effects.damageBonus, -1);
  assert.equal(effects.weightBonus, -1);
});

test("shield lightened modification uses shield-specific effects", () => {
  const effects = selectedItemModificationEffects({ type: "armor", system: { subtype: "shield", modification: "lightened" } });

  assert.equal(effects.attackBonusDice, 0);
  assert.equal(effects.damageBonus, 0);
  assert.equal(effects.qualityBonus, 1);
  assert.equal(effects.weightBonus, -1);
});
