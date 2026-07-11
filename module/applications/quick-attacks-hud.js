import { quickAttacksFromItems } from "../mechanics/trait-attacks.js";
import { availablePathAttackOptions } from "../mechanics/path-abilities.js";
import { hasEquippedItem, itemPassiveEffects, itemPromptEffects } from "../mechanics/item-effects.js";
import { traitConditionalOptions, traitPromptEffects } from "../mechanics/trait-effects.js";
import { preparedTechniques, techniquePromptOptions, techniqueSummary } from "../mechanics/techniques.js";
import { skillBreakdown, skillTotals } from "../mechanics/skills.js";
import { equippedFlasks, flaskAttackContext } from "../mechanics/flasks.js";

const HUD_ID = "hrpg-quick-attacks-hud";
const SCROLL_DIALOG_FORM_STYLE = "height:100%; max-height:calc(86vh - 7rem); overflow-y:auto; overscroll-behavior:contain;";

export function registerQuickAttacksHud() {
  Hooks.on("controlToken", refreshQuickAttacksHud);
  Hooks.on("updateActor", refreshQuickAttacksHud);
  Hooks.on("createItem", refreshQuickAttacksHud);
  Hooks.on("updateItem", refreshQuickAttacksHud);
  Hooks.on("deleteItem", refreshQuickAttacksHud);
  Hooks.once("canvasReady", refreshQuickAttacksHud);
}

export function refreshQuickAttacksHud() {
  const actor = selectedBugActor();
  const attacks = actor ? quickAttacksFromItems(actor.items) : [];
  const techniques = actor ? preparedTechniques(actor.items) : [];
  const flasks = actor ? equippedFlasks(actor.items) : [];
  const existing = document.getElementById(HUD_ID);
  if (!actor) {
    existing?.remove();
    return;
  }

  const hud = existing ?? createHud();
  const skillActions = [
    ...attacks.map((attack) => attackButton(actor, attack)),
    ...techniques.map((technique) => techniqueButton(actor, technique)),
    ...flasks.map((flask) => flaskButton(actor, flask))
  ];
  hud.querySelector("[data-hrpg-attack-list]").replaceChildren(...(
    skillActions.length
      ? skillActions
      : [emptyState("HRPG.NoInteractionSkills")]
  ));
  hud.querySelector("[data-hrpg-stat-list]").replaceChildren(...attributeButtons(actor), ...secondaryButtons(actor), ...skillButtons(actor));
  hud.querySelector("[data-hrpg-action-list]").replaceChildren(...defenseActionButtons(actor), ...combatUtilityActionButtons(actor));
  hud.hidden = false;
}

function selectedBugActor() {
  const controlled = canvas?.tokens?.controlled ?? [];
  if (controlled.length !== 1) return null;
  const actor = controlled[0]?.actor;
  return ["bug", "gmBug"].includes(actor?.type) ? actor : null;
}

function scrollDialogWindow(title) {
  return { title, resizable: true };
}

function scrollDialogPosition() {
  const viewportHeight = Number(globalThis.window?.innerHeight) || 900;
  return {
    width: 640,
    height: Math.min(Math.floor(viewportHeight * 0.86), 780)
  };
}

function createHud() {
  const hud = document.createElement("aside");
  hud.id = HUD_ID;
  hud.className = "hrpg hrpg-quick-hud";
  hud.innerHTML = `
    <div class="hrpg-quick-hud-title" data-hrpg-hud-drag>
      <h2>${game.i18n.localize("HRPG.InteractionMenu")}</h2>
    </div>
    <div class="hrpg-quick-hud-body">
      <section class="hrpg-quick-page active" data-hrpg-page="attacks"><div data-hrpg-attack-list></div></section>
      <section class="hrpg-quick-page" data-hrpg-page="stats"><div data-hrpg-stat-list></div></section>
      <section class="hrpg-quick-page" data-hrpg-page="actions"><div data-hrpg-action-list></div></section>
      <nav class="hrpg-quick-hud-tabs" aria-label="${game.i18n.localize("HRPG.InteractionPages")}">
        <button type="button" class="active" data-hrpg-tab="attacks">${game.i18n.localize("HRPG.InteractionSkills")}</button>
        <button type="button" data-hrpg-tab="stats">${game.i18n.localize("HRPG.Attributes")}</button>
        <button type="button" data-hrpg-tab="actions">${game.i18n.localize("HRPG.Actions")}</button>
      </nav>
    </div>`;
  restoreHudPosition(hud);
  for (const tab of hud.querySelectorAll("[data-hrpg-tab]")) {
    tab.addEventListener("click", () => activatePage(hud, tab.dataset.hrpgTab));
  }
  makeDraggable(hud);
  document.body.append(hud);
  return hud;
}

