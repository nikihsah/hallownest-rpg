import { HRPG } from "./config.js";
import { HallownestActor } from "./documents/actor.js";
import { HallownestItem } from "./documents/item.js";
import { HallownestActorSheet } from "./sheets/actor-sheet.js";
import { HallownestItemSheet } from "./sheets/item-sheet.js";
import { rollDicePool } from "./mechanics/dice-pool.js";
import { applySizeTemplate } from "./mechanics/size-templates.js";
import { migrateActorTraits } from "./migrations/actor-traits.js";

Hooks.once("init", () => {
  console.info("Hallownest RPG | Initializing");
  CONFIG.HRPG = HRPG;
  CONFIG.Actor.documentClass = HallownestActor;
  CONFIG.Item.documentClass = HallownestItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("hallownest-rpg", HallownestActorSheet, { types: ["bug"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("hallownest-rpg", HallownestItemSheet, { makeDefault: true });

  game.hrpg = { rollDicePool, applySizeTemplate };
});

Hooks.once("ready", migrateActorTraits);
