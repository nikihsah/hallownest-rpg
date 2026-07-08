export const BUG_TEMPLATES = Object.freeze({
  small: Object.freeze({ attributes: [2, 3, 3, 4], heart: 6, speed: 7, hunger: [-1, 15], appeal: 1.5, dread: 1, socialBonus: 1 }),
  medium: Object.freeze({ attributes: [3, 3, 3, 3], heart: 7, speed: 6, hunger: [4, 20], appeal: 1, dread: 1, socialBonus: 1.5 }),
  large: Object.freeze({ attributes: [4, 3, 4, 2], heart: 8, speed: 5, hunger: [9, 25], appeal: 1, dread: 1.5, socialBonus: 1 })
});

export function tokenDimensions(size) {
  return size === "large" ? { width: 2, height: 2 } : { width: 1, height: 1 };
}

export function buildSizeTemplateUpdate(size) {
  const selected = BUG_TEMPLATES[size];
  if (!selected) throw new Error(`Unknown size template: ${size}`);

  const [power, insight, shell, grace] = selected.attributes;
  const token = tokenDimensions(size);
  return {
    "system.attributes.power.value": power,
    "system.attributes.power.max": power,
    "system.attributes.insight.value": insight,
    "system.attributes.insight.max": insight,
    "system.attributes.shell.value": shell,
    "system.attributes.shell.max": shell,
    "system.attributes.grace.value": grace,
    "system.attributes.grace.max": grace,
    "system.resources.heart.value": selected.heart,
    "system.resources.heart.max": selected.heart,
    "system.resources.stamina.value": 3,
    "system.resources.stamina.max": 3,
    "system.resources.soul.value": 3,
    "system.resources.soul.max": 3,
    "system.secondary.size": size,
    "system.secondary.speed": selected.speed,
    "system.secondary.hunger.value": selected.hunger[0],
    "system.secondary.hunger.max": selected.hunger[1],
    "system.secondary.appeal": selected.appeal,
    "system.secondary.dread": selected.dread,
    "system.secondary.socialBonus": selected.socialBonus,
    "system.creation.templateApplied": true,
    "prototypeToken.width": token.width,
    "prototypeToken.height": token.height
  };
}

export async function applySizeTemplate(actor, size) {
  if (!actor || typeof actor.update !== "function") throw new TypeError("A Foundry Actor is required");
  const result = await actor.update(buildSizeTemplateUpdate(size));
  const dimensions = tokenDimensions(size);
  const activeTokens = typeof actor.getActiveTokens === "function" ? actor.getActiveTokens(true) : [];
  await Promise.all(activeTokens.map((token) => token.document.update(dimensions)));
  return result;
}
