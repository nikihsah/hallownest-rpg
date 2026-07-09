import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { catalogItemData, customItemData, groupCatalogItems } from "../module/data/item-catalog.js";

const catalogUrl = new URL("../data/items.json", import.meta.url);

test("item catalog imports HK-Kit equipment and charms by game-facing type", async () => {
  const items = JSON.parse(await readFile(catalogUrl, "utf8"));
  const counts = Object.groupBy(items, (item) => item.type);

  assert.equal(items.length, 266);
  assert.equal(counts.weapon.length, 33);
  assert.equal(counts.armor.length, 7);
  assert.equal(counts.charm.length, 116);
  assert.equal(counts.gear.length, 35);
  assert.equal(counts.consumable.length, 75);
  assert.equal(new Set(items.map((item) => item.sourceId)).size, items.length);
});

test("catalog item data preserves equipment fields for Foundry Items", async () => {
  const items = JSON.parse(await readFile(catalogUrl, "utf8"));
  const needle = items.find((item) => item.type === "weapon" && item.itemType === "игла");
  const armor = items.find((item) => item.type === "armor");
  const charm = items.find((item) => item.type === "charm");

  assert.equal(catalogItemData(needle).type, "weapon");
  assert.equal(catalogItemData(needle).system.modification, "");
  assert.equal(catalogItemData(needle).system.quality.value, 1);
  assert.equal(catalogItemData(needle).system.itemType, "игла");
  assert.equal(catalogItemData(armor).system.protection >= 0, true);
  assert.equal(catalogItemData(charm).system.notches >= 0, true);
});

test("item catalog grouping filters by type and marks owned source ids", async () => {
  const groups = groupCatalogItems([
    { sourceId: "items.needle", name: "Needle", type: "weapon", subtype: "weapon" },
    { sourceId: "items.armor", name: "Armor", type: "armor", subtype: "armor" }
  ], { type: "weapon", ownedSourceIds: new Set(["items.needle"]) });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, "weapon");
  assert.equal(groups[0].items[0].owned, true);
  assert.equal(groups[0].items[0].typeLabel, "HRPG.ItemWeapon");
});

test("custom item data creates editable blank items of the requested type", () => {
  const item = customItemData("weapon", "Custom Needle");

  assert.equal(item.type, "weapon");
  assert.equal(item.name, "Custom Needle");
  assert.equal(item.system.catalogType, "weapon");
  assert.equal(item.system.modification, "");
  assert.equal(item.system.equipped, false);
});

test("item catalog application template has a single root element", async () => {
  const template = await readFile(new URL("../templates/applications/item-catalog.hbs", import.meta.url), "utf8");
  const source = await readFile(new URL("../module/applications/item-catalog.js", import.meta.url), "utf8");

  assert.match(template.trimStart(), /^<div class="item-catalog-root">/);
  assert.match(template, /data-action="add-catalog-item"/);
  assert.match(template, /data-action="create-custom-item"/);
  assert.match(source, /class ItemCatalogApplication/);
  assert.match(source, /window: \{ title: "HRPG\.ItemCatalogTitle", resizable: true \}/);
});
