import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { foundryStatusEffects, HRPG_STATUS_EFFECTS, registerStatusEffects } from "../module/data/status-effects.js";

test("system status effect catalog covers combat damage environment and resource states", () => {
  const keys = new Set(HRPG_STATUS_EFFECTS.map((effect) => effect.key));
  for (const key of [
    "imbalance",
    "dead",
    "starving",
    "grappled",
    "immobilized",
    "burning",
    "poisoned",
    "acid",
    "attribute-damage",
    "resource-damage",
    "sense-blocked",
    "smoke-cloud",
    "glued",
    "lifeblood",
    "soul-damage"
  ]) {
    assert.equal(keys.has(key), true, `${key} should be registered`);
  }
});

test("status effects are exposed in Foundry status effect shape without duplicates", () => {
  const foundryEffects = foundryStatusEffects();
  assert.ok(foundryEffects.every((effect) => effect.id.startsWith("hrpg.")));
  assert.ok(foundryEffects.every((effect) => effect.flags["hallownest-rpg"].statusKey));
  assert.deepEqual(foundryEffects.find((effect) => effect.id === "hrpg.dead").statuses, ["dead", "hrpg.dead"]);

  const config = { statusEffects: [{ id: "hrpg.imbalance", name: "Existing" }] };
  const additions = registerStatusEffects(config);
  assert.equal(additions.some((effect) => effect.id === "hrpg.imbalance"), false);
  assert.equal(config.statusEffects.filter((effect) => effect.id === "hrpg.imbalance").length, 1);
  assert.equal(config.statusEffects.some((effect) => effect.id === "hrpg.dead"), true);
});

test("status effect icons use local svg assets", async () => {
  for (const effect of HRPG_STATUS_EFFECTS) {
    assert.match(effect.icon, /^systems\/hallownest-rpg\/assets\/icons\/status\/.+\.svg$/u);
    const relativePath = effect.icon.replace("systems/hallownest-rpg/", "../");
    await access(new URL(relativePath, import.meta.url));
  }
});
