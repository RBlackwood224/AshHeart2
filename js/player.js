'use strict';
// Characters (persisted) and Player (runtime)
AH.PLAYER_COLORS = ['#ff9a8a', '#8ae08e', '#9ec0ff'];
AH.PETS = {
  canary: { name: 'CANARY', desc: 'WARNS OF NEARBY ENEMIES AND LEGENDARY BEASTS.', spr: 'canary' },
  dog: { name: 'DOG', desc: 'DIGS UP TREASURE AND BITES YOUR FOES.', spr: 'dog' },
  rat: { name: 'RAT', desc: 'COLLECTS GOLD AND SNIFFS OUT SECRET WALLS.', spr: 'pet_rat' },
};
// every level takes longer than the last: the deeper you are, the more you farm for the next one
AH.xpNeed = L => Math.floor(30 + 20 * L + 8 * L * L + 0.25 * L * L * L);

AH.newCharacter = function (cls, name, pet, hardcore) {
  const C = AH.CLASSES[cls];
  const rng = AH.mulberry(AH.hashStr(name + cls + Date.now()));
  const ch = {
    v: 1, name, cls, pet, hardcore: !!hardcore, level: 1, xp: 0, base: Object.assign({}, C.base), pts: 0, ppts: 0,
    passives: [AH.CLASS_START[cls]], treeV: AH.TREE_V, skills: {}, slots: [C.skills[0], null, null],
    equip: {}, bag: new Array(40).fill(null), gold: 30, deepest: 0, lifts: [], kills: 0, deaths: 0,
    bestiary: {}, created: Date.now(), playTime: 0, bestTimes: {}, storyDone: false,
  };
  ch.skills[C.skills[0]] = 1;
  const w = AH.genItem(rng, 1, { rarity: 0, base: C.start.weapon }); ch.equip.weapon = w;
  if (C.start.off) ch.equip.off = AH.genItem(rng, 1, { rarity: 0, base: C.start.off });
  const head = { paladin: 'helm', rogue: 'hood', wizard: 'hat', necro: 'hood' }[cls];
  ch.equip.head = AH.genItem(rng, 1, { rarity: 0, base: head });
  ch.equip.chest = AH.genItem(rng, 1, { rarity: 0, base: { paladin: 'plate', rogue: 'leather', wizard: 'robe', necro: 'robe' }[cls] });
  ch.equip.chest.req = null;
  ch.bag[0] = AH.makeCons('potion', 3);
  ch.bag[1] = AH.makeCons('torch', 3);
  if (AH.isCaster(cls)) ch.bag[2] = AH.makeCons('mana', 2);
  return ch;
};

AH.Player = function (pid, ch, device) {
  this.pid = pid; this.ch = ch; this.device = device || null;
  this.color = AH.PLAYER_COLORS[pid % 3];
  this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.face = 1; this.aim = 0;
  this.state = 'idle'; this.st = 0; this.anim = 0; this.walkT = 0;
  this.cd = { atk: 0, dodge: 0, pot: 0, mana: 0 }; this.skillCd = {};
  this.inv = 0; this.flash = 0; this.dead = false; this.reviveT = 0;
  this.buffs = {}; this.hitList = new Set(); this.hitCount = 0; this.nextCrit = false;
  this.torch = 100; this.slow = 0; this.poison = 0;
  if (AH.migratePassives) AH.migratePassives(ch);
  if (AH.fixPlainJewel) { for (const k in ch.equip) AH.fixPlainJewel(ch.equip[k]); for (const it of ch.bag) AH.fixPlainJewel(it); }
  this.recalc();
  this.hp = this.S.hp; this.mp = this.S.mp;
};
const P = AH.Player.prototype;

P.weapon = function () { return this.ch.equip.weapon || null; };
P.wbase = function () { const w = this.weapon(); return w ? AH.WEAPONS[w.base] : { dmg: [2, 4], spd: 0.4, range: 14, arc: 1.4, stat: 'str', name: 'FISTS' }; };

P.recalc = function () {
  const ch = this.ch, C = AH.CLASSES[ch.cls];
  const S = { str: ch.base.str, dex: ch.base.dex, int: ch.base.int, vit: ch.base.vit, hp: 0, mp: 0, armor: 0, dmg: 0, ias: 0, crit: 0, critDmg: 0, loh: 0, lohMult: 1, fire: 0, frost: 0, move: 0, light: 0, gold: 0, mf: 0, thorns: 0, potion: 0, mpr: 0, spell: 0, cdr: 0, res: 0, block: 0, pet: 0, dodgeCdr: 0, freeze: 0, firePct: 0, hpPct: 0, armorPct: 0, noMpr: 0, enemySpd: 0, minion: 0, minionHp: 0, minions: 0, curse: 0, powers: new Set(), keys: new Set(), runewords: [] };
  const add = (fx, mult) => { for (const k in fx) { if (k === 'power') S.powers.add(fx[k]); else if (k === 'key') S.keys.add(fx[k]); else if (k === 'lohMult') S.lohMult *= fx[k]; else if (k === 'noMpr') S.noMpr = 1; else S[k] = (S[k] || 0) + fx[k] * (mult || 1); } };
  for (const slot of AH.EQUIP_SLOTS) {
    const it = ch.equip[slot]; if (!it) continue;
    if (it.armor) S.armor += it.armor;
    if (it.kind === 'armor') { const b = AH.ARMORS[it.base]; if (b.bonus) add(b.bonus); if (b.block) S.block += b.block; }
    if (!it.unid) for (const a of it.affixes) { const def = AH.AFFIXES.find(x => x.k === a.k); S[a.k] = (S[a.k] || 0) + a.v * (AH.fits(def, ch.cls) ? 1.5 : 1); }
    if (it.bargain !== undefined && !it.unid) add(AH.BARGAINS[it.bargain].fx);
    if (it.legend) S.powers.add(it.legend);
    for (const r of it.runes || []) add(AH.RUNES[r].fx);
    const rw = AH.runewordOf(it); if (rw) { add(rw.fx); S.runewords.push(rw.name); }
  }
  const sb = AH.setBonuses(Object.values(ch.equip));
  for (const b of sb.list) add(b.fx);
  S.sets = sb;
  for (const id of ch.passives) { const n = AH.PASSIVES[id]; if (n) add(n.fx); }
  S.hp += C.hp + S.vit * 5 + (ch.level - 1) * 5; S.hp = Math.round(S.hp * (1 + S.hpPct / 100));
  S.mp += C.mp + S.int * 3 + (ch.level - 1) * 2;
  S.armor = Math.round(S.armor * (1 + S.armorPct / 100));
  S.crit += 5 + S.dex * 0.3 + (this.wbase().crit || 0);
  if (ch.cls === 'rogue') { S.critDmg += 10; S.evade = 12; } // assassin's edge, and a knack for not being where the blow lands
  if (ch.cls === 'paladin') { S.armorPct += 20; S.res += 5; } // holy plate: the sturdiest hero
  if (ch.cls === 'wizard') S.spell += 25 + Math.min(80, Math.round(ch.level * 1.25)); // arcane training grows with every level
  if (ch.cls === 'necro') { S.spell += 10; S.minion += 10; S.res += 5; } // the grave answers him
  S.maxMinions = 2 + S.minions + (S.keys.has('army') ? 2 : 0);
  S.speed = C.speed * (1 + S.move / 100);
  S.light = Math.max(-50, S.light);
  if (S.keys.has('thousand')) { S.ias += 35; S.dmg -= 15; }
  S.mprTotal = S.noMpr ? 0 : (0.8 + S.int * 0.06 + S.mpr + (this.wbase().mpr ? 1 : 0));
  this.S = S;
  if (this.hp > S.hp) this.hp = S.hp; if (this.mp > S.mp) this.mp = S.mp;
  this.buildLook();
};

