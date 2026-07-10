export const HRPG_STATUS_EFFECTS = Object.freeze([
  effect("imbalance", "HRPG.Status.Imbalance", "combat", "icons/svg/daze.svg", { stackable: true, max: 3 }),
  effect("dead", "HRPG.Status.Dead", "survival", "icons/svg/skull.svg"),
  effect("starving", "HRPG.Status.Starving", "survival", "icons/svg/downgrade.svg"),
  effect("focused", "HRPG.Status.Focused", "combat", "icons/svg/aura.svg"),
  effect("prepared-action", "HRPG.Status.PreparedAction", "combat", "icons/svg/clockwork.svg"),
  effect("delayed-turn", "HRPG.Status.DelayedTurn", "combat", "icons/svg/time-trap.svg"),
  effect("grappled", "HRPG.Status.Grappled", "combat", "icons/svg/net.svg"),
  effect("immobilized", "HRPG.Status.Immobilized", "combat", "icons/svg/paralysis.svg"),
  effect("hidden", "HRPG.Status.Hidden", "combat", "icons/svg/invisible.svg"),
  effect("wet", "HRPG.Status.Wet", "environment", "icons/svg/water.svg"),
  effect("dry", "HRPG.Status.Dry", "environment", "icons/svg/sun.svg"),
  effect("burning", "HRPG.Status.Burning", "damage", "icons/svg/fire.svg", { stackable: true }),
  effect("delayed-damage", "HRPG.Status.DelayedDamage", "damage", "icons/svg/explosion.svg", { stackable: true }),
  effect("poisoned", "HRPG.Status.Poisoned", "damage", "icons/svg/poison.svg", { stackable: true }),
  effect("acid", "HRPG.Status.Acid", "damage", "icons/svg/acid.svg", { stackable: true }),
  effect("rust", "HRPG.Status.Rust", "damage", "icons/svg/degen.svg", { stackable: true }),
  effect("armor-damaged", "HRPG.Status.ArmorDamaged", "gear", "icons/svg/shield.svg", { stackable: true }),
  effect("equipment-worn", "HRPG.Status.EquipmentWorn", "gear", "icons/svg/item-bag.svg", { stackable: true }),
  effect("attribute-damage", "HRPG.Status.AttributeDamage", "debuff", "icons/svg/decrease.svg", { stackable: true }),
  effect("resource-damage", "HRPG.Status.ResourceDamage", "debuff", "icons/svg/blood.svg", { stackable: true }),
  effect("speed-penalty", "HRPG.Status.SpeedPenalty", "debuff", "icons/svg/turtle.svg", { stackable: true }),
  effect("stamina-max-penalty", "HRPG.Status.StaminaMaxPenalty", "debuff", "icons/svg/battery-pack-alt.svg", { stackable: true }),
  effect("attack-defense-penalty", "HRPG.Status.AttackDefensePenalty", "debuff", "icons/svg/terror.svg", { stackable: true }),
  effect("sense-blocked", "HRPG.Status.SenseBlocked", "senses", "icons/svg/blind.svg", { stackable: true }),
  effect("smoke-cloud", "HRPG.Status.SmokeCloud", "environment", "icons/svg/fog.svg"),
  effect("greased", "HRPG.Status.Greased", "environment", "icons/svg/slippery.svg"),
  effect("glued", "HRPG.Status.Glued", "environment", "icons/svg/web.svg", { stackable: true }),
  effect("pheromones", "HRPG.Status.Pheromones", "social", "icons/svg/scent.svg"),
  effect("charmed", "HRPG.Status.Charmed", "social", "icons/svg/heart.svg"),
  effect("panicked", "HRPG.Status.Panicked", "social", "icons/svg/screaming.svg"),
  effect("unconscious", "HRPG.Status.Unconscious", "survival", "icons/svg/unconscious.svg"),
  effect("enraged", "HRPG.Status.Enraged", "social", "icons/svg/angry.svg"),
  effect("lifeblood", "HRPG.Status.Lifeblood", "resource", "icons/svg/regen.svg", { stackable: true }),
  effect("soul-damage", "HRPG.Status.SoulDamage", "resource", "icons/svg/void.svg", { stackable: true }),
  effect("charged-fireflies", "HRPG.Status.ChargedFireflies", "environment", "icons/svg/lightning.svg"),
  effect("summoned-creature", "HRPG.Status.SummonedCreature", "summon", "icons/svg/mystery-man.svg"),
  effect("shell-puppet", "HRPG.Status.ShellPuppet", "summon", "icons/svg/target.svg")
]);

export function statusEffectDefinition(key) {
  return HRPG_STATUS_EFFECTS.find((entry) => entry.key === key) ?? null;
}

export function foundryStatusEffects() {
  return HRPG_STATUS_EFFECTS.map((entry) => ({
    id: `hrpg.${entry.key}`,
    name: entry.label,
    img: entry.icon,
    statuses: statusIds(entry.key),
    flags: {
      "hallownest-rpg": { statusKey: entry.key, category: entry.category, stackable: entry.stackable, max: entry.max }
    }
  }));
}

export function registerStatusEffects(config = globalThis.CONFIG) {
  if (!config) return [];
  const existing = Array.from(config.statusEffects ?? []);
  const existingIds = new Set(existing.map((entry) => entry.id));
  const additions = foundryStatusEffects().filter((entry) => !existingIds.has(entry.id));
  config.statusEffects = [...existing, ...additions];
  return additions;
}

function effect(key, label, category, icon, { stackable = false, max = 1 } = {}) {
  return Object.freeze({ key, label, category, icon, stackable, max });
}

function statusIds(key) {
  return key === "dead" ? ["dead", "hrpg.dead"] : [`hrpg.${key}`];
}
