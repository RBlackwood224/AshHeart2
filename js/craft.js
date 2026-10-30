'use strict';
// The endgame: paragon levels, ancient items, gems and sockets, the smith's new crafts, the gambler and the jeweler.
(function () {
  const U = AH.UI;

  // ---------- materials and gems (consumables, so they stack, sell and count like ore) ----------
  Object.assign(AH.CONSUMABLES, {
    scrap: { name: 'IRON SCRAP', icon: 'scrap', price: 0, stack: 99, sell: 3 },
    dust: { name: 'ARCANE DUST', icon: 'dust', price: 0, stack: 99, sell: 8 },
    shard: { name: 'LEGENDARY SHARD', icon: 'shard', price: 0, stack: 99, sell: 40 },
  });
  AH.ICON.scrap = AH.iconRecolor('ore', { K: '#2a2a32', k: '#6a6a7a', G: '#9a9aac', g: '#c8c8d4' });
  AH.ICON.dust = AH.sprite(['............', '....x.......', '..x.xx..x...', '...xXXx.....', '..xXwwXx.x..', '...xXXx.....', '.x..xx..x...', '............'], { x: '#7a5ae0', X: '#b08aff', w: '#f0e0ff' });
  AH.ICON.shard = AH.sprite(['......o.....', '.....oO.....', '....oOyO....', '....oyyO....', '...oOyyOo...', '....oOOo....', '.....oo.....'], { o: '#a84a1a', O: '#ff8a2e', y: '#ffe08a' });
  AH.GEMS = {
    ruby: { name: 'RUBY', col: ['#7a1020', '#e0304a', '#ffb0b8'], fx: { W: { dmg: 4 }, H: { hp: 20 }, A: { hp: 30 } } },
    sapphire: { name: 'SAPPHIRE', col: ['#102a7a', '#3a6ae0', '#b0c8ff'], fx: { W: { spell: 5 }, H: { mp: 12 }, A: { mpr: 0.6 } } },
    emerald: { name: 'EMERALD', col: ['#0a5a2a', '#2ec060', '#b0ffc8'], fx: { W: { ias: 3 }, H: { crit: 1.5 }, A: { move: 2 } } },
    topaz: { name: 'TOPAZ', col: ['#7a5a0a', '#f2c030', '#fff0b0'], fx: { W: { gold: 8 }, H: { mf: 8 }, A: { gold: 6 } } },
    amethyst: { name: 'AMETHYST', col: ['#4a1a6a', '#a050e0', '#e8c8ff'], fx: { W: { loh: 1 }, H: { vit: 3 }, A: { vit: 4 } } },
    diamond: { name: 'DIAMOND', col: ['#5a6a7a', '#d8e8f8', '#ffffff'], fx: { W: { critDmg: 6 }, H: { res: 1 }, A: { res: 1.5 } } },
  };
  AH.GEM_GRADES = [{ name: 'CHIPPED', m: 1 }, { name: '', m: 2 }, { name: 'FLAWLESS', m: 3 }, { name: 'PERFECT', m: 5 }];
  AH.gemKey = (type, g) => 'g_' + type + '_' + g;
  AH.isGem = k => typeof k === 'string' && k.indexOf('g_') === 0;
  AH.gemOf = k => { const p = k.split('_'); return { type: p[1], g: +p[2] }; };
  for (const type in AH.GEMS) {
    const G = AH.GEMS[type];
    AH.GEM_GRADES.forEach((gr, g) => {
      const k = AH.gemKey(type, g);
      AH.CONSUMABLES[k] = { name: (gr.name ? gr.name + ' ' : '') + G.name, icon: k, price: 0, stack: 20, sell: [10, 30, 90, 260][g] };
      AH.ICON[k] = AH.iconRecolor('gem', { c: G.col[0], C: G.col[1], w: g >= 2 ? '#ffffff' : G.col[2] });
    });
  }
  // what a socket gives: runes always the same, gems by where they sit (weapon / helm / everything else)
  AH.sockPlace = it => it.kind === 'weapon' ? 'W' : it.slot === 'head' ? 'H' : 'A';
  AH.sockFx = function (r, it) {
    if (AH.RUNES[r]) return AH.RUNES[r].fx;
    if (!AH.isGem(r)) return {};
    const g = AH.gemOf(r), d = AH.GEMS[g.type]; if (!d) return {};
    const base = d.fx[AH.sockPlace(it)], out = {}, m = AH.GEM_GRADES[g.g].m;
    for (const k in base) out[k] = Math.round(base[k] * m * 10) / 10;
    return out;
  };
  AH.sockCol = r => AH.RUNES[r] ? AH.RUNES[r].col : AH.isGem(r) && AH.GEMS[AH.gemOf(r).type] ? AH.GEMS[AH.gemOf(r).type].col[1] : '#3a3442';
  AH.sockName = r => AH.RUNES[r] ? r : AH.isGem(r) ? AH.tr(AH.CONSUMABLES[r].name) : r;
  AH.sockLab = (r, it) => AH.RUNES[r] ? AH.RUNES[r].lab : AH.fxLabel(AH.sockFx(r, it)).join(', ');
  // gems in the bag: what they would do
  const _lines = AH.itemLines;
  AH.itemLines = function (it, cls) {
    if (it.kind === 'cons' && AH.isGem(it.cons)) {
      const g = AH.gemOf(it.cons), d = AH.GEMS[g.type];
      const L = [{ t: it.name, c: d.col[2] }];
      const w = { kind: 'weapon' }, h = { kind: 'armor', slot: 'head' }, a = { kind: 'armor', slot: 'chest' };
      L.push({ t: AH.tr('WEAPON') + ': ' + AH.fxLabel(AH.sockFx(it.cons, w)).join(', '), c: '#9ec0ff' });
      L.push({ t: AH.tr('HELM') + ': ' + AH.fxLabel(AH.sockFx(it.cons, h)).join(', '), c: '#9ec0ff' });
      L.push({ t: AH.tr('ARMOR') + ': ' + AH.fxLabel(AH.sockFx(it.cons, a)).join(', '), c: '#9ec0ff' });
      L.push({ t: g.g < 3 ? 'THREE OF THESE MAKE A BETTER ONE AT THE JEWELER' : 'THE FINEST GEM THERE IS', c: '#6f6880' });
      L.push({ t: 'USE IT TO SET IT INTO GEAR WITH A FREE SOCKET', c: '#6f6880' });
      return L;
    }
    if (it.kind === 'cons' && ['scrap', 'dust', 'shard'].indexOf(it.cons) >= 0) return [{ t: it.name, c: it.cons === 'shard' ? '#ff9a3e' : it.cons === 'dust' ? '#b08aff' : '#b8b0c4' }, { t: 'THE SMITH CRAFTS WITH IT', c: '#9ec0ff' }];
    const L = _lines(it, cls);
    if (it.sockets && !it.unid && it.runes && it.runes.some(r => AH.isGem(r))) {
      // gems: name and what they do
      for (let i = 0; i < L.length; i++) {
        const m = /^([^:]+): /.exec(L[i].t);
        if (m && AH.isGem(m[1])) L[i] = { t: AH.sockName(m[1]) + ': ' + AH.sockLab(m[1], it), c: AH.sockCol(m[1]) };
        if (/^SOCKETS: /.test(L[i].t)) L[i] = { t: 'SOCKETS: ' + (it.runes.map(AH.sockName).join(' ') || '-') + ' (' + it.runes.length + '/' + it.sockets + ')', c: '#a39bb0' };
      }
    }
    if (it.ancient) { L.splice(1, 0, { t: 'ANCIENT: STRONGER THAN ITS KIND', c: '#ff6a3a' }); L[0] = { t: L[0].t, c: '#ff6a3a' }; }
    if (it.heirloom) L.push({ t: 'HEIRLOOM OF ' + it.heirloom, c: '#f2c94c' });
    return L;
  };
  // ---------- ancient items: legendaries and set pieces that came out better ----------
  AH.ancientChance = function () {
    const DF = AH.diffNow ? AH.diffNow() : AH.DIFFS[0], i = AH.DIFFS.indexOf(DF);
    let c = [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14][Math.max(0, i)] || 0.02;
    if (AH.rule('s_ancient')) c *= 3;
    return c;
  };
  AH.makeAncient = function (it) {
    if (!it || it.ancient || !(it.rarity === 3 || it.rarity === 5)) return it;
    it.ancient = 1;
    it.affixes.forEach(a => a.v = Math.round(a.v * 1.3) + 1);
    if (it.dmg) it.dmg = [Math.round(it.dmg[0] * 1.3), Math.round(it.dmg[1] * 1.3)];
    if (it.armor) it.armor = Math.round(it.armor * 1.3);
    it.sockets = Math.max(it.sockets || 0, 1);
    return it;
  };
  const _gen = AH.genItem;
  AH.genItem = function (rng, floor, opt) {
    const it = _gen(rng, floor, opt);
    const G = AH.game;
    if (G && G.scene === 'mine' && !(opt && opt.noAncient) && (it.rarity === 3 || it.rarity === 5) && rng() < AH.ancientChance()) AH.makeAncient(it);
    return it;
  };
  const _drop = GG.dropItem;
  GG.dropItem = function (x, y, item, owner) { _drop.call(this, x, y, item, owner); if (item && item.ancient && owner !== undefined && !item.seenDrop) { item.seenDrop = 1; this.toast(null, 'AN ANCIENT ITEM!', '#ff6a3a'); } };

  // ---------- gems fall in the mine ----------
  AH.rollGem = function (rng, f) {
    const types = Object.keys(AH.GEMS), t = rng.pick(types);
    const r = rng();
    const g = f < 20 ? 0 : f < 45 ? (r < 0.7 ? 0 : 1) : f < 70 ? (r < 0.5 ? 1 : r < 0.85 ? 0 : 2) : (r < 0.45 ? 1 : r < 0.85 ? 2 : 3);
    return AH.makeCons(AH.gemKey(t, g));
  };
  const _loot = GG.rollLoot;
  GG.rollLoot = function (x, y, src, p) {
    _loot.call(this, x, y, src, p);
    const f = this.floorNo || 1, big = src && (src.boss || src.legend || src.nemesis), elite = src && src.elite;
    if (f >= 5 && AH.rand() < (big ? 0.8 : elite ? 0.12 : 0.018)) this.dropItem(x, y, AH.rollGem(AH.rand, f + (big ? 15 : 0)), p.pid);
    if (big && AH.rand() < 0.5) this.dropItem(x, y, AH.makeCons('dust', 1 + AH.rand.int(0, 2)), p.pid);
  };

  // ---------- sockets: the places in the old code now take gems too ----------
  AH.socketPips = function (ctx, it, x, y, s) {
    if (!it || !it.sockets) return;
    for (let i = 0; i < it.sockets; i++) {
      const r = it.runes && it.runes[i], px = x + 2 + i * 4, py = y + s - 5;
      ctx.fillStyle = '#07060a'; ctx.fillRect(px - 1, py - 1, 4, 4);
      ctx.fillStyle = r ? AH.sockCol(r) : '#3a3442'; ctx.fillRect(px, py, 2, 2);
    }
  };

  // ---------- paragon ----------
  AH.PARAGON = [
    { k: 'main', label: 'MAIN STAT', per: 5, cap: 50, desc: 'YOUR CLASS STAT' },
    { k: 'vit', label: 'VITALITY', per: 5, cap: 50 },
    { k: 'dmg', label: 'DAMAGE', per: 1, cap: 50, pct: 1 },
    { k: 'crit', label: 'CRIT CHANCE', per: 0.3, cap: 50, pct: 1 },
    { k: 'ias', label: 'ATTACK SPEED', per: 0.5, cap: 40, pct: 1 },
    { k: 'armorPct', label: 'ARMOR', per: 1, cap: 50, pct: 1 },
    { k: 'res', label: 'DAMAGE TAKEN', per: -0.3, cap: 50, pct: 1 },
    { k: 'luck', label: 'GOLD AND MAGIC FIND', per: 2, cap: 50, pct: 1 },
    { k: 'move', label: 'MOVE SPEED', per: 0.5, cap: 30, pct: 1 },
  ];
  AH.paragonStats = function (S, ch) {
    const a = ch.parAlloc; if (!a) return;
    const C = AH.CLASSES[ch.cls];
    if (a.main) S[C.stat] += a.main * 5;
    if (a.vit) S.vit += a.vit * 5;
    if (a.dmg) S.dmg += a.dmg;
    if (a.crit) S.crit += a.crit * 0.3;
    if (a.ias) S.ias += a.ias * 0.5;
    if (a.armorPct) S.armorPct += a.armorPct;
    if (a.res) S.res += a.res * 0.3;
    if (a.luck) { S.mf += a.luck * 2; S.gold += a.luck * 2; }
    if (a.move) S.move += a.move * 0.5;
  };
  U.init.paragon = function (G, m) { m.sel = 0; };
  U.update.paragon = function (G, m, dt) {
    const ch = m.p.ch; ch.parAlloc = ch.parAlloc || {};
    const rows = AH.PARAGON.length + 1;
    const n = U.nav(G, m, dt);
    const ms = U.mouseList(G, m); if (ms && ms.pick) n.p.a = true; if (ms && ms.back) n.p.b = true;
    if (n.dy) { m.sel = (m.sel + n.dy + rows) % rows; AH.Audio.sfx('move'); }
    if (n.p.b || n.p.start || (n.p.a && m.sel === rows - 1)) { G.closeMenu(); G.saveAll(); return; }
    const P = AH.PARAGON[m.sel]; if (!P) return;
    const cur = ch.parAlloc[P.k] || 0;
    if ((n.p.a || n.dx > 0) && (ch.parPts || 0) > 0 && cur < P.cap) { ch.parAlloc[P.k] = cur + 1; ch.parPts--; m.p.recalc(); AH.Audio.sfx('select'); }
    else if ((n.p.x || n.dx < 0) && cur > 0) { ch.parAlloc[P.k] = cur - 1; ch.parPts = (ch.parPts || 0) + 1; m.p.recalc(); AH.Audio.sfx('back'); }
    else if (n.p.a || n.dx) AH.Audio.sfx('error');
  };
  U.draw.paragon = function (G, ctx, m) {
    U.bg(ctx); U.title(ctx, 'PARAGON', 12);
    const ch = m.p.ch, a = ch.parAlloc || {};
    AH.text(ctx, AH.UW / 2, 34, AH.tr('PARAGON LEVEL') + ' ' + (ch.par || 0) + '   -   ' + AH.tr('POINTS TO SPEND') + ': ' + (ch.parPts || 0), '#ff9a3e', { align: 'center' });
    const rows = AH.PARAGON.map(P => {
      const v = a[P.k] || 0, tot = Math.round(v * P.per * 10) / 10;
      const lab = P.k === 'main' ? AH.tr(AH.CLASSES[ch.cls].stat.toUpperCase() === 'STR' ? 'STRENGTH' : AH.CLASSES[ch.cls].stat === 'dex' ? 'DEXTERITY' : 'INTELLECT') : P.label;
      return { label: lab, right: (tot > 0 ? '+' : '') + tot + (P.pct ? '%' : '') + '   ' + v + '/' + P.cap, rcol: v >= P.cap ? '#8ae08e' : '#e9e2d0' };
    }).concat([{ label: 'BACK' }]);
    U.list(ctx, rows, m.sel, 90, 54, 300, { lh: 16 });
    AH.wrap('EVERY LEVEL PAST 70 GIVES A PARAGON POINT. SPEND IT HERE; TAKING ONE BACK IS FREE.', 400).forEach((l, i) => AH.text(ctx, AH.UW / 2, 222 + i * 10, l, '#a39bb0', { align: 'center' }));
    U.hint(ctx, U.btnName(G, m, 'a') + ' ADD   ' + U.btnName(G, m, 'x') + ' TAKE BACK   ' + U.btnName(G, m, 'b') + ' BACK');
  };
  const _pause = U.pauseItems;
  U.pauseItems = function (G, m) {
    const it = _pause(G, m);
    if (m.p && (m.p.ch.par || 0) > 0) it.splice(5, 0, { id: 'paragon', label: 'PARAGON', right: m.p.ch.parPts ? '+' + m.p.ch.parPts : '', rcol: '#ff9a3e' });
    return it;
  };
  const _pupd = U.update.pause;
  U.update.pause = function (G, m, dt) {
    const items = U.pauseItems(G, m);
    if (items[m.sel] && items[m.sel].id === 'paragon') {
      const n = U.nav(G, m, dt); const ms = U.mouseList(G, m);
      if (n.dy) { m.sel = (m.sel + n.dy + items.length) % items.length; AH.Audio.sfx('move'); return; }
      if (n.p.a || (ms && ms.pick)) { G.closeMenu(); G.openMenu('paragon', m.p); return; }
      if (n.p.b || n.p.start) { G.closeMenu(); return; }
      return;
    }
    _pupd(G, m, dt);
  };

  // ---------- the smith's new crafts ----------
  const SM = U.shopMenus.smith;
  const at = SM.findIndex(x => x.id === 'ore');
  SM.splice(at, 0, { id: 'salvage', label: 'SALVAGE GEAR' }, { id: 'reroll', label: 'REROLL ONE BONUS' }, { id: 'addaff', label: 'ADD A BONUS' });
  AH.salvageOf = function (it) {
    if (it.ancient) return { shard: 2, dust: 2 };
    if (it.rarity >= 3) return { shard: 1, dust: 2 };
    if (it.rarity === 2) return { dust: 2, scrap: 1 };
    if (it.rarity === 1) return { scrap: 2, dust: AH.rand() < 0.5 ? 1 : 0 };
    return { scrap: 1 + (it.tier >= 2 ? 1 : 0) };
  };
  U.maxAff = it => it.rarity >= 3 ? 5 : it.rarity === 2 ? 4 : it.rarity === 1 ? 2 : 1;
  const _cost = U.smithCost;
  U.smithCost = function (it, kind) {
    const t = it.tier || 0, big = it.rarity >= 3;
    if (kind === 'reroll') return { dust: big ? 3 : 2, shard: big ? 1 : 0, gold: 50 + it.ilvl * 3 };
    if (kind === 'addaff') return { scrap: 3, dust: 3, shard: big ? 1 : 0, gold: 80 + it.ilvl * 4 };
    if (kind === 'salvage') return { gold: 0 };
    return _cost(it, kind);
  };
  const costTxt = c => ['scrap', 'dust', 'shard'].filter(k => c[k]).map(k => c[k] + ' ' + { scrap: 'SC', dust: 'DU', shard: 'SH' }[k]).join(' ') + (c.gold ? ' ' + c.gold + 'G' : '');
  const canPay = (p, c) => p.ch.gold >= (c.gold || 0) && ['scrap', 'dust', 'shard'].every(k => !c[k] || p.countCons(k) >= c[k]);
  const pay = (p, c) => { p.ch.gold -= c.gold || 0; for (const k of ['scrap', 'dust', 'shard']) if (c[k]) p.takeCons(k, c[k]); };
  const _shopList = U.shopList;
  U.shopList = function (G, m) {
    if (m.mode === 'pickaff') return m.target.affixes.map((a, i) => ({ aff: a, i, item: m.target }));
    return _shopList(G, m);
  };
  const _smUp = U.update.smith;
  U.update.smith = U.update.store = function (G, m, dt) {
    if (m.type !== 'smith' || ['salvage', 'reroll', 'addaff', 'pickaff', 'unsocket'].indexOf(m.mode) < 0) return _smUp(G, m, dt);
    const p = m.p, ch = p.ch;
    const n = U.nav(G, m, dt);
    if (n.p.b) { m.mode = m.mode === 'pickaff' ? 'reroll' : 'menu'; AH.Audio.sfx('back'); return; }
    const list = U.shopList(G, m);
    if (n.dy) { m.i = AH.clamp(m.i + n.dy, 0, Math.max(0, list.length - 1)); AH.Audio.sfx('move'); }
    if (!n.p.a || !list.length) return;
    const row = list[m.i], it = row.item;
    if (m.mode === 'unsocket') {
      if (!it.runes.length) return;
      if (ch.gold < 20) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); return; }
      ch.gold -= 20;
      const gems = it.runes.filter(r => AH.isGem(r));
      for (const g of gems) if (!p.addItem(AH.makeCons(g))) G.dropItem(p.x, p.y + 8, AH.makeCons(g), p.pid);
      it.runes = []; p.recalc(); AH.Audio.sfx('heavy');
      G.toast(p, gems.length ? 'SOCKETS CLEARED. YOUR GEMS ARE BACK IN THE BAG' : 'SOCKETS CLEARED', '#a39bb0'); return;
    }
    if (m.mode === 'salvage') {
      if (row.eq) { G.toast(p, 'TAKE IT OFF FIRST', '#a39bb0'); AH.Audio.sfx('error'); return; }
      if (it.quest || it.loaner) { G.toast(p, 'THE SMITH WILL NOT BREAK THAT', '#a39bb0'); return; }
      const got = AH.salvageOf(it); ch.bag[row.idx] = null;
      for (const k in got) if (got[k]) { const c = AH.makeCons(k, got[k]); if (!p.addItem(c)) G.dropItem(p.x, p.y + 8, c, p.pid); }
      for (const r of it.runes || []) if (AH.isGem(r)) p.addItem(AH.makeCons(r));
      AH.Audio.sfx('heavy'); G.toast(p, AH.tr('SALVAGED') + ': ' + Object.keys(got).filter(k => got[k]).map(k => got[k] + ' ' + AH.tr(AH.CONSUMABLES[k].name)).join(', '), '#cfc6b4');
      m.i = Math.max(0, Math.min(m.i, U.shopList(G, m).length - 1)); return;
    }
    if (m.mode === 'reroll') {
      if (it.unid) { G.toast(p, 'IDENTIFY IT FIRST', '#a39bb0'); return; }
      if (!it.affixes.length) { G.toast(p, 'NO BONUS TO REROLL', '#a39bb0'); return; }
      m.target = it; m.mode = 'pickaff'; m.i = 0; return;
    }
    const cost = U.smithCost(it, m.mode === 'pickaff' ? 'reroll' : m.mode);
    if (m.mode === 'addaff') {
      if (it.unid) { G.toast(p, 'IDENTIFY IT FIRST', '#a39bb0'); return; }
      if (it.affixes.length >= U.maxAff(it)) { G.toast(p, 'NO ROOM FOR ANOTHER BONUS', '#a39bb0'); AH.Audio.sfx('error'); return; }
    }
    if (!canPay(p, cost)) { G.toast(p, AH.tr('YOU NEED') + ' ' + costTxt(cost), '#ff8a8a'); AH.Audio.sfx('error'); return; }
    // a new bonus that fits the slot and is not on the item yet
    const grp = it.kind === 'weapon' ? 'weapon' : it.slot;
    const have = it.affixes.map(a => a.k);
    const keep = m.mode === 'pickaff' ? it.affixes[row.i].k : null;
    const pool = AH.AFFIXES.filter(a => (a.on === 'any' || a.on.split(' ').indexOf(grp) >= 0) && (have.indexOf(a.k) < 0 || a.k === keep));
    if (!pool.length) { G.toast(p, 'NO ROOM FOR ANOTHER BONUS', '#a39bb0'); return; }
    pay(p, cost);
    const rng = AH.rand, a = rng.pick(pool), tier = it.tier || 0, f = it.ilvl || 1;
    let v = a.b + a.t * tier + rng() * (a.b * 0.8 + a.t); if (f < 20) v *= 0.45 + 0.55 * f / 20; if (it.rarity >= 3) v *= 1.3; if (it.ancient) v *= 1.3;
    const aff = { k: a.k, v: Math.max(1, Math.round(v)) };
    if (m.mode === 'pickaff') { it.affixes[row.i] = aff; m.mode = 'reroll'; } else it.affixes.push(aff);
    if (it.rarity === 0 && it.affixes.length) { it.rarity = 1; AH.nameItem(it, rng); delete it._icon; }
    p.recalc(); AH.Audio.sfx('magic'); G.onLocalEquip && G.onLocalEquip(p);
    G.toast(p, AH.tr('NEW BONUS') + ': ' + AH.AFFIXES.find(x => x.k === aff.k).lab(aff.v), '#8ae08e');
  };
  const _smDraw = U.draw.smith;
  U.draw.smith = U.draw.store = function (G, ctx, m) {
    if (m.type !== 'smith' || ['salvage', 'reroll', 'addaff', 'pickaff'].indexOf(m.mode) < 0) return _smDraw(G, ctx, m);
    U.bg(ctx);
    const npc = AH.SPR.smith; AH.frame(ctx, 4, 4, 130, 262); AH.drawSpr(ctx, npc, 69 - npc.w * 2, 20, false, 4);
    AH.text(ctx, 69, 96, 'DORAN THE SMITH', '#f2e3b3', { align: 'center' });
    const say = { salvage: 'I BREAK IT, YOU KEEP WHAT IS GOOD IN IT.', reroll: 'ONE BONUS, MADE NEW. NO PROMISES.', addaff: 'THERE IS ALWAYS ROOM FOR ONE MORE... ALMOST.', pickaff: 'WHICH ONE GOES?' }[m.mode];
    AH.wrap('"' + say + '"', 118).forEach((l, i) => AH.text(ctx, 69, 108 + i * 9, l, '#a39bb0', { align: 'center' }));
    [['scrap', 'SC'], ['dust', 'DU'], ['shard', 'SH']].forEach(([k, lab], i) => { const x = 12 + i * 40, y = 222; AH.drawSpr(ctx, AH.ICON[k], x - 2, y - 3); AH.text(ctx, x + 12, y, '' + m.p.countCons(k), m.p.countCons(k) ? '#cfc6b4' : '#4e4858'); });
    AH.coinIcon(ctx, 12, 250); AH.text(ctx, 20, 249, '' + m.p.ch.gold, '#f2c94c');
    const list = U.shopList(G, m);
    AH.frame(ctx, 138, 4, 220, 262);
    AH.text(ctx, 144, 10, { salvage: 'SALVAGE WHAT?', reroll: 'REROLL ON WHAT?', addaff: 'ADD TO WHAT?', pickaff: 'WHICH BONUS?' }[m.mode], '#f2e3b3');
    const start = AH.clamp(m.i - 9, 0, Math.max(0, list.length - 20));
    list.slice(start, start + 20).forEach((row, j) => {
      const i = start + j, y = 26 + j * 12, on = i === m.i;
      if (on) AH.rect(ctx, 142, y - 2, 212, 11, '#2e2638');
      if (m.mode === 'pickaff') { const d = AH.AFFIXES.find(x => x.k === row.aff.k); AH.text(ctx, 148, y, d.lab(row.aff.v), on ? '#ffb347' : '#9ec0ff', { maxW: 140 }); AH.text(ctx, 350, y, costTxt(U.smithCost(row.item, 'reroll')), '#f2c94c', { align: 'right' }); return; }
      const it = row.item;
      AH.text(ctx, 148, y, (row.eq ? '* ' : '') + AH.tr(it.unid ? 'UNKNOWN ' + it.typeName : it.name), on ? '#ffb347' : it.ancient ? '#ff6a3a' : AH.RARITY[it.rarity || 0].col, { maxW: 128 });
      const s = m.mode === 'salvage' ? Object.entries(AH.salvageOf(Object.assign({}, it, { rarity: it.rarity }))).filter(e => e[1]).map(([k, v]) => v + { scrap: 'SC', dust: 'DU', shard: 'SH' }[k]).join(' ') : costTxt(U.smithCost(it, m.mode));
      AH.text(ctx, 350, y, s, '#f2c94c', { align: 'right' });
    });
    const row = list[m.i];
    U.itemPanel(G, ctx, row && row.item, 362, 4, 114, 262, m.p.ch.cls);
    U.hint(ctx, U.btnName(G, m, 'a') + ' CHOOSE   ' + U.btnName(G, m, 'b') + ' BACK');
  };

  // ---------- town vendors: the gambler and the jeweler ----------
  AH.SPR.gambler = AH.recolor(AH.SPR.keeper, { s: '#5a2a7a', S: '#2e1440', h: '#1a1420', a: '#f2c94c' });
  AH.SPR.jeweler = AH.recolor(AH.SPR.herbal || AH.SPR.keeper, { s: '#2a4a7a', S: '#16284a', a: '#d8e8f8' });
  const _vill = GG.spawnVillagers;
  GG.spawnVillagers = function () {
    _vill.call(this);
    if (this.scene !== 'town' || !this.map || !this.map.town) return;
    const T = AH.T;
    this.npcs.push({ kind: 'vendor', role: 'gamble', spr: AH.SPR.gambler, x: 44 * T + 8, y: 14 * T + 4, face: -1, fixed: 1, name: 'KAZIMIR' });
    this.npcs.push({ kind: 'vendor', role: 'jewel', spr: AH.SPR.jeweler, x: 8 * T + 8, y: 14 * T + 4, face: 1, fixed: 1, name: 'ISOLDE' });
  };
  const _find = GG.findInteract;
  GG.findInteract = function (p) {
    const best = _find.call(this, p);
    if (this.scene !== 'town') return best;
    let v = null, bd = best && best.kind !== 'talk' ? Math.hypot(p.x - best.x, p.y - best.y) : 99;
    for (const n of this.npcs) if (n.kind === 'vendor') { const d = Math.hypot(p.x - n.x, p.y - n.y); if (d < 20 && d < bd) { bd = d; v = n; } }
    return v ? { kind: 'vendor', obj: v, label: v.role === 'gamble' ? 'GAMBLE' : 'JEWELER', x: v.x, y: v.y } : best;
  };
  const _inter = GG.interact;
  GG.interact = function (p, it) {
    if (it && it.kind === 'vendor') { if (p.remote) return; AH.Audio.sfx('door'); this.openMenu(it.obj.role, p); return; }
    _inter.call(this, p, it);
  };
  // the gambler: pay for an unknown item of a kind you choose
  U.GAMBLE = [['sword'], ['axe'], ['mace'], ['dagger'], ['bow'], ['staff'], ['scepter'], ['maul'], ['greatsword'], ['helm'], ['hood'], ['plate'], ['robe'], ['leather'], ['gloves'], ['boots'], ['cloak'], ['shield'], ['ring', 1.6], ['amulet', 1.8]];
  U.gamblePrice = (G, p, row) => Math.round((90 + Math.max(1, p.ch.deepest || 1) * 14) * (row[1] || 1) * U.priceMul(G));
  U.init.gamble = function (G, m) { m.sel = 0; m.say = 'PICK A KIND. I PICK THE REST. HEH.'; };
  U.update.gamble = function (G, m, dt) {
    const p = m.p, items = U.GAMBLE.map(r => ({ r })).concat([{ leave: 1 }]);
    U.listUpdate(G, m, dt, items, it => {
      if (it.leave) { G.closeMenu(); G.saveAll(); return; }
      const price = U.gamblePrice(G, p, it.r);
      if (p.ch.gold < price) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); AH.Audio.sfx('error'); return; }
      if (p.bagFree() < 0) { G.toast(p, 'BAG IS FULL', '#ff8a8a'); return; }
      p.ch.gold -= price;
      const rng = AH.rand, f = Math.max(1, p.ch.deepest || 1) + 2, r = rng();
      const rarity = r < 0.06 ? 3 : r < 0.3 ? 2 : 1;
      const item = AH.genItem(rng, f, { base: it.r[0], rarity, noAncient: true });
      if (rarity === 3 && rng() < 0.08) AH.makeAncient(item);
      p.addItem(item); AH.Audio.sfx(item.rarity >= 3 ? 'legend' : 'coin');
      m.say = item.rarity >= 3 ? 'WELL! LADY LUCK LOVES YOU.' : item.rarity === 2 ? 'NOT BAD, NOT BAD.' : 'BETTER LUCK NEXT TIME.';
      G.toast(p, AH.tr(item.name), item.ancient ? '#ff6a3a' : AH.RARITY[item.rarity].col);
    }, () => { G.closeMenu(); G.saveAll(); });
  };
  U.draw.gamble = function (G, ctx, m) {
    U.bg(ctx);
    AH.frame(ctx, 4, 4, 130, 262); const s = AH.SPR.gambler; AH.drawSpr(ctx, s, 69 - s.w * 2, 20, false, 4);
    AH.text(ctx, 69, 96, 'KAZIMIR THE GAMBLER', '#f2e3b3', { align: 'center', maxW: 124 });
    AH.wrap('"' + m.say + '"', 118).forEach((l, i) => AH.text(ctx, 69, 110 + i * 9, l, '#a39bb0', { align: 'center' }));
    AH.coinIcon(ctx, 12, 250); AH.text(ctx, 20, 249, '' + m.p.ch.gold, '#f2c94c');
    const rows = U.GAMBLE.map(r => ({ label: (AH.WEAPONS[r[0]] || AH.ARMORS[r[0]]).name, right: U.gamblePrice(G, m.p, r) + 'G', rcol: '#f2c94c' })).concat([{ label: 'LEAVE' }]);
    U.list(ctx, rows, m.sel, 150, 12, 300, { lh: 12 });
  };
  // the jeweler: three gems make a better one; gems come out of gear in one piece
  U.init.jewel = function (G, m) { m.sel = 0; m.mode = 'menu'; m.say = 'GEMS, MY DEAR. NOTHING ELSE LASTS.'; };
  U.jewelRows = function (m) {
    const p = m.p;
    if (m.mode === 'menu') return [{ id: 'combine', label: 'COMBINE THREE GEMS' }, { id: 'remove', label: 'TAKE GEMS OUT OF GEAR', right: '15G' }, { id: 'leave', label: 'LEAVE' }];
    if (m.mode === 'combine') {
      const out = [];
      for (const t in AH.GEMS) for (let g = 0; g < 3; g++) { const k = AH.gemKey(t, g), n = p.countCons(k); if (n) out.push({ k, label: AH.CONSUMABLES[k].name, right: n + '  >  ' + (g + 2 <= 4 ? AH.tr(AH.CONSUMABLES[AH.gemKey(t, g + 1)].name) : ''), cost: 25 * (g + 1) * (g + 1), ok: n >= 3 }); }
      return out.length ? out : [{ none: 1, label: 'NO GEMS TO COMBINE', disabled: true }];
    }
    const rows = [];
    for (const s of AH.EQUIP_SLOTS) { const it = p.ch.equip[s]; if (it && it.runes && it.runes.some(AH.isGem)) rows.push({ it, label: it.name, col: AH.RARITY[it.rarity || 0].col }); }
    p.ch.bag.forEach(it => { if (it && it.runes && it.runes.some(AH.isGem)) rows.push({ it, label: it.name, col: AH.RARITY[it.rarity || 0].col }); });
    return rows.length ? rows : [{ none: 1, label: 'NO GEMS IN YOUR GEAR', disabled: true }];
  };
  U.update.jewel = function (G, m, dt) {
    const p = m.p;
    U.listUpdate(G, m, dt, U.jewelRows(m), it => {
      if (m.mode === 'menu') { if (it.id === 'leave') { G.closeMenu(); G.saveAll(); return; } m.mode = it.id; m.sel = 0; return; }
      if (it.none) return;
      if (m.mode === 'combine') {
        if (!it.ok) { G.toast(p, 'YOU NEED THREE OF THEM', '#ff8a8a'); AH.Audio.sfx('error'); return; }
        if (p.ch.gold < it.cost) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); return; }
        const g = AH.gemOf(it.k); p.ch.gold -= it.cost; p.takeCons(it.k, 3); const nk = AH.gemKey(g.type, g.g + 1);
        if (!p.addItem(AH.makeCons(nk))) G.dropItem(p.x, p.y + 8, AH.makeCons(nk), p.pid);
        AH.Audio.sfx('magic'); m.say = 'THERE. ' + AH.tr(AH.CONSUMABLES[nk].name) + '.'; return;
      }
      if (p.ch.gold < 15) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); return; }
      p.ch.gold -= 15;
      const gems = it.it.runes.filter(AH.isGem); it.it.runes = it.it.runes.filter(r => !AH.isGem(r));
      for (const k of gems) if (!p.addItem(AH.makeCons(k))) G.dropItem(p.x, p.y + 8, AH.makeCons(k), p.pid);
      p.recalc(); AH.Audio.sfx('magic'); m.say = 'NOT A SCRATCH ON THEM.';
      m.sel = 0;
    }, () => { if (m.mode !== 'menu') { m.mode = 'menu'; m.sel = 0; AH.Audio.sfx('back'); } else { G.closeMenu(); G.saveAll(); } });
  };
  U.draw.jewel = function (G, ctx, m) {
    U.bg(ctx);
    AH.frame(ctx, 4, 4, 130, 262); const s = AH.SPR.jeweler; AH.drawSpr(ctx, s, 69 - s.w * 2, 20, false, 4);
    AH.text(ctx, 69, 96, 'ISOLDE THE JEWELER', '#f2e3b3', { align: 'center', maxW: 124 });
    AH.wrap('"' + m.say + '"', 118).forEach((l, i) => AH.text(ctx, 69, 110 + i * 9, l, '#a39bb0', { align: 'center' }));
    AH.coinIcon(ctx, 12, 250); AH.text(ctx, 20, 249, '' + m.p.ch.gold, '#f2c94c');
    const rows = U.jewelRows(m).map(r => m.mode === 'combine' && r.k ? Object.assign({}, r, { label: r.label, right: r.right + '  ' + r.cost + 'G', col: r.ok ? '#cfc6b4' : '#6a6274' }) : r);
    U.list(ctx, rows, m.sel, 150, 20, 320, { lh: 13 });
    if (m.mode === 'combine') AH.text(ctx, 310, 250, 'THREE OF A KIND MAKE ONE BETTER', '#6f6880', { align: 'center' });
  };
})();

