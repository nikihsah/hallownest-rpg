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
  if (!actor || attacks.length === 0) {
    existing?.remove();
    return;
  }

  const hud = existing ?? createHud();
  hud.querySelector("[data-hrpg-attack-list]").replaceChildren(...attacks.map((attack) => attackButton(actor, attack)));
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
  hud.innerHTML = `<h2>${game.i18n.localize("HRPG.QuickAttacks")}</h2><div data-hrpg-attack-list></div>`;
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