function attackButton(actor, attack) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.itemId = attack.itemId;
  button.title = attack.tooltip;

  const name = document.createElement("span");
  name.textContent = attack.name;
  button.append(name);

  const details = document.createElement("small");
  details.textContent = [
    game.i18n.format("HRPG.QualityValue", { quality: attack.quality ?? 1 }),
    attack.damage ? game.i18n.format("HRPG.DamageValue", { damage: attack.damage }) : game.i18n.localize("HRPG.DamageUnspecified"),
    ...(attack.subtraits?.length ? [attack.subtraits.join(", ")] : [])
  ].join(" · ");
  if (attack.itemType || attack.range || attack.modification) {
    details.textContent = [
      ...(attack.itemType ? [attack.itemType] : []),
      game.i18n.format("HRPG.QualityValue", { quality: attack.quality ?? 1 }),
      attack.damage ? game.i18n.format("HRPG.DamageValue", { damage: attack.damage }) : game.i18n.localize("HRPG.DamageUnspecified"),
      ...(attack.range ? [attack.range] : []),
      ...(attack.modification ? [attack.modification] : []),
      ...(attack.subtraits?.length ? [attack.subtraits.join(", ")] : [])
    ].join(" · ");
  }
  button.append(details);

  button.addEventListener("click", async () => {
    const options = await promptAttackOptions(actor, attack);
    if (!options) return;
    await actor.rollTraitAttack(attack.itemId, options);
  });
  return button;
}

function techniqueButton(actor, technique) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.itemId = technique.id;
  button.title = techniqueSummary(technique);

  const name = document.createElement("span");
  name.textContent = technique.name;
  button.append(name);

  const details = document.createElement("small");
  details.textContent = [
    game.i18n.localize(technique.type === "spell" ? "HRPG.ItemSpell" : "HRPG.ItemArt"),
    technique.system?.cost?.raw,
    technique.system?.pathName
  ].filter(Boolean).join(" · ");
  button.append(details);

  button.addEventListener("click", async () => {
    const options = await promptTechniqueUseOptions(technique);
    if (!options) return;
    await actor.useTechnique(technique.id, options);
  });
  return button;
}

function flaskButton(actor, flask) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.itemId = flask.id;
  button.title = [game.i18n.localize("HRPG.ThrowFlask"), flask.effect].filter(Boolean).join("\n");
  button.disabled = !flask.canUse;

  const name = document.createElement("span");
  name.textContent = flask.name;
  button.append(name);

  const details = document.createElement("small");
  details.textContent = [
    game.i18n.localize("HRPG.ItemSubtype.flask"),
    game.i18n.format("HRPG.FlaskUsesValue", { value: flask.uses.value, max: flask.uses.max }),
    flask.rarity
  ].filter(Boolean).join(" · ");
  button.append(details);

  button.addEventListener("click", async () => {
    const options = await promptFlaskThrowOptions(actor, flask);
    if (!options) return;
    await actor.rollFlask(flask.id, options);
  });
  return button;
}

