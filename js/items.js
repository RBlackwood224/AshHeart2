'use strict';
// Items: bases, affixes, runes, runewords, legendary powers, generation
AH.RARITY = [
  { name: 'COMMON', col: '#b8b0c4', border: '#6a6274' },
  { name: 'MAGIC', col: '#7aa8ff', border: '#4a7bd1' },
  { name: 'RARE', col: '#f2d36a', border: '#e8c25a' },
  { name: 'LEGENDARY', col: '#ff9a3e', border: '#ff8a2e' },
  { name: 'MYTHIC', col: '#d890ff', border: '#b05ae0' },
  { name: 'SET', col: '#5ee07a', border: '#2e9a4a' },
];
AH.MATERIALS = [
  { name: 'COPPER', mult: 1.0, metal: ['#e0a070', '#b0703e', '#7a4a2a'] },
  { name: 'IRON', mult: 1.55, metal: ['#b4b0c0', '#8f8aa0', '#5d586e'] },
  { name: 'STEEL', mult: 2.3, metal: ['#d4dae4', '#a4acbc', '#6a7286'] },
  { name: 'SILVER', mult: 3.3, metal: ['#f2f2fa', '#c8c8d8', '#8a8aa0'] },
  { name: 'MITHRIL', mult: 4.6, metal: ['#b8f8f0', '#7ad0c8', '#3a8a88'] },
  { name: 'ASHSTONE', mult: 6.4, metal: ['#8a6a5a', '#5a4038', '#3a2420'] },
];
AH.tierOf = f => Math.min(5, Math.floor((f - 1) / 17));
AH.matMult = function (f) { const t = AH.tierOf(f); let m = AH.MATERIALS[t].mult; if (f > 100) m *= 1 + (f - 100) * 0.04; return m * (1 + ((f - 1) % 17) * 0.025); };

AH.WEAPONS = {
  sword: { name: 'SWORD', dmg: [6, 10], spd: 0.42, range: 19, arc: 1.7, stat: 'str', icon: 'sword', held: 'sword' },
  greatsword: { name: 'GREATSWORD', dmg: [13, 21], spd: 0.72, range: 24, arc: 2.5, stat: 'str', icon: 'greatsword', held: 'greatsword', twoHand: 1 },
  axe: { name: 'AXE', dmg: [9, 15], spd: 0.58, range: 19, arc: 1.5, stat: 'str', icon: 'axe', held: 'axe' },
  mace: { name: 'MACE', dmg: [8, 12], spd: 0.5, range: 17, arc: 1.5, stat: 'str', icon: 'mace', held: 'mace', undead: 1.5 },
  maul: { name: 'MAUL', dmg: [16, 25], spd: 0.8, range: 22, arc: 2.4, stat: 'str', icon: 'maul', held: 'maul', twoHand: 1, stun: 20 },
  dagger: { name: 'DAGGER', dmg: [5, 9], spd: 0.3, range: 15, arc: 1.1, stat: 'dex', icon: 'dagger', held: 'dagger', crit: 10 },
  bow: { name: 'BOW', dmg: [7, 12], spd: 0.5, range: 0, ranged: 'arrow', stat: 'dex', icon: 'bow', held: 'bow', twoHand: 1 },
  staff: { name: 'STAFF', dmg: [4, 7], spd: 0.55, range: 0, ranged: 'magic', stat: 'int', icon: 'staff', held: 'staff', twoHand: 1, mpr: 1 },
  scepter: { name: 'SCEPTER', dmg: [3, 6], spd: 0.6, range: 0, ranged: 'magic', stat: 'int', icon: 'scepter', held: 'scepter' },
};
AH.ARMORS = {
  helm: { slot: 'head', name: 'HELM', armor: 3, icon: 'helm', look: 'helm' },
  greathelm: { slot: 'head', name: 'GREAT HELM', armor: 5, icon: 'helm', look: 'greathelm', reqStr: 1 },
  hood: { slot: 'head', name: 'HOOD', armor: 1, icon: 'hood', look: 'hood', bonus: { dex: 1 } },
  hat: { slot: 'head', name: 'WIZARD HAT', armor: 1, icon: 'hat', look: 'hat', bonus: { int: 1 } },
  hornhelm: { slot: 'head', name: 'HORNED HELM', armor: 3, icon: 'hornhelm', look: 'horned', bonus: { str: 2 } },
  plate: { slot: 'chest', name: 'PLATE ARMOR', armor: 9, icon: 'chest', look: 'plate', reqStr: 1 },
  leather: { slot: 'chest', name: 'LEATHER ARMOR', armor: 5, icon: 'leather', look: 'leather' },
  robe: { slot: 'chest', name: 'ROBE', armor: 2, icon: 'robe', look: 'robe', bonus: { mp: 8 } },
  fur: { slot: 'chest', name: 'FUR ARMOR', armor: 4, icon: 'fur', look: 'fur', bonus: { vit: 2 } },
  gloves: { slot: 'hands', name: 'GLOVES', armor: 2, icon: 'glove' },
  boots: { slot: 'feet', name: 'BOOTS', armor: 2, icon: 'boot', bonus: { move: 3 } },
  cloak: { slot: 'cloak', name: 'CLOAK', armor: 1, icon: 'cloak' },
  shield: { slot: 'off', name: 'SHIELD', armor: 5, icon: 'shield', held: 'shield', block: 15 },
  tomeoff: { slot: 'off', name: 'GRIMOIRE', armor: 0, icon: 'tome', held: 'tome', bonus: { spell: 10, mp: 6 } },
  ring: { slot: 'ring', name: 'RING', armor: 0, icon: 'ring' },
  amulet: { slot: 'amulet', name: 'AMULET', armor: 0, icon: 'amulet' },
};
AH.EQUIP_SLOTS = ['weapon', 'off', 'head', 'chest', 'hands', 'feet', 'cloak', 'ring1', 'ring2', 'amulet'];
AH.SLOT_LABEL = { weapon: 'MAIN HAND', off: 'OFF HAND', head: 'HEAD', chest: 'CHEST', hands: 'HANDS', feet: 'FEET', cloak: 'CLOAK', ring1: 'RING', ring2: 'RING', amulet: 'AMULET' };

