import test from "node:test";
import assert from "node:assert/strict";
import { restRecovery, SATIETY_BANDS, satietyBand } from "../module/mechanics/rest.js";
import { naturalWeaponQualityRecoveryUpdates } from "../module/mechanics/trait-quality.js";

test("satiety bands respect starvation boundaries", () => {
  assert.equal(satietyBand(0), SATIETY_BANDS.FED);
  assert.equal(satietyBand(-1), SATIETY_BANDS.HUNGRY);
  assert.equal(satietyBand(-50), SATIETY_BANDS.STARVING);
  assert.equal(satietyBand(-100), SATIETY_BANDS.STARVING);
  assert.equal(satietyBand(-101), SATIETY_BANDS.DEAD);
});

test("fed rest restores soul, one heart, and one attribute damage", () => {
  const result = restRecovery({ satiety: 0, heart: 4, heartMax: 7, soulMax: 3, attributes: { power: { value: 2, max: 3 } } });
  assert.equal(result.update.heart, 5);
  assert.equal(result.update.soul, 3);
  assert.equal(result.update.attributes.power, 3);
});

test("hungry and starving rest restores half soul rounded upward", () => {
  assert.equal(restRecovery({ satiety: -1, soulMax: 5, attributes: {} }).update.soul, 3);
  assert.equal(restRecovery({ satiety: -50, soulMax: 5, attributes: {} }).update.soul, 3);
});

test("natural weapon quality restoration follows rest rules", () => {
  assert.deepEqual(naturalWeaponQualityRecoveryUpdates([
    { id: "weapon", type: "trait", system: { kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 2 урона.", quality: { value: 0, max: 1 } } }
  ], false), [{ _id: "weapon", "system.quality.value": 1 }]);
  assert.deepEqual(naturalWeaponQualityRecoveryUpdates([
    { id: "lost", type: "trait", system: { kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 2 урона.", quality: { value: -1, max: 1 } } }
  ], true), [{ _id: "lost", "system.quality.value": 0 }]);
});
