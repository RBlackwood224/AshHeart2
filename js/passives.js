'use strict';
// Passive tree: one big shared web (~140 points). Each class starts on its own side with three themed
// branches that end in a keystone; an outer ring of general points links the classes together.
// Coordinates are in tree space; the menu scrolls around it.
AH.TREE_V = 2;
(function () {
  const N = {}, L = [];
  const CX = 520, CY = 400;
  const node = (id, x, y, t, fx, name, desc) => { N[id] = { x: Math.round(x), y: Math.round(y), t, fx, name, desc }; return id; };
  const link = (a, b) => L.push([a, b]);
  const pol = (a, r) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
  const D = Math.PI / 180;

  node('c', CX, CY, 'heart', { hp: 10, mp: 5, dmg: 3 }, 'ASH HEART');

  // small-point pools per branch: each step picks the next entry
  const CLASSES = [
    { cls: 'paladin', id: 'p', ang: -90, start: { str: 3, hp: 10 }, name: 'PALADIN', branches: [
      { key: 'bastion', small: [{ armor: 6 }, { hp: 10 }, { block: 2 }, { vit: 3 }, { armorPct: 5 }],
        n1: ['IRON FAITH', { res: 5, block: 6 }], n2: ['BULWARK', { armorPct: 20, block: 5 }],
        ks: ['UNBREAKABLE', { block: 15, res: 10, move: -15 }, 'BLOCK AND SHRUG OFF FAR MORE, BUT YOU MOVE SLOWER.'] },
      { key: 'holy', small: [{ fire: 3 }, { dmg: 4 }, { str: 3 }, { firePct: 6 }, { crit: 1 }],
        n1: ['HOLY FIRE', { fire: 8, dmg: 6 }], n2: ['SUNFORGED', { firePct: 20, str: 5 }],
        ks: ['EMBER HEART', { key: 'emberheart' }, 'HEAVY ATTACKS DEAL 60% MORE BUT COST 3% OF YOUR LIFE.'] },
      { key: 'crusade', small: [{ hp: 12 }, { loh: 1 }, { potion: 8 }, { vit: 3 }, { hpPct: 3 }],
        n1: ['LAY ON HANDS', { loh: 3, potion: 20 }], n2: ['VIGIL', { hpPct: 10, vit: 5 }],
        ks: ['MARTYR', { power: 'secondwind', hpPct: -15 }, 'ONCE PER FLOOR, SURVIVE A KILLING BLOW. 15% LESS LIFE.'] },
    ] },
    { cls: 'wizard', id: 'm', ang: 30, start: { int: 3, mp: 10 }, name: 'WIZARD', branches: [
      { key: 'pyre', small: [{ fire: 3 }, { spell: 4 }, { int: 3 }, { firePct: 6 }, { mp: 8 }],
        n1: ['PYROMANCY', { firePct: 20, spell: 6 }], n2: ['CINDERHEART', { fire: 10, spell: 6 }],
        ks: ['ASH STORM', { key: 'ashstorm' }, 'SPELLS DEAL 60% MORE BUT COST 50% MORE MANA.'] },
      { key: 'frost', small: [{ frost: 3 }, { cdr: 2 }, { int: 3 }, { freeze: 4 }, { armor: 4 }],
        n1: ['FROSTFIRE', { frost: 6, fire: 6, spell: 6 }], n2: ["WINTER'S GRASP", { freeze: 15, frost: 6 }],
        ks: ['GLACIER', { power: 'frostdodge', res: 8, move: -10 }, 'DODGING LEAVES A FROST NOVA. TOUGHER, BUT SLOWER.'] },
      { key: 'arcane', small: [{ mp: 10 }, { mpr: 0.5 }, { cdr: 2 }, { int: 3 }, { spell: 3 }],
        n1: ['ARCANE FLOW', { mpr: 2, cdr: 6 }], n2: ['DEEP WELL', { mp: 40, int: 5 }],
        ks: ['SOUL SIPHON', { power: 'thirst', hpPct: -10 }, 'KILLS RESTORE MANA. 10% LESS LIFE.'] },
    ] },
    { cls: 'rogue', id: 'r', ang: 150, start: { dex: 3, crit: 2 }, name: 'ROGUE', branches: [
      { key: 'assassin', small: [{ crit: 1.5 }, { critDmg: 6 }, { dex: 3 }, { dmg: 4 }, { crit: 1 }],
        n1: ['BACKSTAB', { critDmg: 30 }], n2: ['COLD EYES', { crit: 5, critDmg: 15 }],
        ks: ['EXECUTIONER', { power: 'executioner', hpPct: -10 }, 'DEAL 50% MORE TO FOES BELOW 30% LIFE. 10% LESS LIFE.'] },
      { key: 'blades', small: [{ ias: 3 }, { move: 2 }, { dex: 3 }, { dodgeCdr: 5 }, { ias: 2 }],
        n1: ['SHADOWSTEP', { dodgeCdr: 25, move: 5 }], n2: ['FLURRY', { ias: 10, dmg: 5 }],
        ks: ['THOUSAND CUTS', { key: 'thousand' }, '+35% ATTACK SPEED, BUT -15% DAMAGE.'] },
      { key: 'ranger', small: [{ dmg: 4 }, { crit: 1 }, { dex: 3 }, { light: 6 }, { ias: 2 }],
        n1: ['EAGLE EYE', { crit: 4, dmg: 8 }], n2: ['QUIVER', { ias: 6, critDmg: 15 }],
        ks: ['VOLLEY', { power: 'multishot', dmg: -20 }, 'ATTACKS FIRE TWO EXTRA SHOTS, BUT -20% DAMAGE.'] },
    ] },
  ];
  const branchEnds = []; // [classIndex][branchIndex] -> {mid, end}
  CLASSES.forEach((C, ci) => {
    const a0 = C.ang * D;
    const [sx, sy] = pol(a0, 80);
    node(C.id + '0', sx, sy, 'start', C.start, C.name);
    N[C.id + '0'].cls = C.cls;
    link('c', C.id + '0');
    branchEnds[ci] = [];
    C.branches.forEach((B, bi) => {
      const spread = (bi - 1) * 30 * D; // left, middle, right
      // path: 4 small, notable, 3 small, notable, 2 small, keystone
      const kinds = ['s', 's', 's', 's', 'n1', 's', 's', 's', 'n2', 's', 's', 'ks'];
      let prev = C.id + '0', si = 0, mid = null;
      kinds.forEach((k, i) => {
        const r = 80 + 30 + i * 26;
        const bend = Math.sin(i * 0.5) * 6 * D * (bi === 1 ? 0 : (bi === 0 ? -1 : 1));
        const [x, y] = pol(a0 + spread * Math.min(1, (i + 1) / 3) + bend, r);
        const id = C.id + B.key + i;
        if (k === 's') { node(id, x, y, 'small', Object.assign({}, B.small[si % B.small.length])); si++; }
        else if (k === 'n1' || k === 'n2') node(id, x, y, 'notable', B[k][1], B[k][0]);
        else node(id, x, y, 'key', B.ks[1], B.ks[0], B.ks[2]);
        link(prev, id); prev = id;
        if (i === 4) mid = id;
      });
      branchEnds[ci].push({ mid, end: prev, n2: C.id + B.key + 8, three: C.id + B.key + 3 });
    });
    // short cross-links between neighbouring branches of the same class, so paths can swap
    link(C.id + C.branches[0].key + 2, C.id + C.branches[1].key + 2);
    link(C.id + C.branches[1].key + 6, C.id + C.branches[2].key + 6);
  });

  // inner ring around the heart: shared small points between the class starts
  const inner = [];
  for (let k = 0; k < 6; k++) {
    const [x, y] = pol((-60 + k * 60) * D, 62);
    const fx = [{ vit: 4 }, { hp: 12 }, { dmg: 4 }, { mp: 10 }, { vit: 4 }, { armor: 6 }][k];
    inner.push(node('i' + k, x, y, 'small', fx));
  }
  for (let k = 0; k < 6; k++) link(inner[k], inner[(k + 1) % 6]);
  link('p0', 'i5'); link('p0', 'i0'); link('m0', 'i1'); link('m0', 'i2'); link('r0', 'i3'); link('r0', 'i4');

  // outer ring between the classes: wanderers' points with general notables and keystones
  const RING = [
    // between paladin (right branch) and wizard (left branch)
    { from: [0, 2], to: [1, 0], at: -30, pts: [{ mf: 6 }, { mf: 6 }, ['LUCKY STARS', { mf: 20, crit: 3 }], { gold: 8 }, ['GOLDEN TOUCH', { power: 'goldheal', gold: -25 }, 'PICKING UP GOLD HEALS YOU. 25% LESS GOLD.', 'key'], { gold: 8 }, { potion: 10 }] },
    // between wizard (right branch) and rogue (left branch)
    { from: [1, 2], to: [2, 0], at: 90, pts: [{ pet: 10 }, { pet: 10 }, ['BEAST BOND', { pet: 50 }], { vit: 4 }, ['WILD BOND', { power: 'petfury', dmg: -10 }, 'YOUR COMPANION HITS THREE TIMES HARDER. -10% DAMAGE.', 'key'], { pet: 10 }, { hp: 12 }] },
    // between rogue (right branch) and paladin (left branch)
    { from: [2, 2], to: [0, 0], at: 210, pts: [{ light: 8 }, { res: 2 }, ['LANTERN BEARER', { light: 30, res: 3 }], { potion: 10 }, ['SOUL EATER', { power: 'souleater', potion: -50 }, 'KILLS HEAL 3% OF YOUR LIFE. POTIONS HEAL HALF.', 'key'], { vit: 4 }, ['SCAVENGER', { gold: 20, mf: 15 }]] },
  ];
  RING.forEach((R, ri) => {
    const a = R.at * D, n = R.pts.length;
    const ids = R.pts.map((p, k) => {
      const off = (k - (n - 1) / 2) * 7.5 * D;
      const isKey = Array.isArray(p) && p[3] === 'key';
      const rr = isKey ? 410 : 345 + (k % 2) * 10;
      const [x, y] = pol(a + off, rr);
      const id = 'o' + ri + '_' + k;
      if (Array.isArray(p)) node(id, x, y, p[3] === 'key' ? 'key' : 'notable', p[1], p[0], p[2]);
      else node(id, x, y, 'small', p);
      return id;
    });
    // chain them, the keystone hangs off the middle
    const chain = ids.filter((id, k) => !(Array.isArray(R.pts[k]) && R.pts[k][3] === 'key'));
    for (let k = 0; k < chain.length - 1; k++) link(chain[k], chain[k + 1]);
    ids.forEach((id, k) => { if (Array.isArray(R.pts[k]) && R.pts[k][3] === 'key') link(id, chain[Math.min(chain.length - 1, Math.floor(chain.length / 2))]); });
    link(branchEnds[R.from[0]][R.from[1]].n2, chain[0]);
    link(chain[chain.length - 1], branchEnds[R.to[0]][R.to[1]].n2);
  });

  // far ring: late, strong points connecting the outer ends of neighbouring branches
  const FAR = [
    [[0, 2], [1, 0], { hpPct: 8, dmg: 8 }, 'TEMPERED'],
    [[1, 2], [2, 0], { spell: 10, crit: 3 }, 'STARFALL'],
    [[2, 2], [0, 0], { armorPct: 12, ias: 5 }, 'VETERAN'],
  ];
  FAR.forEach(([a, b, fx, name], k) => {
    const [x, y] = pol([-30, 90, 210][k] * D, 200);
    const id = 'far' + k;
    node(id, x, y, 'notable', fx, name);
    link(branchEnds[a[0]][a[1]].three, id); link(id, branchEnds[b[0]][b[1]].three);
  });

  AH.PASSIVES = N; AH.PASSIVE_LINKS = L;
  // bounds for the scrolling view
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const id in N) { x0 = Math.min(x0, N[id].x); y0 = Math.min(y0, N[id].y); x1 = Math.max(x1, N[id].x); y1 = Math.max(y1, N[id].y); }
  AH.TREE_BOUNDS = { x0: x0 - 30, y0: y0 - 30, x1: x1 + 30, y1: y1 + 30 };
})();
AH.passiveNeighbors = function (id) {
  if (!AH._pnCache) { AH._pnCache = {}; for (const [a, b] of AH.PASSIVE_LINKS) { (AH._pnCache[a] = AH._pnCache[a] || []).push(b); (AH._pnCache[b] = AH._pnCache[b] || []).push(a); } }
  return AH._pnCache[id] || [];
};
AH.passiveLabel = function (fx) {
  const parts = [];
  const lab = { str: ' STR', dex: ' DEX', int: ' INT', vit: ' VIT', hp: ' LIFE', mp: ' MANA', armor: ' ARMOR', dmg: '% DAMAGE', ias: '% ATTACK SPEED', crit: '% CRIT', move: '% MOVE', res: '% LESS DAMAGE TAKEN', block: '% BLOCK', fire: ' FIRE DMG', frost: ' FROST DMG', spell: '% SPELL DMG', mpr: ' MANA REGEN', cdr: '% COOLDOWN', gold: '% GOLD', mf: '% MAGIC FIND', light: '% LIGHT', pet: '% COMPANION DMG', potion: '% POTION HEAL', dodgeCdr: '% FASTER DODGE', critDmg: '% CRIT DAMAGE', hpPct: '% LIFE', armorPct: '% ARMOR', firePct: '% FIRE DAMAGE', loh: ' LIFE PER HIT', freeze: '% CHILL CHANCE' };
  for (const k in fx) if (k !== 'key' && k !== 'power') parts.push((fx[k] >= 0 ? '+' : '') + fx[k] + (lab[k] || k));
  return parts;
};
// old saves: refund points spent in the previous, smaller tree
AH.migratePassives = function (ch) {
  if (ch.treeV === AH.TREE_V) return;
  const start = { paladin: 'p0', rogue: 'r0', wizard: 'm0' }[ch.cls];
  ch.ppts = (ch.ppts || 0) + Math.max(0, (ch.passives || []).length - 1);
  ch.passives = [start]; ch.treeV = AH.TREE_V;
};
