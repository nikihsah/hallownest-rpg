export function gridMovementCost(origin, destination, gridSize) {
  const size = Math.max(1, Number(gridSize) || 1);
  const dx = Math.abs((Number(destination.x) || 0) - (Number(origin.x) || 0));
  const dy = Math.abs((Number(destination.y) || 0) - (Number(origin.y) || 0));
  return Math.ceil(Math.max(dx, dy) / size);
}

export function availableSpeed(permanent, adjustment = 0, spent = 0) {
  return Math.max(0, (Number(permanent) || 0) + (Number(adjustment) || 0) - (Number(spent) || 0));
}

export function movementOverageCells(origin, destination, gridSize, spentBefore = 0, totalSpeed = 0) {
  const cost = gridMovementCost(origin, destination, gridSize);
  const allowedSteps = Math.max(0, Math.floor((Number(totalSpeed) || 0) - (Number(spentBefore) || 0)));
  if (cost <= allowedSteps) return [];
  const size = Math.max(1, Number(gridSize) || 1);
  const startX = Number(origin.x) || 0;
  const startY = Number(origin.y) || 0;
  const dx = (Number(destination.x) || 0) - startX;
  const dy = (Number(destination.y) || 0) - startY;
  const cells = [];
  for (let step = allowedSteps + 1; step <= cost; step += 1) {
    cells.push({
      x: Math.round((startX + dx * (step / cost)) / size) * size,
      y: Math.round((startY + dy * (step / cost)) / size) * size
    });
  }
  return cells;
}

export const INITIATIVE_FORMULA = "1d6";

export function configureInitiative(combatConfig) {
  combatConfig.initiative.formula = INITIATIVE_FORMULA;
  combatConfig.initiative.decimals = 0;
}

export function initiativeFormulaForActor(actor) {
  const grace = Math.floor(Number(actor?.system?.effective?.attributes?.grace?.value) || 0);
  return grace > 0 ? `${grace}d6` : "0";
}

export function patchBugInitiativeRolls() {
  if (Combatant.prototype._hrpgInitiativePatched) return;
  const baseGetInitiativeRoll = Combatant.prototype.getInitiativeRoll;
  Combatant.prototype.getInitiativeRoll = function getHallownestInitiativeRoll(formula) {
    if (this.actor?.type === "bug") {
      return Roll.create(initiativeFormulaForActor(this.actor), this.actor.getRollData?.() ?? {});
    }
    return baseGetInitiativeRoll.call(this, formula);
  };
  Combatant.prototype._hrpgInitiativePatched = true;
}

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
  const spentBefore = Number(token.actor?.system.combat?.speedSpent) || 0;
  const totalSpeed = (Number(token.actor?.system.effective?.secondary?.speed) || 0) + (Number(token.actor?.system.adjustments?.speed) || 0);
  options.hrpgMovementCost = gridMovementCost({ x: token.x, y: token.y }, destination, gridSize);
  options.hrpgMovementOverageCells = movementOverageCells({ x: token.x, y: token.y }, destination, gridSize, spentBefore, totalSpeed);
}

async function onUpdateToken(token, _change, options, userId) {
  if (userId !== game.user.id || !options.hrpgMovementCost) return;
  const actor = token.actor;
  if (!actor || actor.type !== "bug") return;
  const spent = (Number(actor.system.combat?.speedSpent) || 0) + options.hrpgMovementCost;
  await actor.update({ "system.combat.speedSpent": spent });
  highlightSpeedOverage(options.hrpgMovementOverageCells);
}

export function combatTurnRecoveryUpdate(actor) {
  if (actor?.type !== "bug") return null;
  return {
    "system.combat.speedSpent": 0,
    "system.combat.attackTax": 0,
    "system.resources.stamina.value": Number(actor.system.effective?.resources?.stamina?.max) || Number(actor.system.resources?.stamina?.max) || 0
  };
}

export function combatTurnEndUpdate(actor) {
  if (actor?.type !== "bug") return null;
  const update = { "system.combat.attackTax": 0 };
  const hasSecondWind = actor.items?.some?.((item) => item.type === "path"
    && item.system?.sourceId === "paths.fang"
    && Math.floor(Number(item.system?.rank) || 0) >= 2);
  if (hasSecondWind && (Number(actor.system.resources?.stamina?.value) || 0) <= 0) {
    update["system.resources.stamina.value"] = 1;
  }
  return update;
}

async function onCombatTurnChange(combat) {
  if (!isPrimaryGM()) return;
  const previousActor = combat.previous?.combatantId ? combat.combatants.get(combat.previous.combatantId)?.actor : null;
  const previousUpdate = combatTurnEndUpdate(previousActor);
  if (previousUpdate) await previousActor.update(previousUpdate);
  const actor = combat.combatant?.actor;
  const update = combatTurnRecoveryUpdate(actor);
  if (update) await actor.update(update);
  clearSpeedOverageHighlight();
}

export function registerCombatAutomation() {
  Hooks.once("initializeCombatConfiguration", () => configureInitiative(CONFIG.Combat));
  Hooks.once("ready", patchBugInitiativeRolls);
  Hooks.on("preUpdateToken", onPreUpdateToken);
  Hooks.on("updateToken", onUpdateToken);
  Hooks.on("combatTurnChange", onCombatTurnChange);
}

const SPEED_OVERAGE_LAYER = "hrpg-speed-overage";

function highlightSpeedOverage(cells = []) {
  if (!cells.length) return clearSpeedOverageHighlight();
  const grid = canvas?.interface?.grid ?? canvas?.grid;
  if (!grid?.highlightPosition) return;
  grid.addHighlightLayer?.(SPEED_OVERAGE_LAYER);
  grid.clearHighlightLayer?.(SPEED_OVERAGE_LAYER);
  for (const cell of cells) {
    grid.highlightPosition(SPEED_OVERAGE_LAYER, {
      x: cell.x,
      y: cell.y,
      color: 0xb82020,
      border: 0x7a0f0f,
      alpha: 0.45
    });
  }
  window.setTimeout(() => clearSpeedOverageHighlight(), 1800);
}

function clearSpeedOverageHighlight() {
  const grid = canvas?.interface?.grid ?? canvas?.grid;
  grid?.clearHighlightLayer?.(SPEED_OVERAGE_LAYER);
}
