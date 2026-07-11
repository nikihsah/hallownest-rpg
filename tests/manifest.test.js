import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Foundry manifest uses a direct GitHub codeload zip", async () => {
  const manifest = JSON.parse(await readFile(new URL("../system.json", import.meta.url), "utf8"));

  assert.equal(manifest.manifest, "https://raw.githubusercontent.com/nikihsah/hallownest-rpg/main/system.json");
  assert.equal(manifest.download, "https://codeload.github.com/nikihsah/hallownest-rpg/zip/refs/heads/main");
  assert.equal(manifest.version, "1.0.5");
  assert.doesNotMatch(manifest.download, /github\.com\/.+\/archive\/refs\/heads\/main\.zip/);
});
