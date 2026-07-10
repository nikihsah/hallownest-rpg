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
  assert.match(source, /this\.activeTab = tab/);
  assert.match(source, /activateActorSheetTab\(this\.element, activeTab\)/);
  assert.match(source, /this\.sheetScrollTop = sheetBody\.scrollTop/);
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
  const sheet = await readFile(sheetUrl, "utf8");
  assert.match(template, /class="resource-stat-grid"/);
  assert.match(template, /class="load-summary \{\{#if loadSummary\.over\}\}overloaded\{\{\/if\}\}"/);
  assert.match(template, /HRPG\.CarriedWeight/);
  assert.match(template, /HRPG\.LoadMaximum/);
  assert.match(sheet, /context\.loadSummary/);
  assert.match(sheet, /system\.derived\.carriedWeight/);
  assert.match(sheet, /system\.derived\.load/);
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
  assert.match(hud, /preparedTechniques\(actor\.items\)/);
  assert.match(hud, /techniques\.map\(\(technique\) => techniqueButton\(actor, technique\)\)/);
  assert.match(hud, /techniqueSummary\(technique\)/);
  assert.match(hud, /promptTechniqueUseOptions\(technique\)/);
  assert.match(hud, /actor\.useTechnique\(technique\.id, options\)/);
  assert.match(hud, /HRPG\.VariableStamina/);
  assert.match(hud, /attack\.itemType/);
  assert.match(hud, /attack\.range/);
  assert.match(hud, /availablePathAttackOptions\(actor, attack\)/);
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
  assert.match(hud, /promptDefenseActionOptions\(actor, action\)/);
  assert.match(hud, /actor\.rollDefenseAction\(action\.key, options\)/);
  assert.match(hud, /HRPG\.StaminaCost/);
  assert.match(hud, /dodgeAttributeOptions\(actor\)/);
  assert.match(hud, /parryAttributeOptions\(actor\)/);
  assert.match(hud, /traits\.prygayushchiy/);
  assert.match(hud, /itemPassiveEffects\(actor\.items\)\.defenseStaminaPenalty/);
  assert.match(hud, /staminaCost: 1 \+ armorPenalty/);
  assert.match(hud, /itemPromptEffects\(actor\.items, "attack", \{ itemId: attack\.itemId \}\)/);
  assert.match(hud, /traitPromptEffects\(actor\.items, "attack", \{ itemId: attack\.itemId \}\)/);
  assert.match(hud, /traitConditionalOptions\(actor, "attack", \{ itemId: attack\.itemId \}\)/);
  assert.match(hud, /itemPromptEffects\(actor\.items, trigger\)/);
  assert.match(hud, /HRPG\.ItemEffects/);
  assert.match(hud, /HRPG\.TraitEffects/);
  assert.match(hud, /HRPG\.ConditionalTraitOptions/);
  assert.match(hud, /traitOptionInputs\(traitOptions\)/);
  assert.match(hud, /charms\.general\.spryatannaya-strekoza/);
  assert.match(hud, /charms\.combat\.prygayushchiy-kon/);
  assert.match(hud, /charms\.combat\.kradushchiysya-pauk/);
  assert.match(hud, /HRPG\.DefenseAttribute/);
  assert.match(hud, /staminaCost: Number\(data\.get\("staminaCost"\)\) \|\| 0/);
  assert.match(hud, /makeDraggable\(hud\)/);
  assert.doesNotMatch(styles, /writing-mode/);
  assert.match(styles, /text-overflow: ellipsis/);
  assert.match(styles, /\.hrpg-quick-hud-tabs button \{[^}]*display: block/s);
  assert.match(styles, /\[data-hrpg-attack-list\] button, \.hrpg-quick-hud \[data-hrpg-action-list\] button \{[^}]*gap: \.48rem/s);
  assert.match(styles, /\.hrpg-defense-dialog \{[^}]*background: rgba\(242,238,226,\.96\)/s);
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
  assert.match(itemSheet, /activateListeners\(html\)/);
  assert.match(itemSheet, /element\.scrollTop = this\.sheetScrollTop/);
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
  assert.match(schema, /"traits": \{ "max": 7 \}/);
  assert.match(schema, /"quality": \{ "value": 0, "max": 0 \}/);
});