P.buildLook = function () {
  const ch = this.ch, C = AH.CLASSES[ch.cls], eq = ch.equip;
  const pal = Object.assign({}, AH.CLASS_PAL[ch.cls]);
  const look = { pal, legs: 'pants' };
  const rarCol = r => ['#8a8494', '#4a6ad0', '#c8a03a', '#e0702a', '#a050d0', '#3aa85a'][r || 0];
  // chest
  const chest = eq.chest;
  if (chest) {
    const b = AH.ARMORS[chest.base]; look.torso = b.look;
    const mat = AH.MATERIALS[chest.tier].metal;
    if (b.look === 'plate') { pal.a = mat[0]; pal.m = mat[1]; pal.n = mat[2]; if (chest.rarity >= 1) { pal.t = rarCol(chest.rarity); pal.T = AH.shade(pal.t, 0.6); } }
    else if (b.look === 'leather') { const lc = ['#8a6440', '#7a5a3a', '#5a4a3a', '#6a5a5a', '#4a6a64', '#5a3a32'][chest.tier]; pal.a = AH.shade(lc, 1.2); pal.m = lc; pal.n = AH.shade(lc, 0.65); }
    else { const rc = chest.rarity ? rarCol(chest.rarity) : (ch.cls === 'necro' ? AH.CLASS_PAL.necro.m : AH.CLASS_PAL.wizard.m); pal.a = AH.shade(rc, 1.25); pal.m = rc; pal.n = AH.shade(rc, 0.6); look.legs = 'robe'; pal.x = '#e8c25a'; pal.X = '#a8823a'; }
  } else { look.torso = 'leather'; pal.a = '#b8a888'; pal.m = '#9a8a6a'; pal.n = '#6a5a4a'; }
  if (ch.cls === 'wizard' && chest && AH.ARMORS[chest.base].look === 'robe') look.legs = 'robe';
  if (ch.cls === 'necro' && look.torso === 'robe') { pal.x = '#5a8a4a'; pal.X = '#3a5a34'; pal.g = AH.shade(pal.m, 1.35); }
  // head
  const head = eq.head;
  if (head) {
    const b = AH.ARMORS[head.base]; look.head = b.look;
    if (b.look === 'hat' && ch.cls === 'wizard') look.head = 'beard';
    const mat = AH.MATERIALS[head.tier].metal;
    if (b.look === 'helm' || b.look === 'greathelm') { pal.W = mat[0]; pal.w = mat[1]; pal.k = mat[2]; pal.K = AH.shade(mat[2], 0.7); if (head.rarity) { pal.p = rarCol(head.rarity); pal.P = AH.shade(pal.p, 0.6); } }
    if (b.look === 'hood') { const hc = head.rarity ? rarCol(head.rarity) : AH.CLASS_PAL[ch.cls === 'necro' ? 'necro' : 'rogue'].h; pal.h = hc; pal.H = AH.shade(hc, 0.6); }
    if (b.look === 'hat') { const hc = head.rarity ? rarCol(head.rarity) : AH.CLASS_PAL.wizard.U; pal.U = hc; pal.u = AH.shade(hc, 1.3); pal.q = AH.shade(hc, 0.6); }
    if (head.rarity === 4) look.head = 'crown';
  } else { look.head = 'bare'; pal.h = ch.cls === 'wizard' ? '#c8c0b0' : ch.cls === 'rogue' ? '#3a2a1a' : ch.cls === 'necro' ? '#d8d4cc' : '#6a3a20'; }
  if (ch.cls === 'necro') look.emissive = 'e'; // eyes that glow in the dark
  // held
  const w = eq.weapon;
  const hp = {};
  if (w) {
    const b = AH.WEAPONS[w.base]; look.held = b.held;
    const mat = AH.MATERIALS[w.tier].metal;
    if (w.rarity >= 3) { hp.s = '#fff2b0'; hp.S = '#ffb347'; hp.k = '#ffb347'; hp.K = '#e0702a'; hp.c = '#ffd36a'; hp.C = '#ff8a2e'; }
    else { hp.s = mat[0]; hp.S = mat[1]; hp.k = mat[1]; hp.K = mat[2]; if (w.rarity === 1) { hp.c = '#9ec0ff'; hp.C = '#4a7bd1'; } if (w.rarity === 2) { hp.c = '#f2d36a'; hp.C = '#c8a03a'; } }
    if (w.runes && w.runes.indexOf('KA') >= 0) hp.S = '#ff8a2e';
    if (w.runes && w.runes.indexOf('ISA') >= 0) hp.S = '#9ef0ff';
  }
  const off = eq.off;
  if (off) { look.off = AH.ARMORS[off.base].held; const mat = AH.MATERIALS[off.tier].metal; if (look.off === 'shield') { hp.h = off.rarity ? AH.shade(rarCol(off.rarity), 0.8) : '#7a5232'; hp.H = AH.shade(hp.h, 0.6); hp.g = mat[0]; } if (look.off === 'tome' && off.rarity) { hp.p = rarCol(off.rarity); hp.P = AH.shade(hp.p, 0.6); } }
  look.heldPal = hp;
  this.look = look;
  this.spr = [AH.composeHumanoid(look, 0), AH.composeHumanoid(look, 1), AH.composeHumanoid(look, 2)];
  const noW = Object.assign({}, look, { held: null });
  this.sprAtk = AH.composeHumanoid(noW, 0);
  // standalone weapon sprite (pointing up) and rotated to point right
  if (look.held) {
    const it = AH.HELD[look.held];
    const pal2 = {}; for (const k in AH.HELD_PAL) pal2[k] = hp[k] || AH.HELD_PAL[k];
    const ws = AH.sprite(it.g, pal2);
    this.wSpr = ws; this.wSprR = AH.rotSpr(ws, 1);
  } else { this.wSpr = null; this.wSprR = null; }
  this.portrait = AH.composeHumanoid(Object.assign({}, look, { held: null, off: null }), 0);
};

