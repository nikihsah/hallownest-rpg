import test from "node:test";
import assert from "node:assert/strict";
import {
  isNaturalWeaponTrait,
  naturalWeaponQualityData,
  naturalWeaponQualityRecoveryUpdates,
  naturalWeaponQualityValue
} from "../module/mechanics/trait-quality.js";

test("only parent weapon traits receive natural weapon quality", () => {
  const weapon = { type: "trait", system: { kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 2 урона." } };
  const subtrait = { type: "trait", system: { kind: "subtrait", category: "weapons" } };
  const lifestyle = { type: "trait", system: { kind: "trait", category: "lifestyle" } };

  assert.equal(isNaturalWeaponTrait(weapon), true);
  assert.deepEqual(naturalWeaponQualityData(weapon), { value: 1, max: 1 });
  assert.equal(naturalWeaponQualityValue(weapon), 1);
  assert.equal(isNaturalWeaponTrait(subtrait), false);
  assert.deepEqual(naturalWeaponQualityData(lifestyle), { value: 0, max: 0 });
});

test("rest restores damaged natural weapon quality", () => {
  const updates = naturalWeaponQualityRecoveryUpdates([
    { id: "damaged", type: "trait", system: { kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 2 урона.", quality: { value: 0, max: 2 } } },
    { id: "full", type: "trait", system: { kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 2 урона.", quality: { value: 2, max: 2 } } },
    { id: "subtrait", type: "trait", system: { kind: "subtrait", category: "weapons", quality: { value: 0, max: 2 } } }
  ]);

  assert.deepEqual(updates, [{ _id: "damaged", "system.quality.value": 1 }]);
});

test("lost natural weapons regenerate to zero only after fed rest", () => {
  const lost = { id: "lost", type: "trait", system: { kind: "trait", category: "weapons", description: "Это природное оружие, которое наносит 2 урона.", quality: { value: -1, max: 2 } } };

  assert.deepEqual(naturalWeaponQualityRecoveryUpdates([lost], false), []);
  assert.deepEqual(naturalWeaponQualityRecoveryUpdates([lost], true), [{ _id: "lost", "system.quality.value": 0 }]);
});
