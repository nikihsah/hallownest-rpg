/** Roll a pool of d6s. Results of 5 and 6 count as successes. */
export async function rollDicePool({ dice, reroll = false, label = "Проверка", actor = null } = {}) {
  const poolSize = Math.max(0, Math.floor(Number(dice) || 0));
  if (poolSize === 0) {
    ui.notifications.warn(game.i18n.localize("HRPG.NoDice"));
    return null;
  }

  const roll = await new Roll(`${poolSize}d6`).evaluate();
  const results = roll.dice[0]?.results.map((result) => result.result) ?? [];
  const failedIndex = results.findIndex((result) => result < 5);
  let rerollResult = null;
  if (reroll && failedIndex >= 0) {
    const rerollRoll = await new Roll("1d6").evaluate();
    rerollResult = rerollRoll.total;
    results[failedIndex] = rerollResult;
  }
  const successes = results.filter((result) => result >= 5).length;
  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

  await roll.toMessage({
    speaker,
    flavor: `<strong>${foundry.utils.escapeHTML(label)}</strong><br>${game.i18n.format("HRPG.RollResult", { successes })}${rerollResult === null ? "" : `<br>${game.i18n.format("HRPG.RerollResult", { result: rerollResult })}`}`
  });

  return { roll, results, successes, rerollResult };
}
