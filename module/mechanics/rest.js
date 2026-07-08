export const SATIETY_BANDS = Object.freeze({
  FED: "fed",
  HUNGRY: "hungry",
  STARVING: "starving",
  DEAD: "dead"
});

export function satietyBand(satiety) {
  const value = Number(satiety) || 0;
  if (value < -100) return SATIETY_BANDS.DEAD;
  if (value <= -50) return SATIETY_BANDS.STARVING;
  if (value < 0) return SATIETY_BANDS.HUNGRY;
  return SATIETY_BANDS.FED;
}

export function restRecovery({ satiety, heart, heartMax, soulMax, attributes }) {
  const band = satietyBand(satiety);
  const update = {};

  if (band === SATIETY_BANDS.FED) {
    update.heart = Math.min(Number(heartMax) || 0, (Number(heart) || 0) + 1);
    update.soul = Number(soulMax) || 0;
    update.attributes = Object.fromEntries(Object.entries(attributes).map(([key, attribute]) => [
      key,
      Math.min(Number(attribute.max) || 0, (Number(attribute.value) || 0) + 1)
    ]));
  } else if (band === SATIETY_BANDS.HUNGRY || band === SATIETY_BANDS.STARVING) {
    update.soul = Math.ceil((Number(soulMax) || 0) / 2);
  }

  return { band, update };
}

const EFFECT_FLAG = "restState";

async function setStarvingEffect(actor, active) {
  const existing = actor.effects.find((effect) => effect.getFlag("hallownest-rpg", EFFECT_FLAG) === "starving");
  if (!active) return existing?.delete();
  if (existing) return existing;
  return actor.createEmbeddedDocuments("ActiveEffect", [{
    name: game.i18n.localize("HRPG.StarvingEffect"),
    img: "icons/svg/downgrade.svg",
    changes: ["power", "insight", "shell", "grace"].map((key) => ({
      key: `system.attributes.${key}.value`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -1, priority: 20
    })),
    flags: { "hallownest-rpg": { [EFFECT_FLAG]: "starving" } }
  }]);
}

async function setDeadEffect(actor) {
  const existing = actor.effects.find((effect) => effect.getFlag("hallownest-rpg", EFFECT_FLAG) === "dead");
  if (existing) return existing;
  return actor.createEmbeddedDocuments("ActiveEffect", [{
    name: game.i18n.localize("HRPG.DeadEffect"),
    img: "icons/svg/skull.svg",
    statuses: ["dead"],
    flags: { "hallownest-rpg": { [EFFECT_FLAG]: "dead" } }
  }]);
}

export async function restActor(actor) {
  const system = actor.system;
  const sourceAttributes = actor._source.system.attributes;
  const satiety = Number(system.resources.satiety.value) || 0;
  const result = restRecovery({
    satiety,
    heart: system.resources.heart.value,
    heartMax: system.effective.resources.heart.max,
    soulMax: system.effective.resources.soul.max,
    attributes: sourceAttributes
  });

  const update = {};
  if (result.update.heart !== undefined) update["system.resources.heart.value"] = result.update.heart;
  if (result.update.soul !== undefined) update["system.resources.soul.value"] = result.update.soul;
  for (const [key, value] of Object.entries(result.update.attributes ?? {})) {
    update[`system.attributes.${key}.value`] = value;
  }

  const hunger = (Number(system.effective.secondary.hunger) || 0) + (Number(system.adjustments?.hunger) || 0);
  const nextSatiety = satiety - Math.max(10, hunger);
  update["system.resources.satiety.value"] = nextSatiety;
  await actor.update(update);

  const nextBand = satietyBand(nextSatiety);
  await setStarvingEffect(actor, nextBand === SATIETY_BANDS.STARVING);
  if (nextBand === SATIETY_BANDS.DEAD) await setDeadEffect(actor);
  return { ...result, nextSatiety, nextBand };
}
