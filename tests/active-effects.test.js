import test from "node:test";
import assert from "node:assert/strict";
import { activeEffectDiceModifier, HRPG_EFFECT_SCOPE, hrpgStatusEffectData, setHrpgStatusEffect } from "../module/mechanics/active-effects.js";

class FakeEffect {
  constructor(data) {
    Object.assign(this, data);
    this.deleted = false;
  }

  getFlag(scope, key) {
    return this.flags?.[scope]?.[key];
  }

  async update(data) {
    Object.assign(this, data);
    return this;
  }

  async delete() {
    this.deleted = true;
  }
}

function fakeActor() {
  return {
    effects: [],
    async createEmbeddedDocuments(type, documents) {
      assert.equal(type, "ActiveEffect");
      const created = documents.map((data) => new FakeEffect(data));
      this.effects.push(...created);
      return created;
    }
  };
}

test("HRPG status effect data uses Foundry ActiveEffect shape and system flags", () => {
  const data = hrpgStatusEffectData("imbalance", { value: 2 });

  assert.equal(data.img, "systems/hallownest-rpg/assets/icons/status/imbalance.svg");
  assert.deepEqual(data.statuses, ["hrpg.imbalance"]);
  assert.equal(data.flags[HRPG_EFFECT_SCOPE].statusKey, "imbalance");
  assert.equal(data.flags[HRPG_EFFECT_SCOPE].value, 2);
  assert.match(data.name, /2$/);
});

test("setHrpgStatusEffect creates updates and removes a stackable status", async () => {
  const actor = fakeActor();

  const created = await setHrpgStatusEffect(actor, "imbalance", 2);
  assert.equal(actor.effects.length, 1);
  assert.equal(created.flags[HRPG_EFFECT_SCOPE].value, 2);

  await setHrpgStatusEffect(actor, "imbalance", 3);
  assert.equal(actor.effects.length, 1);
  assert.equal(actor.effects[0].flags[HRPG_EFFECT_SCOPE].value, 3);

  await setHrpgStatusEffect(actor, "imbalance", 0);
  assert.equal(actor.effects[0].deleted, true);
});

test("active effect dice modifiers replace condition item dice modifiers", () => {
  const actor = {
    effects: [
      { flags: { [HRPG_EFFECT_SCOPE]: { diceModifier: -1, trigger: "attribute" } } },
      { flags: { [HRPG_EFFECT_SCOPE]: { diceModifier: 2, triggers: ["attack"] } } },
      { disabled: true, flags: { [HRPG_EFFECT_SCOPE]: { diceModifier: 5, trigger: "attribute" } } }
    ]
  };

  assert.equal(activeEffectDiceModifier(actor, "attribute"), -1);
  assert.equal(activeEffectDiceModifier(actor, "attack"), 2);
});
