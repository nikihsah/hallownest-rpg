export function currentStatValue(permanent, adjustment = 0) {
  return (Number(permanent) || 0) + (Number(adjustment) || 0);
}

export function statAdjustment(displayedCurrent, permanent) {
  const current = Number(displayedCurrent);
  if (!Number.isFinite(current)) throw new TypeError("Current stat value must be numeric");
  return current - (Number(permanent) || 0);
}

export function maneuverFromGrace(grace) {
  return Math.ceil(Number(grace) || 0);
}
