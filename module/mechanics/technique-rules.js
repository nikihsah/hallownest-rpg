const ART_RULES = Object.freeze({
  "combat-arts.zamakh": rule(["attack"], ["boost", "imbalance"]),
  "combat-arts.khvatka-baldra": rule(["defense", "absorption"], ["reaction", "absorption"]),
  "combat-arts.berserk": rule(["utility"], ["stance", "focus"]),
  "combat-arts.peredyshka": rule(["utility", "attack"], ["next-attack", "stamina-discount"]),
  "combat-arts.tochnyy-udar": rule(["utility", "attack"], ["aim", "next-attack"]),
  "combat-arts.razgrom": rule(["attack"], ["area", "weapon"]),
  "combat-arts.shkval-udachi": rule(["attack", "defense"], ["reaction", "provoked-attack", "multiattack"]),
  "combat-arts.velikiy-zaryad": rule(["movement", "attack"], ["variable-cost", "movement", "imbalance"]),
  "combat-arts.vypad": rule(["movement", "attack"], ["movement", "melee", "damage"]),
  "combat-arts.vzveshennyy-udar": rule(["attack"], ["heavy-weapon", "imbalance-prevention"]),
  "combat-arts.ralli": rule(["utility", "movement"], ["ally-action", "command"]),
  "combat-arts.shipy": rule(["attack"], ["ranged", "soul", "hazard"]),
  "combat-arts.oshelomlyayushchiy-udar": rule(["attack"], ["weapon", "imbalance", "damage-cap"]),
  "combat-arts.zakhvat-muravlva": rule(["attack", "utility"], ["grapple", "contest"]),
  "combat-arts.udar-strekozy": rule(["attack"], ["unarmed", "poison"]),
  "combat-arts.udavka": rule(["attack"], ["grapple", "net", "delayed-damage"]),
  "combat-arts.khvatka-bogomola": rule(["attack"], ["grapple", "unarmed", "auto-success"]),
  "combat-arts.vzmakh-olenya": rule(["attack", "movement"], ["throw", "grapple", "unarmed"]),
  "combat-arts.razyashchiy-tsiklon": rule(["attack"], ["area", "nail"]),
  "combat-arts.likhoy-udar": rule(["movement", "attack"], ["movement", "nail", "damage"]),
  "combat-arts.velikiy-udar": rule(["attack"], ["nail", "damage"]),
  "combat-arts.kriketnyy-udar": rule(["attack"], ["needle"]),
  "combat-arts.solnechnoe-spletenie": rule(["attack"], ["needle", "soul"]),
  "combat-arts.pronzanie": rule(["attack"], ["needle", "nail"]),
  "combat-arts.svyazka-udarov": rule(["attack"], ["needle", "multiattack"]),
  "combat-arts.razrushayushchiy-udar": rule(["attack"], ["fang", "armor-break"]),
  "combat-arts.sokrushitelnyy-udar": rule(["attack"], ["fang", "natural", "damage"]),
  "combat-arts.udarnaya-volna": rule(["attack"], ["fang", "area"]),
  "combat-arts.vsplesk-otchayaniya": rule(["attack", "defense"], ["reaction", "natural"]),
  "combat-arts.udar-pod-dykh": rule(["attack"], ["fang", "debuff"]),
  "combat-arts.zhivotnyy-instinkt": rule(["attack"], ["fang", "natural", "shell-cost"]),
  "combat-arts.uporstvo-bogomola": rule(["attack"], ["hook", "control"]),
  "combat-arts.kosa-vetrov": rule(["attack"], ["hook", "natural", "soul"]),
  "combat-arts.estestvennyy-otbor": rule(["attack"], ["sling", "hook"]),
  "combat-arts.bezumstvo-khishchnika": rule(["attack"], ["natural", "multiattack"]),
  "combat-arts.khvatka-khishchnika": rule(["attack"], ["natural", "grapple"]),
  "combat-arts.podsechka": rule(["attack"], ["hook", "nail", "trip"]),
  "combat-arts.shot-po-krivoy": rule(["attack"], ["sling", "soul", "ranged"]),
  "combat-arts.razoruzhayushchiy-shot": rule(["attack"], ["sling", "hook", "disarm"]),
  "combat-arts.grad-vystrelov": rule(["attack"], ["sling", "multiattack"]),
  "combat-arts.bystraya-ruka": rule(["attack"], ["sling", "reach", "combo"]),
  "combat-arts.rassypnoy-shot": rule(["attack"], ["sling", "soul", "area"]),
  "combat-arts.pauchiy-shot": rule(["attack"], ["sling", "hook", "trap-cost"]),
  "combat-arts.brosok-baldra": rule(["attack"], ["shield", "throw"]),
  "combat-arts.oleniy-udar": rule(["attack", "defense"], ["shield", "reaction"]),
  "combat-arts.pauchiy-gambit": rule(["attack", "defense"], ["reaction", "natural", "needle", "sling"]),
  "combat-arts.parirovanie-skorpiona": rule(["defense", "parry"], ["reaction", "parry"]),
  "combat-arts.uklonenie-aspida": rule(["defense", "dodge"], ["reaction", "dodge"])
});

