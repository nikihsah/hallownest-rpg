import { buildSizeTemplateUpdate } from "../mechanics/size-templates.js";

export async function migrateAttributeMaximums() {
  if (!game.user.isGM) return;

  for (const actor of game.actors.filter((entry) => entry.type === "bug")) {
    if (actor.getFlag("hallownest-rpg", "attributeMaximumsMigrated")) continue;
    const size = actor.system.secondary?.size ?? "medium";
    const template = buildSizeTemplateUpdate(size);
    await actor.update({
      "system.attributes.power.max": template["system.attributes.power.max"],
      "system.attributes.insight.max": template["system.attributes.insight.max"],
      "system.attributes.shell.max": template["system.attributes.shell.max"],
      "system.attributes.grace.max": template["system.attributes.grace.max"],
      "flags.hallownest-rpg.attributeMaximumsMigrated": true
    });
  }
}
