import { statusEffectDefinition } from "../data/status-effects.js";

export const HRPG_EFFECT_SCOPE = "hallownest-rpg";
export const HRPG_STATUS_FLAG = "statusKey";

export function hrpgStatusEffectData(key, { value = 1, changes = [] } = {}) {
  const definition = statusEffectDefinition(key);
  if (!definition) throw new Error(`Unknown Hallownest RPG status effect: ${key}`);
  const stack = Math.max(0, Math.floor(Number(value) || 0));
  return {
    name: localized(definition.label) + (definition.stackable && stack > 0 ? ` ${stack}` : ""),
    img: definition.icon,
    changes,
    statuses: statusIds(key),
    flags: {
      [HRPG_EFFECT_SCOPE]: {
        [HRPG_STATUS_FLAG]: key,
        value: stack || 1,
        category: definition.category,
        stackable: definition.stackable,
        max: definition.max
      }
    }
  };
}

export function findHrpgStatusEffect(actor, key) {
  return Array.from(actor?.effects ?? []).find((effect) => effectFlag(effect, HRPG_STATUS_FLAG) === key
    || effectFlag(effect, "statusKey") === key
    || effectFlag(effect, "key") === key);
}

export async function setHrpgStatusEffect(actor, key, value = 1, { changes = [] } = {}) {
  const definition = statusEffectDefinition(key);
  if (!actor || !definition) return null;
  const stack = Math.max(0, Math.min(definition.max, Math.floor(Number(value) || 0)));
  const existing = findHrpgStatusEffect(actor, key);
  if (stack <= 0) {
    await existing?.delete?.();
    return null;
  }
  const data = hrpgStatusEffectData(key, { value: stack, changes });
  if (existing) {
    await existing.update?.(data);
    return existing;
  }
  const created = await actor.createEmbeddedDocuments?.("ActiveEffect", [data]);
  return Array.isArray(created) ? created[0] : created;
}

export function activeEffectDiceModifier(actor, trigger = "") {
  return Array.from(actor?.effects ?? [])
    .filter((effect) => !effect.disabled)
    .reduce((total, effect) => total + matchingDiceModifier(effect, trigger), 0);
}

function matchingDiceModifier(effect, trigger) {
  const flags = effect.flags?.[HRPG_EFFECT_SCOPE] ?? {};
  const modifier = Number(flags.diceModifier) || 0;
  if (!modifier) return 0;
  const triggers = Array.isArray(flags.triggers) ? flags.triggers : flags.trigger ? [flags.trigger] : [];
  if (trigger && triggers.length && !triggers.includes(trigger)) return 0;
  return modifier;
}

function effectFlag(effect, key) {
  return effect?.getFlag?.(HRPG_EFFECT_SCOPE, key)
    ?? effect?.flags?.[HRPG_EFFECT_SCOPE]?.[key]
    ?? effect?.flags?.hrpg?.[key];
}

function localized(label) {
  return globalThis.game?.i18n?.localize?.(label) ?? label;
}

function statusIds(key) {
  return key === "dead" ? ["dead", "hrpg.dead"] : [`hrpg.${key}`];
}
