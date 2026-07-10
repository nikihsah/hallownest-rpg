import test from "node:test";
import assert from "node:assert/strict";
import { classifyWeaponLike, weaponMatchesRequirement, weaponRequirementsMatch } from "../module/mechanics/weapon-classifier.js";

test("weapon classifier keeps multiple weapon families from raw text", () => {
  const classification = classifyWeaponLike({
    type: "weapon",
    name: "Великий колокол Клык",
    system: {
      itemType: "крюк",
      rawText: "Великий колокол Клык, крюк 4 2Р 2 200\nАтака может считаться как ближней, так и дальнобойной.",
      weight: 2,
      range: ""
    }
  });

  assert.ok(classification.types.includes("fang"));
  assert.ok(classification.types.includes("hook"));
  assert.equal(classification.heavy, true);
  assert.equal(classification.melee, true);
  assert.equal(classification.ranged, true);
});

test("weapon requirements understand melee reach heavy paired natural and exact types", () => {
  const classification = classifyWeaponLike({
    type: "weapon",
    name: "Парная досягаемая игла",
    system: {
      itemType: "Игла",
      description: "Парное оружие с досягаемостью.",
      weight: 2,
      range: "Досяг."
    }
  });

  assert.equal(weaponMatchesRequirement(classification, "Игла"), true);
  assert.equal(weaponMatchesRequirement(classification, "Оружие ближнего боя с досягаемостью"), true);
  assert.equal(weaponMatchesRequirement(classification, "Тяжелое оружие"), true);
  assert.equal(weaponMatchesRequirement(classification, "Парное оружие"), true);
  assert.equal(weaponMatchesRequirement(classification, "Праща"), false);
});

test("natural and unarmed requirements can match natural attacks", () => {
  const classification = classifyWeaponLike({
    name: "Когти",
    itemType: "Природное",
    description: "Безоружная природная атака.",
    weight: 0
  });

  assert.equal(weaponRequirementsMatch(classification, [{ type: "weapon_or_condition", value: "природное" }]), true);
  assert.equal(weaponRequirementsMatch(classification, [{ type: "weapon_or_condition", value: "без оружия" }]), true);
});