async function promptFlaskThrowOptions(actor, flask) {
  const attack = flaskAttackContext(flask.item);
  const pathOptions = availablePathAttackOptions(actor, attack);
  const attributes = flaskAttributeOptions(actor);
  const id = `hrpg-flask-${flask.id}-${foundry.utils.randomID()}`;
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.prompt) {
    return {
      attribute: window.prompt(game.i18n.localize("HRPG.ActionAttribute"), "grace") || "grace",
      investedStamina: Number(window.prompt(game.i18n.localize("HRPG.InvestedStamina"), "0")) || 0,
      pathOptions: []
    };
  }
  const buttons = pathOptions.map((option, index) => `
    <label class="hrpg-path-option">
      <input type="checkbox" name="pathOption" value="${index}">
      <span>${foundry.utils.escapeHTML(option.pathName)}: ${foundry.utils.escapeHTML(option.label)}</span>
      <small>${foundry.utils.escapeHTML(option.note)}</small>
    </label>`).join("");
  return DialogV2.prompt({
    window: scrollDialogWindow(game.i18n.format("HRPG.FlaskThrowDialogTitle", { name: flask.name })),
    position: scrollDialogPosition(),
    content: `
      <form id="${id}" class="hrpg-attack-dialog" style="${SCROLL_DIALOG_FORM_STYLE}">
        <p>${foundry.utils.escapeHTML(flask.effect || game.i18n.localize("HRPG.NoDescription"))}</p>
        <label>${game.i18n.localize("HRPG.ActionAttribute")}
          <select name="attribute">${attributes.map((option) => `<option value="${option.key}">${foundry.utils.escapeHTML(game.i18n.localize(option.label))}</option>`).join("")}</select>
        </label>
        <label>${game.i18n.localize("HRPG.InvestedStamina")}
          <input type="number" name="investedStamina" value="0" min="0" step="1">
        </label>
        <p>${game.i18n.format("HRPG.AttackTaxHint", { tax: Number(actor.system.combat?.attackTax) || 0 })}</p>
        ${buttons ? `<section><h3>${game.i18n.localize("HRPG.PathAbilities")}</h3>${buttons}</section>` : ""}
        <label>${game.i18n.localize("HRPG.Note")}
          <textarea name="note" rows="3"></textarea>
        </label>
      </form>`,
    ok: {
      label: game.i18n.localize("HRPG.ThrowFlask"),
      callback: (_event, button) => {
        const form = button?.form ?? document.getElementById(id);
        const data = new FormData(form);
        return {
          attribute: String(data.get("attribute") || "grace"),
          investedStamina: Number(data.get("investedStamina")) || 0,
          pathOptions: data.getAll("pathOption").map((value) => pathOptions[Number(value)]).filter(Boolean),
          note: String(data.get("note") || "")
        };
      }
    },
    rejectClose: false
  });
}

async function promptTechniqueUseOptions(technique) {
  const rawCost = String(technique.system?.cost?.raw ?? "");
  if (!/x\s*вынослив/i.test(rawCost)) return {};
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.prompt) {
    return { extraCost: { stamina: Number(window.prompt(game.i18n.localize("HRPG.VariableStamina"), "0")) || 0 } };
  }
  const id = `hrpg-technique-${technique.id}-${foundry.utils.randomID()}`;
  return DialogV2.prompt({
    window: scrollDialogWindow(technique.name),
    position: scrollDialogPosition(),
    content: `
      <form id="${id}" class="hrpg-attack-dialog" style="${SCROLL_DIALOG_FORM_STYLE}">
        <p>${foundry.utils.escapeHTML(rawCost)}</p>
        <label>${game.i18n.localize("HRPG.VariableStamina")}
          <input type="number" name="stamina" value="0" min="0" step="1">
        </label>
      </form>`,
    ok: {
      label: game.i18n.localize("HRPG.Use"),
      callback: (_event, button) => {
        const form = button?.form ?? document.getElementById(id);
        const data = new FormData(form);
        return { extraCost: { stamina: Math.max(0, Math.floor(Number(data.get("stamina")) || 0)) } };
      }
    },
    rejectClose: false
  });
}

