import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { groupTraits, repeatLimitForTrait, traitItemData } from "../module/data/trait-catalog.js";

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

test("repeatable traits remain available until their limit", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const hauler = traits.find((trait) => trait.sourceId === "traits.zhuk-tyagach");
  const awkward = traits.find((trait) => trait.sourceId === "traits.neuklyuzhiy");
  const projectile = traits.find((trait) => trait.sourceId === "traits.natural-projectile");
  assert.equal(repeatLimitForTrait(hauler), 3);
  assert.equal(repeatLimitForTrait(awkward), 2);
  assert.equal(repeatLimitForTrait(projectile), 99);

  const once = groupTraits([hauler], new Set([hauler.sourceId]), new Map([[hauler.sourceId, 1]])).flatMap((group) => group.traits)[0];
  const capped = groupTraits([hauler], new Set([hauler.sourceId]), new Map([[hauler.sourceId, 3]])).flatMap((group) => group.traits)[0];
  const projectileOnce = groupTraits([projectile], new Set([projectile.sourceId]), new Map([[projectile.sourceId, 1]])).flatMap((group) => group.traits)[0];
  assert.equal(once.owned, false);
  assert.equal(once.repeatable, true);
  assert.equal(once.repeatLimitLabel, "3");
  assert.equal(capped.owned, true);
  assert.equal(projectileOnce.owned, false);
  assert.equal(projectileOnce.repeatable, true);
  assert.equal(projectileOnce.repeatLimitLabel, "∞");
});

test("trait catalog action respects repeat limits and small-only traits", async () => {
  const source = await readFile(new URL("../module/applications/trait-catalog.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /ownedCount >= 1 \|\| \(trait\.kind !== "subtrait"/);
  assert.match(source, /trait\.sourceId === "traits\.krokha"/);
  assert.match(source, /system\.secondary\?\.size !== "small"/);
  assert.match(source, /HRPG\.TraitRequiresSmallSize/);
});

test("repeatable parent subtraits stay available per parent instance", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const heavyShot = traits.find((trait) => trait.sourceId === "traits.natural-projectile.heavy-shot");
  const parentChoices = new Map([[heavyShot.parentTrait, [
    { id: "projectile-a", label: "Projectile #1" },
    { id: "projectile-b", label: "Projectile #2" }
  ]]]);
  const groups = groupTraits([heavyShot], new Set([heavyShot.parentTrait, heavyShot.sourceId]), new Map([[heavyShot.sourceId, 1]]), parentChoices);
  const entry = groups.flatMap((group) => group.traits)[0];

  assert.equal(entry.parentMissing, false);
  assert.equal(entry.owned, false);
  assert.equal(entry.repeatable, true);
  assert.equal(entry.repeatLimit, 2);
  assert.deepEqual(entry.parentChoices, parentChoices.get(heavyShot.parentTrait));
});

test("trait item data can bind subtraits to one parent item", async () => {
  const traits = JSON.parse(await readFile(catalogUrl, "utf8"));
  const heavyShot = traits.find((trait) => trait.sourceId === "traits.natural-projectile.heavy-shot");
  const item = traitItemData(heavyShot, { parentItemId: "projectile-a" });

  assert.equal(item.system.parentTrait, heavyShot.parentTrait);
  assert.equal(item.system.parentItemId, "projectile-a");
});

test("trait catalog template renders as one V2 application root element", async () => {
  const template = await readFile(new URL("../templates/applications/trait-catalog.hbs", import.meta.url), "utf8");
  assert.match(template.trimStart(), /^<div class="trait-catalog-root">/);
  assert.match(template, /data-parent-choice/);
});

test("trait catalog keeps names readable and long costs inside cards", async () => {
  const template = await readFile(new URL("../templates/applications/trait-catalog.hbs", import.meta.url), "utf8");
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");
  assert.match(template, /class="trait-choice-cost"/);
  assert.match(template, /trait\.repeatLimitLabel/);
  assert.match(styles, /\.trait-choice h3 \{[^}]*color: #111415/s);
  assert.match(styles, /\.trait-choice \.trait-choice-cost \{[^}]*overflow-wrap: anywhere/s);
});
