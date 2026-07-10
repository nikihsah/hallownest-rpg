import { HRPG_EFFECT_SCOPE, findHrpgStatusEffect, setHrpgStatusEffect } from "./active-effects.js";
import { statusEffectDefinition } from "../data/status-effects.js";

const PATCH_FLAG = Symbol.for("hallownest-rpg.token-status-effects-patched");

export function registerTokenStatusEffectAutomation() {
  const prototype = globalThis.TokenDocument?.prototype ?? globalThis.CONFIG?.Token?.documentClass?.prototype;
  if (!prototype?.toggleActiveEffect || prototype.toggleActiveEffect[PATCH_FLAG]) return false;
  const original = prototype.toggleActiveEffect;
  async function toggleHallownestStatus(effect, options = {}) {
    const key = statusKeyFromEffect(effect);
    const actor = this.actor;
    if (key && statusEffectDefinition(key) && ["bug", "gmBug"].includes(actor?.type)) {
      const existing = findHrpgStatusEffect(actor, key);
      const active = typeof options?.active === "boolean" ? options.active : !existing;
      await setHrpgStatusEffect(actor, key, active ? 1 : 0);
      return active;
    }
    return original.call(this, effect, options);
  }
  toggleHallownestStatus[PATCH_FLAG] = true;
  toggleHallownestStatus._hrpgOriginal = original;
  prototype.toggleActiveEffect = toggleHallownestStatus;
  return true;
}

export function statusKeyFromEffect(effect) {
  const flag = effect?.getFlag?.(HRPG_EFFECT_SCOPE, "statusKey")
    ?? effect?.flags?.[HRPG_EFFECT_SCOPE]?.statusKey;
  if (flag) return String(flag);
  const id = String(effect?.id ?? effect ?? "");
  if (id.startsWith("hrpg.")) return id.slice(5);
  const status = Array.from(effect?.statuses ?? []).find((entry) => String(entry).startsWith("hrpg."));
  return status ? String(status).slice(5) : "";
}