async function promptAttackOptions(actor, attack) {
  const pathOptions = availablePathAttackOptions(actor, attack);
  const itemEffects = itemPromptEffects(actor.items, "attack", { itemId: attack.itemId });
  const traitEffects = traitPromptEffects(actor.items, "attack", { itemId: attack.itemId });
  const traitOptions = traitConditionalOptions(actor, "attack", { itemId: attack.itemId });
  const techniqueOptions = techniquePromptOptions(actor, "attack", { itemId: attack.itemId });
  const id = `hrpg-attack-${attack.itemId}-${foundry.utils.randomID()}`;
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.prompt) {
    return { investedStamina: Number(window.prompt(game.i18n.localize("HRPG.InvestedStamina"), "0")) || 0, pathOptions: [] };
  }
  const buttons = pathOptions.map((option, index) => `
    <label class="hrpg-path-option">
      <input type="checkbox" name="pathOption" value="${index}">
      <span>${foundry.utils.escapeHTML(option.pathName)}: ${foundry.utils.escapeHTML(option.label)}</span>
      <small>${foundry.utils.escapeHTML(option.note)}</small>
    </label>`).join("");
  return DialogV2.prompt({
    window: scrollDialogWindow(game.i18n.format("HRPG.AttackDialogTitle", { name: attack.name })),
    position: scrollDialogPosition(),
    content: `
      <form id="${id}" class="hrpg-attack-dialog" style="${SCROLL_DIALOG_FORM_STYLE}">
        <label>${game.i18n.localize("HRPG.InvestedStamina")}
          <input type="number" name="investedStamina" value="0" min="0" step="1">
        </label>
        <p>${game.i18n.format("HRPG.AttackTaxHint", { tax: Number(actor.system.combat?.attackTax) || 0 })}</p>
        ${buttons ? `<section><h3>${game.i18n.localize("HRPG.PathAbilities")}</h3>${buttons}</section>` : `<p>${game.i18n.localize("HRPG.NoPathAbilities")}</p>`}
        ${itemEffects.length ? `<section><h3>${game.i18n.localize("HRPG.ItemEffects")}</h3>${effectNotes(itemEffects)}</section>` : ""}
        ${techniqueOptions.length ? `<section><h3>${game.i18n.localize("HRPG.Techniques")}</h3>${techniqueOptionInputs(techniqueOptions)}</section>` : ""}
        ${traitEffects.length ? `<section><h3>${game.i18n.localize("HRPG.TraitEffects")}</h3>${effectNotes(traitEffects)}</section>` : ""}
        ${traitOptions.length ? `<section><h3>${game.i18n.localize("HRPG.ConditionalTraitOptions")}</h3>${traitOptionInputs(traitOptions)}</section>` : ""}
      </form>`,
    ok: {
      label: game.i18n.localize("HRPG.Roll"),
      callback: (_event, button) => {
        const form = button?.form ?? document.getElementById(id);
        const data = new FormData(form);
        return {
          investedStamina: Number(data.get("investedStamina")) || 0,
          pathOptions: data.getAll("pathOption").map((value) => pathOptions[Number(value)]).filter(Boolean),
          traitOptions: data.getAll("traitOption").map(String),
          techniqueOptions: data.getAll("techniqueOption").map(String)
        };
      }
    },
    rejectClose: false
  });
}