test("actor sheet opens item catalogs and toggles equipment", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const itemTemplate = await readFile(new URL("../templates/item/item-sheet.hbs", import.meta.url), "utf8");

  assert.match(sheet, /import \{ ItemCatalogApplication \}/);
  assert.match(sheet, /new ItemCatalogApplication\(this\.actor/);
  assert.match(sheet, /\["weapon", "armor", "charm", "gear", "consumable", "art", "spell"\]\.includes\(type\)/);
  assert.match(sheet, /data-item-equipped/);
  assert.match(sheet, /"system\.equipped": event\.currentTarget\.checked/);
  assert.match(template, /data-item-equipped="\{\{item\.id\}\}"/);
  assert.match(template, /HRPG\.Equipped/);
  assert.match(itemTemplate, /name="system\.itemType"/);
  assert.match(itemTemplate, /name="system\.quality\.value"/);
  assert.match(itemTemplate, /name="system\.damageReduction"/);
  assert.match(itemTemplate, /name="system\.notches"/);
  assert.match(itemTemplate, /name="system\.uses\.value"/);
  assert.match(itemTemplate, /name="system\.modification"/);
  assert.match(itemTemplate, /selectedItemModification/);
  assert.match(itemTemplate, /item-raw-text/);
  assert.match(itemTemplate, /item-description-editor/);
  assert.match(itemTemplate, /name="system\.description"/);
  assert.match(itemTemplate, /HRPG\.ItemDescriptionHint/);
  assert.doesNotMatch(itemTemplate, /\{\{editor system\.description/);
});

test("paths and traits can be removed from the actor sheet", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  assert.equal((template.match(/data-action="delete-item"/g) ?? []).length, 6);
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
  assert.match(actor, /rollDefenseAction\(actionKey, \{ bonusDice = 0, staminaCost = 0, attribute = "", traitOptions = \[\], techniqueOptions = \[\] \} = \{\}\)/);
  assert.match(actor, /await this\.spendCombatStamina\(staminaCost \+ techniqueCost\.stamina\)/);
  assert.match(actor, /dodge: \{ label: "HRPG\.Dodge", attribute: "grace" \}/);
  assert.match(actor, /parry: \{ label: "HRPG\.Parry", attribute: "power" \}/);
  assert.match(actor, /absorption: \{ label: "HRPG\.DamageAbsorption", attribute: "shell" \}/);
  assert.match(actor, /rollAttributeDefense\(attributeKey, \{ label, bonusDice = 0, notes = \[\] \} = \{\}\)/);
  assert.match(actor, /Math\.floor\(value\) \+ Math\.floor\(Number\(bonusDice\) \|\| 0\)/);
  assert.match(actor, /rollAbsorption\(attributeKey = "shell", options = \{\}\)/);
  assert.match(actor, /itemPassiveEffects\(this\.items\)/);
  assert.match(actor, /itemDefenseBonus\(this, actionKey\)/);
  assert.match(actor, /applyTraitConditionalOptions\(traitConditionalOptions\(this, actionKey\), traitOptions\)/);
  assert.match(actor, /traitPromptNotes\(this\.items, \[actionKey\]\)/);
  assert.match(actor, /itemPromptNotes\(this\.items, defensePromptTriggers\(actionKey\)\)/);
  assert.match(actor, /itemPromptNotes\(this\.items, \["attack"\], \{ itemId \}\)/);
  assert.match(actor, /selectedItemModificationEffects\(item\)/);
  assert.match(actor, /modificationNotes\(modificationEffects\)/);
  assert.match(actor, /selectedTechniqueCost\(this, techniqueOptions, actionKey\)/);
  assert.match(actor, /techniqueNotesFromIds\(this, techniqueOptions, "attack"/);
  assert.match(actor, /useTechnique\(itemId/);
  assert.match(actor, /extraCost = \{\}/);
  assert.match(actor, /addTechniqueCosts\(techniqueCostFromItem\(item\), extraCost\)/);
  assert.match(actor, /attackTaxReduction/);
  assert.match(actor, /itemEffects\.modifiers/);
  assert.match(actor, /pathSupplyBonus\(path\.system\?\.sourceId, rank\)/);
  assert.match(actor, /pathAppealBonus\(path\.system\?\.sourceId, rank\)/);
  assert.match(actor, /itemEffectNotes\(this\.system\.effective\?\.itemEffects/);
  assert.match(actor, /effective\?\.attributes\?\.\[attributeKey\]\?\.value/);
  assert.match(actor, /HRPG\.DefenseRoll/);
  assert.match(actor, /reroll: value % 1 >= 0\.5/);
  assert.match(actor, /naturalWeaponQualityValue\(item\)/);
  assert.match(actor, /spendAttackStamina\(\{ invested = 0, taxAsDice = false \} = \{\}\)/);
  assert.match(actor, /const base = 1/);
  assert.match(actor, /"system\.combat\.attackTax": rawTax \+ 1/);
  assert.match(actor, /baseAttackConfig\(this, item\)/);
  assert.match(actor, /equipment\.magic-focus\.palochka/);
  assert.match(actor, /HRPG\.MagicFocusInsightAttack/);
  assert.match(actor, /function defensePromptTriggers\(actionKey\)/);
  assert.match(actor, /applyPathAttackOptions\(\{ attribute: baseAttack\.attribute, successThreshold: 5 \}, pathOptions\)/);
  assert.match(actor, /paths\.needle/);
  assert.match(actor, /HRPG\.NeedlePathWeaponGrace/);
  assert.match(actor, /dice: Math\.floor\(value\) \+ quality \+ stamina\.dice \+ attackOptions\.bonusDice \+ traitAdjustment\.bonusDice \+ \(Number\(modificationEffects\?\.attackBonusDice\) \|\| 0\)/);
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

test("long item and catalog descriptions scroll inside their panels", async () => {
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

  assert.match(styles, /\.hrpg\.sheet\.item form \{[^}]*overflow: auto/s);
  assert.match(styles, /\.trait-choice details, \.item-choice details \{[^}]*max-height: 9rem/s);
  assert.match(styles, /\.trait-choice details, \.item-choice details \{[^}]*overflow-y: auto/s);
  assert.match(styles, /\.hrpg \.path-ranks \{[^}]*max-height: 22rem/s);
  assert.match(styles, /\.hrpg \.path-ranks \{[^}]*overflow-y: auto/s);
});
