import test from "node:test";
import assert from "node:assert/strict";

globalThis.Actor = class {
  prepareDerivedData() {}
};

const { HallownestActor } = await import("../module/documents/actor.js");

function bugActor({ items = [], resources = {} } = {}) {
  const actor = Object.create(HallownestActor.prototype);
  actor.type = "bug";
  actor.items = items;
  actor.system = {
    attributes: {
      power: { value: 2, max: 2 },
      insight: { value: 2, max: 2 },
      shell: { value: 2, max: 2 },
      grace: { value: 2, max: 2 },
      heart: { value: 2, max: 2 }
    },
    resources: {
      heart: { value: 3, max: 3 },
      stamina: { value: 3, max: resources.stamina ?? 3 },
      soul: { value: 3, max: resources.soul ?? 3 },
      satiety: { value: 0, max: 10 }
    },
    secondary: {
      speed: 3,
      hunger: { value: 0 },
      appeal: 0,
      dread: 0,
      marks: { max: 3 }
    }
  };
  return actor;
}

test("path ranks add marks and their matching dice pool", () => {
  const actor = bugActor({
    items: [
      { type: "path", system: { rank: 1, category: "martial" } },
      { type: "path", system: { rank: 2, category: "mystic" } }
    ]
  });

  actor.prepareDerivedData();

  assert.equal(actor.system.effective.secondary.marks, 6);
  assert.equal(actor.system.effective.resources.stamina.max, 4);
  assert.equal(actor.system.effective.resources.soul.max, 5);
  assert.deepEqual(actor.system.effective.pathModifiers, { marks: 3, stamina: 1, soul: 2 });
});

test("path bonuses cannot raise stamina or soul above seven", () => {
  const actor = bugActor({
    resources: { stamina: 6, soul: 6 },
    items: [
      { type: "path", system: { rank: 3, category: "martial" } },
      { type: "path", system: { rank: 3, category: "mystic" } }
    ]
  });

  actor.prepareDerivedData();

  assert.equal(actor.system.effective.resources.stamina.max, 7);
  assert.equal(actor.system.effective.resources.soul.max, 7);
});