AH.addI18n(`
IRON SCRAP|FERRAILLE|VASHULLADÉK
ARCANE DUST|POUSSIÈRE ARCANIQUE|VARÁZSPOR
LEGENDARY SHARD|ÉCLAT LÉGENDAIRE|LEGENDÁS SZILÁNK
RUBY|RUBIS|RUBIN
SAPPHIRE|SAPHIR|ZAFÍR
EMERALD|ÉMERAUDE|SMARAGD
TOPAZ|TOPAZE|TOPÁZ
AMETHYST|AMÉTHYSTE|AMETISZT
DIAMOND|DIAMANT|GYÉMÁNT
CHIPPED RUBY|RUBIS ÉBRÉCHÉ|CSORBA RUBIN
CHIPPED SAPPHIRE|SAPHIR ÉBRÉCHÉ|CSORBA ZAFÍR
CHIPPED EMERALD|ÉMERAUDE ÉBRÉCHÉE|CSORBA SMARAGD
CHIPPED TOPAZ|TOPAZE ÉBRÉCHÉE|CSORBA TOPÁZ
CHIPPED AMETHYST|AMÉTHYSTE ÉBRÉCHÉE|CSORBA AMETISZT
CHIPPED DIAMOND|DIAMANT ÉBRÉCHÉ|CSORBA GYÉMÁNT
FLAWLESS RUBY|RUBIS PARFAIT|HIBÁTLAN RUBIN
FLAWLESS SAPPHIRE|SAPHIR PARFAIT|HIBÁTLAN ZAFÍR
FLAWLESS EMERALD|ÉMERAUDE PARFAITE|HIBÁTLAN SMARAGD
FLAWLESS TOPAZ|TOPAZE PARFAITE|HIBÁTLAN TOPÁZ
FLAWLESS AMETHYST|AMÉTHYSTE PARFAITE|HIBÁTLAN AMETISZT
FLAWLESS DIAMOND|DIAMANT PARFAIT|HIBÁTLAN GYÉMÁNT
PERFECT RUBY|RUBIS ROYAL|TÖKÉLETES RUBIN
PERFECT SAPPHIRE|SAPHIR ROYAL|TÖKÉLETES ZAFÍR
PERFECT EMERALD|ÉMERAUDE ROYALE|TÖKÉLETES SMARAGD
PERFECT TOPAZ|TOPAZE ROYALE|TÖKÉLETES TOPÁZ
PERFECT AMETHYST|AMÉTHYSTE ROYALE|TÖKÉLETES AMETISZT
PERFECT DIAMOND|DIAMANT ROYAL|TÖKÉLETES GYÉMÁNT
HELM|CASQUE|SISAK
ARMOR|ARMURE|PÁNCÉL
THREE OF THESE MAKE A BETTER ONE AT THE JEWELER|TROIS DE CES PIERRES EN FONT UNE MEILLEURE CHEZ LA JOAILLIÈRE|HÁROM EBBŐL EGY JOBBAT AD AZ ÉKSZERÉSZNÉL
THE FINEST GEM THERE IS|LA PLUS BELLE PIERRE QUI SOIT|A LEGSZEBB KŐ, AMI LÉTEZIK
USE IT TO SET IT INTO GEAR WITH A FREE SOCKET|UTILISE-LA POUR LA SERTIR DANS UN ÉQUIPEMENT AVEC UNE CHÂSSE LIBRE|HASZNÁLD, ÉS BETEHETED EGY SZABAD FOGLALATÚ TÁRGYBA
THE SMITH CRAFTS WITH IT|LE FORGERON S'EN SERT|A KOVÁCS DOLGOZIK VELE
ANCIENT: STRONGER THAN ITS KIND|ANCIEN : PLUS FORT QUE SES SEMBLABLES|ŐSI: ERŐSEBB A TÖBBINÉL
AN ANCIENT ITEM!|UN OBJET ANCIEN !|ŐSI TÁRGY!
PARAGON|PARANGON|PARAGON
PARAGON LEVEL|NIVEAU DE PARANGON|PARAGON SZINT
POINTS TO SPEND|POINTS À DÉPENSER|KIOSZTHATÓ PONT
MAIN STAT|CARAC. PRINCIPALE|FŐ TULAJDONSÁG
DAMAGE TAKEN|DÉGÂTS SUBIS|KAPOTT SEBZÉS
GOLD AND MAGIC FIND|OR ET DÉCOUVERTE MAGIQUE|ARANY ÉS TÁRGYTALÁLÁS
EVERY LEVEL PAST 70 GIVES A PARAGON POINT. SPEND IT HERE; TAKING ONE BACK IS FREE.|CHAQUE NIVEAU APRÈS 70 DONNE UN POINT DE PARANGON. DÉPENSE-LE ICI ; LE REPRENDRE EST GRATUIT.|A 70. SZINT UTÁN MINDEN SZINT AD EGY PARAGON PONTOT. ITT KÖLTHETED EL; VISSZAVENNI INGYENES.
ADD|AJOUTER|HOZZÁAD
TAKE BACK|REPRENDRE|VISSZAVESZ
PARAGON {0}! A POINT TO SPEND|PARANGON {0} ! UN POINT À DÉPENSER|{0}. PARAGON! EGY PONTOT KIOSZTHATSZ
SALVAGE GEAR|RECYCLER L'ÉQUIPEMENT|FELSZERELÉS SZÉTSZEDÉSE
REROLL ONE BONUS|RETIRER UN BONUS|EGY TULAJDONSÁG ÚJRADOBÁSA
ADD A BONUS|AJOUTER UN BONUS|TULAJDONSÁG HOZZÁADÁSA
SALVAGED|RECYCLÉ|SZÉTSZEDVE
TAKE IT OFF FIRST|ENLÈVE-LE D'ABORD|ELŐBB VEDD LE
THE SMITH WILL NOT BREAK THAT|LE FORGERON NE CASSERA PAS ÇA|EZT A KOVÁCS NEM SZEDI SZÉT
IDENTIFY IT FIRST|IDENTIFIE-LE D'ABORD|ELŐBB AZONOSÍTSD
NO BONUS TO REROLL|AUCUN BONUS À RETIRER|NINCS ÚJRADOBHATÓ TULAJDONSÁG
NO ROOM FOR ANOTHER BONUS|PAS DE PLACE POUR UN AUTRE BONUS|NINCS HELY TÖBB TULAJDONSÁGNAK
YOU NEED|IL TE FAUT|KELL:
NEW BONUS|NOUVEAU BONUS|ÚJ TULAJDONSÁG
SALVAGE WHAT?|RECYCLER QUOI ?|MIT SZEDJEK SZÉT?
REROLL ON WHAT?|RETIRER SUR QUOI ?|MELYIKEN DOBJAK ÚJRA?
ADD TO WHAT?|AJOUTER À QUOI ?|MELYIKHEZ ADJAK?
WHICH BONUS?|QUEL BONUS ?|MELYIK TULAJDONSÁG?
I BREAK IT, YOU KEEP WHAT IS GOOD IN IT.|JE LE CASSE, TU GARDES CE QU'IL A DE BON.|ÉN SZÉTSZEDEM, TE MEGTARTOD, AMI JÓ BENNE.
ONE BONUS, MADE NEW. NO PROMISES.|UN BONUS, REFAIT À NEUF. SANS PROMESSE.|EGY TULAJDONSÁG, ÚJRA. ÍGÉRNI NEM ÍGÉREK SEMMIT.
THERE IS ALWAYS ROOM FOR ONE MORE... ALMOST.|IL Y A TOUJOURS DE LA PLACE POUR UN DE PLUS... PRESQUE.|MINDIG VAN HELY MÉG EGYNEK... MAJDNEM.
WHICH ONE GOES?|LEQUEL S'EN VA ?|MELYIK MENJEN?
SOCKETS CLEARED. YOUR GEMS ARE BACK IN THE BAG|CHÂSSES VIDÉES. TES PIERRES SONT DANS TON SAC|FOGLALATOK KIÜRÍTVE. A KÖVEID A TÁSKÁDBAN
GAMBLE|PARIER|SZERENCSEJÁTÉK
JEWELER|JOAILLIÈRE|ÉKSZERÉSZ
KAZIMIR THE GAMBLER|KAZIMIR LE PARIEUR|KAZIMIR, A SZERENCSEJÁTÉKOS
PICK A KIND. I PICK THE REST. HEH.|CHOISIS LE GENRE. JE CHOISIS LE RESTE. HÉ.|TE VÁLASZTASZ FAJTÁT. A TÖBBIT ÉN. HEHE.
WELL! LADY LUCK LOVES YOU.|EH BIEN ! LA CHANCE T'AIME.|NOCSAK! SZERET A SZERENCSE.
NOT BAD, NOT BAD.|PAS MAL, PAS MAL.|NEM ROSSZ, NEM ROSSZ.
BETTER LUCK NEXT TIME.|PLUS DE CHANCE LA PROCHAINE FOIS.|LEGKÖZELEBB TÖBB SZERENCSÉT.
ISOLDE THE JEWELER|ISOLDE LA JOAILLIÈRE|ISOLDE, AZ ÉKSZERÉSZ
GEMS, MY DEAR. NOTHING ELSE LASTS.|LES PIERRES, MON CHER. RIEN D'AUTRE NE DURE.|DRÁGAKÖVEK, KEDVESEM. SEMMI MÁS NEM TART ÖRÖKKÉ.
COMBINE THREE GEMS|COMBINER TROIS PIERRES|HÁROM KŐ ÖSSZEOLVASZTÁSA
TAKE GEMS OUT OF GEAR|SORTIR LES PIERRES DE L'ÉQUIPEMENT|KÖVEK KISZEDÉSE A TÁRGYAKBÓL
NO GEMS TO COMBINE|PAS DE PIERRES À COMBINER|NINCS ÖSSZEOLVASZTHATÓ KŐ
NO GEMS IN YOUR GEAR|PAS DE PIERRES DANS TON ÉQUIPEMENT|NINCS KŐ A TÁRGYAIDBAN
YOU NEED THREE OF THEM|IL T'EN FAUT TROIS|HÁROM KELL BELŐLE
NOT A SCRATCH ON THEM.|PAS UNE ÉGRATIGNURE.|EGY KARCOLÁS SINCS RAJTUK.
THREE OF A KIND MAKE ONE BETTER|TROIS PAREILLES EN FONT UNE MEILLEURE|HÁROM EGYFORMÁBÓL EGY JOBB LESZ
GEM SET|PIERRE SERTIE|KŐ A HELYÉN
HEIRLOOM OF {0}|HÉRITAGE DE {0}|{0} ÖRÖKSÉGE
`);
