/** Roll a pool of d6s. Results of 5 and 6 count as successes by default. */
export async function rollDicePool({
  dice,
  reroll = false,
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
  const failedIndex = results.findIndex((result) => result < threshold);
  let rerollResult = null;
  if (reroll && failedIndex >= 0) {
    const rerollRoll = await new Roll("1d6").evaluate();
    rerollResult = rerollRoll.total;
    results[failedIndex] = rerollResult;
  }
  const successes = results.filter((result) => result >= threshold).length;
  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();
  const noteLines = Array.from(notes ?? []).filter(Boolean).map((note) => foundry.utils.escapeHTML(String(note)));

  await roll.toMessage({
    speaker,
    flavor: `<strong>${foundry.utils.escapeHTML(label)}</strong><br>${game.i18n.format("HRPG.RollResult", { successes })}${threshold === 5 ? "" : `<br>${game.i18n.format("HRPG.SuccessThreshold", { threshold })}`}${rerollResult === null ? "" : `<br>${game.i18n.format("HRPG.RerollResult", { result: rerollResult })}`}${noteLines.length ? `<hr>${noteLines.join("<br>")}` : ""}`
  });

  return { roll, results, successes, rerollResult, successThreshold: threshold };
}
