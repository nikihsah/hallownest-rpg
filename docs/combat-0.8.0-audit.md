# Combat 0.8.0 audit

Source: `The Unofficial Hollow Knight RPG - RUS v.1.8(1).pdf`, combat chapter, physical pages 117-122.

## Implemented as automation

- Initiative uses Grace dice as a summed `d6` roll, not success counting.
- Small and medium bugs occupy 1x1 token space; large bugs occupy 2x2.
- Orthogonal and diagonal movement both cost 1 Speed per cell.
- Movement beyond available Speed is highlighted in red instead of blocked.
- Combat turn start resets spent Speed and attack tax.
- Combat turn start restores Stamina, reduced by current Imbalance, then lowers Imbalance by 1.
- Each attack has a base Stamina cost of 1 and raises the next attack tax by 1.
- Fast Strike can reduce the paid attack tax without changing the tax counter.
- Defense actions support Dodge, Parry, and Damage Absorption.
- Dodge can optionally mark the 1-cell post-dodge movement and add 1 Imbalance.
- Heavy armor increases initial Dodge and Parry Stamina cost through item effects.
- Soul Focus spends Soul and rolls the focus pool with Insight-based rerolls and automatic successes per 3 Soul.
- Expected damage calculation handles:
  - hit or miss by attack successes;
  - extra damage capped by base damage or invested Stamina;
  - damage reduction with the minimum-damage rule;
  - optional Absorption roll;
  - optional Absorption pool.

## Implemented as controlled prompts / chat reminders

- Opportunity attack.
- Retreat.
- Dash / Jump.
- Grapple.
- Escape Grapple.
- Skill Action.
- Minor Action.
- Ready Action.
- Delay Turn.
- Focus Soul.
- Damage Calculator.
- Combat-relevant item, charm, trait, path, and prepared technique notes in roll dialogs.

## Left intentionally under GM control

These rules depend on exact scene context, target consent, token geometry, or GM adjudication. They should not be guessed automatically.

- Squeezing into another creature's cell.
- Passing through allied, unconscious, or hostile creatures.
- Whether movement actually provokes an attack.
- Once-per-round tracking for opportunity attacks per pair of bugs.
- Area templates and cone geometry beyond Foundry's native template tools.
- Cover fractions and whether missed cover is hit.
- Invisible attacker/defender detection state.
- Death's Door and unconscious targeting priorities.
- Delayed Damage and generic status-effect inventory.
- Weapon wear/destruction beyond current quality and modification fields.

## Next safe layer

- GM condition panel for Imbalance, Delayed Damage, Death's Door, Unconscious, Suffocation, and custom status effects.
- Cover/invisibility toggles in attack and defense dialogs.
- Belt-slot UX and minor-action speed helpers.
- Skill list UX: mostly roleplay, but useful as suggested combat action presets.
