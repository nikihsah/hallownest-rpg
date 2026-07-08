import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { groupTraits, traitItemData } from "../module/data/trait-catalog.js";

const catalogUrl = new URL("../data/traits.json", import.meta.url);

test("HK-Kit trait catalog contains every trait and subtrait", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  assert.equal(traits.length, 133);
  assert.equal(traits.filter((trait) => trait.kind === "trait").length, 104);
  assert.equal(traits.filter((trait) => trait.kind === "subtrait").length, 29);
  assert.equal(new Set(traits.map((trait) => trait.sourceId)).size, traits.length);
  assert.equal(new Set(traits.map((trait) => trait.category)).size, 8);
  for (const trait of traits.filter((entry) => entry.kind === "subtrait")) {
    assert.ok(traits.some((parent) => parent.sourceId === trait.parentTrait), `${trait.name} needs its parent`);
  }
});

test("trait costs become automatic hunger and social modifiers", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const jaws = traits.find((trait) => trait.sourceId === "traits.drobyashchie-chelyusti");
  const item = traitItemData(jaws);
  assert.equal(item.system.modifiers.hunger, 1);
  assert.equal(item.system.modifiers.dread, 0.5);

  const secretions = traits.find((trait) => trait.sourceId === "traits.natural-secretions");
  assert.equal(traitItemData(secretions, { social: "appeal" }).system.modifiers.appeal, 0.5);
  assert.equal(traitItemData(secretions, { social: "appeal" }).system.modifiers.dread, 0);
});

test("subtraits are locked until their parent is owned", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const groups = groupTraits(traits, new Set());
  const hugeJaws = groups.flatMap((group) => group.traits).find((trait) => trait.sourceId.endsWith("huge-chelyusti"));
  assert.equal(hugeJaws.parentMissing, true);
  const ownedGroups = groupTraits(traits, new Set([hugeJaws.parentTrait]));
  assert.equal(ownedGroups.flatMap((group) => group.traits).find((trait) => trait.sourceId === hugeJaws.sourceId).parentMissing, false);
});

test("trait catalog template renders as one V2 application root element", async () => {
  const template = await readFile(new URL("../templates/applications/trait-catalog.hbs", import.meta.url), "utf8");
  assert.match(template.trimStart(), /^<div class="trait-catalog-root">/);
});

test("trait catalog keeps names readable and long costs inside cards", async () => {
  const template = await readFile(new URL("../templates/applications/trait-catalog.hbs", import.meta.url), "utf8");
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");
  assert.match(template, /class="trait-choice-cost"/);
  assert.match(styles, /\.trait-choice h3 \{[^}]*color: #111415/s);
  assert.match(styles, /\.trait-choice \.trait-choice-cost \{[^}]*overflow-wrap: anywhere/s);
});
