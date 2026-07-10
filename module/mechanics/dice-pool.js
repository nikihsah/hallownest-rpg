/** Roll a pool of d6s. Results of 5 and 6 count as successes by default. */
export async function rollDicePool({
  dice,
  reroll = false,
  rerolls = 0,
  automaticSuccesses = 0,
  label = "Проверка",
  actor = null,
  successThreshold = 5,
  notes = []
} = {}) {
  const poolSize = Math.max(0, Math.floor(Number(dice) || 0));
  if (poolSize === 0) {
    ui.notifications.warn(game.i18n.localize("HRPG.NoDice"));
    return null;
  }

  const threshold = Math.min(6, Math.max(2, Math.floor(Number(successThreshold) || 5)));
  const roll = await new Roll(`${poolSize}d6`).evaluate();
  const results = roll.dice[0]?.results.map((result) => result.result) ?? [];
  const rerollLimit = Math.max(0, Math.floor(Number(rerolls) || 0) + (reroll === true ? 1 : Number(reroll) || 0));
  const rerollResults = [];
  for (let count = 0; count < rerollLimit; count += 1) {
    const failedIndex = results.findIndex((result) => result < threshold);
    if (failedIndex < 0) break;
    const rerollRoll = await new Roll("1d6").evaluate();
    const previous = results[failedIndex];
    const next = Math.max(previous, rerollRoll.total);
    rerollResults.push(next);
    results[failedIndex] = next;
  }
  const autoSuccesses = Math.max(0, Math.floor(Number(automaticSuccesses) || 0));
  const successes = results.filter((result) => result >= threshold).length + autoSuccesses;
  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();
  const noteLines = Array.from(notes ?? []).filter(Boolean).map((note) => foundry.utils.escapeHTML(String(note)));

  await roll.toMessage({
    speaker,
    flavor: `<strong>${foundry.utils.escapeHTML(label)}</strong><br>${game.i18n.format("HRPG.RollResult", { successes })}${threshold === 5 ? "" : `<br>${game.i18n.format("HRPG.SuccessThreshold", { threshold })}`}${autoSuccesses ? `<br>${game.i18n.format("HRPG.AutomaticSuccesses", { successes: autoSuccesses })}` : ""}${rerollResults.length ? `<br>${game.i18n.format("HRPG.RerollResults", { results: rerollResults.join(", ") })}` : ""}${noteLines.length ? `<hr>${noteLines.join("<br>")}` : ""}`
  });

  return { roll, results, successes, rerollResults, automaticSuccesses: autoSuccesses, successThreshold: threshold };
}