function attributeButtons(actor) {
  return Object.entries(CONFIG.HRPG.attributes).map(([key, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.title = game.i18n.localize(label);
    const name = document.createElement("span");
    name.textContent = game.i18n.localize(label);
    button.append(name);
    button.addEventListener("click", async () => actor.rollAttribute(key));
    return button;
  });
}

function secondaryButtons(actor) {
  const labels = { speed: "HRPG.Speed", appeal: "HRPG.Appeal", dread: "HRPG.Dread" };
  return Object.entries(labels).map(([key, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    const name = document.createElement("span");
    name.textContent = game.i18n.localize(label);
    button.title = game.i18n.localize(label);
    button.append(name);
    button.addEventListener("click", async () => actor.rollSecondary(key));
    return button;
  });
}

function skillButtons(actor) {
  const totals = skillTotals(actor.items);
  if (!totals.length) return [];
  const heading = document.createElement("h3");
  heading.className = "hrpg-quick-section-title";
  heading.textContent = game.i18n.localize("HRPG.Skills");
  return [heading, ...totals.map((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.title = skillBreakdown(entry, {
      totalLabel: game.i18n.localize("HRPG.Total"),
      masteryLabel: game.i18n.localize("HRPG.Mastery"),
      cappedLabel: game.i18n.localize("HRPG.SkillRankCap")
    });
    const name = document.createElement("span");
    name.textContent = entry.name;
    button.append(name);
    const details = document.createElement("small");
    details.textContent = entry.masteryBonus ? game.i18n.localize("HRPG.Mastery") : game.i18n.localize("HRPG.Skill");
    button.append(details);
    button.addEventListener("click", async () => actor.rollSkill(entry.name));
    return button;
  })];
}

function defenseActionButtons(actor) {
  const armorPenalty = Number(actor.system.effective?.itemEffects?.defenseStaminaPenalty) || itemPassiveEffects(actor.items).defenseStaminaPenalty;
  return [
    actionButton(actor, { key: "protection", label: "HRPG.DefenseAction", hint: "HRPG.DefenseActionHint", description: "HRPG.DefenseActionDescription", prompt: true, staminaCost: 1 }),
    actionButton(actor, { key: "dodge", label: "HRPG.Dodge", hint: "HRPG.DodgeHint", description: "HRPG.DodgeDescription", prompt: true, staminaCost: 1 + armorPenalty, attributes: dodgeAttributeOptions(actor) }),
    actionButton(actor, { key: "parry", label: "HRPG.Parry", hint: "HRPG.ParryHint", description: "HRPG.ParryDescription", prompt: true, staminaCost: 1 + armorPenalty, attributes: parryAttributeOptions(actor) }),
    actionButton(actor, { key: "absorption", label: "HRPG.DamageAbsorption", hint: "HRPG.DamageAbsorptionHint", description: "HRPG.DamageAbsorptionDescription", prompt: true, staminaCost: 0 })
  ];
}

function combatUtilityActionButtons(actor) {
  return [
    utilityActionButton(actor, { key: "opportunity-attack", label: "HRPG.OpportunityAttack", hint: "HRPG.OpportunityAttackHint", description: "HRPG.OpportunityAttackDescription", staminaCost: 1 }),
    utilityActionButton(actor, { key: "retreat", label: "HRPG.Retreat", hint: "HRPG.RetreatHint", description: "HRPG.RetreatDescription", staminaCost: 1, speedCost: 2 }),
    utilityActionButton(actor, { key: "dash-jump", label: "HRPG.DashJump", hint: "HRPG.DashJumpHint", description: "HRPG.DashJumpDescription", staminaCost: 1, speedCost: 0, speedEditable: true }),
    utilityActionButton(actor, { key: "grapple", label: "HRPG.Grapple", hint: "HRPG.GrappleHint", description: "HRPG.GrappleDescription", staminaCost: 1, roll: true, attributes: [{ key: "power", label: "HRPG.AttributePower" }] }),
    utilityActionButton(actor, { key: "escape-grapple", label: "HRPG.EscapeGrapple", hint: "HRPG.EscapeGrappleHint", description: "HRPG.EscapeGrappleDescription", staminaCost: 1, roll: true, attributes: [{ key: "power", label: "HRPG.AttributePower" }, { key: "grace", label: "HRPG.AttributeGrace" }] }),
    utilityActionButton(actor, { key: "skill-action", label: "HRPG.SkillAction", hint: "HRPG.SkillActionHint", description: "HRPG.SkillActionDescription", staminaCost: 1, roll: true, attributes: attributeOptions() }),
    utilityActionButton(actor, { key: "minor-action", label: "HRPG.MinorAction", hint: "HRPG.MinorActionHint", description: "HRPG.MinorActionDescription", staminaCost: 0, speedEditable: true }),
    utilityActionButton(actor, { key: "ready-action", label: "HRPG.ReadyAction", hint: "HRPG.ReadyActionHint", description: "HRPG.ReadyActionDescription", staminaCost: 1, note: true }),
    utilityActionButton(actor, { key: "delay-turn", label: "HRPG.DelayTurn", hint: "HRPG.DelayTurnHint", description: "HRPG.DelayTurnDescription", staminaCost: 0, note: true }),
    utilityActionButton(actor, { key: "focus-soul", label: "HRPG.FocusSoul", hint: "HRPG.FocusSoulHint", description: "HRPG.FocusSoulDescription", soul: true }),
    utilityActionButton(actor, { key: "damage-calculator", label: "HRPG.DamageCalculator", hint: "HRPG.DamageCalculatorHint", description: "HRPG.DamageCalculatorDescription", damage: true })
  ];
}

function actionButton(actor, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = actionTitle(action);
  const name = document.createElement("span");
  name.textContent = game.i18n.localize(action.label);
  const details = document.createElement("small");
  details.textContent = game.i18n.localize(action.hint);
  button.append(name);
  button.append(details);
  button.addEventListener("click", async () => {
    const options = action.prompt ? await promptDefenseActionOptions(actor, action) : { bonusDice: 0, staminaCost: action.staminaCost ?? 0 };
    if (!options) return;
    await actor.rollDefenseAction(action.key, options);
  });
  return button;
}

function utilityActionButton(actor, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = actionTitle(action);
  const name = document.createElement("span");
  name.textContent = game.i18n.localize(action.label);
  const details = document.createElement("small");
  details.textContent = game.i18n.localize(action.hint);
  button.append(name);
  button.append(details);
  button.addEventListener("click", async () => {
    const options = await promptCombatActionOptions(action);
    if (!options) return;
    await actor.useCombatAction(action.key, options);
  });
  return button;
}

async function promptCombatActionOptions(action) {
  const id = `hrpg-action-${action.key}-${foundry.utils.randomID()}`;
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.prompt) return {
    staminaCost: action.staminaCost ?? 0,
    speedCost: action.speedCost ?? 0,
    soulCost: action.soul ? Number(window.prompt(game.i18n.localize("HRPG.ResourceSoul"), "1")) || 1 : 0
  };
  return DialogV2.prompt({
    window: scrollDialogWindow(game.i18n.localize(action.label)),
    position: scrollDialogPosition(),
    content: `
      <form id="${id}" class="hrpg-defense-dialog" style="${SCROLL_DIALOG_FORM_STYLE}">
        <p>${foundry.utils.escapeHTML(game.i18n.localize(action.hint))}</p>
        ${actionDescriptionMarkup(action)}
        ${action.damage ? damageCalculatorFields() : action.soul ? focusSoulFields() : combatActionFields(action)}
      </form>`,
    ok: {
      label: action.damage ? game.i18n.localize("HRPG.Calculate") : game.i18n.localize("HRPG.Use"),
      callback: (_event, button) => {
        const form = button?.form ?? document.getElementById(id);
        const data = new FormData(form);
        if (action.damage) return {
          successes: Number(data.get("successes")) || 0,
          baseDamage: Number(data.get("baseDamage")) || 0,
          investedStamina: Number(data.get("investedStamina")) || 0,
          damageReduction: Number(data.get("damageReduction")) || 0,
          absorptionSuccesses: Number(data.get("absorptionSuccesses")) || 0,
          absorption: Number(data.get("absorption")) || 0,
          absorbable: data.get("absorbable") === "on"
        };
        if (action.soul) return {
          soulCost: Number(data.get("soulCost")) || 0,
          note: String(data.get("note") || "")
        };
        return {
          staminaCost: Number(data.get("staminaCost")) || 0,
          speedCost: Number(data.get("speedCost")) || 0,
          bonusDice: Number(data.get("bonusDice")) || 0,
          attribute: String(data.get("attribute") || ""),
          note: String(data.get("note") || "")
        };
      }
    },
    rejectClose: false
  });
}

async function promptDefenseActionOptions(actor, action) {
  const id = `hrpg-defense-${action.key}-${foundry.utils.randomID()}`;
  const effects = defensePromptEffects(actor, action.key);
  const traitEffects = traitPromptEffects(actor.items, action.key);
  const traitOptions = traitConditionalOptions(actor, action.key);
  const techniqueOptions = techniquePromptOptions(actor, action.key);
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.prompt) {
    return { bonusDice: Number(window.prompt(game.i18n.localize("HRPG.BonusDice"), "0")) || 0, staminaCost: action.staminaCost ?? 0 };
  }
  return DialogV2.prompt({
    window: scrollDialogWindow(game.i18n.localize(action.label)),
    position: scrollDialogPosition(),
    content: `
      <form id="${id}" class="hrpg-defense-dialog" style="${SCROLL_DIALOG_FORM_STYLE}">
        <p>${foundry.utils.escapeHTML(game.i18n.localize(action.hint))}</p>
        ${actionDescriptionMarkup(action)}
        ${action.attributes?.length ? `<label>${game.i18n.localize("HRPG.DefenseAttribute")}
          <select name="attribute">${action.attributes.map((option) => `<option value="${option.key}">${foundry.utils.escapeHTML(game.i18n.localize(option.label))}</option>`).join("")}</select>
        </label>` : ""}
        <label>${game.i18n.localize("HRPG.BonusDice")}
          <input type="number" name="bonusDice" value="0" step="1">
        </label>
        <label>${game.i18n.localize("HRPG.StaminaCost")}
          <input type="number" name="staminaCost" value="${action.staminaCost ?? 0}" min="0" step="1">
        </label>
        ${action.key === "dodge" ? `<label class="hrpg-inline-check"><input type="checkbox" name="dodgeMove"> ${game.i18n.localize("HRPG.DodgeMove")}</label>` : ""}
        ${effects.length ? `<section><h3>${game.i18n.localize("HRPG.ItemEffects")}</h3>${effectNotes(effects)}</section>` : ""}
        ${techniqueOptions.length ? `<section><h3>${game.i18n.localize("HRPG.Techniques")}</h3>${techniqueOptionInputs(techniqueOptions)}</section>` : ""}
        ${traitEffects.length ? `<section><h3>${game.i18n.localize("HRPG.TraitEffects")}</h3>${effectNotes(traitEffects)}</section>` : ""}
        ${traitOptions.length ? `<section><h3>${game.i18n.localize("HRPG.ConditionalTraitOptions")}</h3>${traitOptionInputs(traitOptions)}</section>` : ""}
      </form>`,
    ok: {
      label: game.i18n.localize("HRPG.Roll"),
      callback: (_event, button) => {
        const form = button?.form ?? document.getElementById(id);
        const data = new FormData(form);
        return {
          bonusDice: Number(data.get("bonusDice")) || 0,
          staminaCost: Number(data.get("staminaCost")) || 0,
          attribute: String(data.get("attribute") || ""),
          dodgeMove: data.get("dodgeMove") === "on",
          traitOptions: data.getAll("traitOption").map(String),
          techniqueOptions: data.getAll("techniqueOption").map(String)
        };
      }
    },
    rejectClose: false
  });
}