// affixes: k, label fn, allowed slot groups, base value, per-tier growth
AH.AFFIXES = [
  { k: 'str', lab: v => `+${v} STRENGTH`, on: 'any', b: 2, t: 2, fit: 'paladin barb' },
  { k: 'dex', lab: v => `+${v} DEXTERITY`, on: 'any', b: 2, t: 2, fit: 'rogue' },
  { k: 'int', lab: v => `+${v} INTELLECT`, on: 'any', b: 2, t: 2, fit: 'wizard necro' },
  { k: 'vit', lab: v => `+${v} VITALITY`, on: 'any', b: 2, t: 2 },
  { k: 'dmg', lab: v => `+${v}% DAMAGE`, on: 'weapon ring amulet hands', b: 6, t: 3 },
  { k: 'ias', lab: v => `+${v}% ATTACK SPEED`, on: 'weapon hands ring', b: 4, t: 1.5 },
  { k: 'crit', lab: v => `+${v}% CRIT CHANCE`, on: 'weapon ring amulet head', b: 2, t: 1 },
  { k: 'loh', lab: v => `+${v} LIFE ON HIT`, on: 'weapon ring', b: 1, t: 1 },
  { k: 'hp', lab: v => `+${v} MAX LIFE`, on: 'any', b: 8, t: 8 },
  { k: 'mp', lab: v => `+${v} MAX MANA`, on: 'any', b: 5, t: 4 },
  { k: 'armor', lab: v => `+${v} ARMOR`, on: 'head chest hands feet cloak off', b: 2, t: 3 },
  { k: 'fire', lab: v => `+${v} FIRE DAMAGE`, on: 'weapon', b: 2, t: 4 },
  { k: 'frost', lab: v => `+${v} FROST DAMAGE`, on: 'weapon', b: 2, t: 3.5 },
  { k: 'move', lab: v => `+${v}% MOVE SPEED`, on: 'feet cloak', b: 4, t: 1 },
  { k: 'light', lab: v => `+${v}% LIGHT RADIUS`, on: 'head amulet off', b: 10, t: 2 },
  { k: 'gold', lab: v => `+${v}% GOLD FIND`, on: 'ring amulet hands', b: 10, t: 4 },
  { k: 'mf', lab: v => `+${v}% MAGIC FIND`, on: 'ring amulet head', b: 8, t: 3 },
  { k: 'thorns', lab: v => `REFLECT ${v} DAMAGE`, on: 'chest off cloak', b: 2, t: 4 },
  { k: 'potion', lab: v => `+${v}% POTION HEALING`, on: 'amulet chest', b: 15, t: 3 },
  { k: 'mpr', lab: v => `+${v} MANA REGEN`, on: 'any', b: 1, t: 0.6 },
  { k: 'spell', lab: v => `+${v}% SPELL DAMAGE`, on: 'weapon off amulet ring head', b: 6, t: 3, fit: 'wizard' },
  { k: 'cdr', lab: v => `-${v}% SKILL COOLDOWN`, on: 'amulet head off', b: 5, t: 1.2 },
  { k: 'res', lab: v => `-${v}% DAMAGE TAKEN`, on: 'chest off cloak amulet', b: 2, t: 0.8 },
  { k: 'minion', lab: v => `+${v}% SERVANT DAMAGE`, on: 'weapon off amulet head', b: 6, t: 3, fit: 'necro' },
  { k: 'minionHp', lab: v => `+${v}% SERVANT LIFE`, on: 'off amulet chest cloak', b: 8, t: 4, fit: 'necro' },
];
AH.fits = (def, cls) => !!(def && def.fit && cls && def.fit.split(' ').indexOf(cls) >= 0);
AH.SLOT_GROUP = { weapon: 'weapon', off: 'off', head: 'head', chest: 'chest', hands: 'hands', feet: 'feet', cloak: 'cloak', ring: 'ring', amulet: 'amulet' };

AH.BARGAINS = [
  { lab: '+35% DAMAGE, -15% MAX LIFE', fx: { dmg: 35, hpPct: -15 } },
  { lab: '+25% ATTACK SPEED, POTIONS HEAL HALF', fx: { ias: 25, potion: -50 } },
  { lab: '+40% SPELL DAMAGE, TAKE 20% MORE DAMAGE', fx: { spell: 40, res: -20 } },
  { lab: '+30% MOVE SPEED, -25% ARMOR', fx: { move: 30, armorPct: -25 } },
  { lab: 'LIFE ON HIT X3, NO MANA REGEN', fx: { lohMult: 3, noMpr: 1 } },
  { lab: '+50% GOLD FIND, -20% LIGHT RADIUS', fx: { gold: 50, light: -20 } },
  { lab: '+20% CRIT, ENEMIES 10% FASTER', fx: { crit: 20, enemySpd: 10 } },
];

