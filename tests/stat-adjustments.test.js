import test from "node:test";
import assert from "node:assert/strict";
import { currentStatValue, maneuverFromGrace, statAdjustment } from "../module/mechanics/stat-adjustments.js";

test("maneuver is grace rounded upward", () => {
  assert.equal(maneuverFromGrace(3), 3);
  assert.equal(maneuverFromGrace(3.5), 4);
});

test("temporary adjustment survives a permanent stat increase", () => {
  const adjustment = statAdjustment(4, 6);
  assert.equal(adjustment, -2);
  assert.equal(currentStatValue(7, adjustment), 5);
});
