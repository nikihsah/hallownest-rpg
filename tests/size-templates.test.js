import test from "node:test";
import assert from "node:assert/strict";
import { applySizeTemplate, buildSizeTemplateUpdate } from "../module/mechanics/size-templates.js";

test("medium template produces the canonical HK-Kit values", () => {
  const update = buildSizeTemplateUpdate("medium");
  assert.equal(update["system.attributes.power.value"], 3);
  assert.equal(update["system.attributes.grace.value"], 3);
  assert.equal(update["system.resources.heart.max"], 7);
  assert.equal(update["system.secondary.hunger.value"], 4);
  assert.equal(update["system.secondary.hunger.max"], 20);
  assert.equal(update["system.creation.templateApplied"], true);
});

test("all supported templates can be built", () => {
  for (const size of ["small", "medium", "large"]) {
    assert.equal(buildSizeTemplateUpdate(size)["system.secondary.size"], size);
  }
});

test("unknown templates fail loudly", () => {
  assert.throws(() => buildSizeTemplateUpdate("colossal"), /Unknown size template/);
});

test("applySizeTemplate sends the complete update to an Actor", async () => {
  let received = null;
  const actor = { async update(data) { received = data; return data; } };
  await applySizeTemplate(actor, "small");
  assert.equal(received["system.secondary.size"], "small");
  assert.equal(received["system.creation.templateApplied"], true);
});
