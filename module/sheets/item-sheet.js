export class HallownestItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hrpg", "sheet", "item"],
      width: 560,
      height: 520,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.pathRankOptions = { 1: "1", 2: "2", 3: "3" };
    return context;
  }

  get template() {
    return "systems/hallownest-rpg/templates/item/item-sheet.hbs";
  }
}
