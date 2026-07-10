const ITEM_ICON_ROOT = "systems/hallownest-rpg/assets/icons/items";

const TYPE_ICONS = Object.freeze({
  weapon: "weapon.svg",
  armor: "armor.svg",
  trait: "trait.svg",
  path: "path.svg",
  skill: "skill.svg",
  art: "art.svg",
  spell: "spell.svg",
  charm: "charm.svg",
  gear: "gear.svg",
  consumable: "consumable.svg"
});

const SUBTYPE_ICONS = Object.freeze({
  shield: "shield.svg",
  flask: "flask.svg",
  potion: "consumable.svg",
  poison: "consumable.svg",
  food: "consumable.svg",
  "magic-focus": "spell.svg"
});

export function defaultItemIcon(type = "gear", { subtype = "" } = {}) {
  const filename = SUBTYPE_ICONS[subtype] ?? TYPE_ICONS[type] ?? TYPE_ICONS.gear;
  return `${ITEM_ICON_ROOT}/${filename}`;
}
