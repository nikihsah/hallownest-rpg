export function expectedDamage({
  successes = 0,
  baseDamage = 0,
  investedStamina = 0,
  damageReduction = 0,
  absorptionSuccesses = 0,
  absorption = 0,
  absorbable = true
} = {}) {
  const hitSuccesses = Math.max(0, Math.floor(Number(successes) || 0));
  if (hitSuccesses <= 0) return damageResult({ hit: false });

  const base = Math.max(0, Number(baseDamage) || 0);
  const invested = Math.max(0, Math.floor(Number(investedStamina) || 0));
  const extraSuccesses = Math.max(0, hitSuccesses - 1);
  const extraCap = Math.max(base, invested);
  const extraDamage = Math.min(extraSuccesses, extraCap);
  const probableDamage = base + extraDamage;
  const afterReduction = Math.max(1, probableDamage - Math.max(0, Number(damageReduction) || 0));
  const afterAbsorptionRoll = absorbable
    ? Math.max(0, afterReduction - Math.max(0, Math.floor(Number(absorptionSuccesses) || 0)))
    : afterReduction;
  const absorbedByPool = absorptionReduction(afterAbsorptionRoll, absorption);
  const finalDamage = Math.max(0, afterAbsorptionRoll - absorbedByPool);

  return damageResult({
    hit: true,
    baseDamage: base,
    extraSuccesses,
    extraCap,
    extraDamage,
    probableDamage,
    afterReduction,
    afterAbsorptionRoll,
    absorbedByPool,
    finalDamage
  });
}

function damageResult(result) {
  return {
    hit: false,
    baseDamage: 0,
    extraSuccesses: 0,
    extraCap: 0,
    extraDamage: 0,
    probableDamage: 0,
    afterReduction: 0,
    afterAbsorptionRoll: 0,
    absorbedByPool: 0,
    finalDamage: 0,
    ...result
  };
}

function absorptionReduction(damage, absorption) {
  const pool = Math.max(0, Math.floor(Number(absorption) || 0));
  const remaining = Math.max(0, Number(damage) || 0);
  if (pool <= 0 || remaining <= 0) return 0;
  return Math.min(remaining, 1 + Math.floor(remaining / pool));
}