AH.LEGEND_POWERS = [
  { id: 'triple', lab: 'EVERY 4TH HIT STRIKES DOUBLE.' },
  { id: 'bleed', lab: 'FOES THAT HIT YOU BLEED DOUBLE.' },
  { id: 'mend', lab: 'SLOWLY MENDS YOUR WOUNDS.' },
  { id: 'burnground', lab: 'HEAVY ATTACKS LEAVE BURNING GROUND.' },
  { id: 'killboom', lab: 'SLAIN FOES EXPLODE.' },
  { id: 'frostdodge', lab: 'DODGING LEAVES A FROST NOVA.' },
  { id: 'chaincrit', lab: 'CRITS CALL CHAIN LIGHTNING.' },
  { id: 'petfury', lab: 'YOUR COMPANION HITS THREE TIMES HARDER.' },
  { id: 'goldheal', lab: 'PICKING UP GOLD HEALS YOU.' },
  { id: 'multishot', lab: 'ATTACKS FIRE TWO EXTRA SHOTS.' },
  { id: 'thirst', lab: 'KILLS RESTORE MANA.' },
  { id: 'emberheart', lab: 'BELOW HALF LIFE YOU DEAL 40% MORE.' },
];
// powers that only come from full sets
AH.SET_POWERS = {
  secondwind: 'ONCE PER FLOOR, SURVIVE A KILLING BLOW.',
  stormstrike: 'HEAVY ATTACKS CALL CHAIN LIGHTNING.',
  executioner: 'DEAL 50% MORE TO FOES BELOW 30% LIFE.',
  pestilence: 'CURSED FOES SPREAD THE CURSE WHEN THEY DIE.',
  souleater: 'KILLS HEAL 3% OF YOUR LIFE.',
  rampage: 'EVERY KILL: +6% ATTACK SPEED FOR 4 SECONDS, UP TO 5 TIMES.',
};
AH.SET_POWER_LAB = id => AH.SET_POWERS[id] || (AH.LEGEND_POWERS.find(p => p.id === id) || {}).lab || id;
// item sets: wear more pieces for stronger bonuses
AH.SETS = [
  { id: 'dawn', name: 'DAWNGUARD', cls: 'paladin', minF: 6, pieces: ['greathelm', 'plate', 'shield', 'mace'], b: { 2: { vit: 8 }, 3: { block: 10, armor: 20 }, 4: { power: 'secondwind', res: 6 } } },
  { id: 'light', name: 'LIGHTBRINGER', cls: 'paladin', minF: 18, pieces: ['helm', 'gloves', 'sword', 'amulet'], b: { 2: { dmg: 18 }, 3: { spell: 20, light: 25 }, 4: { power: 'chaincrit', crit: 8 } } },
  { id: 'ironvow', name: 'IRON VOW', cls: 'paladin', minF: 34, pieces: ['plate', 'boots', 'gloves', 'shield', 'helm'], b: { 2: { armor: 30, hp: 30 }, 4: { res: 12, hp: 40, dmg: 15 }, 5: { power: 'bleed', thorns: 25, dmg: 10 } } },
  { id: 'night', name: 'NIGHTSTALKER', cls: 'rogue', minF: 6, pieces: ['hood', 'leather', 'dagger', 'boots'], b: { 2: { crit: 6 }, 3: { move: 12 }, 4: { power: 'triple', critDmg: 15 } } },
  { id: 'hawk', name: 'HAWKEYE', cls: 'rogue', minF: 18, pieces: ['bow', 'hood', 'gloves', 'cloak'], b: { 2: { ias: 10 }, 3: { crit: 10 }, 4: { power: 'multishot' } } },
  { id: 'viper', name: 'VIPERFANG', cls: 'rogue', minF: 34, pieces: ['dagger', 'ring', 'amulet', 'gloves'], b: { 2: { loh: 3 }, 3: { critDmg: 15 }, 4: { power: 'executioner', dex: 10 } } },
  { id: 'emberw', name: 'EMBERWEAVE', cls: 'wizard', minF: 6, pieces: ['staff', 'robe', 'hat', 'tomeoff'], b: { 2: { spell: 15, hp: 25 }, 3: { fire: 12, firePct: 20 }, 4: { power: 'burnground', int: 10 } } },
  { id: 'frostm', name: 'FROSTMANTLE', cls: 'wizard', minF: 18, pieces: ['robe', 'hat', 'boots', 'cloak'], b: { 2: { frost: 10, spell: 10 }, 3: { cdr: 15, int: 8 }, 4: { power: 'frostdodge', freeze: 15, res: 8, spell: 15 } } },
  { id: 'storm', name: 'STORMSAGE', cls: 'wizard', minF: 34, pieces: ['staff', 'ring', 'amulet', 'hat'], b: { 2: { mp: 25, spell: 20, vit: 8 }, 3: { mpr: 2, spell: 30 }, 4: { power: 'stormstrike', crit: 8, int: 12 } } },
  { id: 'graveward', name: 'GRAVEWARD', cls: 'necro', minF: 6, pieces: ['scepter', 'robe', 'hood', 'tomeoff'], b: { 2: { minion: 15, hp: 25 }, 3: { minions: 1 }, 4: { power: 'pestilence', curse: 20 } } },
  { id: 'warlord', name: 'WARLORD', cls: 'barb', minF: 6, pieces: ['axe', 'hornhelm', 'fur', 'boots'], b: { 2: { str: 8, hp: 25 }, 3: { ias: 10, armor: 20 }, 4: { power: 'rampage', dmg: 15 } } },
  { id: 'bloodrage', name: 'BLOOD RAGE', cls: 'barb', minF: 22, pieces: ['maul', 'gloves', 'amulet', 'cloak'], b: { 2: { loh: 4, vit: 6 }, 3: { critDmg: 25, dmg: 10 }, 4: { power: 'bleed', hpPct: 15 } } },
  { id: 'bonethrone', name: 'BONE THRONE', cls: 'necro', minF: 22, pieces: ['scepter', 'amulet', 'ring', 'cloak'], b: { 2: { minionHp: 30, vit: 6 }, 3: { spell: 10, minion: 10 }, 4: { power: 'souleater', minionHp: 20 } } },
  { id: 'miner', name: "MINER'S PRIDE", minF: 3, pieces: ['helm', 'gloves', 'boots', 'leather'], b: { 2: { light: 25 }, 3: { gold: 35 }, 4: { power: 'goldheal', mf: 20 } } },
  { id: 'beast', name: 'BEASTMASTER', minF: 9, pieces: ['cloak', 'gloves', 'amulet'], b: { 2: { pet: 35 }, 3: { power: 'petfury', vit: 6 } } },
  { id: 'grave', name: 'GRAVEDIGGER', minF: 12, pieces: ['gloves', 'boots', 'axe', 'cloak'], b: { 2: { dmg: 10 }, 3: { loh: 5 }, 4: { power: 'souleater', str: 8 } } },
  { id: 'ashcrown', name: 'ASHEN CROWN', minF: 40, pieces: ['greathelm', 'amulet', 'ring', 'plate'], b: { 2: { str: 10 }, 3: { dmg: 15 }, 4: { power: 'killboom', hp: 50 } } },
  { id: 'wander', name: 'WANDERER', minF: 4, pieces: ['boots', 'cloak', 'hood', 'ring'], b: { 2: { move: 10 }, 3: { mf: 25 }, 4: { power: 'mend', vit: 6 } } },
  { id: 'blood', name: 'BLOOD OATH', minF: 24, pieces: ['axe', 'ring', 'amulet', 'leather'], b: { 2: { loh: 3 }, 3: { dmg: 12 }, 4: { power: 'emberheart', lohMult: 2 } } },
  { id: 'glacier', name: 'GLACIER HEART', minF: 28, pieces: ['shield', 'plate', 'amulet'], b: { 2: { hp: 40, frost: 6 }, 3: { res: 15, freeze: 15 } } },
  { id: 'shadowp', name: 'SHADOW PACT', minF: 46, pieces: ['dagger', 'cloak', 'ring'], b: { 2: { crit: 10 }, 3: { power: 'executioner', move: 10 } } },
  { id: 'lantern', name: 'LANTERN KEEPER', minF: 8, pieces: ['amulet', 'helm', 'cloak'], b: { 2: { light: 40 }, 3: { power: 'goldheal', mf: 40 } } },
  { id: 'delver', name: 'DEEP DELVER', minF: 52, pieces: ['greatsword', 'plate', 'boots', 'gloves'], b: { 2: { dmg: 15 }, 3: { ias: 10 }, 4: { power: 'triple', str: 12 } } },
  { id: 'scholar', name: 'SCHOLAR', minF: 14, pieces: ['tomeoff', 'robe', 'ring'], b: { 2: { mp: 30, spell: 10 }, 3: { power: 'thirst', spell: 15 } } },
  { id: 'hollow', name: 'HOLLOW KING', minF: 58, pieces: ['greathelm', 'plate', 'mace', 'shield', 'amulet'], b: { 2: { str: 12, vit: 10 }, 4: { dmg: 32 }, 5: { power: 'souleater', res: 10 } } },
  { id: 'spore', name: 'SPORELORD', minF: 30, pieces: ['staff', 'hood', 'robe'], b: { 2: { spell: 18, hp: 40 }, 3: { power: 'killboom', int: 14, res: 8 } } },
  { id: 'tide', name: 'TIDECALLER', minF: 40, pieces: ['bow', 'leather', 'boots'], b: { 2: { frost: 14 }, 3: { power: 'multishot', ias: 12 } } },
  { id: 'forge', name: 'EMBERFORGED', minF: 66, pieces: ['sword', 'gloves', 'helm', 'boots'], b: { 2: { fire: 20 }, 3: { firePct: 35 }, 4: { power: 'burnground', dmg: 25 } } },
  { id: 'abyss', name: 'ABYSSWALKER', minF: 76, pieces: ['hood', 'cloak', 'boots', 'ring', 'amulet'], b: { 2: { move: 12, dmg: 12 }, 3: { crit: 12, critDmg: 20 }, 5: { power: 'stormstrike', dodgeCdr: 30 } } },
  { id: 'heart', name: 'HEARTBREAKER', minF: 86, pieces: ['greatsword', 'greathelm', 'plate', 'amulet'], b: { 2: { dmg: 20 }, 3: { hp: 80 }, 4: { power: 'executioner', critDmg: 40 } } },
];
AH.setOf = id => AH.SETS.find(s => s.id === id);
AH.genSetItem = function (rng, floor, setId) {
  const pool = AH.SETS.filter(s => floor >= s.minF);
  const set = setId ? AH.setOf(setId) : rng.pick(pool.length ? pool : AH.SETS.slice(0, 3));
  const base = rng.pick(set.pieces);
  const it = AH.genItem(rng, Math.max(floor, set.minF), { rarity: 3, base, noSet: true });
  it.rarity = 5; it.set = set.id; delete it.legend; delete it.bargain; delete it.unid; delete it.cursed;
  it.affixes = it.affixes.slice(0, 3);
  const bn = it.kind === 'weapon' ? AH.WEAPONS[base].name : AH.ARMORS[base].name;
  it.name = set.name + ' ' + bn;
  return it;
};
// bonuses active for a list of equipped items: [{set, count, fx[]}]
AH.setBonuses = function (items) {
  const cnt = {};
  for (const it of items) if (it && it.set) cnt[it.set] = (cnt[it.set] || 0) + 1;
  const out = [];
  for (const id in cnt) { const set = AH.setOf(id); if (!set) continue; for (const n in set.b) if (cnt[id] >= +n) out.push({ set, n: +n, fx: set.b[n] }); }
  return { cnt, list: out };
};
// a readable label for a bonus fx
AH.fxLabel = function (fx) {
  const L = { str: v => `+${v} STRENGTH`, dex: v => `+${v} DEXTERITY`, int: v => `+${v} INTELLECT`, vit: v => `+${v} VITALITY`, hp: v => `+${v} MAX LIFE`, mp: v => `+${v} MAX MANA`, armor: v => `+${v} ARMOR`, dmg: v => `+${v}% DAMAGE`, ias: v => `+${v}% ATTACK SPEED`, crit: v => `+${v}% CRIT CHANCE`, critDmg: v => `+${v}% CRIT DAMAGE`, loh: v => `+${v} LIFE ON HIT`, lohMult: v => `LIFE ON HIT X${v}`, fire: v => `+${v} FIRE DAMAGE`, frost: v => `+${v} FROST DAMAGE`, firePct: v => `+${v}% FIRE DAMAGE`, move: v => `+${v}% MOVE SPEED`, light: v => `+${v}% LIGHT RADIUS`, gold: v => `+${v}% GOLD FIND`, mf: v => `+${v}% MAGIC FIND`, thorns: v => `REFLECT ${v} DAMAGE`, mpr: v => `+${v} MANA REGEN`, spell: v => `+${v}% SPELL DAMAGE`, cdr: v => `-${v}% SKILL COOLDOWN`, minion: v => `+${v}% SERVANT DAMAGE`, minionHp: v => `+${v}% SERVANT LIFE`, minions: v => `+${v} MAX SERVANTS`, curse: v => `+${v}% CURSE POWER`, res: v => `-${v}% DAMAGE TAKEN`, block: v => `+${v}% BLOCK`, pet: v => `+${v}% COMPANION DMG`, freeze: v => `+${v}% FREEZE CHANCE`, dodgeCdr: v => `+${v}% FASTER DODGE`, power: v => AH.SET_POWER_LAB(v) };
  return Object.keys(fx).map(k => (L[k] ? L[k](fx[k]) : k));
};
AH.LEGEND_NAMES = {
  sword: ['EMBERBRAND', 'DAWNCUTTER', 'OATHKEEPER', 'THE LAST LIGHT'], greatsword: ['WORLDSPLITTER', 'GRIEF', 'THE ANVIL\'S SON'],
  axe: ['WIDOWMAKER', 'GORESONG', 'FROSTBITE'], mace: ['BONEBREAKER', 'THE PENITENT', 'SAINTFIST'],
  dagger: ['WHISPER', 'THE KISS', 'NIGHTSTING'], bow: ['STARFALL', 'THE LONG GOODBYE', 'HAWKEYE'], staff: ['ASHWOOD', 'STORMCALLER', 'THE CANDLE'], scepter: ['GRAVECALLER', 'THE WAKING BONE', 'LICHFINGER'],
  helm: ['CROWN OF EMBERS', 'FACE OF STONE'], greathelm: ['THE BASTION'], hood: ['SHADOWVEIL', 'NIGHT\'S EMBRACE'], hat: ['ARCHMAGE\'S PEAK', 'STARGAZER'],
  plate: ['HEARTFORGE', 'BULWARK OF DUNMERE'], leather: ['SKIN OF THE HOUND', 'DUSKWALKER'], robe: ['ROBE OF AGES', 'WEAVE OF STARS'],
  gloves: ['IRONGRIP', 'FINGERS OF FLAME'], boots: ['WINDSTRIDE', 'GRAVEWALKERS'], cloak: ['MANTLE OF ASH', 'THE LONG NIGHT'],
  shield: ['THE GATE', 'LAST STAND'], tomeoff: ['BOOK OF ENDINGS', 'THE BLACK PAGE'], ring: ['BAND OF THE MINER', 'THE EMBER LOOP', 'CIRCLE OF GRIEF'], amulet: ['HEART OF DUNMERE', 'THE CANARY\'S EYE'],
};
AH.PREFIX = { str: 'MIGHTY', dex: 'NIMBLE', int: 'WISE', vit: 'STURDY', dmg: 'CRUEL', ias: 'SWIFT', crit: 'KEEN', loh: 'THIRSTY', hp: 'HALE', mp: 'MYSTIC', armor: 'IRONCLAD', fire: 'FIERY', frost: 'FROZEN', move: 'FLEET', light: 'BRIGHT', gold: 'GREEDY', mf: 'LUCKY', thorns: 'SPIKED', potion: 'HERBAL', mpr: 'FLOWING', spell: 'ARCANE', cdr: 'TIMELESS', res: 'WARDED', minion: 'GRAVEBOUND', minionHp: 'BONEKNIT' };
AH.SUFFIX = { str: 'OF THE BEAR', dex: 'OF THE FOX', int: 'OF THE OWL', vit: 'OF THE OX', dmg: 'OF SLAUGHTER', ias: 'OF HASTE', crit: 'OF PRECISION', loh: 'OF THE LEECH', hp: 'OF LIFE', mp: 'OF THE MIND', armor: 'OF THE WALL', fire: 'OF EMBERS', frost: 'OF WINTER', move: 'OF THE WIND', light: 'OF THE LANTERN', gold: 'OF FORTUNE', mf: 'OF LUCK', thorns: 'OF THORNS', potion: 'OF REMEDY', mpr: 'OF FLOW', spell: 'OF SORCERY', cdr: 'OF AGES', res: 'OF WARDING', minion: 'OF THE CRYPT', minionHp: 'OF THE OSSUARY' };
AH.RARE_A = ['DOOM', 'GRIM', 'ASH', 'BLOOD', 'STORM', 'GLOOM', 'BONE', 'DREAD', 'RUNE', 'SOUL', 'DUSK', 'EMBER', 'WRAITH', 'IRON', 'HOLLOW'];
AH.RARE_B = { weapon: ['FANG', 'BITE', 'SONG', 'EDGE', 'CALL', 'BANE', 'REAVER'], armor: ['GUARD', 'SHELL', 'MANTLE', 'HIDE', 'WARD', 'AEGIS'], jewel: ['LOOP', 'EYE', 'TEAR', 'SEAL', 'KNOT', 'STAR'] };

