import test from "node:test";
import assert from "node:assert/strict";
import { availableSpeed, combatTurnEndUpdate, combatTurnRecoveryUpdate, configureInitiative, gridMovementCost, initiativeFormulaForActor, INITIATIVE_FORMULA, movementOverageCells } from "../module/mechanics/combat.js";
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

test("movement beyond available Speed reports only overage cells", () => {
  assert.deepEqual(movementOverageCells({ x: 0, y: 0 }, { x: 300, y: 0 }, 100, 1, 3), [{ x: 300, y: 0 }]);
  assert.deepEqual(movementOverageCells({ x: 0, y: 0 }, { x: 300, y: 300 }, 100, 0, 1), [{ x: 200, y: 200 }, { x: 300, y: 300 }]);
  assert.deepEqual(movementOverageCells({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 0, 3), []);
});

test("initiative sums Grace dice instead of counting successes", () => {
  assert.equal(INITIATIVE_FORMULA, "1d6");
  const config = { initiative: { formula: null, decimals: 2 } };
  configureInitiative(config);
  assert.deepEqual(config.initiative, { formula: INITIATIVE_FORMULA, decimals: 0 });
  assert.equal(initiativeFormulaForActor({ system: { effective: { attributes: { grace: { value: 3 } } } } }), "3d6");
  assert.equal(initiativeFormulaForActor({ system: { effective: { attributes: { grace: { value: 0 } } } } }), "0");
});

test("bugs recover combat stamina and speed at the start of their turn", () => {
  const actor = {
    type: "bug",
    system: {
      combat: { speedSpent: 4 },
      resources: { stamina: { value: 1, max: 3 } },
      effective: { resources: { stamina: { max: 5 } } }
    }
  };

  assert.deepEqual(combatTurnRecoveryUpdate(actor), {
    "system.combat.speedSpent": 0,
    "system.combat.attackTax": 0,
    "system.resources.stamina.value": 5
  });
  assert.equal(combatTurnRecoveryUpdate({ type: "npc" }), null);
});

test("attack tax resets at end of turn and Fang second wind restores one stamina", () => {
  const actor = {
    type: "bug",
    items: [{ type: "path", system: { sourceId: "paths.fang", rank: 2 } }],
    system: {
      combat: { attackTax: 2 },
      resources: { stamina: { value: 0 } }
    }
  };

  assert.deepEqual(combatTurnEndUpdate(actor), {
    "system.combat.attackTax": 0,
    "system.resources.stamina.value": 1
  });
  assert.equal(combatTurnEndUpdate({ type: "npc" }), null);
});
