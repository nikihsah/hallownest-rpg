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
  assert.match(source, /window: \{ resizable: true \}/);
});

test("actor sheet exposes the character milestone selector", async () => {
  const template = await readFile(templateUrl, "utf8");
  assert.match(template, /name="system\.advancement\.milestone"/);
});

test("actor sheet portrait opens an image picker", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");
  assert.match(template, /class="profile-img"/);
  assert.match(template, /data-action="choose-portrait"/);
  assert.match(template, /data-actor-portrait role="button" tabindex="0"/);
  assert.match(sheet, /new FilePicker\(\{/);
  assert.match(sheet, /type: "image"/);
  assert.match(sheet, /actor\.update\(\{ img: path \}\)/);
  assert.match(styles, /\.hrpg \.profile-img \{[^}]*cursor: pointer/s);
});

test("header exposes heart soul and stamina with temporary hit points", async () => {
  const template = await readFile(templateUrl, "utf8");
  const schema = await readFile(new URL("../template.json", import.meta.url), "utf8");
  const header = template.slice(template.indexOf('<header class="sheet-header'), template.indexOf("</header>"));
  assert.match(header, /class="core-resource-table"/);
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
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");
  assert.doesNotMatch(template, /class="quick-attacks"/);
  assert.doesNotMatch(sheet, /roll-trait-attack/);
  assert.match(main, /registerQuickAttacksHud\(\)/);
  assert.match(hud, /Hooks\.on\("controlToken", refreshQuickAttacksHud\)/);
  assert.match(hud, /quickAttacksFromItems\(actor\.items\)/);
  assert.match(hud, /unlockedPathAttackOptions\(actor\)/);
  assert.match(hud, /promptAttackOptions\(actor, attack\)/);
  assert.match(hud, /actor\.rollTraitAttack\(attack\.itemId, options\)/);
  assert.match(hud, /HRPG\.InvestedStamina/);
  assert.match(hud, /HRPG\.AttackTaxHint/);
  assert.match(hud, /HRPG\.PathAbilities/);
  assert.match(hud, /data-hrpg-tab="attacks"/);
  assert.match(hud, /HRPG\.InteractionSkills/);
  assert.doesNotMatch(hud, /HRPG\.DicePoolValue/);
  assert.match(hud, /data-hrpg-tab="stats"/);
  assert.match(hud, /data-hrpg-tab="actions"/);
  assert.match(hud, /data-hrpg-action-list/);
  assert.match(hud, /HRPG\.Actions/);
  assert.match(hud, /actor\.rollAttribute\(key\)/);
  assert.match(hud, /speed: "HRPG\.Speed"/);
  assert.match(hud, /appeal: "HRPG\.Appeal"/);
  assert.match(hud, /dread: "HRPG\.Dread"/);
  assert.match(hud, /actor\.rollSecondary\(key\)/);
  assert.match(hud, /defenseActionButtons\(actor\)/);
  assert.match(hud, /HRPG\.DefenseAction/);
  assert.match(hud, /HRPG\.Dodge/);
  assert.match(hud, /HRPG\.Parry/);
  assert.match(hud, /HRPG\.DamageAbsorption/);
  assert.match(hud, /promptDefenseActionOptions\(action\)/);
  assert.match(hud, /actor\.rollDefenseAction\(action\.key, options\)/);
  assert.match(hud, /HRPG\.StaminaCost/);
  assert.match(hud, /staminaCost: Number\(data\.get\("staminaCost"\)\) \|\| 0/);
  assert.match(hud, /makeDraggable\(hud\)/);
  assert.doesNotMatch(styles, /writing-mode/);
  assert.match(styles, /text-overflow: ellipsis/);
  assert.match(styles, /\.hrpg-quick-hud-tabs button \{[^}]*display: block/s);
  assert.match(styles, /\[data-hrpg-attack-list\] button \{[^}]*gap: \.38rem/s);
});

test("path sheet hides inventory metadata and selects ranks from one to three", async () => {
  const template = await readFile(new URL("../templates/item/item-sheet.hbs", import.meta.url), "utf8");
  const actorTemplate = await readFile(templateUrl, "utf8");
  const itemSheet = await readFile(new URL("../module/sheets/item-sheet.js", import.meta.url), "utf8");
  assert.match(template, /\{\{#unless \(eq item\.type "path"\)\}\}<label>\{\{localize "HRPG\.Quantity"\}\}/);
  assert.match(template, /<select name="system\.rank">\{\{selectOptions pathRankOptions selected=system\.rank\}\}<\/select>/);
  assert.match(actorTemplate, /\{\{path\.name\}\} - \{\{localize path\.categoryLabel\}\}/);
  assert.doesNotMatch(actorTemplate, /вЂ”/);
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
  assert.doesNotMatch(traitBranch, /<select/);
  assert.match(traitBranch, /traitQualityEditable/);
  assert.match(traitBranch, /name="system\.quality\.value"/);
  assert.match(traitBranch, /name="system\.quality\.max"/);
  assert.doesNotMatch(traitBranch, /name="system\.(?!quality\.)/);
  assert.match(itemSheet, /traitModifierRows/);
  assert.match(itemSheet, /isNaturalWeaponTrait\(context\.item\)/);
  assert.match(itemSheet, /context\.system = context\.item\.system \?\? \{\}/);
});

test("actor traits tab tracks trait limit and natural weapon quality", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const schema = await readFile(new URL("../template.json", import.meta.url), "utf8");
  assert.match(template, /traitCounter\.current/);
  assert.match(template, /name="system\.traits\.max"/);
  assert.match(template, /data-trait-quality="\{\{trait\.id\}\}"/);
  assert.match(template, /data-trait-quality-max="\{\{trait\.id\}\}"/);
  assert.match(sheet, /ordinaryTraits = \(context\.itemsByType\.trait \?\? \[\]\)\.filter/);
  assert.match(sheet, /kind !== "subtrait"/);
  assert.match(sheet, /isNaturalWeaponTrait\(trait\)/);
  assert.match(sheet, /data-trait-quality/);
  assert.match(sheet, /"system\.quality\.value"/);
  assert.match(schema, /"traits": \{ "max": 10 \}/);
  assert.match(schema, /"quality": \{ "value": 0, "max": 0 \}/);
});

test("paths and traits can be removed from the actor sheet", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  assert.equal((template.match(/data-action="delete-item"/g) ?? []).length, 2);
  assert.match(template, /&times;/);
  assert.doesNotMatch(template, /Г—/);
  assert.match(sheet, /"delete-item": deleteItemAction/);
  assert.match(sheet, /deleteEmbeddedDocuments\("Item", ids\)/);
  assert.match(sheet, /candidate\.system\.parentItemId \? candidate\.system\.parentItemId === item\.id : true/);
});

test("embedded items open even when clicking nested row content", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  assert.match(template, /data-open-item-id="\{\{trait\.id\}\}"/);
  assert.match(template, /role="button" tabindex="0"/);
  assert.match(sheet, /target\.closest\("\[data-open-item-id\]"\)\?\.dataset\.openItemId/);
  assert.match(sheet, /addEventListener\("click"/);
  assert.match(sheet, /addEventListener\("keydown"/);
  assert.match(sheet, /renderDocumentSheet\(actor\.items\.get\(itemId\)\)/);
});

test("secondary tooltips omit visible values and hunger shows the template limit", async () => {
  const sheet = await readFile(sheetUrl, "utf8");
  assert.match(sheet, /key === "hunger"/);
  assert.match(sheet, /HRPG\.TemplateHungerLimit/);
  assert.match(sheet, /system\.secondary\.hunger\.max/);
  assert.doesNotMatch(sheet, /HRPG\.SatietyThreshold/);
  assert.doesNotMatch(sheet, /system\.resources\.satiety\.max/);
  assert.doesNotMatch(sheet, /HRPG\.PermanentValue"\)\}: \$\{permanent\}/);
  assert.doesNotMatch(sheet, /HRPG\.CurrentValue"\)\}: \$\{current\}/);
});

test("actor document exposes defensive action rolls", async () => {
  const actor = await readFile(new URL("../module/documents/actor.js", import.meta.url), "utf8");
  assert.match(actor, /spendCombatStamina\(cost = 0\)/);
  assert.match(actor, /"system\.resources\.stamina\.value": next/);
  assert.match(actor, /HRPG\.StaminaExceeded/);
  assert.match(actor, /rollDefenseAction\(actionKey, \{ bonusDice = 0, staminaCost = 0 \} = \{\}\)/);
  assert.match(actor, /await this\.spendCombatStamina\(staminaCost\)/);
  assert.match(actor, /dodge: \{ label: "HRPG\.Dodge", attribute: "grace" \}/);
  assert.match(actor, /parry: \{ label: "HRPG\.Parry", attribute: "power" \}/);
  assert.match(actor, /absorption: \{ label: "HRPG\.DamageAbsorption", attribute: "shell" \}/);
  assert.match(actor, /rollAttributeDefense\(attributeKey, \{ label, bonusDice = 0 \} = \{\}\)/);
  assert.match(actor, /Math\.floor\(value\) \+ Math\.floor\(Number\(bonusDice\) \|\| 0\)/);
  assert.match(actor, /rollAbsorption\(attributeKey = "shell", options = \{\}\)/);
  assert.match(actor, /effective\?\.attributes\?\.\[attributeKey\]\?\.value/);
  assert.match(actor, /HRPG\.DefenseRoll/);
  assert.match(actor, /reroll: value % 1 >= 0\.5/);
  assert.match(actor, /naturalWeaponQualityValue\(item\)/);
  assert.match(actor, /spendAttackStamina\(\{ invested = 0, taxAsDice = false \} = \{\}\)/);
  assert.match(actor, /"system\.combat\.attackTax": tax \+ 1/);
  assert.match(actor, /applyPathAttackOptions\(\{ attribute: "power", successThreshold: 5 \}, pathOptions\)/);
  assert.match(actor, /dice: Math\.floor\(value\) \+ quality \+ stamina\.dice \+ attackOptions\.bonusDice/);
  assert.match(actor, /successThreshold: attackOptions\.successThreshold/);
});

test("combat movement highlights Speed overage instead of warning", async () => {
  const combat = await readFile(new URL("../module/mechanics/combat.js", import.meta.url), "utf8");
  assert.match(combat, /movementOverageCells/);
  assert.match(combat, /highlightSpeedOverage\(options\.hrpgMovementOverageCells\)/);
  assert.match(combat, /SPEED_OVERAGE_LAYER/);
  assert.match(combat, /color: 0xb82020/);
  assert.doesNotMatch(combat, /ui\.notifications\.warn\(game\.i18n\.localize\("HRPG\.SpeedExceeded"\)\)/);
});
