import test from "node:test";
import assert from "node:assert/strict";
import {
  equippedFlasks,
  flaskAttackContext,
  flaskEffectText,
  flaskUses,
  isFlaskItem,
  spendFlaskUseUpdate
} from "../module/mechanics/flasks.js";

function item(overrides = {}) {
  return {
    id: overrides.id ?? "flask-1",
    name: overrides.name ?? "Горючая",
    type: overrides.type ?? "consumable",
    system: {
      subtype: overrides.subtype ?? "flask",
      equipped: overrides.equipped ?? true,
      uses: overrides.uses ?? { value: 1, max: 1 },
      description: overrides.description ?? "Направленный: цель горит.",
      rawText: overrides.rawText ?? "",
      rarity: overrides.rarity ?? "Обычная",
      weight: overrides.weight ?? 0,
      sourceId: overrides.sourceId ?? "equipment.flask.goryuchaya"
    }
  };
}

test("equipped flasks expose only worn consumable flask items", () => {
  const flasks = equippedFlasks([
    item({ id: "ready" }),
    item({ id: "bag", equipped: false }),
    item({ id: "food", subtype: "food" }),
    item({ id: "weapon", type: "weapon" })
  ]);

  assert.deepEqual(flasks.map((flask) => flask.id), ["ready"]);
  assert.equal(flasks[0].effect, "Направленный: цель горит.");
  assert.equal(flasks[0].canUse, true);
});

test("flask helpers track uses and spending update", () => {
  const flask = item({ uses: { value: 2, max: 3 } });

  assert.equal(isFlaskItem(flask), true);
  assert.deepEqual(flaskUses(flask), { value: 2, max: 3 });
  assert.deepEqual(spendFlaskUseUpdate(flask), { "system.uses.value": 1 });
  assert.equal(flaskEffectText(item({ description: "", rawText: "raw effect" })), "raw effect");
  assert.equal(spendFlaskUseUpdate(item({ uses: { value: 0, max: 1 } })), null);
});

test("flask attack context marks the action as a ranged thrown vial", () => {
  const context = flaskAttackContext(item({ id: "acid", weight: 1 }));

  assert.equal(context.itemId, "acid");
  assert.equal(context.sourceType, "consumable");
  assert.equal(context.classification.ranged, true);
  assert.equal(context.classification.thrown, true);
  assert.equal(context.classification.types.has("vial"), true);
});