P.mainStat = function () { return this.S[this.wbase().stat] || 0; };
P.rollDamage = function (mult, opt) {
  opt = opt || {};
  const w = this.weapon(); const b = this.wbase();
  const range = w ? w.dmg : b.dmg;
  let d = range[0] + Math.random() * (range[1] - range[0]);
  d *= 1 + this.mainStat() * 0.03;
  d *= 1 + this.S.dmg / 100;
  d *= mult || 1;
  if (this.buffs.fury > 0) d *= 1.3;
  if (this.S.powers.has('emberheart') && this.hp < this.S.hp * 0.5) d *= 1.4;
  if (this.S.powers.has('lastlight') && this.hp < this.S.hp * 0.3) d *= 1.4;
  const fire = this.S.fire * (1 + this.S.firePct / 100) * (mult || 1);
  const frost = this.S.frost * (mult || 1);
  let crit = Math.random() * 100 < this.S.crit || this.nextCrit;
  if (opt.noCrit) crit = false;
  if (crit) { d *= 1.75 + this.S.critDmg / 100; this.nextCrit = false; }
  return { dmg: d + fire + frost, crit, fire: fire > 0, frost: frost > 0, freeze: this.S.freeze };
};
P.spellPower = function (base) {
  // spells grow with the weapon in hand (better staves hit harder) and multiply with intellect, like weapons do with their stat
  const w = this.weapon(), wa = w ? (w.dmg[0] + w.dmg[1]) / 2 : 3;
  let m = (base * 1.6 + wa + this.ch.level * 0.5) * (1 + this.S.int * 0.03) * (1 + this.S.spell / 100);
  if (this.S.keys.has('ashstorm')) m *= 1.4;
  if (this.S.keys.has('bloodmagic')) m *= 1.3;
  if (this.S.powers.has('lastlight') && this.hp < this.S.hp * 0.3) m *= 1.4;
  return m;
};
P.manaCost = function (c) { return Math.round(c * (this.S.keys.has('ashstorm') ? 1.4 : 1)); };
// a servant's hit: grows with spell power and servant damage
P.minionPower = function () { return this.spellPower(4) * 0.85 * (1 + this.S.minion / 100) * (this.S.keys.has('army') ? 0.75 : 1); };
P.atkTime = function () { return this.wbase().spd / (1 + this.S.ias / 100); };

P.gainXp = function (G, n) {
  if (this.remote && G.isHost) { G.netEvent('xp', this, n); return; }
  const ch = this.ch; ch.xp += n;
  let up = false;
  while (ch.xp >= AH.xpNeed(ch.level) && ch.level < 99) {
    ch.xp -= AH.xpNeed(ch.level); ch.level++; ch.pts += 3; ch.ppts += 1;
    const C = AH.CLASSES[ch.cls]; ch.base[C.stat] += 1; ch.base.vit += 1;
    up = true;
  }
  if (up) {
    const C = AH.CLASSES[ch.cls];
    [[4, 1], [8, 2]].forEach(([lv, i]) => {
      const sk = C.skills[i];
      if (ch.level >= lv && !ch.skills[sk]) {
        ch.skills[sk] = 1;
        const free = ch.slots.indexOf(null); if (free >= 0) ch.slots[free] = sk;
        G.banner('NEW SKILL: ' + AH.SKILLS[sk].name, '#9ec0ff', AH.SKILLS[sk].desc);
      }
    });
    this.recalc(); this.hp = this.S.hp; this.mp = this.S.mp;
    AH.Audio.sfx('levelup');
    G.toast(this, 'LEVEL ' + ch.level + '! POINTS TO SPEND', '#f2c94c');
    AH.fx.ring(G, this.x, this.y - 8, '#f2c94c', 30);
  }
};