function combatActionFields(action) {
  return `
    <label>${game.i18n.localize("HRPG.StaminaCost")}
      <input type="number" name="staminaCost" value="${action.staminaCost ?? 0}" min="0" step="1">
    </label>
    ${(action.speedEditable || Number(action.speedCost)) ? `<label>${game.i18n.localize("HRPG.SpeedCost")}
      <input type="number" name="speedCost" value="${action.speedCost ?? 0}" min="0" step="1">
    </label>` : `<input type="hidden" name="speedCost" value="${action.speedCost ?? 0}">`}
    ${action.roll ? `<label>${game.i18n.localize("HRPG.ActionAttribute")}
      <select name="attribute">${(action.attributes ?? attributeOptions()).map((option) => `<option value="${option.key}">${foundry.utils.escapeHTML(game.i18n.localize(option.label))}</option>`).join("")}</select>
    </label>
    <label>${game.i18n.localize("HRPG.BonusDice")}
      <input type="number" name="bonusDice" value="0" step="1">
    </label>` : `<input type="hidden" name="attribute" value="">`}
    ${action.note ? `<label>${game.i18n.localize("HRPG.Note")}
      <textarea name="note" rows="3"></textarea>
    </label>` : `<input type="hidden" name="note" value="">`}`;
}

function focusSoulFields() {
  return `
    <label>${game.i18n.localize("HRPG.ResourceSoul")}
      <input type="number" name="soulCost" value="1" min="1" step="1">
    </label>
    <label>${game.i18n.localize("HRPG.Note")}
      <textarea name="note" rows="3"></textarea>
    </label>`;
}