// runes
AH.RUNES = {
  KA: { col: '#ff8a2e', lab: '+FIRE DAMAGE', fx: { fire: 6, dmg: 4 }, glyph: [[4, 2], [4, 3], [5, 3], [3, 4], [4, 4], [5, 4], [3, 5], [5, 5], [4, 6], [5, 6], [6, 5]] },
  ISA: { col: '#9ef0ff', lab: '+FROST DAMAGE', fx: { frost: 5 }, glyph: [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [2, 4], [3, 4], [5, 4], [6, 4], [3, 3], [5, 5], [5, 3], [3, 5]] },
  VOR: { col: '#ff3b3b', lab: '+LIFE ON HIT', fx: { loh: 2 }, glyph: [[2, 2], [6, 2], [3, 3], [5, 3], [3, 4], [5, 4], [4, 5], [4, 6]] },
  TOR: { col: '#ffe04a', lab: '+ATTACK SPEED', fx: { ias: 6 }, glyph: [[5, 2], [4, 3], [3, 4], [4, 4], [5, 4], [5, 5], [4, 6]] },
  EL: { col: '#fff2b0', lab: '+LIGHT RADIUS', fx: { light: 15, hp: 10 }, glyph: [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [5, 6], [6, 6]] },
  MOR: { col: '#e8c25a', lab: '+STRENGTH', fx: { str: 3, dmg: 3 }, glyph: [[2, 6], [2, 5], [2, 4], [2, 3], [3, 2], [4, 3], [5, 2], [6, 3], [6, 4], [6, 5], [6, 6]] },
  SUL: { col: '#8ae08e', lab: '+MOVE SPEED', fx: { move: 5, dex: 2 }, glyph: [[3, 2], [4, 2], [5, 2], [3, 3], [3, 4], [4, 4], [5, 4], [5, 5], [3, 6], [4, 6], [5, 6]] },
  NEX: { col: '#d890ff', lab: '+CRIT CHANCE', fx: { crit: 4 }, glyph: [[2, 2], [6, 2], [3, 3], [5, 3], [4, 4], [3, 5], [5, 5], [2, 6], [6, 6]] },
};
AH.RUNE_ICON = {};
for (const k in AH.RUNES) AH.RUNE_ICON[k] = AH.runeIcon(AH.RUNES[k].col, AH.RUNES[k].glyph);
AH.RUNEWORDS = [
  { runes: ['KA', 'VOR', 'MOR'], name: 'ASHEN OATH', lab: '+40% FIRE, HEAVY HITS BURN THE GROUND', fx: { firePct: 40, power: 'burnground', dmg: 10 } },
  { runes: ['ISA', 'ISA'], name: 'FROSTBITE', lab: 'HITS MAY FREEZE FOES', fx: { freeze: 15, frost: 10 } },
  { runes: ['EL', 'SUL'], name: 'LANTERN DANCE', lab: '+40% LIGHT, +15% MOVE SPEED', fx: { light: 40, move: 15 } },
  { runes: ['TOR', 'NEX', 'TOR'], name: 'STORMCALL', lab: 'CRITS CALL CHAIN LIGHTNING', fx: { power: 'chaincrit', crit: 6 } },
  { runes: ['VOR', 'VOR', 'MOR'], name: 'BLOODTHIRST', lab: 'LIFE ON HIT X3, +20% DAMAGE', fx: { lohMult: 3, dmg: 20 } },
  { runes: ['MOR', 'KA'], name: 'FORGEFIRE', lab: '+25% DAMAGE, +FIRE', fx: { dmg: 25, fire: 10 } },
  { runes: ['NEX', 'SUL', 'NEX'], name: 'SHADOWDANCE', lab: '+25% CRIT, FASTER DODGE', fx: { crit: 25, dodgeCdr: 40 } },
  { runes: ['EL', 'ISA', 'EL'], name: 'WINTER LANTERN', lab: 'DODGE LEAVES FROST NOVA, +LIGHT', fx: { power: 'frostdodge', light: 30 } },
];

