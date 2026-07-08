import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathItemData, pathOverview } from "../module/data/path-catalog.js";

const catalogUrl = new URL("../data/paths.json", import.meta.url);

test("HK-Kit path catalog contains every martial and mystic path", async () => {
  const paths = JSON.parse(await readFile(catalogUrl, "utf8"));
  assert.equal(paths.length, 15);
  assert.equal(paths.filter((path) => path.category === "martial").length, 8);
  assert.equal(paths.filter((path) => path.category === "mystic").length, 7);
  assert.equal(new Set(paths.map((path) => path.sourceId)).size, paths.length);
  for (const path of paths) {
    assert.equal(path.ranks.length, 3, `${path.name} must have three ranks`);
    assert.deepEqual(path.ranks.map((rank) => rank.rank), [1, 2, 3]);
  }
});

test("catalog entry becomes an editable Foundry path item", async () => {
  const [path] = JSON.parse(await readFile(catalogUrl, "utf8"));
  const item = pathItemData(path);
  assert.equal(item.type, "path");
  assert.equal(item.system.sourceId, "paths.nail");
  assert.equal(item.system.rank, 1);
  assert.equal(item.system.rankMax, 3);
  assert.equal(item.system.ranks.length, 3);
  assert.match(item.system.description, /Хороший удар/);
  assert.doesNotMatch(item.system.description, /Ранг 1|Военные Пути|^29$/m);
});

test("every catalog path has a clean standalone description", async () => {
  const paths = JSON.parse(await readFile(catalogUrl, "utf8"));
  for (const path of paths) {
    const description = pathOverview(path);
    assert.ok(description.length > 30, `${path.name} needs a description`);
    assert.doesNotMatch(description, /Ранг\s*1|Военные пути|Мистические пути/iu);
  }
});
