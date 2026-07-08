import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const templateUrl = new URL("../templates/actor/bug-sheet.hbs", import.meta.url);

test("creation screen exposes a stable template selector and apply action", async () => {
  const template = await readFile(templateUrl, "utf8");
  assert.match(template, /name="system\.secondary\.size" data-template-size/);
  assert.match(template, /button type="submit" name="_applySizeTemplate" value="1" data-action="apply-size"/);
});

test("actor sheet keeps each major area in its own tab", async () => {
  const template = await readFile(templateUrl, "utf8");
  for (const tab of ["overview", "traits", "charms", "techniques", "skills", "inventory", "notes"]) {
    assert.match(template, new RegExp(`data-tab="${tab}"`));
  }
});
