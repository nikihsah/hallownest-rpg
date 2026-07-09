import test from "node:test";
import assert from "node:assert/strict";
import { applyTraitConditionalOptions, traitConditionalOptions, traitPromptEffects } from "../module/mechanics/trait-effects.js";

function trait(sourceId, { id = sourceId, name = sourceId, active = true, kind = "trait", parentTrait = "", parentItemId = "", description = "", rules = [] } = {}) {
  return {
    id,
    name,
    type: "trait",
    system: { sourceId, active, kind, parentTrait, parentItemId, description, rules }
  };
}

test("selected natural weapon shows its own trait and bound subtrait notes", () => {
  const effects = traitPromptEffects([
    trait("traits.natural-projectile", { id: "projectile", name: "Природный Снаряд", description: "Снаряд наносит 2 урона." }),
    trait("traits.natural-projectile.spray", {
      id: "spray",
      name: "Спрей",
      kind: "subtrait",
      parentTrait: "traits.natural-projectile",
      parentItemId: "projectile",
      description: "Использование требует 1 дополнительной Выносливости."
    }),
    trait("traits.natural-projectile.heavy-shot", {
      id: "other",
      name: "Тяжелый выстрел",
      kind: "subtrait",
      parentTrait: "traits.natural-projectile",
      parentItemId: "other-parent",
      description: "Не должен попасть в выбранную атаку."
    })
  ], "attack", { itemId: "projectile" });

  assert.deepEqual(effects.map((effect) => effect.label), ["Природный Снаряд", "Спрей"]);
});

test("conditional trait options expose only owned and applicable options", () => {
  const actor = {
    items: [
      trait("traits.kollektivnyy-razum"),
      trait("traits.claws", { id: "claws" }),
      trait("traits.bolshe-nog")
    ]
  };

  assert.deepEqual(traitConditionalOptions(actor, "attack", { itemId: "claws" }).map((option) => option.key), [
    "ally-hit-target",
    "target-grappled-by-claws"
  ]);
  assert.deepEqual(traitConditionalOptions(actor, "dodge").map((option) => option.key), ["resist-forced-movement"]);
});

test("selected conditional trait options add dice and chat notes", () => {
  const options = [
    { key: "ally-hit-target", bonusDice: 1, note: "ally" },
    { key: "civilized-wounded", bonusDice: -1, note: "civilized" },
    { key: "target-grappled-by-claws", bonusDice: 0, note: "grappled" }
  ];

  assert.deepEqual(applyTraitConditionalOptions(options, ["ally-hit-target", "target-grappled-by-claws"]), {
    bonusDice: 1,
    notes: ["ally", "grappled"]
  });
});
