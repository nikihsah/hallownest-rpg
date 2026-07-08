export function calculateAttributeState(attributes, modifiers = {}) {
  return Object.fromEntries(
    ["power", "insight", "shell", "grace"].map((key) => {
      const attribute = attributes[key] ?? {};
      const modifier = Number(modifiers[key]) || 0;
      const storedCurrent = Number(attribute.value) || 0;
      const storedMaximum = Number(attribute.max ?? attribute.value) || 0;
      return [key, {
        value: storedCurrent + modifier,
        max: storedMaximum + modifier,
        modifier
      }];
    })
  );
}

export function storedAttributeValue(displayedValue, modifier = 0) {
  const value = Number(displayedValue);
  if (!Number.isFinite(value)) throw new TypeError("Attribute value must be numeric");
  return value - (Number(modifier) || 0);
}

export function attributeBreakdown({ templateLabel, base, traits = [], total, totalLabel = "Итого" }) {
  const lines = [`${templateLabel}: ${formatSigned(base)}`];
  for (const trait of traits) lines.push(`${trait.name}: ${formatSigned(trait.value)}`);
  lines.push(`${totalLabel}: ${total}`);
  return lines.join("\n");
}

function formatSigned(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}
