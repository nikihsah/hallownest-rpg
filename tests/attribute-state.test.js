import test from "node:test";
import assert from "node:assert/strict";
import { calculateAttributeState, storedAttributeValue } from "../module/mechanics/attribute-state.js";

test("trait modifiers change both maximum and current attribute values", () => {
  const result = calculateAttributeState({
    power: { value: 2, max: 3 }, insight: {}, shell: {}, grace: {}
  }, { power: 1 });
  assert.deepEqual(result.power, { value: 3, max: 4, modifier: 1 });
});

test("editing displayed current value preserves the permanent trait modifier", () => {
  assert.equal(storedAttributeValue(2, 1), 1);
  const result = calculateAttributeState({
    power: { value: 1, max: 3 }, insight: {}, shell: {}, grace: {}
  }, { power: 1 });
  assert.equal(result.power.value, 2);
  assert.equal(result.power.max, 4);
});
