'use strict';
// Passive tree: one shared web, each class starts on its own side. Coordinates are in menu space (480x270).
AH.PASSIVES = {
  c: { x: 170, y: 140, t: 'heart', name: 'ASH HEART', fx: { hp: 10, mp: 5 } },
  p0: { x: 170, y: 112, t: 'start', cls: 'paladin', name: 'PALADIN', fx: { str: 3, hp: 10 } },
  p1: { x: 170, y: 88, t: 'small', fx: { armor: 6 } },
  p2: { x: 170, y: 64, t: 'small', fx: { dmg: 6 } },
  pk: { x: 170, y: 34, t: 'key', name: 'EMBER HEART', fx: { key: 'emberheart' }, desc: 'HEAVY ATTACKS DEAL 60% MORE BUT COST 3% OF YOUR LIFE.' },
  pl1: { x: 146, y: 96, t: 'small', fx: { hp: 15 } },
  pl: { x: 126, y: 80, t: 'notable', name: 'IRON FAITH', fx: { res: 6, block: 8 } },
  pr1: { x: 194, y: 96, t: 'small', fx: { str: 4 } },
  pr: { x: 214, y: 80, t: 'notable', name: 'HOLY FIRE', fx: { fire: 8, dmg: 8 } },
  tp: { x: 198, y: 66, t: 'small', fx: { str: 3 } },
  r0: { x: 146, y: 164, t: 'start', cls: 'rogue', name: 'ROGUE', fx: { dex: 3, crit: 2 } },
  r1: { x: 126, y: 184, t: 'small', fx: { ias: 4 } },
  r2: { x: 106, y: 204, t: 'small', fx: { dex: 4 } },
  rk: { x: 84, y: 226, t: 'key', name: 'THOUSAND CUTS', fx: { key: 'thousand' }, desc: '+35% ATTACK SPEED, BUT -15% DAMAGE.' },
  rs1: { x: 116, y: 160, t: 'small', fx: { move: 4 } },
  rs: { x: 94, y: 154, t: 'notable', name: 'SHADOWSTEP', fx: { dodgeCdr: 25, move: 6 } },
  rb1: { x: 146, y: 196, t: 'small', fx: { crit: 3 } },
  rb: { x: 138, y: 222, t: 'notable', name: 'BACKSTAB', fx: { critDmg: 35 } },
  m0: { x: 194, y: 164, t: 'start', cls: 'wizard', name: 'WIZARD', fx: { int: 3, mp: 10 } },
  m1: { x: 214, y: 184, t: 'small', fx: { spell: 6 } },
  m2: { x: 234, y: 204, t: 'small', fx: { int: 4 } },
  mk: { x: 256, y: 226, t: 'key', name: 'ASH STORM', fx: { key: 'ashstorm' }, desc: 'SPELLS DEAL 60% MORE BUT COST 50% MORE MANA.' },
  ms1: { x: 224, y: 160, t: 'small', fx: { mpr: 1 } },
  ms: { x: 246, y: 154, t: 'notable', name: 'ARCANE FLOW', fx: { mpr: 2, cdr: 8 } },
  mb1: { x: 194, y: 196, t: 'small', fx: { mp: 12 } },
  mb: { x: 202, y: 222, t: 'notable', name: 'FROSTFIRE', fx: { fire: 6, frost: 6, spell: 8 } },
  bot: { x: 170, y: 246, t: 'notable', name: 'TWIN PATHS', fx: { dmg: 8, spell: 8 } },
  lr: { x: 100, y: 116, t: 'small', fx: { vit: 4 } },
  rr: { x: 240, y: 116, t: 'small', fx: { vit: 4 } },
  o1: { x: 62, y: 104, t: 'small', fx: { gold: 15 } },
  o2: { x: 278, y: 104, t: 'small', fx: { mf: 15 } },
  o3: { x: 52, y: 176, t: 'notable', name: 'SCAVENGER', fx: { gold: 25, mf: 20 } },
  o4: { x: 288, y: 176, t: 'notable', name: 'LUCKY STARS', fx: { mf: 25, crit: 3 } },
  o5: { x: 112, y: 46, t: 'notable', name: 'LANTERN BEARER', fx: { light: 30, res: 3 } },
  o6: { x: 228, y: 46, t: 'notable', name: 'BEAST BOND', fx: { pet: 60 } },
  o7: { x: 40, y: 140, t: 'small', fx: { potion: 20 } },
  o8: { x: 300, y: 140, t: 'small', fx: { cdr: 5 } },
};
AH.PASSIVE_LINKS = [
  ['c', 'p0'], ['p0', 'p1'], ['p1', 'p2'], ['p2', 'pk'], ['p1', 'pl1'], ['pl1', 'pl'], ['p1', 'pr1'], ['pr1', 'pr'], ['p2', 'tp'], ['tp', 'pr'],
  ['c', 'r0'], ['r0', 'r1'], ['r1', 'r2'], ['r2', 'rk'], ['r0', 'rs1'], ['rs1', 'rs'], ['r1', 'rb1'], ['rb1', 'rb'],
  ['c', 'm0'], ['m0', 'm1'], ['m1', 'm2'], ['m2', 'mk'], ['m0', 'ms1'], ['ms1', 'ms'], ['m1', 'mb1'], ['mb1', 'mb'],
  ['rb', 'bot'], ['bot', 'mb'], ['pl', 'lr'], ['lr', 'rs'], ['pr', 'rr'], ['rr', 'ms'],
  ['lr', 'o1'], ['rr', 'o2'], ['rs', 'o3'], ['ms', 'o4'], ['pl', 'o5'], ['pr', 'o6'], ['o1', 'o7'], ['o2', 'o8'], ['o7', 'o3'], ['o8', 'o4'],
];
AH.passiveNeighbors = function (id) {
  const n = []; for (const [a, b] of AH.PASSIVE_LINKS) { if (a === id) n.push(b); else if (b === id) n.push(a); } return n;
};
AH.passiveLabel = function (fx) {
  const parts = [];
  const lab = { str: ' STR', dex: ' DEX', int: ' INT', vit: ' VIT', hp: ' LIFE', mp: ' MANA', armor: ' ARMOR', dmg: '% DAMAGE', ias: '% ATTACK SPEED', crit: '% CRIT', move: '% MOVE', res: '% LESS DAMAGE TAKEN', block: '% BLOCK', fire: ' FIRE DMG', frost: ' FROST DMG', spell: '% SPELL DMG', mpr: ' MANA REGEN', cdr: '% COOLDOWN', gold: '% GOLD', mf: '% MAGIC FIND', light: '% LIGHT', pet: '% COMPANION DMG', potion: '% POTION HEAL', dodgeCdr: '% FASTER DODGE', critDmg: '% CRIT DAMAGE' };
  for (const k in fx) if (k !== 'key') parts.push('+' + fx[k] + (lab[k] || k));
  return parts;
};