// ---------- generation ----------
AH.itemIcon = function (it) {
  if (it.kind === 'rune') return AH.RUNE_ICON[it.rune];
  if (it._icon) return it._icon;
  let ic;
  if (it.kind === 'weapon') {
    const mat = AH.MATERIALS[it.tier].metal;
    const legend = it.rarity >= 3;
    ic = AH.iconRecolor(AH.WEAPONS[it.base].icon, legend ? { s: '#fff2b0', S: '#ffb347', m: '#ffb347', K: '#e0702a' } : { s: mat[0], S: mat[1], m: mat[1], K: mat[2] });
  } else if (it.kind === 'armor') {
    const mat = AH.MATERIALS[it.tier].metal;
    ic = AH.iconRecolor(AH.ARMORS[it.base].icon, { a: mat[0], m: mat[1], n: mat[2], W: mat[0] });
  } else ic = AH.ICON[it.icon || 'scroll'];
  Object.defineProperty(it, '_icon', { value: ic, enumerable: false, writable: true });
  return ic;
};

AH.genItem = function (rng, floor, opt) {
  opt = opt || {};
  const tier = AH.tierOf(floor);
  const mf = opt.mf || 0;
  let rarity = opt.rarity;
  if (rarity === undefined) {
    const r = rng() * 100 / (1 + Math.min(mf, 300) / 100);
    const leg = floor < 10 ? 0 : Math.min(2.5, 0.4 + (floor - 10) * 0.02);
    const rare = floor < 4 ? 0.8 : Math.min(9, 1.5 + floor * 0.12);
    const magic = Math.min(36, 10 + floor * 0.9);
    rarity = r < leg ? 3 : r < leg + rare ? 2 : r < leg + rare + magic ? 1 : 0;
  }
  let kind, base;
  if (opt.base) { base = opt.base; kind = AH.WEAPONS[base] ? 'weapon' : 'armor'; }
  else if (rng() < 0.42) { kind = 'weapon'; base = rng.pick(Object.keys(AH.WEAPONS)); }
  else { kind = 'armor'; base = rng.pick(Object.keys(AH.ARMORS)); }
  const it = { id: AH.uid(), kind, base, tier, ilvl: floor, rarity, affixes: [], sockets: 0, runes: [] };
  const mm = AH.matMult(floor);
  let slotGroup;
  if (kind === 'weapon') {
    const b = AH.WEAPONS[base];
    it.dmg = [Math.max(1, Math.round(b.dmg[0] * mm)), Math.max(2, Math.round(b.dmg[1] * mm))];
    it.slot = 'weapon'; slotGroup = 'weapon';
    it.req = tier >= 2 ? { stat: b.stat, v: 4 + tier * 4 } : null;
  } else {
    const b = AH.ARMORS[base];
    it.armor = Math.round(b.armor * mm);
    it.slot = b.slot; slotGroup = b.slot;
    if (b.reqStr && tier >= 2) it.req = { stat: 'str', v: 2 + tier * 4 };
  }
  const nAff = [(slotGroup === 'ring' || slotGroup === 'amulet') ? 1 : 0, rng.int(1, 2), rng.int(2, 3), 2, 3][rarity];
  const pool = AH.AFFIXES.filter(a => (a.on === 'any' || a.on.split(' ').indexOf(slotGroup) >= 0) && !(a.k === 'loh' && floor < 8));
  const used = {};
  for (let i = 0; i < nAff && pool.length; i++) {
    let a; let guard = 0;
    do { a = rng.pick(pool); guard++; } while (used[a.k] && guard < 20);
    if (used[a.k]) continue;
    used[a.k] = 1;
    let v = a.b + a.t * tier + rng() * (a.b * 0.8 + a.t);
    if (floor < 20) v *= 0.45 + 0.55 * floor / 20; // the first floors give small bonuses
    if (rarity >= 3) v *= 1.3;
    if (floor > 100) v *= 1 + (floor - 100) * 0.02;
    it.affixes.push({ k: a.k, v: Math.max(1, Math.round(v)) });
  }
  // sockets
  const sk = [rng.chance(0.15) ? 1 : 0, rng.int(0, 2), rng.int(1, 2), rng.int(1, 3), 3][rarity];
  if (['weapon', 'chest', 'head', 'off'].indexOf(slotGroup) >= 0) it.sockets = sk;
  if (rarity >= 3) it.legend = rng.pick(AH.LEGEND_POWERS).id;
  if (rarity === 2 && rng.chance(0.15) || rarity === 3 && rng.chance(0.25)) it.bargain = rng.int(0, AH.BARGAINS.length - 1);
  if (slotGroup === 'ring' && rarity > 0 && rng.chance(0.45)) it.unid = 1;
  if (slotGroup === 'ring' && rarity > 0 && rng.chance(0.12)) it.cursed = 1;
  AH.nameItem(it, rng);
  if (!opt.noSet && !opt.base && floor >= 8 && (rarity === 3 && rng.chance(0.4) || rarity === 2 && rng.chance(0.08))) return AH.genSetItem(rng, floor);
  return it;
};
// older saves: a plain ring or amulet with nothing on it gets its one bonus now
AH.fixPlainJewel = function (it) {
  if (!it || it.kind !== 'armor' || (it.rarity || 0) !== 0 || (it.affixes && it.affixes.length)) return;
  const b = AH.ARMORS[it.base]; if (!b || (b.slot !== 'ring' && b.slot !== 'amulet')) return;
  const f = it.ilvl || 1, tier = it.tier || 0, rng = AH.mulberry(AH.hashStr(String(it.id) + it.base));
  const pool = AH.AFFIXES.filter(a => (a.on === 'any' || a.on.split(' ').indexOf(b.slot) >= 0) && !(a.k === 'loh' && f < 8));
  const a = rng.pick(pool); let v = a.b + a.t * tier + rng() * (a.b * 0.8 + a.t); if (f < 20) v *= 0.45 + 0.55 * f / 20;
  it.affixes = [{ k: a.k, v: Math.max(1, Math.round(v)) }];
};
AH.nameItem = function (it, rng) {
  const baseName = it.kind === 'weapon' ? AH.WEAPONS[it.base].name : AH.ARMORS[it.base].name;
  const mat = (it.kind === 'weapon' || (it.kind === 'armor' && ['ring', 'amulet', 'tomeoff', 'robe', 'hood', 'hat', 'cloak'].indexOf(it.base) < 0)) ? AH.MATERIALS[it.tier].name + ' ' : '';
  if (it.rarity === 0) it.name = mat + baseName;
  else if (it.rarity === 1) {
    const a = it.affixes[0], b = it.affixes[1];
    it.name = (a ? AH.PREFIX[a.k] + ' ' : '') + baseName + (b ? ' ' + AH.SUFFIX[b.k] : '');
  } else if (it.rarity === 2) {
    const grp = it.kind === 'weapon' ? 'weapon' : (['ring', 'amulet'].indexOf(it.base) >= 0 ? 'jewel' : 'armor');
    it.name = rng.pick(AH.RARE_A) + ' ' + rng.pick(AH.RARE_B[grp]);
  } else if (it.rarity === 3) it.name = rng.pick(AH.LEGEND_NAMES[it.base] || ['THE NAMELESS']);
  it.typeName = mat + baseName;
};
AH.genMythic = function (rng, floor, legendDef) {
  const bases = Object.keys(AH.WEAPONS).concat(['plate', 'ring', 'amulet', 'cloak', 'helm']);
  // the item is what its name says: a crown is a helm, a fang is a dagger
  const it = AH.genItem(rng, floor + 6, { rarity: 3, base: legendDef.dropBase || rng.pick(bases) });
  it.rarity = 4; it.name = legendDef.drop; it.affixes.forEach(a => a.v = Math.round(a.v * 1.3));
  it.affixes.push({ k: rng.pick(['dmg', 'hp', 'crit', 'res']), v: 10 + AH.tierOf(floor) * 4 });
  it.sockets = Math.max(it.sockets, 2); delete it.bargain; delete it.unid; delete it.cursed;
  return it;
};
AH.genRune = function (rng, floor) {
  const keys = Object.keys(AH.RUNES);
  const r = rng.pick(keys);
  return { id: AH.uid(), kind: 'rune', rune: r, name: r + ' RUNE', rarity: 1, stack: 1 };
};
// the potion belt: how many of each potion a hero can carry
AH.CONS_CAP = { potion: 6, mana: 4 };
AH.capMsg = k => k === 'potion' ? 'YOU CAN CARRY 6 HEALING POTIONS' : 'YOU CAN CARRY 4 MANA POTIONS';
AH.CONSUMABLES = {
  potion: { name: 'HEALING POTION', icon: 'potion', price: 25, stack: 9 },
  mana: { name: 'MANA POTION', icon: 'mana', price: 20, stack: 9 },
  murky: { name: 'MURKY POTION', icon: 'murky', price: 0, stack: 9 },
  torch: { name: 'TORCH', icon: 'torch', price: 12, stack: 9 },
  ore: { name: 'COPPER ORE', icon: 'ore', price: 0, stack: 99, sell: 4 },
  coal: { name: 'COAL', icon: 'coal', price: 0, stack: 99, sell: 2 },
  iron: { name: 'IRON ORE', icon: 'iron', price: 0, stack: 99, sell: 7 },
  silver: { name: 'SILVER ORE', icon: 'silver', price: 0, stack: 99, sell: 12 },
  goldore: { name: 'GOLD ORE', icon: 'goldore', price: 0, stack: 99, sell: 20 },
  mithril: { name: 'MITHRIL ORE', icon: 'mithril', price: 0, stack: 99, sell: 35 },
  gem: { name: 'CRYSTAL', icon: 'gem', price: 0, stack: 99, sell: 15 },
  bomb: { name: 'BOMB', icon: 'bomb', price: 30, stack: 9 },
  key: { name: 'VAULT KEY', icon: 'key', price: 0, stack: 9 },
  idscroll: { name: 'SCROLL OF SIGHT', icon: 'scroll', price: 25, stack: 9 },
  lockpick: { name: 'LOCKPICK', icon: 'lockpick', price: 35, stack: 9 },
};
// which ore the smith needs to work an item of a given tier, and what rocks hold at each depth
AH.ORE_FOR_TIER = ['ore', 'iron', 'silver', 'goldore', 'goldore', 'mithril'];
AH.ORE_COLORS = { coal: ['#0c0a0e', '#2a2630', '#4a4652', '#8a8a96'], ore: ['#3a1a0a', '#a0582a', '#e0904a', '#ffd0a0'], iron: ['#1a1a22', '#5a5a6a', '#9a9aac', '#e0e0ec'], silver: ['#2a2a3a', '#a8a8bc', '#e4e4f2', '#ffffff'], goldore: ['#5a3a14', '#c89030', '#f2d060', '#fff4c0'], mithril: ['#0a3a3a', '#3aa8a0', '#8af0e0', '#e8fff8'] };
AH.oreForFloor = function (f, r) {
  const T = f < 10 ? [['coal', 40], ['ore', 60]] : f < 30 ? [['coal', 15], ['ore', 25], ['iron', 60]] : f < 50 ? [['coal', 10], ['iron', 30], ['silver', 60]] : f < 80 ? [['coal', 10], ['silver', 30], ['goldore', 60]] : [['coal', 10], ['goldore', 35], ['mithril', 55]];
  let x = r * 100; for (const [k, w] of T) { if (x < w) return k; x -= w; } return T[T.length - 1][0];
};
AH.makeCons = function (k, n) { const c = AH.CONSUMABLES[k]; return { id: AH.uid(), kind: 'cons', cons: k, name: c.name, icon: c.icon, rarity: 0, stack: n || 1 }; };
AH.makeTome = function (skill) { return { id: AH.uid(), kind: 'tome', skill, name: 'TOME: ' + AH.SKILLS[skill].name, icon: 'tome', rarity: 2 }; };