// bag helpers
P.bagFree = function () { return this.ch.bag.indexOf(null); };
P.addItem = function (it) {
  const bag = this.ch.bag;
  AH.fixPlainJewel && AH.fixPlainJewel(it);
  if (it && it.set) { const f = this.ch.setsFound = this.ch.setsFound || {}; const l = f[it.set] = f[it.set] || []; if (l.indexOf(it.base) < 0) l.push(it.base); }
  if (AH.isStackable(it)) {
    for (const b of bag) if (b && AH.sameStack(b, it)) { const max = it.kind === 'rune' ? 9 : AH.CONSUMABLES[it.cons].stack; if (b.stack < max) { const n = Math.min(max - b.stack, it.stack); b.stack += n; it.stack -= n; if (it.stack <= 0) return true; } }
  }
  const i = this.bagFree(); if (i < 0) return false;
  bag[i] = it; return true;
};
P.countCons = function (k) { let n = 0; for (const b of this.ch.bag) if (b && b.kind === 'cons' && b.cons === k) n += b.stack; return n; };
P.takeCons = function (k, n) {
  n = n || 1;
  if (this.remote && AH.game && AH.game.isHost) AH.game.netEvent('take', this, k, n);
  for (let i = 0; i < this.ch.bag.length && n > 0; i++) { const b = this.ch.bag[i]; if (b && b.kind === 'cons' && b.cons === k) { const t = Math.min(n, b.stack); b.stack -= t; n -= t; if (b.stack <= 0) this.ch.bag[i] = null; } }
  return n <= 0;
};
P.canEquip = function (it) {
  if (!it || (it.kind !== 'weapon' && it.kind !== 'armor')) return false;
  if (it.req && (this.ch.base[it.req.stat] + 0) < it.req.v && this.S[it.req.stat] < it.req.v) return false;
  return true;
};
P.slotFor = function (it) {
  if (it.kind === 'weapon') return 'weapon';
  const s = AH.ARMORS[it.base].slot;
  if (s === 'ring') return !this.ch.equip.ring1 ? 'ring1' : !this.ch.equip.ring2 ? 'ring2' : 'ring1';
  return s;
};
P.equipFromBag = function (G, i) {
  const ch = this.ch, it = ch.bag[i];
  if (!this.canEquip(it)) { AH.Audio.sfx('error'); G.toast(this, it && it.req ? 'NEED ' + it.req.v + ' ' + it.req.stat.toUpperCase() : 'CANNOT EQUIP', '#ff8a8a'); return false; }
  const slot = this.slotFor(it);
  const cur = ch.equip[slot];
  if (cur && cur.cursed) { AH.Audio.sfx('error'); G.toast(this, 'IT IS CURSED! THE PRIEST CAN HELP.', '#e05a5a'); return false; }
  ch.bag[i] = cur || null;
  ch.equip[slot] = it;
  if (it.unid) { it.unid = 0; it.identified = 1; G.toast(this, 'REVEALED: ' + it.name, AH.RARITY[it.rarity].col); if (it.cursed) { AH.Audio.sfx('warn'); G.toast(this, 'A CURSE TIGHTENS AROUND YOUR FINGER!', '#e05a5a'); } }
  if (it.kind === 'weapon' && AH.WEAPONS[it.base].twoHand && ch.equip.off) { const off = ch.equip.off; ch.equip.off = null; if (!this.addItem(off)) G.dropItem(this.x, this.y, off, this.pid); }
  if (slot === 'off' && ch.equip.weapon && AH.WEAPONS[ch.equip.weapon.base].twoHand) { const w = ch.equip.weapon; ch.equip.weapon = null; if (!this.addItem(w)) G.dropItem(this.x, this.y, w, this.pid); }
  this.recalc(); AH.Audio.sfx('pickup');
  G.onLocalEquip && G.onLocalEquip(this);
  return true;
};
P.unequip = function (G, slot) {
  const it = this.ch.equip[slot]; if (!it) return;
  if (it.cursed) { AH.Audio.sfx('error'); G.toast(this, 'IT IS CURSED! THE PRIEST CAN HELP.', '#e05a5a'); return; }
  if (this.bagFree() < 0) { G.toast(this, 'BAG IS FULL', '#ff8a8a'); return; }
  this.ch.equip[slot] = null; this.addItem(it); this.recalc(); AH.Audio.sfx('move');
  G.onLocalEquip && G.onLocalEquip(this);
};
P.useItem = function (G, i) {
  const it = this.ch.bag[i]; if (!it) return;
  if (it.kind === 'weapon' || it.kind === 'armor') return this.equipFromBag(G, i);
  if (it.kind === 'tome') {
    const s = it.skill; this.ch.skills[s] = (this.ch.skills[s] || 0) + 1;
    if (this.ch.slots.indexOf(s) < 0 && this.ch.skills[s] === 1) {
      const empty = this.ch.slots.indexOf(null); if (empty >= 0) this.ch.slots[empty] = s;
    }
    this.ch.bag[i] = null; AH.Audio.sfx('magic');
    G.toast(this, AH.SKILLS[s].name + ' RANK ' + this.ch.skills[s], '#9ec0ff'); return;
  }
  if (it.kind === 'cons') {
    const k = it.cons;
    if (k === 'potion') return this.drink(G, 'potion');
    if (k === 'mana') return this.drink(G, 'mana');
    if (k === 'murky') return this.drink(G, 'murky');
    if (k === 'coal') { if (this.torch >= 100) { G.toast(this, 'YOUR TORCH BURNS BRIGHT', '#a39bb0'); return; } this.torch = Math.min(100, this.torch + 40); this.takeCons('coal'); AH.Audio.sfx('pickup'); G.toast(this, 'COAL FEEDS THE FLAME', '#ffb347'); return; }
    if (k === 'torch') { this.torch = 100; this.takeCons('torch'); AH.Audio.sfx('pickup'); G.toast(this, 'FRESH TORCH', '#ffb347'); return; }
    if (k === 'idscroll') {
      const ring = this.ch.bag.find(b => b && b.unid);
      if (!ring) { G.toast(this, 'NOTHING TO IDENTIFY', '#a39bb0'); return; }
      ring.unid = 0; ring.identified = 1; this.takeCons('idscroll'); AH.Audio.sfx('magic');
      G.toast(this, 'IDENTIFIED: ' + ring.name + (ring.cursed ? ' (CURSED!)' : ''), ring.cursed ? '#e05a5a' : AH.RARITY[ring.rarity].col); return;
    }
    if (k === 'bomb') { if (G.scene === 'mine') { this.takeCons('bomb'); G.spawnBomb(this); } return; }
  }
};
P.drink = function (G, k) {
  if (k === 'potion') {
    if (this.cd.pot > 0 || !this.countCons('potion')) { if (!this.countCons('potion')) G.toast(this, 'NO POTIONS!', '#ff8a8a'); return; }
    if (this.hp >= this.S.hp) { G.toast(this, 'YOU FEEL FINE', '#a39bb0'); return; }
    this.takeCons('potion'); this.cd.pot = 4;
    const heal = this.S.hp * 0.3 * (1 + this.S.potion / 100);
    this.heal(G, heal); AH.Audio.sfx('drink'); return;
  }
  if (k === 'mana') {
    if (this.cd.mana > 0 || !this.countCons('mana')) { if (!this.countCons('mana')) G.toast(this, 'NO MANA POTIONS!', '#9ec0ff'); return; }
    this.takeCons('mana'); this.cd.mana = 1.2; this.mp = Math.min(this.S.mp, this.mp + this.S.mp * 0.6); AH.Audio.sfx('drink'); return;
  }
  if (k === 'murky') {
    this.takeCons('murky'); AH.Audio.sfx('drink');
    const r = Math.random();
    if (r < 0.2) { this.hp = this.S.hp; G.toast(this, 'FULLY HEALED!', '#8ae08e'); }
    else if (r < 0.38) { this.hurt(G, this.S.hp * 0.25, null, true); G.toast(this, 'UGH. POISON!', '#9ad84a'); }
    else if (r < 0.52) { this.gainXp(G, AH.xpNeed(this.ch.level) * 0.3); G.toast(this, 'YOUR MIND EXPANDS!', '#f2c94c'); }
    else if (r < 0.64) { this.torch = 100; this.mp = this.S.mp; G.toast(this, 'MANA AND TORCH RESTORED!', '#9ec0ff'); }
    else if (r < 0.74) { this.ch.base.vit += 1; this.recalc(); G.toast(this, 'PERMANENT +1 VITALITY!', '#ffb347'); }
    else if (r < 0.86) { this.buffs.haste = 15; G.toast(this, 'YOU FEEL FAST!', '#8ae08e'); }
    else { this.slow = 6; G.toast(this, 'YOUR LEGS FEEL LIKE LEAD...', '#ff8a8a'); }
  }
};
P.heal = function (G, n) {
  if (this.dead) return;
  const before = this.hp; this.hp = Math.min(this.S.hp, this.hp + n);
  const d = Math.round(this.hp - before);
  if (d > 0 && G) AH.fx.num(G, this.x, this.y - 22, '+' + d, '#8ae08e');
};
P.hurt = function (G, dmg, src, raw) {
  if (G.rumble && !this.dead) G.rumble(this, Math.min(1, 0.25 + dmg / Math.max(1, this.S.hp) * 2), 140);
  if (this.dead || (this.inv > 0 && !raw)) return 0;
  if (!raw && this.S.evade > 0 && Math.random() * 100 < this.S.evade) { AH.fx.num(G, this.x, this.y - 22, 'DODGE', '#8ae08e'); this.inv = 0.15; return 0; }
  if (!raw && this.S.block > 0 && Math.random() * 100 < Math.min(50, this.S.block)) { AH.fx.num(G, this.x, this.y - 22, 'BLOCK', '#9ec0ff'); AH.Audio.sfx('block'); this.inv = 0.15; return 0; }
  let d = dmg;
  if (!raw) {
    const fl = Math.max(1, G.floorNo || 1);
    d *= 1 - this.S.armor / (this.S.armor + 40 + fl * 9);
    d *= 1 - Math.min(60, this.S.res) / 100;
    if (this.buffs.aegis > 0) d *= 0.5;
  }
  d = Math.max(1, Math.round(d));
  this.hp -= d; this.flash = 0.12; this.inv = raw ? 0 : 0.45;
  if (this.hp <= 0 && this.ch.hardcore && !this.lbUsed && (!this.S.powers.has('secondwind') || this.swUsed)) { this.lbUsed = true; this.hp = 1; this.inv = 2; G.toast(this, 'LAST BREATH! ONE MORE MISTAKE ON THIS FLOOR IS DEATH', '#ff6a5a'); AH.fx.ring(G, this.x, this.y - 8, '#ff6a5a', 30); AH.Audio.sfx('warn'); }
  if (this.hp <= 0 && this.S.powers.has('secondwind') && !this.swUsed) { this.swUsed = true; this.hp = Math.round(this.S.hp * 0.3); this.inv = 1.5; G.toast(this, 'SECOND WIND!', '#f2c94c'); AH.fx.ring(G, this.x, this.y - 8, '#f2c94c', 30); }
  AH.fx.num(G, this.x, this.y - 22, '-' + d, '#ff6a5a');
  AH.Audio.sfx('hurt');
  G.shake(2);
  if (src && src.hurt && this.S.thorns > 0) src.hurt(G, this.S.thorns * (this.S.powers.has('bleed') ? 2 : 1), this, { noXp: false, thorns: 1 });
  if (src && src.hurt && this.S.powers.has('bleed')) src.bleed = 3;
  if (this.hp <= 0) { this.hp = 0; G.playerDown(this, src); }
  return d;
};

