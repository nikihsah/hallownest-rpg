let cachedPaths;

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
    system: {
      description: path.description,
      rank: 1,
      rankMax: 3,
      category: path.category,
      sourceId: path.sourceId,
      ranks: path.ranks
    }
  };
}
