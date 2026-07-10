import { defaultItemIcon } from "./item-icons.js";

let cachedPaths;

const DESCRIPTION_CORRECTIONS = {
  "paths.dreams": "Когда жук умирает, его дух не исчезает. Наши воспоминания остаются, задерживаясь на местах, где мы были, на вещах, которые мы любили. С практикой эти воспоминания можно заставить снова служить.",
  "paths.dust": "Все вещи исчезают со временем. Таков мир. Являются ли те, кто приветствует конец, дураками, лихорадочно марширующими к своей гибели, или мы — дураки, пытающиеся отрицать это? Перед носителями Пути Пыли ни одна стена не остаётся нерушимой навсегда, и никакое дерево не вырастет до неба."
};

export async function loadPathCatalog() {
  if (cachedPaths) return cachedPaths;
  const response = await fetch("systems/hallownest-rpg/data/paths.json");
  if (!response.ok) throw new Error(`Could not load path catalog: ${response.status}`);
  cachedPaths = await response.json();
  return cachedPaths;
}

export function pathItemData(path) {
  return {
    name: path.name,
    type: "path",
    img: path.img || defaultItemIcon("path"),
    system: {
      description: pathOverview(path),
      rank: 1,
      rankMax: 3,
      category: path.category,
      sourceId: path.sourceId,
      ranks: path.ranks
    }
  };
}

export function pathOverview(path) {
  if (DESCRIPTION_CORRECTIONS[path.sourceId]) return DESCRIPTION_CORRECTIONS[path.sourceId];
  const heading = /^(?:военные|мистические) пути$/iu;
  return String(path.description ?? "")
    .split(/ранг\s*1/iu, 1)[0]
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+$/u.test(line) && !heading.test(line) && line !== path.name)
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}