// ---------- update ----------
P.update = function (G, dt, pad) {
  const S = this.S;
  for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] -= dt;
  for (const k in this.skillCd) if (this.skillCd[k] > 0) this.skillCd[k] -= dt;
  for (const k in this.buffs) if (this.buffs[k] > 0) this.buffs[k] -= dt;
  if (this.inv > 0) this.inv -= dt;
  if (this.flash > 0) this.flash -= dt;
  if (this.slow > 0) this.slow -= dt;
  if (this.dead) { this.updateDead(G, dt, pad); return; }
  // regen
  if (!S.noMpr) this.mp = Math.min(S.mp, this.mp + S.mprTotal * dt);
  if (S.powers.has('mend')) this.hp = Math.min(S.hp, this.hp + S.hp * 0.01 * dt);
  if (G.scene === 'town') { this.hp = Math.min(S.hp, this.hp + S.hp * 0.08 * dt); this.mp = Math.min(S.mp, this.mp + S.mp * 0.1 * dt); }
  // torch burns in the mine from floor 6
  if (G.scene === 'mine' && G.floorNo >= 6) {
    const burn = (G.map && G.map.biome.id === 'sunken' ? 1.6 : 1) * (G.event === 'flooded' ? 1.3 : 1);
    this.torch = Math.max(0, this.torch - dt * 0.55 * burn);
    if (this.torch <= 0 && this.countCons('torch') && this.autoTorch !== false) { this.takeCons('torch'); this.torch = 100; G.toast(this, 'YOU LIGHT A NEW TORCH', '#ffb347'); }
  }
  // hazards
  const tile = G.map ? G.map.tileAt(this.x, this.y) : 1;
  let spdMul = 1;
  if (tile === AH.TILE.WATER) spdMul = 0.62;
  if (this.slow > 0) spdMul *= 0.6;
  if (this.buffs.haste > 0) spdMul *= 1.35;
  if (tile === AH.TILE.LAVA && this.state !== 'dodge') { this.lavaT = (this.lavaT || 0) - dt; if (this.lavaT <= 0) { this.lavaT = 0.5; this.hurt(G, 3 + this.S.hp * 0.05, null, true); } }
  // input (keyboard/pad, or mouse goals for the PC player)
  let ax = pad.ax, ay = pad.ay, mouseAtk = false;
  if (Math.hypot(ax, ay) > 0.2) { this.mTarget = this.mInter = this.mDest = this.mVein = null; }
  else if (this.mStand && this.mCursor && G.scene !== 'town') {
    // Shift + click: stand still and attack toward the cursor
    const c = this.mCursor; this.aim = Math.atan2(c.y - (this.y - 6), c.x - this.x); this.face = c.x >= this.x ? 1 : -1; this.mAimLock = 0.25; mouseAtk = true;
  }
  else if (this.mTarget || this.mInter || this.mDest || this.mVein) {
    const steer = (tx, ty) => {
      // follow a grid path around walls, recomputed now and then
      this.mPathT = (this.mPathT || 0) - dt;
      if (!this.mPath || this.mPathT <= 0) { this.mPath = G.map.los(this.x, this.y - 4, tx, ty) ? [{ x: tx, y: ty }] : (G.map.path(this.x, this.y, tx, ty) || [{ x: tx, y: ty }]); this.mPathT = 0.35; }
      while (this.mPath.length > 1 && Math.hypot(this.mPath[0].x - this.x, this.mPath[0].y - this.y) < 6) this.mPath.shift();
      if (!this.mPath.length) this.mPath = [{ x: tx, y: ty }];
      const wp = this.mPath[0]; const a = Math.atan2(wp.y - this.y, wp.x - this.x); ax = Math.cos(a); ay = Math.sin(a);
    };
    if (this.mTarget && (this.mTarget.dead || this.mTarget.hidden || this.mTarget.gone)) this.mTarget = null;
    if (this.mTarget) {
      const e = this.mTarget, b = this.wbase(), d = Math.hypot(e.x - this.x, (e.y - 4) - (this.y - 6));
      const reach = b.ranged ? 165 : b.range + e.r - 3;
      if (d > reach || (b.ranged && !G.map.los(this.x, this.y - 6, e.x, e.y - 4))) steer(e.x, e.y);
      else {
        this.aim = Math.atan2(e.y - 4 - (this.y - 6), e.x - this.x); this.face = e.x >= this.x ? 1 : -1; this.mAimLock = 0.25;
        mouseAtk = true;
        if (!this.mHold && this.cd.atk <= 0) this.mOnce = true;
      }
    } else if (this.mInter) {
      const it = this.mInter, cur = G.findInteract(this);
      if (cur && cur.obj === it.obj) { G.interact(this, cur); this.mInter = null; }
      else if (Math.hypot(it.x - this.x, it.y - this.y) < 6) this.mInter = null;
      else steer(it.x, it.y);
    } else if (this.mVein) {
      // walk up to the ore rock and hit it until it breaks (ranged heroes shoot it from a distance)
      const vn = this.mVein, cy = vn.y - 6, d = Math.hypot(vn.x - this.x, cy - (this.y - 4)), b = this.wbase();
      const ok = b.ranged ? d < 110 && G.map.los(this.x, this.y - 6, vn.x, cy + 4) || d < 18 : d < 19;
      if (vn.secret && G.map.get(vn.tx, vn.ty) !== AH.TILE.SECRET) vn.hp = 0;
      if (vn.hp <= 0) this.mVein = null;
      else if (!ok) { steer(vn.x, vn.y + 10); this.mStuck = Math.hypot(this.x - this.lastPosX, this.y - this.lastPosY) < 0.05 ? (this.mStuck || 0) + dt : 0; if (this.mStuck > 1.2) { this.mVein = null; this.mStuck = 0; } }
      else {
        this.aim = Math.atan2(cy - (this.y - 6), vn.x - this.x); this.face = vn.x >= this.x ? 1 : -1; this.mAimLock = 0.25;
        mouseAtk = true;
      }
    } else if (this.mDest) {
      if (Math.hypot(this.mDest.x - this.x, this.mDest.y - this.y) < 4 && !this.mHold) this.mDest = null;
      else if (Math.hypot(this.mDest.x - this.x, this.mDest.y - this.y) >= 4) steer(this.mDest.x, this.mDest.y);
      this.mStuck = (this.lastPosD !== undefined && Math.hypot(this.x - this.lastPosX, this.y - this.lastPosY) < 0.05) ? (this.mStuck || 0) + dt : 0;
      if (this.mStuck > 0.6) { this.mDest = null; this.mStuck = 0; }
    }
  }
  this.lastPosX = this.x; this.lastPosY = this.y; this.lastPosD = 1;
  let mag = Math.hypot(ax, ay);
  this.lastMag = (this.mTarget || this.mDest || this.mInter || this.mVein) ? 0 : mag;
  if (mag > 0.2 && !(this.mAimLock > 0 && mouseAtk)) { this.aim = Math.atan2(ay, ax); if (Math.abs(ax) > 0.15) this.face = ax > 0 ? 1 : -1; }
  if (this.mAimLock > 0) this.mAimLock -= dt;
  if (mouseAtk) { ax = 0; ay = 0; mag = 0; }
  this.st -= dt;
  const busy = this.state === 'attack' || this.state === 'heavy' || this.state === 'dodge' || this.state === 'cast';
  if (this.state !== 'idle' && this.state !== 'walk' && this.st <= 0) {
    if (this.state === 'heavyWind') this.doHeavy(G);
    else this.state = 'idle';
  }
  let speed = 72 * S.speed * spdMul;
  if (this.state === 'dodge') speed = 72 * 2.7 * S.speed;
  else if (this.state === 'attack' || this.state === 'heavy' || this.state === 'heavyWind') speed *= 0.35;
  if (this.state === 'dodge') { this.vx = Math.cos(this.dodgeA) * speed; this.vy = Math.sin(this.dodgeA) * speed; }
  else if (mag > 0.2) { const n = Math.min(1, mag); this.vx = Math.cos(this.aim) * speed * n; this.vy = Math.sin(this.aim) * speed * n; }
  else { this.vx = 0; this.vy = 0; }
  if (tile === AH.TILE.ICE && this.state !== 'dodge') { this.ivx = AH.lerp(this.ivx || 0, this.vx, dt * 3); this.ivy = AH.lerp(this.ivy || 0, this.vy, dt * 3); this.vx = this.ivx; this.vy = this.ivy; } else { this.ivx = this.vx; this.ivy = this.vy; }
  G.moveEntity(this, this.vx * dt, this.vy * dt, 4);
  if (mag > 0.2 && !busy) { this.walkT += dt * (2 + speed / 40); this.anim = [0, 1, 0, 2][Math.floor(this.walkT * 2) % 4]; if (this.state === 'idle') this.state = 'walk'; }
  else if (!busy) { this.anim = 0; if (this.state === 'walk') this.state = 'idle'; }
  if (G.paused) return;
  // actions
  const inter = G.findInteract(this);
  this.interactable = inter;
  if (pad.pressed('a')) {
    if (inter && this.state !== 'attack') { G.interact(this, inter); }
    else this.tryAttack(G);
  }
  if (pad.held('a') && !inter && this.state === 'idle' || pad.held('a') && !inter && this.state === 'walk') this.tryAttack(G, true);
  if (mouseAtk && this.state !== 'attack') { this.tryAttack(G, true); if (this.mOnce && this.state === 'attack') { this.mOnce = false; this.mTarget = null; } }
  if (this.mHeavy !== undefined && this.mHeavy !== null) { this.aim = this.mHeavy; this.face = Math.cos(this.mHeavy) >= 0 ? 1 : -1; this.mAimLock = 0.3; this.mHeavy = null; this.tryHeavy(G); }
  if (this.mCursor && AH.Mouse && AH.Mouse.player(G) === this && (pad.pressed('x') || pad.pressed('y') || pad.pressed('lb') || pad.pressed('rb') || pad.pressed('b') || pad.pressed('dodge'))) {
    const c = this.mCursor; this.aim = Math.atan2(c.y - (this.y - 6), c.x - this.x); this.face = c.x >= this.x ? 1 : -1; this.mAimLock = 0.3; this.dodgeAimMouse = true;
  }
  if (pad.pressed('x')) this.tryHeavy(G);
  if (pad.pressed('b') || pad.pressed('dodge')) this.tryDodge(G);
  if (pad.pressed('y')) this.trySkill(G, 0);
  if (pad.pressed('lb')) this.trySkill(G, 1);
  if (pad.pressed('rb')) this.trySkill(G, 2);
  if (pad.pressed('pot')) this.drink(G, 'potion');
  if (pad.pressed('mana')) this.drink(G, 'mana');
};
P.updateDead = function (G, dt, pad) {
  this.vx = this.vy = 0;
  // revived by an ally standing close
  const ally = G.players.find(p => p !== this && !p.dead && AH.dist(p, this) < 20);
  if (ally) { this.reviveT += dt; if (this.reviveT > 2.5) { if (G.scene === 'mine' && this.graveRec && G.map) G.map.props.push({ type: 'grave', x: this.x, y: this.y + 2, g: this.graveRec }); this.graveRec = null; this.dead = false; this.hp = this.S.hp * 0.35; this.reviveT = 0; this.inv = 2; G.toast(this, 'REVIVED BY ' + ally.ch.name, '#8ae08e'); AH.Audio.sfx('holy'); } }
  else this.reviveT = Math.max(0, this.reviveT - dt);
};
P.autoAim = function (G, r) {
  if ((this.lastMag || 0) > 0.2 || !G.nearestEnemy || this.mAimLock > 0) return;
  const e = G.nearestEnemy(this, r);
  if (e) { this.aim = Math.atan2(e.y - 4 - (this.y - 6), e.x - this.x); this.face = e.x >= this.x ? 1 : -1; }
};
P.tryAttack = function (G, auto) {
  if (G.scene === 'town') return;
  if (this.cd.atk > 0 || this.state === 'dodge' || this.state === 'heavyWind' || this.state === 'heavy') return;
  this.autoAim(G, this.wbase().ranged ? 150 : 50);
  const b = this.wbase(), t = this.atkTime();
  this.cd.atk = t; this.state = 'attack'; this.st = Math.min(0.2, t * 0.6); this.stMax = this.st; this.atkT = 0; this.swingDir = -(this.swingDir || 1);
  this.hitList.clear();
  this.hitCount++;
  if (b.ranged) { G.shoot(this, b.ranged, 1, false); }
  else { AH.Audio.sfx('swing'); G.meleeSwing(this, 1, b.range, b.arc, false); }
  if (this.S.powers.has('multishot')) {
    if (b.ranged) { G.shoot(this, b.ranged, 0.6, false, 0.25); G.shoot(this, b.ranged, 0.6, false, -0.25); }
    else G.shoot(this, 'wave', 0.5, false);
  }
};
P.tryHeavy = function (G) {
  if (G.scene === 'town') return;
  if (this.cd.atk > 0 || this.state === 'dodge' || this.state === 'heavyWind') return;
  this.autoAim(G, this.wbase().ranged ? 150 : 60);
  this.state = 'heavyWind'; this.st = 0.22; this.stMax = 0.22; this.cd.atk = this.atkTime() * 2.1;
  AH.fx.spark(G, this.x + this.face * 6, this.y - 12, '#ffb347', 4);
};
P.doHeavy = function (G) {
  const b = this.wbase();
  this.state = 'heavy'; this.st = 0.2; this.stMax = 0.2; this.hitList.clear(); this.hitCount++;
  let mult = 2.2; if (this.S.keys.has('emberheart')) { mult *= 1.6; this.hurt(G, this.S.hp * 0.03, null, true); }
  if (b.ranged) G.shoot(this, b.ranged, mult, true);
  else { AH.Audio.sfx('heavy'); G.meleeSwing(this, mult, b.range * 1.3, b.arc * 1.4, true); G.shake(2); }
  if (this.S.powers.has('stormstrike')) { const t = G.enemies.filter(e => !e.dead && !e.hidden && AH.dist(e, this) < 90).sort((a, c) => AH.dist(a, this) - AH.dist(c, this))[0]; if (t) G.chainLightning(this, t, this.rollDamage(0.9, { noCrit: true }).dmg, 4); }
  if (this.S.powers.has('burnground') && !b.ranged) G.addZone({ kind: 'fire', x: this.x + Math.cos(this.aim) * 16, y: this.y + Math.sin(this.aim) * 12, r: 18, t: 3, dps: this.rollDamage(0.5, { noCrit: true }).dmg, owner: this });
};
P.tryDodge = function (G) {
  if (this.cd.dodge > 0 || this.state === 'dodge') return;
  this.state = 'dodge'; this.st = 0.22; this.inv = Math.max(this.inv, 0.28);
  this.cd.dodge = 0.85 * (1 - Math.min(70, this.S.dodgeCdr) / 100);
  this.dodgeA = this.aim; AH.Audio.sfx('dodge');
  AH.fx.dust(G, this.x, this.y);
  if (this.S.powers.has('frostdodge')) G.nova(this, this.x, this.y, 40, this.spellPower(6) * 0.6, 'frost');
};
P.trySkill = function (G, slot) {
  if (G.scene === 'town') return;
  const id = this.ch.slots[slot]; if (!id) return;
  const sk = AH.SKILLS[id], rank = this.ch.skills[id] || 1;
  if ((this.skillCd[id] || 0) > 0) return;
  const cost = this.manaCost(sk.mp);
  const native = AH.CLASSES[this.ch.cls].skills.indexOf(id) >= 0;
  if (this.S.keys.has('bloodmagic')) {
    // blood magic: spells are paid with life, never with the last of it
    const hpCost = cost * (native ? 1 : 1.3) * 1.2;
    if (this.hp <= hpCost + 1) { G.toast(this, 'NOT ENOUGH LIFE', '#ff6a5a'); AH.Audio.sfx('error'); return; }
    this.skillCd[id] = sk.cd * (1 - Math.min(50, this.S.cdr) / 100);
    if (G.castSkill(this, id, 1 + (rank - 1) * 0.22) === false) { this.skillCd[id] = 0.3; return; }
    this.hp -= hpCost; AH.fx.num(G, this.x, this.y - 22, '-' + Math.round(hpCost), '#c83a4a');
    return;
  }
  if (this.mp < cost) { G.toast(this, 'NOT ENOUGH MANA', '#9ec0ff'); AH.Audio.sfx('error'); return; }
  this.mp -= cost * (native ? 1 : 1.3);
  this.skillCd[id] = sk.cd * (1 - Math.min(50, this.S.cdr) / 100);
  const rm = 1 + (rank - 1) * 0.22;
  if (G.castSkill(this, id, rm) === false) { this.skillCd[id] = 0.3; this.mp += cost * (native ? 1 : 1.3); }
};

