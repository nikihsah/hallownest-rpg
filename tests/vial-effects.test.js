import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fluidVialHungerModifier, isFluidsSubtrait, normalizeVialEffectSelection, vialEffectOptionsFromItems } from "../module/data/vial-effects.js";

const catalogUrl = new URL("../data/items.json", import.meta.url);

test("fluid subtrait can choose common and uncommon vial effects from the item catalog", async () => {
  const items = JSON.parse(await readFile(catalogUrl, "utf8"));
  const options = vialEffectOptionsFromItems(items);
  const sourceIds = new Set(options.map((option) => option.sourceId));

  assert.equal(sourceIds.has("equipment.flask.goryuchaya"), true);
  assert.equal(sourceIds.has("equipment.flask.kislotnaya"), true);
  assert.equal(sourceIds.has("equipment.flask.bite-vdovy"), false);
  assert.equal(sourceIds.has("equipment.flask.filosofskoe-yaytso"), false);
  assert.equal(options.find((option) => option.sourceId === "equipment.flask.goryuchaya").hungerCost, 0);
  assert.equal(options.find((option) => option.sourceId === "equipment.flask.kislotnaya").hungerCost, 2);
});

test("fluid vial selection stores the mechanical hunger cost", () => {
  const selected = normalizeVialEffectSelection({
    sourceId: "equipment.flask.kislotnaya",
    name: "Кислотная",
    rarity: "Необычная",
    hungerCost: 2,
    description: "test"
  });
  const fluids = { type: "trait", system: { sourceId: "traits.natural-projectile.fluids", vialEffect: selected } };

  assert.equal(isFluidsSubtrait(fluids), true);
  assert.equal(fluidVialHungerModifier(fluids), 2);
  assert.equal(fluidVialHungerModifier({ type: "trait", system: { sourceId: "traits.natural-projectile.spray", vialEffect: selected } }), 0);
});