function damageCalculatorFields() {
  return `
    <label>${game.i18n.localize("HRPG.AttackSuccesses")}
      <input type="number" name="successes" value="1" min="0" step="1">
    </label>
    <label>${game.i18n.localize("HRPG.BaseDamage")}
      <input type="number" name="baseDamage" value="1" min="0" step="1">
    </label>
    <label>${game.i18n.localize("HRPG.InvestedStamina")}
      <input type="number" name="investedStamina" value="0" min="0" step="1">
    </label>
    <label>${game.i18n.localize("HRPG.DamageReductionShort")}
      <input type="number" name="damageReduction" value="0" min="0" step="1">
    </label>
    <label>${game.i18n.localize("HRPG.AbsorptionSuccesses")}
      <input type="number" name="absorptionSuccesses" value="0" min="0" step="1">
    </label>
    <label>${game.i18n.localize("HRPG.AbsorptionPool")}
      <input type="number" name="absorption" value="0" min="0" step="1">
    </label>
    <label class="hrpg-inline-check"><input type="checkbox" name="absorbable" checked> ${game.i18n.localize("HRPG.AbsorbableDamage")}</label>`;
}

function actionTitle(action) {
  return [game.i18n.localize(action.hint), action.description ? game.i18n.localize(action.description) : ""]
    .filter(Boolean)
    .join("\n\n");
}

function actionDescriptionMarkup(action) {
  if (!action.description) return "";
  const text = game.i18n.localize(action.description);
  if (!text || text === action.description) return "";
  const paragraphs = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  return `<section class="hrpg-action-description">
    <h3>${game.i18n.localize("HRPG.ActionDescription")}</h3>
    ${paragraphs.map((line) => `<p>${foundry.utils.escapeHTML(line)}</p>`).join("")}
  </section>`;
}

function attributeOptions() {
  return [
    { key: "power", label: "HRPG.AttributePower" },
    { key: "insight", label: "HRPG.AttributeInsight" },
    { key: "shell", label: "HRPG.AttributeShell" },
    { key: "grace", label: "HRPG.AttributeGrace" },
    { key: "speed", label: "HRPG.Speed" },
    { key: "appeal", label: "HRPG.Appeal" },
    { key: "dread", label: "HRPG.Dread" }
  ];
}

function dodgeAttributeOptions(actor) {
  const options = [{ key: "grace", label: "HRPG.AttributeGrace" }];
  if (hasEquippedItem(actor.items, "charms.combat.prygayushchiy-kon")) {
    options.push({ key: "power", label: "HRPG.AttributePower" });
  }
  if (hasTrait(actor, "traits.prygayushchiy")
    || hasTrait(actor, "traits.jumping")
    || hasEquippedItem(actor.items, "charms.general.spryatannaya-strekoza")) {
    options.push({ key: "speed", label: "HRPG.Speed" });
  }
  return options;
}

