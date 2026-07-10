import test from "node:test";
import assert from "node:assert/strict";
import { expectedDamage } from "../module/mechanics/damage.js";

test("expected damage follows hit extra damage reduction and absorption order", () => {
  const result = expectedDamage({
    successes: 4,
    baseDamage: 2,
    investedStamina: 1,
    damageReduction: 1,
    absorptionSuccesses: 1
  });

  assert.equal(result.hit, true);
  assert.equal(result.extraDamage, 2);
  assert.equal(result.probableDamage, 4);
  assert.equal(result.afterReduction, 3);
  assert.equal(result.afterAbsorptionRoll, 2);
  assert.equal(result.finalDamage, 2);
});

test("damage reduction cannot lower a hit below one before absorption", () => {
  const result = expectedDamage({ successes: 1, baseDamage: 2, damageReduction: 10 });

  assert.equal(result.afterReduction, 1);
  assert.equal(result.finalDamage, 1);
});

test("magic and natural damage can skip absorption roll but still use reduction and absorption pool", () => {
  const result = expectedDamage({
    successes: 2,
    baseDamage: 3,
    damageReduction: 1,
    absorptionSuccesses: 5,
    absorption: 2,
    absorbable: false
  });

  assert.equal(result.afterReduction, 3);
  assert.equal(result.afterAbsorptionRoll, 3);
  assert.equal(result.absorbedByPool, 2);
  assert.equal(result.finalDamage, 1);
});

test("missed attacks deal no expected damage", () => {
  assert.deepEqual(expectedDamage({ successes: 0, baseDamage: 3 }), {
    hit: false,
    baseDamage: 0,
    extraSuccesses: 0,
    extraCap: 0,
    extraDamage: 0,
    probableDamage: 0,
    afterReduction: 0,
    afterAbsorptionRoll: 0,
    absorbedByPool: 0,
    finalDamage: 0
  });
});