AH.itemValue = function (it) {
  if (it.loaner) return 0;
  if (it.kind === 'cons') return (AH.CONSUMABLES[it.cons].sell || Math.floor(AH.CONSUMABLES[it.cons].price / 3)) * (it.stack || 1);
  if (it.kind === 'rune') return 30;
  if (it.kind === 'tome') return 60;
  return Math.floor((6 + it.ilvl * 1.5) * [1, 2.5, 5, 12, 20, 15][it.rarity] / 2);
};
AH.isStackable = it => it.kind === 'cons' || it.kind === 'rune';
AH.sameStack = (a, b) => a.kind === b.kind && (a.kind === 'cons' ? a.cons === b.cons : a.rune === b.rune);

// item tooltip lines [{t, c}]
AH.itemLines = function (it, cls) {
  const L = [];
  const R = AH.RARITY[it.rarity || 0];
  L.push({ t: it.unid ? 'UNKNOWN ' + (it.typeName || it.name) : it.name, c: R.col });
  if ((it.kind === 'weapon' || it.kind === 'armor') && (it.rarity > 0 || it.typeName !== it.name)) L.push({ t: (it.rarity > 0 ? R.name + ' ' : '') + it.typeName, c: '#8d8494' });
  if (it.kind === 'weapon') { const b = AH.WEAPONS[it.base]; L.push({ t: `${it.dmg[0]}-${it.dmg[1]} DAMAGE`, c: '#ffffff' }); L.push({ t: (b.ranged ? 'RANGED' : 'MELEE') + (b.twoHand ? ', TWO-HANDED' : ''), c: '#6f6880' }); }
  if (it.armor) L.push({ t: `${it.armor} ARMOR`, c: '#ffffff' });
  if (it.kind === 'armor' && AH.ARMORS[it.base].block) L.push({ t: `${AH.ARMORS[it.base].block}% BLOCK`, c: '#ffffff' });
  // what the base itself gives (a grimoire's spell power, a robe's mana...), shown even on plain items
  if (it.kind === 'armor' && AH.ARMORS[it.base].bonus) for (const t of AH.fxLabel(AH.ARMORS[it.base].bonus)) L.push({ t, c: '#ffffff' });
  if (it.sockets && !it.unid) {
    const rw = AH.runewordOf(it);
    L.push({ t: `SOCKETS: ${it.runes.join(' ') || '-'} (${it.runes.length}/${it.sockets})`, c: '#a39bb0' });
    for (const r of it.runes) L.push({ t: r + ': ' + AH.RUNES[r].lab, c: AH.RUNES[r].col });
    if (rw) L.push({ t: 'RUNEWORD ' + rw.name + ': ' + rw.lab, c: '#6fbf73' });
  }
  if (it.unid) L.push({ t: 'PUT IT ON OR IDENTIFY IT', c: '#a39bb0' });
  else for (const a of it.affixes || []) {
    const def = AH.AFFIXES.find(x => x.k === a.k);
    const fit = AH.fits(def, cls);
    L.push({ t: def.lab(fit ? Math.round(a.v * 1.5) : a.v), c: fit ? '#8ae08e' : '#9ec0ff' });
  }
  if (it.bargain !== undefined && !it.unid) L.push({ t: 'BARGAIN: ' + AH.BARGAINS[it.bargain].lab, c: '#ff8a8a' });
  if (it.legend) { const p = AH.LEGEND_POWERS.find(p => p.id === it.legend); L.push({ t: 'LEGEND: ' + p.lab, c: '#ffb347' }); }
  if (it.cursed && it.identified) L.push({ t: 'CURSED: CANNOT BE REMOVED', c: '#e05a5a' });
  if (it.set) {
    const set = AH.setOf(it.set), worn = (AH.tooltipEquip || []);
    const have = AH.setBonuses(worn).cnt[it.set] || 0;
    L.push({ t: 'SET: ' + set.name + ' (' + have + '/' + set.pieces.length + ')', c: '#5ee07a' });
    for (const n in set.b) for (const lab of AH.fxLabel(set.b[n])) L.push({ t: '(' + n + ') ' + lab, c: have >= +n ? '#8ae08e' : '#4e6a54' });
  }
  if (it.kind === 'rune') { L.push({ t: AH.RUNES[it.rune].lab, c: '#9ec0ff' }); L.push({ t: 'SOCKET INTO GEAR AT THE SMITH OR IN THE BAG', c: '#6f6880' }); }
  if (it.kind === 'tome') { L.push({ t: AH.SKILLS[it.skill].desc, c: '#9ec0ff' }); L.push({ t: 'READ TO LEARN OR IMPROVE THIS SKILL', c: '#6f6880' }); }
  if (it.kind === 'cons') {
    const d = { potion: 'RESTORES LIFE', mana: 'RESTORES MANA', murky: 'ANYTHING CAN HAPPEN...', torch: 'REFILLS YOUR TORCH', ore: 'THE SMITH NEEDS IT', coal: 'FEEDS YOUR TORCH', iron: 'THE SMITH NEEDS IT', silver: 'THE SMITH NEEDS IT', goldore: 'THE SMITH NEEDS IT', mithril: 'THE SMITH NEEDS IT', gem: 'SELLS WELL', bomb: 'BREAKS WALLS AND FOES', key: 'OPENS A VAULT DOOR', idscroll: 'IDENTIFIES A RING', lockpick: 'OPENS LOCKED CHESTS. THE ROGUE NEEDS NONE.' }[it.cons];
    L.push({ t: d, c: '#9ec0ff' });
  }
  if (it.req) L.push({ t: `REQUIRES ${it.req.v} ${it.req.stat.toUpperCase()}`, c: '#a39bb0' });
  return L;
};
AH.runewordOf = function (it) {
  if (!it.sockets || it.runes.length !== it.sockets) return null;
  return AH.RUNEWORDS.find(rw => rw.runes.length === it.runes.length && rw.runes.every((r, i) => it.runes[i] === r)) || null;
};
