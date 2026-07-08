import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const templateUrl = new URL("../templates/actor/bug-sheet.hbs", import.meta.url);
const sheetUrl = new URL("../module/sheets/actor-sheet.js", import.meta.url);

test("creation screen exposes a stable template selector and apply action", async () => {
  const template = await readFile(templateUrl, "utf8");
  assert.match(template, /name="system\.secondary\.size" data-template-size/);
  assert.match(template, /button type="button" data-action="apply-size"/);
});

test("actor sheet keeps each major area in its own tab", async () => {
  const template = await readFile(templateUrl, "utf8");
  for (const tab of ["overview", "traits", "charms", "techniques", "skills", "inventory", "notes"]) {
    assert.match(template, new RegExp(`data-tab="${tab}"`));
  }
});

test("actor sheet uses the Foundry V2 application framework", async () => {
  const source = await readFile(sheetUrl, "utf8");
  assert.match(source, /HandlebarsApplicationMixin\(ActorSheetV2\)/);
  assert.doesNotMatch(source, /extends ActorSheet\s*\{/);
  assert.match(source, /"apply-size": applySizeAction/);
});

test("actor sheet exposes the character milestone selector", async () => {
  const template = await readFile(templateUrl, "utf8");
  assert.match(template, /name="system\.advancement\.milestone"/);
});

test("header exposes heart soul and stamina with temporary hit points", async () => {
  const template = await readFile(templateUrl, "utf8");
  const schema = await readFile(new URL("../template.json", import.meta.url), "utf8");
  const header = template.slice(template.indexOf('<header class="sheet-header'), template.indexOf("</header>"));
  for (const key of ["heart", "soul", "stamina"]) {
    assert.match(header, new RegExp(`name="system\\.resources\\.${key}\\.value"`));
    assert.match(header, new RegExp(`system\\.effective\\.resources\\.${key}\\.max`));
    assert.match(header, new RegExp(`name="system\\.resources\\.${key}\\.temp"`));
  }
  assert.match(schema, /"heart": \{ "value": 7, "max": 7, "temp": 0 \}/);
  assert.match(schema, /"soul": \{ "value": 3, "max": 3, "temp": 0 \}/);
  assert.match(schema, /"stamina": \{ "value": 3, "max": 3, "temp": 0 \}/);
});

test("secondary panel exposes three editable custom resources", async () => {
  const template = await readFile(templateUrl, "utf8");
  const schema = await readFile(new URL("../template.json", import.meta.url), "utf8");
  assert.match(template, /class="resource-stat-grid"/);
  for (const key of ["custom1", "custom2", "custom3"]) {
    assert.match(template, new RegExp(`name="system\\.resources\\.${key}\\.label"`));
    assert.match(template, new RegExp(`name="system\\.resources\\.${key}\\.value"`));
    assert.match(template, new RegExp(`name="system\\.resources\\.${key}\\.max"`));
    assert.match(schema, new RegExp(`"${key}": \\{ "label": "", "value": 0, "max": 0 \\}`));
  }
  const header = template.slice(template.indexOf('<header class="sheet-header'), template.indexOf("</header>"));
  assert.doesNotMatch(header, /system\.resources\.custom1/);
});

test("quick trait attacks are exposed through the selected-token HUD", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const main = await readFile(new URL("../module/main.js", import.meta.url), "utf8");
  const hud = await readFile(new URL("../module/applications/quick-attacks-hud.js", import.meta.url), "utf8");
  assert.doesNotMatch(template, /class="quick-attacks"/);
  assert.doesNotMatch(sheet, /roll-trait-attack/);
  assert.match(main, /registerQuickAttacksHud\(\)/);
  assert.match(hud, /Hooks\.on\("controlToken", refreshQuickAttacksHud\)/);
  assert.match(hud, /quickAttacksFromItems\(actor\.items\)/);
});

test("path sheet hides inventory metadata and selects ranks from one to three", async () => {
  const template = await readFile(new URL("../templates/item/item-sheet.hbs", import.meta.url), "utf8");
  const itemSheet = await readFile(new URL("../module/sheets/item-sheet.js", import.meta.url), "utf8");
  assert.match(template, /\{\{#unless \(eq item\.type "path"\)\}\}<label>\{\{localize "HRPG\.Quantity"\}\}/);
  assert.match(template, /<select name="system\.rank">\{\{selectOptions pathRankOptions selected=system\.rank\}\}<\/select>/);
  assert.match(itemSheet, /submitOnChange:\s*true/);
  const pathFields = template.match(/\{\{#if \(eq item\.type "path"\)\}\}([\s\S]*?)\{\{\/if\}\}/)?.[1] ?? "";
  assert.doesNotMatch(pathFields, /name="system\.sourceId"/);
});

test("trait item sheet is a readable reference page instead of editable fields", async () => {
  const template = await readFile(new URL("../templates/item/item-sheet.hbs", import.meta.url), "utf8");
  const itemSheet = await readFile(new URL("../module/sheets/item-sheet.js", import.meta.url), "utf8");
  const traitBranch = template.slice(
    template.indexOf('{{#if (eq item.type "trait")}}'),
    template.indexOf("  {{else}}\n  <header")
  );
  assert.match(traitBranch, /trait-readonly/);
  assert.match(traitBranch, /trait-description/);
  assert.match(traitBranch, /trait-modifier-pills/);
  assert.doesNotMatch(traitBranch, /<input/);
  assert.doesNotMatch(traitBranch, /<select/);
  assert.doesNotMatch(traitBranch, /name="system\./);
  assert.match(itemSheet, /traitModifierRows/);
});

test("paths and traits can be removed from the actor sheet", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  assert.equal((template.match(/data-action="delete-item"/g) ?? []).length, 2);
  assert.match(sheet, /"delete-item": deleteItemAction/);
  assert.match(sheet, /deleteEmbeddedDocuments\("Item", ids\)/);
});

test("embedded items open even when clicking nested row content", async () => {
  const sheet = await readFile(sheetUrl, "utf8");
  assert.match(sheet, /target\.closest\("\[data-item-id\]"\)\?\.dataset\.itemId/);
});
