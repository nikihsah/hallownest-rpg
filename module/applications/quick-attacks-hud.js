import { quickAttacksFromItems } from "../mechanics/trait-attacks.js";

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
    attacks.length ? attacks.map((attack) => attackButton(actor, attack)) : [emptyState("HRPG.NoQuickAttacks")]
  ));
  hud.querySelector("[data-hrpg-stat-list]").replaceChildren(...attributeButtons(actor), ...secondaryButtons(actor));
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
      <nav class="hrpg-quick-hud-tabs" aria-label="${game.i18n.localize("HRPG.InteractionPages")}">
        <button type="button" class="active" data-hrpg-tab="attacks">${game.i18n.localize("HRPG.QuickAttacks")}</button>
        <button type="button" data-hrpg-tab="stats">${game.i18n.localize("HRPG.Attributes")}</button>
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
    attack.damage ? game.i18n.format("HRPG.DamageValue", { damage: attack.damage }) : game.i18n.localize("HRPG.DamageUnspecified"),
    ...(attack.subtraits?.length ? [attack.subtraits.join(", ")] : [])
  ].join(" · ");
  button.append(details);

  button.addEventListener("click", async () => actor.rollTraitAttack(attack.itemId));
  return button;
}

function attributeButtons(actor) {
  return Object.entries(CONFIG.HRPG.attributes).map(([key, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.title = game.i18n.localize(label);
    const name = document.createElement("span");
    name.textContent = game.i18n.localize(label);
    const details = document.createElement("small");
    const value = actor.system.effective?.attributes?.[key]?.value ?? actor.system.attributes?.[key]?.value ?? 0;
    details.textContent = game.i18n.format("HRPG.DicePoolValue", { value });
    button.append(name, details);
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
    const details = document.createElement("small");
    details.textContent = game.i18n.format("HRPG.DicePoolValue", { value: actor.system.effective?.secondary?.[key] ?? 0 });
    button.append(name, details);
    button.addEventListener("click", async () => actor.rollSecondary(key));
    return button;
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