// ---------- draw ----------
P.draw = function (ctx, G) {
  if (this.dead) {
    // a puff of smoke, then a fresh grave where the hero fell
    if (!this.deadAt) this.deadAt = G.time;
    const k = AH.clamp((G.time - this.deadAt) / 0.35, 0, 1), s = this.sprAtk;
    if (k < 1) { ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y + 2)); ctx.rotate(-this.face * k * Math.PI / 2); AH.drawSpr(ctx, s, -s.w / 2, -s.h + 1, this.face < 0); ctx.restore(); }
    else AH.drawGrave(ctx, this.x, this.y + 2, true);
    if (this.reviveT > 0) AH.bar(ctx, this.x - 10, this.y - 26, 20, 2, this.reviveT / 2.5, '#8ae08e', '#142014');
    return;
  }
  this.deadAt = 0;
  const blink = this.inv > 0 && this.state !== 'dodge' && (Math.floor(G.time * 20) % 2 === 0);
  if (blink) return;
  const melee = this.wSpr && !this.wbase().ranged;
  const swinging = (this.state === 'attack' || this.state === 'heavy' || this.state === 'heavyWind') && melee;
  const s = swinging ? this.sprAtk : this.spr[this.anim] || this.spr[0];
  const bob = (this.state === 'walk' && this.anim) ? -1 : 0;
  const prog = this.stMax ? AH.clamp(1 - this.st / this.stMax, 0, 1) : 1;
  // lunge forward on the strike, crouch on the wind-up, roll on dodge
  let lx = 0, ly = 0;
  if (this.state === 'attack' || this.state === 'heavy') lx = Math.round(Math.sin(prog * Math.PI) * (this.state === 'heavy' ? 3 : 2)) * this.face;
  if (this.state === 'heavyWind') { lx = -this.face; ly = 1; }
  const x = Math.round(this.x - s.w / 2) + lx, y = Math.round(this.y - s.h + 3 + bob) + ly;
  if (this.state === 'dodge') {
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y - s.h / 2 + 3)); ctx.rotate(this.face * prog * Math.PI * 2);
    AH.drawSpr(ctx, s, -s.w / 2, -s.h / 2, this.face < 0); ctx.restore();
  } else if (this.flash > 0) AH.drawFlash(ctx, s, x, y, this.face < 0);
  else AH.drawSpr(ctx, s, x, y, this.face < 0);
  if (swinging) {
    // weapon swings in an arc around the hand
    const ws = this.wSpr, it = AH.HELD[this.look.held];
    let a;
    if (this.state === 'heavyWind') a = -0.9 - prog * 0.5;
    else if (this.state === 'heavy') a = -1.4 + prog * 3.6;
    else { const from = this.swingDir > 0 ? -0.6 : 2.4, to = this.swingDir > 0 ? 2.4 : -0.2; a = from + (to - from) * Math.pow(prog, 0.7); }
    const hx = Math.round(this.x) + lx + this.face * 4, hy = y + 13;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(this.face, 1); ctx.rotate(a);
    AH.drawSpr(ctx, ws, -(it.ax + 1), -(it.ay + 1));
    ctx.restore();
    // swing trail
    if (this.state !== 'heavyWind') {
      const len = ws.h - 2, a0 = this.state === 'heavy' ? -1.4 : (this.swingDir > 0 ? -0.6 : 2.4);
      ctx.fillStyle = this.state === 'heavy' ? 'rgba(255,211,106,0.55)' : 'rgba(240,240,255,0.4)';
      for (let t = a0; this.state === 'heavy' ? t < a : (this.swingDir > 0 ? t < a : t > a); t += (this.swingDir > 0 || this.state === 'heavy' ? 0.12 : -0.12)) {
        const tx = hx + this.face * Math.sin(t) * len, ty = hy - Math.cos(t) * len;
        ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1);
      }
    }
  } else if ((this.state === 'attack') && this.wSpr) {
    // ranged: hold the weapon forward with a small recoil
    const ws = this.wSprR, rx = this.face > 0 ? x + s.w - 6 - Math.round((1 - prog) * 2) : x - ws.w + 6 + Math.round((1 - prog) * 2);
    AH.drawSpr(ctx, ws, rx, y + 10 - (ws.h >> 1), this.face < 0);
  }
  if (this.state === 'heavyWind') { ctx.fillStyle = '#ffd36a'; ctx.fillRect(this.x + this.face * 7, y + 6, 1, 1); }
  if (this.buffs.aegis > 0) { ctx.globalAlpha = 0.35; AH.arc(ctx, this.x, this.y - 10, 13, 0, Math.PI * 2, ['#9ec0ff']); ctx.globalAlpha = 1; }
};