const SPELL_RULES = Object.freeze({
  "magic.spire.rasseivanie": rule(["utility", "defense"], ["dispel"]),
  "magic.spire.levitatsiya": rule(["utility", "movement"], ["movement"]),
  "magic.spire.raketa": rule(["attack"], ["projectile"]),
  "magic.spire.prigotovlenie": rule(["utility"], ["preparation"]),
  "magic.spire.vizg": rule(["attack"], ["area", "sound"]),
  "magic.spire.stazis": rule(["attack", "utility"], ["control"]),
  "magic.spire.podavlenie": rule(["attack", "utility"], ["control"]),
  "magic.spire.opeka": rule(["defense", "utility"], ["ward"]),
  "magic.spire.bakh": rule(["attack"], ["blast"]),
  "magic.cloak.tanets-plashcha": rule(["utility", "movement"], ["movement"]),
  "magic.cloak.plashch-klinkov": rule(["attack", "defense"], ["blade", "cloak"]),
  "magic.cloak.padenie": rule(["movement", "utility"], ["fall"]),
  "magic.cloak.zatemnenie": rule(["defense", "utility"], ["concealment"]),
  "magic.cloak.speshka": rule(["movement", "utility"], ["speed"]),
  "magic.cloak.peremeshchenie-domoy": rule(["utility", "movement"], ["teleport"]),
  "magic.cloak.teleport": rule(["utility", "movement"], ["teleport"]),
  "magic.dreams.krug-sna": rule(["utility"], ["sleep"]),
  "magic.dreams.maskirovka": rule(["utility"], ["illusion"]),
  "magic.dreams.illyuziya": rule(["utility"], ["illusion"]),
  "magic.dreams.zerkalnyy-soyuznik": rule(["utility", "attack", "defense"], ["summon", "illusion"]),
  "magic.dreams.chtenie-mysley": rule(["utility"], ["mind"]),
  "magic.dreams.polutelesnost": rule(["defense", "utility"], ["incorporeal"]),
  "magic.dreams.razgovor-s-grezami": rule(["utility"], ["dream"]),
  "magic.nightmares.kipenie-krovi": rule(["attack"], ["blood"]),
  "magic.nightmares.pozhiratel-snov": rule(["attack", "utility"], ["dream", "drain"]),
  "magic.nightmares.vostorg": rule(["utility"], ["emotion"]),
  "magic.nightmares.ognennyy-shar": rule(["attack"], ["fire", "projectile"]),
  "magic.nightmares.manipulyatsiya": rule(["utility", "attack"], ["control"]),
  "magic.nightmares.marionetka": rule(["utility", "attack"], ["control"]),
  "magic.nightmares.roy": rule(["attack"], ["swarm"]),
  "magic.bloom.amrita": rule(["utility"], ["heal"]),
  "magic.bloom.dar-tsveteniya": rule(["utility"], ["buff"]),
  "magic.bloom.spokoystvie": rule(["defense", "utility"], ["calm"]),
  "magic.bloom.zaryad": rule(["attack", "utility"], ["charge"]),
  "magic.bloom.zaputyvanie": rule(["attack", "utility"], ["control"]),
  "magic.bloom.tselebnaya-pyltsa": rule(["utility"], ["heal"]),
  "magic.bloom.simbioticheskoe-semya": rule(["utility"], ["symbiosis"]),
  "magic.thorn.protivoyadie": rule(["utility"], ["antidote"]),
  "magic.thorn.top": rule(["attack", "movement"], ["terrain", "control"]),
  "magic.thorn.otravlenie": rule(["attack"], ["poison"]),
  "magic.thorn.zarazhenie": rule(["attack"], ["poison"]),
  "magic.thorn.volna-yada": rule(["attack"], ["poison", "area"]),
  "magic.thorn.smog": rule(["attack", "defense"], ["poison", "cloud"]),
  "magic.thorn.polosa-shipov": rule(["attack"], ["hazard", "thorns"]),
  "magic.dust.stiranie": rule(["attack", "utility"], ["erasure"]),
  "magic.dust.annigilyatsiya": rule(["attack"], ["annihilation"]),
  "magic.dust.rasslablenie": rule(["utility", "attack"], ["debuff"]),
  "magic.dust.stiranie-pamyati": rule(["utility", "attack"], ["memory"]),
  "magic.dust.peschanaya-burya": rule(["attack", "defense"], ["area", "sand"]),
  "magic.dust.golodnoe-bezumie": rule(["attack", "utility"], ["hunger"]),
  "magic.dust.istoshchenie": rule(["attack"], ["exhaustion"])
});

const RULES = Object.freeze({ ...ART_RULES, ...SPELL_RULES });

export function techniqueRule(technique) {
  const sourceId = technique?.system?.sourceId ?? technique?.sourceId ?? "";
  return RULES[sourceId] ?? rule([], []);
}

export function hasTechniqueRule(sourceId) {
  return sourceId in RULES;
}

export function techniqueRuleTriggers(technique) {
  return techniqueRule(technique).triggers;
}

export function techniqueRuleTags(technique) {
  return techniqueRule(technique).tags;
}

function rule(triggers, tags) {
  return { triggers: [...triggers], tags: [...tags] };
}
