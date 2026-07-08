export class HallownestItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hrpg", "sheet", "item"],
      width: 560,
      height: 520
    });
  }

  get template() {
    return "systems/hallownest-rpg/templates/item/item-sheet.hbs";
  }
}
