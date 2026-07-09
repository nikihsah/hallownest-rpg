import { quickAttacksFromItems } from "../mechanics/trait-attacks.js";
import { unlockedPathAttackOptions } from "../mechanics/path-abilities.js";

const HUD_ID = "hrpg-quick-attacks-hud";

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
  const existing = document.getElementById(HUD_ID);
  if (!actor) {
    existing?.remove();
    return;
  }

  const hud = existing ?? createHud();
  hud.querySelector("[data-hrpg-attack-list]").replaceChildren(...(
    attacks.length ? attacks.map((attack) => attackButton(actor, attack)) : [emptyState("HRPG.NoInteractionSkills")]
  ));
  hud.querySelector("[data-hrpg-stat-list]").replaceChildren(...attributeButtons(actor), ...secondaryButtons(actor));
  hud.querySelector("[data-hrpg-action-list]").replaceChildren(...defenseActionButtons(actor));
  hud.hidden = false;
}

function selectedBugActor() {
  const controlled = canvas?.tokens?.controlled ?? [];
  if (controlled.length !== 1) return null;
  const actor = controlled[0]?.actor;
  return actor?.type === "bug" ? actor : null;
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
  button.append(details);

  button.addEventListener("click", async () => {
    const options = await promptAttackOptions(actor, attack);
    if (!options) return;
    await actor.rollTraitAttack(attack.itemId, options);
  });
  return button;
}

async function promptAttackOptions(actor, attack) {
  const pathOptions = unlockedPathAttackOptions(actor);
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
    window: { title: game.i18n.format("HRPG.AttackDialogTitle", { name: attack.name }) },
    content: `
      <form id="${id}" class="hrpg-attack-dialog">
        <label>${game.i18n.localize("HRPG.InvestedStamina")}
          <input type="number" name="investedStamina" value="0" min="0" step="1">
        </label>
        <p>${game.i18n.format("HRPG.AttackTaxHint", { tax: Number(actor.system.combat?.attackTax) || 0 })}</p>
        ${buttons ? `<section><h3>${game.i18n.localize("HRPG.PathAbilities")}</h3>${buttons}</section>` : `<p>${game.i18n.localize("HRPG.NoPathAbilities")}</p>`}
      </form>`,
    ok: {
      label: game.i18n.localize("HRPG.Roll"),
      callback: (_event, button) => {
        const form = button?.form ?? document.getElementById(id);
        const data = new FormData(form);
        return {
          investedStamina: Number(data.get("investedStamina")) || 0,
          pathOptions: data.getAll("pathOption").map((value) => pathOptions[Number(value)]).filter(Boolean)
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

function defenseActionButtons(actor) {
  return [
    actionButton(actor, { key: "protection", label: "HRPG.DefenseAction", hint: "HRPG.DefenseActionHint", prompt: true, staminaCost: 1 }),
    actionButton(actor, { key: "dodge", label: "HRPG.Dodge", hint: "HRPG.DodgeHint", prompt: true, staminaCost: 1 }),
    actionButton(actor, { key: "parry", label: "HRPG.Parry", hint: "HRPG.ParryHint", prompt: true, staminaCost: 1 }),
    actionButton(actor, { key: "absorption", label: "HRPG.DamageAbsorption", hint: "HRPG.DamageAbsorptionHint", prompt: true, staminaCost: 0 })
  ];
}

function actionButton(actor, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = game.i18n.localize(action.hint);
  const name = document.createElement("span");
  name.textContent = game.i18n.localize(action.label);
  const details = document.createElement("small");
  details.textContent = game.i18n.localize(action.hint);
  button.append(name);
  button.append(details);
  button.addEventListener("click", async () => {
    const options = action.prompt ? await promptDefenseActionOptions(action) : { bonusDice: 0, staminaCost: action.staminaCost ?? 0 };
    if (!options) return;
    await actor.rollDefenseAction(action.key, options);
  });
  return button;
}

async function promptDefenseActionOptions(action) {
  const id = `hrpg-defense-${action.key}-${foundry.utils.randomID()}`;
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.prompt) {
    return { bonusDice: Number(window.prompt(game.i18n.localize("HRPG.BonusDice"), "0")) || 0, staminaCost: action.staminaCost ?? 0 };
  }
  return DialogV2.prompt({
    window: { title: game.i18n.localize(action.label) },
    content: `
      <form id="${id}" class="hrpg-defense-dialog">
        <p>${foundry.utils.escapeHTML(game.i18n.localize(action.hint))}</p>
        <label>${game.i18n.localize("HRPG.BonusDice")}
          <input type="number" name="bonusDice" value="0" step="1">
        </label>
        <label>${game.i18n.localize("HRPG.StaminaCost")}
          <input type="number" name="staminaCost" value="${action.staminaCost ?? 0}" min="0" step="1">
        </label>
      </form>`,
    ok: {
      label: game.i18n.localize("HRPG.Roll"),
      callback: (_event, button) => {
        const form = button?.form ?? document.getElementById(id);
        const data = new FormData(form);
        return {
          bonusDice: Number(data.get("bonusDice")) || 0,
          staminaCost: Number(data.get("staminaCost")) || 0
        };
      }
    },
    rejectClose: false
  });
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
