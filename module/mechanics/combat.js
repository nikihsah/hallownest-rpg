export function gridMovementCost(origin, destination, gridSize) {
  const size = Math.max(1, Number(gridSize) || 1);
  const dx = Math.abs((Number(destination.x) || 0) - (Number(origin.x) || 0));
  const dy = Math.abs((Number(destination.y) || 0) - (Number(origin.y) || 0));
  return Math.ceil(Math.max(dx, dy) / size);
}

export function availableSpeed(permanent, adjustment = 0, spent = 0) {
  return Math.max(0, (Number(permanent) || 0) + (Number(adjustment) || 0) - (Number(spent) || 0));
}

export const INITIATIVE_FORMULA = "floor(@effective.attributes.grace.value)d6";

function isPrimaryGM() {
  const activeGM = game.users.activeGM;
  return game.user.isGM && (!activeGM || activeGM.id === game.user.id);
}

function currentCombatantForToken(token) {
  const combat = game.combat;
  if (!combat?.started) return null;
  const combatant = combat.combatant;
  return combatant?.tokenId === token.id ? combatant : null;
}

function onPreUpdateToken(token, change, options, userId) {
  if (userId !== game.user.id || change.x === undefined && change.y === undefined) return;
  if (!currentCombatantForToken(token)) return;
  const destination = { x: change.x ?? token.x, y: change.y ?? token.y };
  const gridSize = token.parent?.grid?.size ?? canvas?.grid?.size ?? 1;
  options.hrpgMovementCost = gridMovementCost({ x: token.x, y: token.y }, destination, gridSize);
}

async function onUpdateToken(token, _change, options, userId) {
  if (userId !== game.user.id || !options.hrpgMovementCost) return;
  const actor = token.actor;
  if (!actor || actor.type !== "bug") return;
  const spent = (Number(actor.system.combat?.speedSpent) || 0) + options.hrpgMovementCost;
  await actor.update({ "system.combat.speedSpent": spent });
  const remaining = availableSpeed(actor.system.effective.secondary.speed, actor.system.adjustments?.speed, spent);
  if (remaining <= 0 && spent > (Number(actor.system.effective.secondary.speed) || 0) + (Number(actor.system.adjustments?.speed) || 0)) {
    ui.notifications.warn(game.i18n.localize("HRPG.SpeedExceeded"));
  }
}

async function onCombatTurnChange(combat, prior) {
  if (!isPrimaryGM() || !prior?.tokenId) return;
  const combatant = combat.combatants.find((entry) => entry.tokenId === prior.tokenId);
  const actor = combatant?.actor;
  if (actor?.type === "bug" && actor.system.combat?.speedSpent) {
    await actor.update({ "system.combat.speedSpent": 0 });
  }
}

export function registerCombatAutomation() {
  CONFIG.Combat.initiative.formula = INITIATIVE_FORMULA;
  CONFIG.Combat.initiative.decimals = 0;
  Hooks.on("preUpdateToken", onPreUpdateToken);
  Hooks.on("updateToken", onUpdateToken);
  Hooks.on("combatTurnChange", onCombatTurnChange);
}
