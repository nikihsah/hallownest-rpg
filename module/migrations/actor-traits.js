/** Convert the short-lived 0.2.0 actor trait array into embedded Item documents. */
export async function migrateActorTraits() {
  if (!game.user.isGM) return;

  let migrated = 0;
  for (const actor of game.actors) {
    const traits = actor.system.traits;
    if (!Array.isArray(traits) || traits.length === 0) continue;

    const itemData = traits.map((trait) => ({
      name: trait.name || game.i18n.localize("HRPG.NewTrait"),
      type: "trait",
      system: {
        kind: trait.kind === "subtrait" ? "subtrait" : "trait",
        description: trait.description || "",
        parentTrait: "",
        sourceId: ""
      }
    }));

    await actor.createEmbeddedDocuments("Item", itemData);
    await actor.update({ "system.-=traits": null });
    migrated += itemData.length;
  }

  if (migrated > 0) {
    ui.notifications.info(game.i18n.format("HRPG.TraitsMigrated", { count: migrated }));
  }
}
