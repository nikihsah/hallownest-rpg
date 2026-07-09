import test from "node:test";
import assert from "node:assert/strict";
import { itemModificationOptions, selectedItemModification } from "../module/data/item-modifications.js";

test("weapons expose weapon modifications", () => {
  const options = itemModificationOptions({ type: "weapon", system: {} });

  assert.ok(options.some((option) => option.key === "heavy"));
  assert.ok(options.some((option) => option.key === "balanced"));
  assert.ok(options.some((option) => option.key === "threaded"));
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
