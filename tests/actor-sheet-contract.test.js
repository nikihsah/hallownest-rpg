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
  assert.match(template, /\{\{#unless isMasterBug\}\}<a class="item" data-action="select-tab" data-tab="skills"/);
  assert.match(template, /\{\{#unless isMasterBug\}\}<div class="tab skills"/);
});

test("actor sheet uses the Foundry V2 application framework", async () => {
  const source = await readFile(sheetUrl, "utf8");
  const main = await readFile(new URL("../module/main.js", import.meta.url), "utf8");
  const actor = await readFile(new URL("../module/documents/actor.js", import.meta.url), "utf8");
  const system = JSON.parse(await readFile(new URL("../system.json", import.meta.url), "utf8"));
  const schema = JSON.parse(await readFile(new URL("../template.json", import.meta.url), "utf8"));
  const ru = JSON.parse(await readFile(new URL("../lang/ru.json", import.meta.url), "utf8"));

  assert.match(source, /HandlebarsApplicationMixin\(ActorSheetV2\)/);
  assert.doesNotMatch(source, /extends ActorSheet\s*\{/);
  assert.match(source, /"apply-size": applySizeAction/);
  assert.match(source, /window: \{ resizable: true \}/);
  assert.match(source, /this\.activeTab = tab/);
  assert.match(source, /context\.isMasterBug = this\.actor\.type === "gmBug"/);
  assert.match(source, /context\.isMasterBug && this\.activeTab === "skills"/);
  assert.match(source, /activateActorSheetTab\(this\.element, activeTab\)/);
  assert.match(source, /this\.sheetScrollTop = sheetBody\.scrollTop/);
  assert.match(main, /types: \["bug", "gmBug"\]/);
  assert.match(actor, /\["bug", "gmBug"\]\.includes\(type\)/);
  assert.equal(system.documentTypes.Actor.gmBug !== undefined, true);
  assert.equal(schema.Actor.types.includes("gmBug"), true);
  assert.equal(ru["TYPES.Actor.gmBug"], "Жук мастера");
});

test("actor sheet exposes the character milestone selector", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");
  assert.match(template, /name="system\.advancement\.milestone"/);
  assert.match(template, /data-milestone-select/);
  assert.match(template, /data-current-milestone="\{\{system\.advancement\.milestone\}\}"/);
  assert.match(sheet, /function milestoneChanged/);
  assert.match(sheet, /showMilestoneAdvanceDialog\(next\)/);
  assert.match(sheet, /HRPG\.MinorAdvancementWeaponModification/);
  assert.match(styles, /\.hrpg-milestone-dialog/);
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
  assert.match(schema, /"geo": 0/);
  assert.match(header, /name="system\.resources\.geo"/);
  assert.match(header, /HRPG\.Geo/);
  assert.match(schema, /"combat": \{ "speedSpent": 0, "attackTax": 0, "imbalance": 0 \}/);
  assert.doesNotMatch(header, /name="system\.combat\.imbalance"/);
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

test("overview exposes HRPG status effect controls", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

  assert.match(template, /class="panel status-panel"/);
  assert.match(template, /data-status-select/);
  assert.match(template, /data-status-value/);
  assert.match(template, /data-action="apply-status"/);
  assert.match(template, /data-action="remove-status"/);
  assert.match(sheet, /HRPG_STATUS_EFFECTS/);
  assert.match(sheet, /setHrpgStatusEffect\(this\.actor, key, value\)/);
  assert.match(sheet, /setHrpgStatusEffect\(this\.actor, target\.dataset\.statusKey, 0\)/);
  assert.match(sheet, /activeHrpgStatuses\(this\.actor\)/);
  assert.match(styles, /\.hrpg \.status-panel/);
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
  assert.match(main, /registerTokenStatusEffectAutomation\(\)/);
  assert.match(hud, /Hooks\.on\("controlToken", refreshQuickAttacksHud\)/);
  assert.match(hud, /quickAttacksFromItems\(actor\.items\)/);
  assert.match(hud, /preparedTechniques\(actor\.items\)/);
  assert.match(hud, /equippedFlasks\(actor\.items\)/);
  assert.match(hud, /techniques\.map\(\(technique\) => techniqueButton\(actor, technique\)\)/);
  assert.match(hud, /flasks\.map\(\(flask\) => flaskButton\(actor, flask\)\)/);
  assert.match(hud, /techniqueSummary\(technique\)/);
  assert.match(hud, /promptTechniqueUseOptions\(technique\)/);
  assert.match(hud, /actor\.useTechnique\(technique\.id, options\)/);
  assert.match(hud, /promptFlaskThrowOptions\(actor, flask\)/);
  assert.match(hud, /actor\.rollFlask\(flask\.id, options\)/);
  assert.match(hud, /flaskAttackContext\(flask\.item\)/);
  assert.match(hud, /hasPath\(actor, "paths\.vial", 1\)/);
  assert.match(hud, /HRPG\.ThrowFlask/);
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
  assert.match(hud, /skillTotals\(actor\.items\)/);
  assert.match(hud, /skillButtons\(actor\)/);
  assert.match(hud, /actor\.rollSkill\(entry\.name\)/);
  assert.match(hud, /defenseActionButtons\(actor\)/);
  assert.match(hud, /combatUtilityActionButtons\(actor\)/);
  assert.match(hud, /HRPG\.DefenseAction/);
  assert.match(hud, /HRPG\.Dodge/);
  assert.match(hud, /HRPG\.Parry/);
  assert.match(hud, /HRPG\.DamageAbsorption/);
  assert.match(hud, /promptDefenseActionOptions\(actor, action\)/);
  assert.match(hud, /actor\.rollDefenseAction\(action\.key, options\)/);
  assert.match(hud, /HRPG\.StaminaCost/);
  assert.match(hud, /HRPG\.OpportunityAttack/);
  assert.match(hud, /HRPG\.Retreat/);
  assert.match(hud, /HRPG\.DashJump/);
  assert.match(hud, /HRPG\.Grapple/);
  assert.match(hud, /HRPG\.EscapeGrapple/);
  assert.match(hud, /HRPG\.SkillAction/);
  assert.match(hud, /HRPG\.MinorAction/);
  assert.match(hud, /HRPG\.ReadyAction/);
  assert.match(hud, /HRPG\.DelayTurn/);
  assert.match(hud, /HRPG\.FocusSoul/);
  assert.match(hud, /HRPG\.DamageCalculator/);
  assert.match(hud, /promptCombatActionOptions\(action\)/);
  assert.match(hud, /actor\.useCombatAction\(action\.key, options\)/);
  assert.match(hud, /SCROLL_DIALOG_FORM_STYLE/);
  assert.match(hud, /scrollDialogWindow\(game\.i18n\.format\("HRPG\.AttackDialogTitle"/);
  assert.match(hud, /position: scrollDialogPosition\(\)/);
  assert.match(hud, /return \{ title, resizable: true \}/);
  assert.match(hud, /height: Math\.min\(Math\.floor\(viewportHeight \* 0\.76\), 700\)/);
  assert.match(hud, /class="hrpg-attack-dialog" style="\$\{SCROLL_DIALOG_FORM_STYLE\}"/);
  assert.match(hud, /class="hrpg-defense-dialog" style="\$\{SCROLL_DIALOG_FORM_STYLE\}"/);
  assert.match(hud, /description: "HRPG\.FocusSoulDescription"/);
  assert.match(hud, /actionDescriptionMarkup\(action\)/);
  assert.match(hud, /HRPG\.ActionDescription/);
  assert.match(hud, /damageCalculatorFields\(\)/);
  assert.match(hud, /focusSoulFields\(\)/);
  assert.match(hud, /name="dodgeMove"/);
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
  assert.match(styles, /\.hrpg-defense-dialog \.hrpg-inline-check/);
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
  assert.match(traitBranch, /<select name="system\.modification">/);
  assert.match(traitBranch, /traitQualityEditable/);
  assert.match(traitBranch, /name="system\.quality\.value"/);
  assert.match(traitBranch, /name="system\.quality\.max"/);
  assert.match(traitBranch, /name="system\.modification"/);
  assert.match(traitBranch, /trait-modification-description/);
  assert.match(traitBranch, /fluidVialEffectEditable/);
  assert.match(traitBranch, /name="system\.vialEffect\.sourceId"/);
  assert.doesNotMatch(traitBranch, /name="system\.(?!quality\.|modification"|vialEffect\.sourceId")/);
  assert.match(itemSheet, /traitModifierRows/);
  assert.match(itemSheet, /isNaturalWeaponTrait\(context\.item\)/);
  assert.match(itemSheet, /isFluidsSubtrait\(context\.item\)/);
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
  assert.match(sheet, /ordinaryTraitKeys = new Set/);
  assert.match(sheet, /current: ordinaryTraitKeys\.size/);
  assert.match(sheet, /kind !== "subtrait"/);
  assert.match(sheet, /isNaturalWeaponTrait\(trait\)/);
  assert.match(sheet, /data-trait-quality/);
  assert.match(sheet, /"system\.quality\.value"/);
  assert.match(schema, /"traits": \{ "max": 7 \}/);
  assert.match(schema, /"quality": \{ "value": 0, "max": 0 \}/);
});

test("actor charms tab tracks equipped charm mark usage", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

  assert.match(template, /class="panel charm-slots-panel \{\{#if charmSlots\.over\}\}overloaded\{\{\/if\}\}"/);
  assert.match(template, /HRPG\.CharmMarks/);
  assert.match(template, /charmSlots\.used/);
  assert.match(template, /charmSlots\.maximum/);
  assert.match(template, /charmSlots\.remaining/);
  assert.match(template, /charmSlots\.overage/);
  assert.match(template, /\{\{#each charmRows as \|item\|\}\}/);
  assert.match(sheet, /context\.charmRows/);
  assert.match(sheet, /equippedCharmRows/);
  assert.match(sheet, /usedCharmMarks/);
  assert.match(sheet, /maximumCharmMarks/);
  assert.match(sheet, /HRPG\.CharmMarksUsed/);
  assert.match(styles, /\.hrpg \.charm-slots-panel \{/);
  assert.match(styles, /\.hrpg \.charm-slots-panel\.overloaded/);
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
  assert.match(itemTemplate, /HRPG\.ItemDescription/);
  assert.match(itemTemplate, /name="system\.description"/);
  assert.match(itemTemplate, /HRPG\.ItemDescriptionHint/);
  assert.doesNotMatch(itemTemplate, /\{\{editor system\.description/);
  assert.ok(itemTemplate.indexOf("item-description-editor") < itemTemplate.indexOf('class="item-properties"'));
});

test("paths and traits can be removed from the actor sheet", async () => {
  const template = await readFile(templateUrl, "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  assert.equal((template.match(/data-action="delete-item"/g) ?? []).length, 7);
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
  assert.match(actor, /spendSpeed\(cost = 0\)/);
  assert.match(actor, /spendSoul\(cost = 0\)/);
  assert.match(actor, /addImbalance\(amount = 1\)/);
  assert.match(actor, /setHrpgStatusEffect\(this, "imbalance", next\)/);
  assert.match(actor, /activeEffectDiceModifier\(this, "attribute"\)/);
  assert.doesNotMatch(actor, /item\.type === "condition"/);
  assert.match(actor, /useCombatAction\(actionKey, options = \{\}\)/);
  assert.match(actor, /focusSoul\(\{ soulCost = 1, note = "" \} = \{\}\)/);
  assert.match(actor, /postDamageCalculation\(options = \{\}\)/);
  assert.match(actor, /expectedDamage\(options\)/);
  assert.match(actor, /rollAttributeCheck\(attributeKey/);
  assert.match(actor, /rollSkill\(skillName\)/);
  assert.match(actor, /skillTotal\(this\.items, skillName\)/);
  assert.match(actor, /HRPG\.SkillRoll/);
  assert.match(actor, /rollFlask\(itemId/);
  assert.match(actor, /isFlaskItem\(item\)/);
  assert.match(actor, /flaskUses\(item\)/);
  assert.match(actor, /item\.update\(spendFlaskUseUpdate\(item\)\)/);
  assert.match(actor, /HRPG\.FlaskThrowRoll/);
  assert.match(actor, /HRPG\.FlaskUseSpent/);
  assert.match(actor, /"system\.resources\.stamina\.value": next/);
  assert.match(actor, /HRPG\.StaminaExceeded/);
  assert.match(actor, /rollDefenseAction\(actionKey, \{ bonusDice = 0, staminaCost = 0, attribute = "", traitOptions = \[\], techniqueOptions = \[\], dodgeMove = false \} = \{\}\)/);
  assert.match(actor, /await this\.spendCombatStamina\(staminaCost \+ techniqueCost\.stamina\)/);
  assert.match(actor, /actionKey === "dodge" && dodgeMove/);
  assert.match(actor, /HRPG\.DodgeMoveImbalance/);
  assert.match(actor, /dodge: \{ label: "HRPG\.Dodge", attribute: "grace" \}/);
  assert.match(actor, /parry: \{ label: "HRPG\.Parry", attribute: "power" \}/);
  assert.match(actor, /absorption: \{ label: "HRPG\.DamageAbsorption", attribute: "shell" \}/);
  assert.match(actor, /rollAttributeDefense\(attributeKey, \{ label, bonusDice = 0, notes = \[\] \} = \{\}\)/);
  assert.match(actor, /Math\.floor\(value\) \+ Math\.floor\(Number\(bonusDice\) \|\| 0\)/);
  assert.match(actor, /rollAbsorption\(attributeKey = "shell", options = \{\}\)/);
  assert.match(actor, /itemAbsorptionBonus\(this\)/);
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
  assert.match(actor, /naturalWeaponAttackQualityValue\(item, modificationEffects\)/);
  assert.match(actor, /selectedItemModificationEffects\(item\)/);
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

test("states are not exposed as an Item document type", async () => {
  const system = JSON.parse(await readFile(new URL("../system.json", import.meta.url), "utf8"));
  const schema = JSON.parse(await readFile(new URL("../template.json", import.meta.url), "utf8"));
  const config = await readFile(new URL("../module/config.js", import.meta.url), "utf8");
  const ru = JSON.parse(await readFile(new URL("../lang/ru.json", import.meta.url), "utf8"));
  const en = JSON.parse(await readFile(new URL("../lang/en.json", import.meta.url), "utf8"));

  assert.equal(system.documentTypes.Item.condition, undefined);
  assert.equal(schema.Item.types.includes("condition"), false);
  assert.equal(schema.Item.condition, undefined);
  assert.doesNotMatch(config, /ItemCondition|condition:\s*"HRPG\.ItemCondition"/);
  assert.equal(ru["TYPES.Item.condition"], undefined);
  assert.equal(en["TYPES.Item.condition"], undefined);
  assert.equal(ru["HRPG.ItemCondition"], undefined);
  assert.equal(en["HRPG.ItemCondition"], undefined);
});

test("skill items expose four skill names and aggregate roll buttons", async () => {
  const template = await readFile(templateUrl, "utf8");
  const itemTemplate = await readFile(new URL("../templates/item/item-sheet.hbs", import.meta.url), "utf8");
  const sheet = await readFile(sheetUrl, "utf8");
  const itemSheet = await readFile(new URL("../module/sheets/item-sheet.js", import.meta.url), "utf8");
  const schema = await readFile(new URL("../template.json", import.meta.url), "utf8");
  const styles = await readFile(new URL("../styles/system.css", import.meta.url), "utf8");

  assert.match(schema, /"skill": \{[\s\S]*"skills": \[/);
  assert.equal((schema.match(/\{ "name": "" \}/g) ?? []).length >= 4, true);
  assert.match(template, /skillItemRows/);
  assert.match(template, /name="items\.\{\{skill\.id\}\}\.name"/);
  assert.match(template, /name="items\.\{\{skill\.id\}\}\.system\.rank"/);
  assert.match(template, /name="items\.\{\{skill\.id\}\}\.system\.mastery"/);
  assert.match(template, /data-skill-item-name="\{\{skill\.id\}\}"/);
  assert.match(template, /data-skill-rank="\{\{skill\.id\}\}"/);
  assert.match(template, /data-skill-mastery="\{\{skill\.id\}\}"/);
  assert.match(template, /name="items\.\{\{\.\.\/id\}\}\.system\.skills\.\{\{row\.key\}\}\.name"/);
  assert.match(template, /data-skill-slot="\{\{\.\.\/id\}\}"/);
  assert.match(template, /data-skill-slot-index="\{\{row\.key\}\}"/);
  assert.match(template, /data-action="roll-skill"/);
  assert.match(template, /data-skill-name="\{\{row\.name\}\}"/);
  assert.match(template, /row\.total/);
  assert.match(template, /HRPG\.MasteryShort/);
  assert.match(sheet, /skillTotals\(this\.actor\.items\)/);
  assert.match(sheet, /skillRowsForItem\(item\)/);
  assert.match(sheet, /updateSkillItemName/);
  assert.match(sheet, /updateSkillRank/);
  assert.match(sheet, /updateSkillMastery/);
  assert.match(sheet, /updateSkillSlot/);
  assert.match(sheet, /updateEmbeddedItem\(sheet\.actor, item\.id, skillSlotUpdateData\(item, input\.dataset\.skillSlotIndex, input\.value\)\)/);
  assert.match(sheet, /_processFormData\(event, form, formData\)/);
  assert.match(sheet, /inlineSkillItemUpdates\(this\.actor, expanded\.items\)/);
  assert.match(sheet, /_processSubmitData\(event, form, formData\)/);
  assert.match(sheet, /updateEmbeddedDocuments\("Item", this\._pendingInlineItemUpdates\)/);
  assert.doesNotMatch(sheet, /addEventListener\("input", queueSkillSlotUpdate/);
  assert.match(sheet, /input\.addEventListener\("focusout", updateSkillSlot\.bind\(this\)\)/);
  assert.match(sheet, /event\.stopImmediatePropagation\(\)/);
  assert.match(sheet, /"roll-skill": rollSkillAction/);
  assert.match(itemTemplate, /class="skill-editor"/);
  assert.match(itemTemplate, /name="system\.skills\.\{\{row\.key\}\}\.name"/);
  assert.match(itemTemplate, /name="system\.mastery"/);
  assert.match(itemSheet, /context\.skillRows = skillRowsForItem\(context\.item\)/);
  assert.match(styles, /\.hrpg \.skill-card/);
  assert.match(styles, /\.hrpg \.skill-editor/);
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
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\)[^}]*max-height: calc\(100vh - 2rem\) !important/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\)[^}]*resize: both/s);
  assert.match(styles, /\.dialog:has\(\.hrpg-attack-dialog\)/);
  assert.match(styles, /\.window-app:has\(\.hrpg-attack-dialog\)/);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.window-content[^}]*max-height: calc\(100vh - 4rem\)/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.window-content[^}]*overflow-y: scroll !important/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.window-content[^}]*overscroll-behavior: contain/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.dialog-content[^}]*display: flex/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.dialog-content[^}]*flex: 1 1 auto/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.dialog-content[^}]*overflow-y: visible/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.dialog-buttons[^}]*flex: 0 0 auto/s);
  assert.match(styles, /\.application:has\(\.hrpg-attack-dialog\) \.dialog-buttons[^}]*position: sticky/s);
  assert.match(styles, /\.hrpg-attack-dialog \{[^}]*height: min\(32rem, calc\(100vh - 12rem\)\)/s);
  assert.match(styles, /\.hrpg-attack-dialog \{[^}]*max-height: min\(32rem, calc\(100vh - 12rem\)\)/s);
  assert.match(styles, /\.hrpg-attack-dialog \{[^}]*overflow-y: scroll !important/s);
  assert.match(styles, /\.hrpg-attack-dialog \{[^}]*overscroll-behavior: contain/s);
  assert.match(styles, /\.hrpg-defense-dialog \{[^}]*height: min\(32rem, calc\(100vh - 12rem\)\)/s);
  assert.match(styles, /\.hrpg-defense-dialog \{[^}]*max-height: min\(32rem, calc\(100vh - 12rem\)\)/s);
  assert.match(styles, /\.hrpg-defense-dialog \{[^}]*overflow-y: scroll !important/s);
  assert.match(styles, /\.hrpg \.notes-panel \{[^}]*min-height: 34rem/s);
  assert.match(styles, /\.hrpg \.notes-panel textarea \{[^}]*min-height: 28rem/s);
});