function parryAttributeOptions(actor) {
  const options = [{ key: "power", label: "HRPG.AttributePower" }];
  if (hasEquippedItem(actor.items, "charms.combat.kradushchiysya-pauk")) {
    options.push({ key: "grace", label: "HRPG.AttributeGrace" });
  }
  return options;
}

function hasTrait(actor, sourceId) {
  return actor.items?.some?.((item) => item.type === "trait" && item.system?.active !== false && item.system?.sourceId === sourceId);
}

function flaskAttributeOptions(actor) {
  const options = [{ key: "grace", label: "HRPG.AttributeGrace" }];
  if (hasPath(actor, "paths.vial", 1)) options.push({ key: "power", label: "HRPG.AttributePower" });
  return options;
}

function hasPath(actor, sourceId, minimumRank = 1) {
  return actor.items?.some?.((item) => item.type === "path"
    && item.system?.sourceId === sourceId
    && Math.floor(Number(item.system?.rank) || 0) >= minimumRank);
}

function heavyArmorDefensePenalty(actor) {
  return actor.items?.some?.((item) => item.type === "armor"
    && item.system?.equipped === true
    && (item.system?.sourceId === "equipment.armor.tyazhelaya-bronya"
      || (item.system?.subtype === "armor" && (Number(item.system?.weight) || 0) >= 3))) ? 1 : 0;
}

function defensePromptEffects(actor, actionKey) {
  const triggers = actionKey === "parry" ? ["parry", "defense"]
    : actionKey === "absorption" ? ["absorption"]
      : actionKey === "dodge" ? ["defense"]
        : ["defense"];
  return triggers.flatMap((trigger) => itemPromptEffects(actor.items, trigger));
}

function effectNotes(effects) {
  return effects.map((effect) => `
    <article class="hrpg-effect-note">
      <strong>${foundry.utils.escapeHTML(effect.label)}</strong>
      <small>${foundry.utils.escapeHTML(effect.itemName)}</small>
      <p>${foundry.utils.escapeHTML(effect.note)}</p>
    </article>`).join("");
}

function traitOptionInputs(options) {
  return options.map((option) => `
    <label class="hrpg-path-option">
      <input type="checkbox" name="traitOption" value="${foundry.utils.escapeHTML(option.key)}">
      <span>${foundry.utils.escapeHTML(option.label)}</span>
      <small>${foundry.utils.escapeHTML(option.note)}</small>
    </label>`).join("");
}

function techniqueOptionInputs(options) {
  return options.map((option) => `
    <label class="hrpg-path-option">
      <input type="checkbox" name="techniqueOption" value="${foundry.utils.escapeHTML(option.key)}">
      <span>${foundry.utils.escapeHTML(option.label)}</span>
      <small>${foundry.utils.escapeHTML(option.note)}</small>
    </label>`).join("");
}

function emptyState(label) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = game.i18n.localize(label);
  return paragraph;
}

function activatePage(hud, page) {
  hud.querySelectorAll("[data-hrpg-page]").forEach((element) => element.classList.toggle("active", element.dataset.hrpgPage === page));
  hud.querySelectorAll("[data-hrpg-tab]").forEach((element) => element.classList.toggle("active", element.dataset.hrpgTab === page));
}

function makeDraggable(hud) {
  const handle = hud.querySelector("[data-hrpg-hud-drag]");
  handle?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const rect = hud.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      hud.style.left = `${Math.max(0, moveEvent.clientX - offsetX)}px`;
      hud.style.top = `${Math.max(0, moveEvent.clientY - offsetY)}px`;
      hud.style.right = "auto";
      hud.style.bottom = "auto";
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      localStorage.setItem(`${HUD_ID}.position`, JSON.stringify({ left: hud.style.left, top: hud.style.top }));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}

function restoreHudPosition(hud) {
  try {
    const position = JSON.parse(localStorage.getItem(`${HUD_ID}.position`) ?? "null");
    if (!position?.left || !position?.top) return;
    hud.style.left = position.left;
    hud.style.top = position.top;
    hud.style.right = "auto";
    hud.style.bottom = "auto";
  } catch (_error) {
    localStorage.removeItem(`${HUD_ID}.position`);
  }
}
