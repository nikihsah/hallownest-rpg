import test from "node:test";
import assert from "node:assert/strict";
import { availableSpeed, configureInitiative, gridMovementCost, initiativeFormulaForActor, INITIATIVE_FORMULA } from "../module/mechanics/combat.js";
import { tokenDimensions } from "../module/mechanics/size-templates.js";

test("large bugs use a two by two token footprint", () => {
  assert.deepEqual(tokenDimensions("small"), { width: 1, height: 1 });
  assert.deepEqual(tokenDimensions("medium"), { width: 1, height: 1 });
  assert.deepEqual(tokenDimensions("large"), { width: 2, height: 2 });
});

test("orthogonal and diagonal movement each cost one Speed per cell", () => {
  assert.equal(gridMovementCost({ x: 0, y: 0 }, { x: 100, y: 0 }, 100), 1);
  assert.equal(gridMovementCost({ x: 0, y: 0 }, { x: 100, y: 100 }, 100), 1);
  assert.equal(gridMovementCost({ x: 0, y: 0 }, { x: 300, y: 200 }, 100), 3);
});

test("spent movement is separate from a temporary Speed adjustment", () => {
  assert.equal(availableSpeed(6, -1, 2), 3);
});

test("initiative sums Grace dice instead of counting successes", () => {
  assert.equal(INITIATIVE_FORMULA, "1d6");
  const config = { initiative: { formula: null, decimals: 2 } };
  configureInitiative(config);
  assert.deepEqual(config.initiative, { formula: INITIATIVE_FORMULA, decimals: 0 });
  assert.equal(initiativeFormulaForActor({ system: { effective: { attributes: { grace: { value: 3 } } } } }), "3d6");
  assert.equal(initiativeFormulaForActor({ system: { effective: { attributes: { grace: { value: 0 } } } } }), "0");
});
