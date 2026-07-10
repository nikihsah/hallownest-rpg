export const HRPG_STATUS_EFFECTS = Object.freeze([
  effect("imbalance", "HRPG.Status.Imbalance", "combat", statusIcon("imbalance"), { stackable: true, max: 3 }),
  effect("dead", "HRPG.Status.Dead", "survival", statusIcon("dead")),
  effect("starving", "HRPG.Status.Starving", "survival", statusIcon("starving")),
  effect("focused", "HRPG.Status.Focused", "combat", statusIcon("focused")),
  effect("prepared-action", "HRPG.Status.PreparedAction", "combat", statusIcon("prepared-action")),
  effect("delayed-turn", "HRPG.Status.DelayedTurn", "combat", statusIcon("delayed-turn")),
  effect("grappled", "HRPG.Status.Grappled", "combat", statusIcon("grappled")),
  effect("immobilized", "HRPG.Status.Immobilized", "combat", statusIcon("immobilized")),
  effect("hidden", "HRPG.Status.Hidden", "combat", statusIcon("hidden")),
  effect("wet", "HRPG.Status.Wet", "environment", statusIcon("wet")),
  effect("dry", "HRPG.Status.Dry", "environment", statusIcon("dry")),
  effect("burning", "HRPG.Status.Burning", "damage", statusIcon("burning"), { stackable: true }),
  effect("delayed-damage", "HRPG.Status.DelayedDamage", "damage", statusIcon("delayed-damage"), { stackable: true }),
  effect("poisoned", "HRPG.Status.Poisoned", "damage", statusIcon("poisoned"), { stackable: true }),
  effect("acid", "HRPG.Status.Acid", "damage", statusIcon("acid"), { stackable: true }),
  effect("rust", "HRPG.Status.Rust", "damage", statusIcon("rust"), { stackable: true }),
  effect("armor-damaged", "HRPG.Status.ArmorDamaged", "gear", statusIcon("armor-damaged"), { stackable: true }),
  effect("equipment-worn", "HRPG.Status.EquipmentWorn", "gear", statusIcon("equipment-worn"), { stackable: true }),
  effect("attribute-damage", "HRPG.Status.AttributeDamage", "debuff", statusIcon("attribute-damage"), { stackable: true }),
  effect("resource-damage", "HRPG.Status.ResourceDamage", "debuff", statusIcon("resource-damage"), { stackable: true }),
  effect("speed-penalty", "HRPG.Status.SpeedPenalty", "debuff", statusIcon("speed-penalty"), { stackable: true }),
  effect("stamina-max-penalty", "HRPG.Status.StaminaMaxPenalty", "debuff", statusIcon("stamina-max-penalty"), { stackable: true }),
  effect("attack-defense-penalty", "HRPG.Status.AttackDefensePenalty", "debuff", statusIcon("attack-defense-penalty"), { stackable: true }),
  effect("sense-blocked", "HRPG.Status.SenseBlocked", "senses", statusIcon("sense-blocked"), { stackable: true }),
  effect("smoke-cloud", "HRPG.Status.SmokeCloud", "environment", statusIcon("smoke-cloud")),
  effect("greased", "HRPG.Status.Greased", "environment", statusIcon("greased")),
  effect("glued", "HRPG.Status.Glued", "environment", statusIcon("glued"), { stackable: true }),
  effect("pheromones", "HRPG.Status.Pheromones", "social", statusIcon("pheromones")),
  effect("charmed", "HRPG.Status.Charmed", "social", statusIcon("charmed")),
  effect("panicked", "HRPG.Status.Panicked", "social", statusIcon("panicked")),
  effect("unconscious", "HRPG.Status.Unconscious", "survival", statusIcon("unconscious")),
  effect("enraged", "HRPG.Status.Enraged", "social", statusIcon("enraged")),
  effect("lifeblood", "HRPG.Status.Lifeblood", "resource", statusIcon("lifeblood"), { stackable: true }),
  effect("soul-damage", "HRPG.Status.SoulDamage", "resource", statusIcon("soul-damage"), { stackable: true }),
  effect("charged-fireflies", "HRPG.Status.ChargedFireflies", "environment", statusIcon("charged-fireflies")),
  effect("summoned-creature", "HRPG.Status.SummonedCreature", "summon", statusIcon("summoned-creature")),
  effect("shell-puppet", "HRPG.Status.ShellPuppet", "summon", statusIcon("shell-puppet"))
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

function statusIcon(key) {
  return `systems/hallownest-rpg/assets/icons/status/${key}.svg`;
}

function statusIds(key) {
  return key === "dead" ? ["dead", "hrpg.dead"] : [`hrpg.${key}`];
}
