'use strict';
// Season play, the visible part: the season keeper in town, the season journal, the hud, the floor props and the weather.
(function () {
  const U = AH.UI, S = AH.Season, SPA = AH.SPA, TH = SPA.TH, GP = AH.Game.prototype, R = AH.Render.prototype, T = AH.T;
  const tid = SPA.tid;
  const RW = AH.W, RH = AH.H, UW = AH.UW, UH = AH.UH;
  const col = () => { const c = S.now(); return c ? c.theme.col : '#f2c94c'; };
  // a small diamond: the season coin
  AH.sigIcon = function (ctx, x, y, c) { AH.rect(ctx, x + 2, y, 1, 1, c); AH.rect(ctx, x + 1, y + 1, 3, 1, c); AH.rect(ctx, x, y + 2, 5, 1, c); AH.rect(ctx, x + 1, y + 3, 3, 1, c); AH.rect(ctx, x + 2, y + 4, 1, 1, c); AH.rect(ctx, x + 2, y + 1, 1, 1, '#ffffff'); };

  // ---------- the season keeper ----------
  const keeperSpr = {};
  const kSpr = () => { const c = col(); if (!keeperSpr[c]) keeperSpr[c] = AH.recolor(AH.SPR.cultist, { p: '#2a2438', P: '#16121e', k: '#0c0910', e: c, f: '#c89868', g: c }); return keeperSpr[c]; };
  const _vill = GP.spawnVillagers;
  GP.spawnVillagers = function () {
    _vill.call(this);
    if (this.scene !== 'town' || !this.map || !this.map.town || !tid(this)) return;
    this.npcs.push({ kind: 'vendor', role: 'skeeper', spr: kSpr(), x: 20 * T + 8, y: 14 * T + 4, face: 1, fixed: 1, name: 'THE SEASON KEEPER' });
  };
  const _find = GP.findInteract;
  GP.findInteract = function (p) {
    const best = _find.call(this, p);
    if (best && best.kind === 'vendor' && best.obj && best.obj.role === 'skeeper') best.label = 'SEASON KEEPER';
    return best;
  };
  U.KEEP_PRICE = { leg: 110, boon: 36, gem: 30, pot: 12 };
  U.keeperRows = function (G, m) {
    const p = m.p, id = tid(G) || (S.now() && S.now().theme.id), th = TH[id], sig = p.ch.sig || 0, P = U.KEEP_PRICE;
    const done = [0, 1, 2, 3].filter(i => SPA.chapDone(p.ch, id, i)).length;
    const rows = [
      { id: 'journal', label: 'SEASON JOURNAL', right: done + '/4', rcol: col() },
      { id: 'leg', label: 'SEASON LEGENDARY', right: '' + P.leg, rcol: sig >= P.leg ? col() : '#5a5262' },
      { id: 'boon', label: th.boon.name, right: p.ch.boon === id ? 'READY' : '' + P.boon, rcol: p.ch.boon === id ? '#8ae08e' : sig >= P.boon ? col() : '#5a5262' },
      { id: 'gem', label: 'FLAWLESS GEM', right: '' + P.gem, rcol: sig >= P.gem ? col() : '#5a5262' },
      { id: 'pot', label: '3 HEALING POTIONS', right: '' + P.pot, rcol: sig >= P.pot ? col() : '#5a5262' },
    ];
    if (id === 's_gold') rows.push({ id: 'invest', label: 'INVEST IN A SHAFT', right: p.ch.invest ? AH.tr('WAITING') : '10% ' + AH.tr('GOLD'), rcol: '#f2c94c' });
    rows.push({ id: 'leave', label: 'LEAVE' });
    return rows;
  };
  U.init.skeeper = function (G, m) { m.sel = 0; const th = TH[tid(G)]; m.say = th ? th.say : ''; };
  U.update.skeeper = function (G, m, dt) {
    const p = m.p, id = tid(G), th = TH[id];
    if (!th) { G.closeMenu(); return; }
    U.listUpdate(G, m, dt, U.keeperRows(G, m), it => {
      const pay = n => { if ((p.ch.sig || 0) < n) { G.toast(p, 'NOT ENOUGH ' + th.cur, '#ff8a8a'); AH.Audio.sfx('error'); return false; } p.ch.sig -= n; return true; };
      const give = x => { if (!p.addItem(x)) { G.toast(p, 'BAG IS FULL', '#ff8a8a'); return false; } return true; };
      if (it.id === 'leave') { G.closeMenu(); G.saveAll(); return; }
      if (it.id === 'journal') { G.openMenu('sjournal', p, { dev: m.dev }); return; }
      if (it.id === 'leg') { if (p.bagFree() < 0) { G.toast(p, 'BAG IS FULL', '#ff8a8a'); return; } if (!pay(U.KEEP_PRICE.leg)) return; const x = AH.seasonLegend(id, Math.max(5, p.ch.deepest || 1)); give(x); AH.Audio.sfx('legend'); G.toast(p, AH.tr(x.name), AH.RARITY[3].col); m.say = 'WEAR IT WELL. IT REMEMBERS THIS SEASON.'; }
      if (it.id === 'boon') { if (p.ch.boon === id) { G.toast(p, 'YOUR BLESSING WAITS FOR YOUR NEXT TRIP', '#8ae08e'); return; } if (!pay(U.KEEP_PRICE.boon)) return; p.ch.boon = id; AH.Audio.sfx('holy'); m.say = 'IT WILL BE WITH YOU NEXT TIME YOU GO DOWN.'; }
      if (it.id === 'gem') { if (p.bagFree() < 0) { G.toast(p, 'BAG IS FULL', '#ff8a8a'); return; } if (!pay(U.KEEP_PRICE.gem)) return; give(AH.makeCons(AH.gemKey(AH.rand.pick(Object.keys(AH.GEMS)), 2), 1)); AH.Audio.sfx('coin'); }
      if (it.id === 'pot') { if (!pay(U.KEEP_PRICE.pot)) return; if (!give(AH.makeCons('potion', 3))) p.ch.sig += U.KEEP_PRICE.pot; else AH.Audio.sfx('coin'); }
      if (it.id === 'invest') {
        if (p.ch.invest) { G.toast(p, 'YOUR SHAFT PAYS OUT TOMORROW MORNING', '#f2c94c'); return; }
        const g = Math.floor(p.ch.gold * 0.1); if (g < 50) { G.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); return; }
        p.ch.gold -= g; p.ch.invest = g; AH.Audio.sfx('coin'); m.say = 'TOMORROW IT PAYS - OR THE ROOF COMES DOWN. HEH.';
      }
      G.saveAll();
    }, () => { G.closeMenu(); G.saveAll(); });
  };
  U.draw.skeeper = function (G, ctx, m) {
    U.bg(ctx);
    const p = m.p, id = tid(G), th = TH[id], c = S.now(); if (!th || !c) return;
    AH.frame(ctx, 4, 4, 130, 262, { edge: c.theme.col });
    const s = kSpr(); AH.drawSpr(ctx, s, 69 - s.w * 2, 20, false, 4);
    AH.text(ctx, 69, 92, 'THE SEASON KEEPER', '#f2e3b3', { align: 'center', maxW: 124 });
    AH.text(ctx, 69, 102, c.theme.name, c.theme.col, { align: 'center', maxW: 124 });
    AH.wrap('"' + AH.tr(m.say) + '"', 118).forEach((l, i) => AH.text(ctx, 69, 116 + i * 9, l, '#a39bb0', { align: 'center' }));
    AH.sigIcon(ctx, 12, 249, c.theme.col); AH.text(ctx, 20, 249, (p.ch.sig || 0) + ' ' + AH.tr(th.cur), c.theme.col, { maxW: 108 });
    AH.coinIcon(ctx, 12, 238); AH.text(ctx, 20, 237, '' + p.ch.gold, '#f2c94c');
    const rows = U.keeperRows(G, m);
    AH.text(ctx, 150, 12, 'PRICES IN ' + th.cur, '#6f6880');
    U.list(ctx, rows, m.sel, 150, 26, 320, { lh: 14 });
    const r = rows[m.sel]; let desc = '';
    if (r) {
      if (r.id === 'journal') desc = 'FOUR CHAPTERS OF SEASON TASKS. EVERY CHAPTER HAS A REWARD.';
      if (r.id === 'leg') desc = AH.tr('ONE OF THE SEASON\'S TWO POWERS') + ': ' + th.pw.map(id2 => AH.tr(AH.SET_POWER_LAB(id2))).join(' / ');
      if (r.id === 'boon') desc = th.boon.desc;
      if (r.id === 'gem') desc = 'A RANDOM FLAWLESS GEM.';
      if (r.id === 'pot') desc = 'THREE HEALING POTIONS.';
      if (r.id === 'invest') desc = 'A TENTH OF YOUR GOLD GOES INTO A SHAFT. TOMORROW MORNING IT PAYS BACK MORE - OR NOTHING AT ALL.';
    }
    AH.frame(ctx, 150, 140 + 4, 320, 96, { fill: '#100c14' });
    AH.wrap(desc, 304).forEach((l, i) => AH.text(ctx, 158, 152 + i * 10, l, '#cfc6b4'));
    U.hint(ctx, U.btnName(G, m, 'a') + ' CHOOSE   ' + U.btnName(G, m, 'b') + ' LEAVE');
  };

  // ---------- the season journal ----------
  U.init.sjournal = function (G, m) { m.sel = 0; const p = m.p, id = tid(G) || (S.now() && S.now().theme.id); for (let i = 0; i < 4; i++) { const j = p.ch.sj; if (!(j && j.got && j.got.indexOf(i) >= 0)) { m.sel = i; break; } } m.id = id; };
  U.update.sjournal = function (G, m, dt) {
    const p = m.p, rows = [0, 1, 2, 3].map(i => ({ i }));
    U.listUpdate(G, m, dt, rows, it => {
      const j = p.ch.sj || {};
      if (j.got && j.got.indexOf(it.i) >= 0) { G.toast(p, 'ALREADY CLAIMED', '#a39bb0'); return; }
      if (!SPA.chapDone(p.ch, m.id, it.i)) { G.toast(p, 'NOT DONE YET', '#a39bb0'); AH.Audio.sfx('error'); return; }
      if (it.i > 0 && !(j.got && j.got.indexOf(it.i - 1) >= 0)) { G.toast(p, 'CLAIM THE CHAPTER BEFORE IT FIRST', '#a39bb0'); return; }
      SPA.claim(G, p, it.i);
    }, () => G.closeMenu());
  };
  U.draw.sjournal = function (G, ctx, m) {
    U.bg(ctx);
    const p = m.p, c = S.now(), id = m.id; if (!c || !TH[id]) return;
    U.title(ctx, 'SEASON JOURNAL', 10, c.theme.col);
    AH.text(ctx, UW / 2, 30, AH.tr('SEASON') + ' ' + c.n + ': ' + AH.tr(c.theme.name) + ' - ' + S.leftText(), '#8d8494', { align: 'center' });
    const j = p.ch.sj && p.ch.sj.s === c.n ? p.ch.sj : { got: [] };
    const rows = [0, 1, 2, 3].map(i => {
      const got = j.got.indexOf(i) >= 0, done = SPA.chapDone(p.ch, id, i);
      return { label: AH.tr('CHAPTER') + ' ' + (i + 1), right: got ? AH.tr('CLAIMED') : done ? AH.tr('CLAIM!') : SPA.chapters(id)[i].filter(t => SPA.taskVal(p.ch, t) >= t.n).length + '/' + SPA.chapters(id)[i].length, rcol: got ? '#5a5262' : done ? '#8ae08e' : '#a39bb0' };
    });
    U.list(ctx, rows, m.sel, 12, 52, 140, { lh: 18 });
    AH.frame(ctx, 160, 44, 310, 200, { fill: '#100c14', edge: c.theme.col });
    const tasks = SPA.chapters(id)[m.sel] || [];
    tasks.forEach((t, k) => {
      const v = Math.min(t.n, SPA.taskVal(p.ch, t)), y = 54 + k * 30, ok = v >= t.n;
      AH.text(ctx, 170, y, SPA.taskLab(id, t), ok ? '#8ae08e' : '#cfc6b4', { maxW: 290 });
      AH.bar(ctx, 170, y + 11, 230, 4, v / t.n, ok ? '#8ae08e' : c.theme.col, '#2a2430');
      AH.text(ctx, 410, y + 9, v + '/' + t.n, ok ? '#8ae08e' : '#a39bb0');
    });
    AH.text(ctx, 170, 192, 'REWARD', '#6f6880');
    AH.wrap(SPA.REWARDS[m.sel], 290).forEach((l, i) => AH.text(ctx, 170, 204 + i * 10, l, '#f2c94c'));
    AH.sigIcon(ctx, 14, 250, c.theme.col); AH.text(ctx, 22, 250, (p.ch.sig || 0) + ' ' + AH.tr(TH[id].cur), c.theme.col);
    U.hint(ctx, U.btnName(G, m, 'a') + ' CLAIM   ' + U.btnName(G, m, 'b') + ' BACK');
  };
  // the journal from the pause menu
  const _pause = U.pauseItems;
  U.pauseItems = function (G, m) {
    const it = _pause(G, m);
    if (m.p && tid(G) && S.active(m.p.ch)) it.splice(Math.min(it.length - 1, 4), 0, { id: 'sjournal', label: 'SEASON JOURNAL', rcol: col(), right: (m.p.ch.sig || 0) + '' });
    return it;
  };
  const _pupd = U.update.pause;
  U.update.pause = function (G, m, dt) {
    const items = U.pauseItems(G, m);
    if (items[m.sel] && items[m.sel].id === 'sjournal') {
      const n = U.nav(G, m, dt); const ms = U.mouseList(G, m);
      if (n.dy) { m.sel = (m.sel + n.dy + items.length) % items.length; AH.Audio.sfx('move'); return; }
      if (n.p.a || (ms && ms.pick)) { G.closeMenu(); G.openMenu('sjournal', m.p, { dev: m.dev }); return; }
      if (n.p.b || n.p.start) { G.closeMenu(); return; }
      return;
    }
    _pupd(G, m, dt);
  };
  // season items say where they come from
  const _lines = AH.itemLines;
  AH.itemLines = function (it, cls) {
    const L = _lines(it, cls);
    if (it && it.slegend) { const t = AH.SEASON_THEMES.find(x => x.id === it.slegend); if (t) L.splice(1, 0, { t: AH.tr('SEASON LEGENDARY') + ': ' + AH.tr(t.name), c: t.col }); }
    return L;
  };

  // ---------- floor props ----------
  const _props = R.drawMineProps;
  R.drawMineProps = function (G, v) {
    _props.call(this, G, v);
    const ctx = this.ctx, m = G.map;
    for (const p of m.props) {
      if (!p.type || p.type[0] !== 's' || p.type[1] !== '_' || !this.inView(v, p.x, p.y, 30)) continue;
      if (p.type === 's_brazier') { const s = Math.floor(G.time * 6 + p.id) % 2 ? AH.SPR.s_brazier : AH.SPR.s_brazier2; AH.drawSpr(ctx, s, p.x - 6, p.y - 13); }
      else if (p.type === 's_bonepile' && !p.used) AH.drawSpr(ctx, AH.SPR.s_bonepile, p.x - 7, p.y - 6);
      else if (p.type === 's_crypt') AH.drawSpr(ctx, p.open ? AH.SPR.s_cryptOpen : AH.SPR.s_crypt, p.x - 7, p.y - 13);
      else if (p.type === 's_chasm') {
        // a dark hole in the floor with a glimmer of the deep at the bottom
        for (let j = -6; j <= 6; j++) for (let i = -14; i <= 14; i++) {
          const d = (i * i) / 196 + (j * j) / 36; if (d > 1) continue;
          ctx.fillStyle = d > 0.78 ? '#3a4a6a' : d > 0.55 ? '#141a2a' : '#06040a';
          ctx.fillRect(p.x + i, p.y + j, 1, 1);
        }
        if (Math.floor(G.time * 3) % 3 === 0) { ctx.fillStyle = '#6fd6e8'; ctx.fillRect(p.x + (Math.floor(G.time * 7) % 9) - 4, p.y + 1, 1, 1); }
      }
    }
  };
  const _em = R.drawEmissive;
  R.drawEmissive = function (G, v) {
    _em.call(this, G, v);
    if (G.scene !== 'mine' || !tid(G)) return;
    const ctx = this.ctx;
    ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip(); ctx.translate(v.x - v.camX, v.y - v.camY);
    for (const p of G.map.props) if (p.type === 's_brazier' && this.inView(v, p.x, p.y)) { const s = Math.floor(G.time * 6 + p.id) % 2 ? AH.SPR.s_brazier : AH.SPR.s_brazier2; AH.drawSprEm(ctx, s, p.x - 6, p.y - 13); }
    for (const e of G.enemies) if (e.sobj && !e.dead && this.inView(v, e.x, e.y) && e._dx !== undefined) AH.drawSprEm(ctx, e.spr, e._dx, e._dy, false, e.scale);
    ctx.restore();
  };
  // umbral foes are hard to see until they are close
  const _eDraw = AH.Enemy.prototype.draw;
  AH.Enemy.prototype.draw = function (ctx, G) {
    if (this.has && this.has('umbral') && !this.dead && G.scene === 'mine') {
      const near = G.players.some(p => !p.dead && Math.hypot(p.x - this.x, p.y - this.y) < 56);
      if (!near) { ctx.globalAlpha = 0.18; try { _eDraw.call(this, ctx, G); } finally { ctx.globalAlpha = 1; } return; }
    }
    _eDraw.call(this, ctx, G);
  };

  // ---------- the town in the season ----------
  const _world = R.drawWorld;
  R.drawWorld = function (G, v) {
    _world.call(this, G, v);
    if (G.scene !== 'town' || !G.map) return;
    const id = tid(G); if (!id) return;
    const ctx = this.ctx, m = G.map;
    ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip(); ctx.translate(v.x - v.camX, v.y - v.camY);
    if (id === 's_winter') {
      // snow lies on the ground
      const x0 = Math.floor(v.camX / 2) * 2, y0 = Math.floor(v.camY / 2) * 2;
      for (let y = y0; y < v.camY + v.h; y += 2) for (let x = x0; x < v.camX + v.w; x += 2) {
        const tl = m.get(Math.floor(x / T), Math.floor(y / T)); if (tl !== AH.TILE.GRASS && tl !== AH.TILE.ROAD) continue;
        const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        if (h % 7 < (tl === AH.TILE.ROAD ? 1 : 3)) { ctx.fillStyle = h % 3 ? '#e8f0ff' : '#c8d8ec'; ctx.fillRect(x, y, h % 5 ? 1 : 2, 1); }
      }
    }
    if (id === 's_depth' && m.board) {
      // the trophy wall: one skull for every legend brought down this season
      const n = Math.min(12, Math.max(...G.players.map(p => p.ch.trophies || 0)));
      for (let k = 0; k < n; k++) { const x = m.board.x - 16 + (k % 6) * 6, y = m.board.y - 22 - Math.floor(k / 6) * 6; ctx.fillStyle = AH.OUT; ctx.fillRect(x - 1, y - 1, 5, 5); ctx.fillStyle = '#e2dcc8'; ctx.fillRect(x, y, 3, 3); ctx.fillStyle = '#2a2430'; ctx.fillRect(x, y + 1, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1); }
    }
    ctx.restore();
  };

  // ---------- on-screen effects and the season hud ----------
  const _vh = R.drawViewHud;
  R.drawViewHud = function (G, v, views) {
    const id = tid(G);
    if (id) try { overlay(this, G, v, id); } catch (e) { /* never block the hud */ }
    _vh.call(this, G, v, views);
    if (id && v.split && v.main && !v.main.remote) widget(this.ctx, G, v.main, v.x + 2, v.y + v.h - 22, id);
  };
  function overlay(r, G, v, id) {
    const ctx = r.ctx, p = v.main || (v.players && v.players[0]);
    if (G.scene === 'mine') {
      if (id === 's_winter') {
        for (let i = 0; i < 36; i++) {
          const sx = (i * 61.7 + Math.sin(G.time + i) * 10 + G.time * 6) % v.w, sy = (i * 37.3 + G.time * (16 + (i % 4) * 5)) % v.h;
          ctx.fillStyle = i % 4 ? 'rgba(232,240,255,0.7)' : '#ffffff'; ctx.fillRect(Math.round(v.x + sx), Math.round(v.y + sy), 1, 1);
        }
        if (p && p.cold > 40) edges(ctx, v, '#9ef0ff', (p.cold - 40) / 60 * 0.5, Math.round(2 + (p.cold - 40) / 10));
      }
      if (id === 's_bloodmoon' && G.fullMoon) edges(ctx, v, '#c81a2a', 0.25 + 0.15 * Math.sin(G.time * 4), 4);
      if (id === 's_depth' && G.deepCurse) edges(ctx, v, '#3a5a8a', 0.3, 3);
      if (id === 's_shadow' && p && p.oil !== undefined && p.oil < 25) edges(ctx, v, '#000000', 0.5, 6);
      if (G.lightning > 0.05) { ctx.fillStyle = 'rgba(230,236,255,' + Math.min(0.4, G.lightning * 2.5) + ')'; ctx.fillRect(v.x, v.y, v.w, v.h); }
    } else if (G.scene === 'town' && id === 's_bloodmoon') {
      const night = 1 - r.ambientOf(G); if (night > 0.25) { ctx.fillStyle = 'rgba(140,10,20,' + Math.min(0.16, night * 0.2) + ')'; ctx.fillRect(v.x, v.y, v.w, v.h); }
    }
  }
  // dithered coloured frame around the view
  function edges(ctx, v, c, a, wd) {
    ctx.fillStyle = c;
    for (let k = 0; k < wd; k++) {
      const aa = a * (1 - k / wd);
      for (let x = v.x; x < v.x + v.w; x++) { if (AH.BAYER[((v.y + k) & 3) * 4 + (x & 3)] < aa) ctx.fillRect(x, v.y + k, 1, 1); if (AH.BAYER[((v.y + v.h - 1 - k) & 3) * 4 + (x & 3)] < aa) ctx.fillRect(x, v.y + v.h - 1 - k, 1, 1); }
      for (let y = v.y; y < v.y + v.h; y++) { if (AH.BAYER[(y & 3) * 4 + ((v.x + k) & 3)] < aa) ctx.fillRect(v.x + k, y, 1, 1); if (AH.BAYER[(y & 3) * 4 + ((v.x + v.w - 1 - k) & 3)] < aa) ctx.fillRect(v.x + v.w - 1 - k, y, 1, 1); }
    }
  }
  // coin and meter: bottom left, above the gold
  function meterOf(p, id, G) {
    if (id === 's_winter') return { lab: 'COLD', v: (p.cold || 0) / 100, c: p.cold >= 100 ? '#ffffff' : p.cold >= 60 ? '#9ef0ff' : '#6fb8d8' };
    if (id === 's_bloodmoon') return p.buffs.pact > 0 ? { lab: 'PACT', v: p.buffs.pact / (p.pactMax || 12), c: '#ff5a5a' } : { lab: 'BLOOD', v: (p.blood || 0) / 100, c: '#c81a2a' };
    if (id === 's_shadow') return { lab: 'OIL', v: (p.oil === undefined ? 100 : p.oil) / 100, c: '#e8c860' };
    if (id === 's_storm') return p.buffs.superc > 0 ? { lab: 'SUPERCHARGED', v: p.buffs.superc / 12, c: '#ffffff' } : { lab: 'CHARGE', v: (p.charge || 0) / 100, c: '#ffe04a' };
    if (id === 's_gold' && !p.boonOn) { const W = (600 + p.ch.level * 60) / AH.SPA.HARD; return { lab: (p.tripGold || 0) > W ? 'HEAVY POCKETS' : 'POCKETS', v: Math.min(1, (p.tripGold || 0) / (W * 2)), c: (p.tripGold || 0) > W ? '#ff9a3e' : '#f2c94c' }; }
    if (id === 's_bones' && p.boneSt) return { lab: 'BONE ARMOR', v: p.boneSt / 10, c: '#e2dcc8' };
    return null;
  }
  function widget(ctx, G, p, x, y, id) {
    const th = TH[id]; if (!th || !p || !p.ch) return;
    AH.sigIcon(ctx, x + 1, y + 1, col()); AH.text(ctx, x + 8, y, '' + (p.ch.sig || 0), col());
    const mt = G.scene === 'mine' ? meterOf(p, id, G) : null;
    if (mt) { const mx = x + 8 + AH.textW('' + (p.ch.sig || 0)) + 6; AH.text(ctx, mx, y, mt.lab, mt.c); const bx = mx + AH.textW(mt.lab) + 4; AH.bar(ctx, bx, y + 1, 40, 3, mt.v, mt.c, '#2a2430'); }
  }
  const _gh = R.drawGlobalHud;
  R.drawGlobalHud = function (G, views) {
    _gh.call(this, G, views);
    const id = tid(G); if (!id || views.length !== 1 || G.scene === 'title') return;
    const locals = G.players.filter(p => !p.remote);
    locals.forEach((p, i) => widget(this.ctx, G, p, 3, RH - 20 - i * 9, id));
  };
})();

AH.addI18n(`
EMBERS|BRAISES|PARÁZS
BLOOD DROPS|GOUTTES DE SANG|VÉRCSEPP
BONE CHIPS|ÉCLATS D'OS|CSONTSZILÁNK
NUGGETS|PÉPITES|ARANYRÖG
LIGHT SHARDS|ÉCLATS DE LUMIÈRE|FÉNYSZILÁNK
ABYSS PEARLS|PERLES DE L'ABÎME|MÉLYGYÖNGY
STORM GLASS|VERRE D'ORAGE|VIHARÜVEG
OLD COINS|VIEILLES PIÈCES|ŐSI ÉRME
SIGILS|SCEAUX|PECSÉT
COLD|FROID|HIDEG
BLOOD|SANG|VÉR
PACT|PACTE|PAKTUM
OIL|HUILE|OLAJ
CHARGE|CHARGE|TÖLTÉS
SUPERCHARGED|SURCHARGÉ|TÚLTÖLTVE
POCKETS|POCHES|ZSEBEK
HEAVY POCKETS|POCHES LOURDES|NEHÉZ ZSEBEK
BONE ARMOR|ARMURE D'OS|CSONTPÁNCÉL
FRIGID|GLACIAL|FAGYOS
BLOODTHIRSTY|ASSOIFFÉ|VÉRSZOMJAS
OSSIFIED|OSSIFIÉ|ELCSONTOSODOTT
GILDED|DORÉ|ARANYOZOTT
UMBRAL|OMBREUX|ÁRNYAS
ABYSSAL|ABYSSAL|MÉLYSÉGI
CHARGED|CHARGÉ|FELTÖLTÖTT
TIMELESS|INTEMPOREL|IDŐTLEN
FROST WRAITH|SPECTRE DE GIVRE|DÉRLIDÉRC
WEREWOLF|LOUP-GAROU|VÉRFARKAS
BLOOD BAT|CHAUVE-SOURIS DE SANG|VÉRDENEVÉR
BONESMITH|FORGEUR D'OS|CSONTKOVÁCS
KOBOLD THIEF|KOBOLD VOLEUR|KOBOLDTOLVAJ
SHADE|OMBRE ERRANTE|ÁRNYLÉNY
ABYSS LURKER|RÔDEUR DE L'ABÎME|MÉLYSÉGI LESŐ
STORM SPRITE|FOLLET D'ORAGE|VIHARMANÓ
ELDER GUARDIAN|GARDIEN ANCIEN|ŐSI ŐRZŐ
RIVAL PROSPECTOR|PROSPECTEUR RIVAL|RIVÁLIS KUTATÓ
SHADOW|OMBRE|ÁRNY
ANCESTOR|ANCÊTRE|ŐS
FROZEN CHEST|COFFRE GELÉ|BEFAGYOTT LÁDA
GOLD SEAM|FILON D'OR|ARANYÉR
LIGHT CRYSTAL|CRISTAL DE LUMIÈRE|FÉNYKRISTÁLY
STORM ROD|PARATONNERRE|VIHARRÚD
HEARTH BLESSING|BÉNÉDICTION DU FOYER|A TŰZHELY ÁLDÁSA
MOON ELIXIR|ÉLIXIR DE LUNE|HOLDELIXÍR
BONE CHARM|CHARME D'OS|CSONTAMULETT
PROSPECTOR'S MAP|CARTE DU PROSPECTEUR|A KUTATÓ TÉRKÉPE
LAMP OIL BARREL|BARIL D'HUILE|OLAJOSHORDÓ
ROPE OF THE DEEP|CORDE DES PROFONDEURS|A MÉLYSÉG KÖTELE
COPPER WIRE|FIL DE CUIVRE|RÉZDRÓT
ANCESTOR'S BLESSING|BÉNÉDICTION DES ANCÊTRES|AZ ŐSÖK ÁLDÁSA
ON YOUR NEXT TRIP THE COLD CREEPS IN HALF AS FAST.|À TA PROCHAINE DESCENTE, LE FROID MONTE DEUX FOIS MOINS VITE.|A KÖVETKEZŐ LESZÁLLÁSON FELE OLYAN GYORSAN KÚSZIK BELÉD A HIDEG.
ON YOUR NEXT TRIP EVERY BLOOD PACT LASTS TWICE AS LONG.|À TA PROCHAINE DESCENTE, CHAQUE PACTE DE SANG DURE DEUX FOIS PLUS.|A KÖVETKEZŐ LESZÁLLÁSON MINDEN VÉRPAKTUM KÉTSZER ANNYI IDEIG TART.
ON YOUR NEXT TRIP A BONE GUARD RISES BESIDE YOU ON EVERY FLOOR.|À TA PROCHAINE DESCENTE, UN GARDE D'OS SE LÈVE À TES CÔTÉS À CHAQUE ÉTAGE.|A KÖVETKEZŐ LESZÁLLÁSON MINDEN SZINTEN CSONTŐR KEL FEL MELLETTED.
ON YOUR NEXT TRIP TWICE AS MANY GOLD SEAMS AND NO HEAVY POCKETS.|À TA PROCHAINE DESCENTE, DEUX FOIS PLUS DE FILONS D'OR ET PAS DE POCHES LOURDES.|A KÖVETKEZŐ LESZÁLLÁSON KÉTSZER ANNYI ARANYÉR, ÉS NEM NEHEZEDNEK A ZSEBEID.
ON YOUR NEXT TRIP YOUR LANTERN BURNS ITS OIL HALF AS FAST.|À TA PROCHAINE DESCENTE, TA LANTERNE BRÛLE SON HUILE DEUX FOIS MOINS VITE.|A KÖVETKEZŐ LESZÁLLÁSON FELE OLYAN GYORSAN FOGY A LÁMPÁSOD OLAJA.
ON YOUR NEXT TRIP THE CHASMS DO NOT CURSE YOU.|À TA PROCHAINE DESCENTE, LES GOUFFRES NE TE MAUDISSENT PAS.|A KÖVETKEZŐ LESZÁLLÁSON A SZAKADÉKOK NEM ÁTKOZNAK MEG.
ON YOUR NEXT TRIP YOU START EVERY FLOOR HALF CHARGED.|À TA PROCHAINE DESCENTE, TU COMMENCES CHAQUE ÉTAGE À MOITIÉ CHARGÉ.|A KÖVETKEZŐ LESZÁLLÁSON MINDEN SZINTET FÉLIG FELTÖLTVE KEZDESZ.
ON YOUR NEXT TRIP EVERY ANCESTOR LEAVES TWO ANCIENT ITEMS.|À TA PROCHAINE DESCENTE, CHAQUE ANCÊTRE LAISSE DEUX OBJETS ANTIQUES.|A KÖVETKEZŐ LESZÁLLÁSON MINDEN ŐS KÉT ŐSI TÁRGYAT HAGY HÁTRA.
WARM YOURSELF AT {0} BRAZIERS|RÉCHAUFFE-TOI À {0} BRASEROS|MELEGEDJ MEG {0} PARÁZSTARTÓNÁL
SLAY {0} FROST WRAITHS|TUE {0} SPECTRES DE GIVRE|ÖLJ MEG {0} DÉRLIDÉRCET
BREAK {0} FROZEN CHESTS|BRISE {0} COFFRES GELÉS|TÖRJ FEL {0} BEFAGYOTT LÁDÁT
SEAL {0} BLOOD PACTS|SCELLE {0} PACTES DE SANG|KÖSS {0} VÉRPAKTUMOT
SLAY {0} WEREWOLVES AND BLOOD BATS|TUE {0} LOUPS-GAROUS ET CHAUVES-SOURIS DE SANG|ÖLJ MEG {0} VÉRFARKAST ÉS VÉRDENEVÉRT
SLAY {0} BEASTS UNDER THE FULL MOON|TUE {0} BÊTES SOUS LA PLEINE LUNE|ÖLJ MEG {0} SZÖRNYET TELIHOLDKOR
RAISE {0} BONE PILES|RELÈVE {0} TAS D'OS|ÉLESSZ FEL {0} CSONTKUPACOT
SLAY {0} BONESMITHS|TUE {0} FORGEURS D'OS|ÖLJ MEG {0} CSONTKOVÁCSOT
CATCH {0} RIVAL PROSPECTORS|ATTRAPE {0} PROSPECTEURS RIVAUX|KAPJ EL {0} RIVÁLIS KUTATÓT
CATCH {0} KOBOLD THIEVES|ATTRAPE {0} KOBOLDS VOLEURS|KAPJ EL {0} KOBOLDTOLVAJT
MINE {0} GOLD SEAMS|EXPLOITE {0} FILONS D'OR|BÁNYÁSSZ KI {0} ARANYERET
DEFEAT {0} OF YOUR SHADOWS|VAINCS {0} DE TES OMBRES|GYŐZD LE {0} ÁRNYÉKODAT
SLAY {0} SHADES|TUE {0} OMBRES ERRANTES|ÖLJ MEG {0} ÁRNYLÉNYT
BREAK {0} LIGHT CRYSTALS|BRISE {0} CRISTAUX DE LUMIÈRE|TÖRJ SZÉT {0} FÉNYKRISTÁLYT
JUMP INTO {0} CHASMS|SAUTE DANS {0} GOUFFRES|UGORJ BELE {0} SZAKADÉKBA
SLAY {0} ABYSS LURKERS|TUE {0} RÔDEURS DE L'ABÎME|ÖLJ MEG {0} MÉLYSÉGI LESŐT
BECOME SUPERCHARGED {0} TIMES|SOIS SURCHARGÉ {0} FOIS|TÖLTŐDJ TÚL {0} ALKALOMMAL
SLAY {0} STORM SPRITES|TUE {0} FOLLETS D'ORAGE|ÖLJ MEG {0} VIHARMANÓT
DISCHARGE {0} STORM RODS|DÉCHARGE {0} PARATONNERRES|SÜSS KI {0} VIHARRUDAT
DEFEAT {0} ANCESTORS|VAINCS {0} ANCÊTRES|GYŐZZ LE {0} ŐST
SLAY {0} ELDER GUARDIANS|TUE {0} GARDIENS ANCIENS|ÖLJ MEG {0} ŐSI ŐRZŐT
REACH FLOOR {0}|ATTEINS L'ÉTAGE {0}|ÉRD EL A(Z) {0}. SZINTET
SLAY {0} MONSTERS|TUE {0} MONSTRES|ÖLJ MEG {0} SZÖRNYET
SLAY {0} ELITES|TUE {0} ÉLITES|ÖLJ MEG {0} ELITET
SLAY {0} LEGENDARY BEASTS|TUE {0} BÊTES LÉGENDAIRES|ÖLJ MEG {0} LEGENDÁS BESTIÁT
DEFEAT {0} FLOOR GUARDIANS|VAINCS {0} GARDIENS D'ÉTAGE|GYŐZZ LE {0} SZINTŐRZŐT
THE COLD TAKES THE CARELESS. STAY NEAR THE FIRE.|LE FROID EMPORTE LES IMPRUDENTS. RESTE PRÈS DU FEU.|A HIDEG ELVISZI A FIGYELMETLENT. MARADJ A TŰZ KÖZELÉBEN.
WHEN THE MOON IS FULL, THE BLOOD SINGS. LISTEN TO IT.|QUAND LA LUNE EST PLEINE, LE SANG CHANTE. ÉCOUTE-LE.|TELIHOLDKOR A VÉR ÉNEKEL. HALLGASS RÁ.
BONES REMEMBER HOW TO STAND. THEY ONLY NEED A REASON.|LES OS SE SOUVIENNENT COMMENT TENIR DEBOUT. IL LEUR FAUT JUSTE UNE RAISON.|A CSONTOK EMLÉKEZNEK, HOGYAN KELL FELÁLLNI. CSAK OK KELL HOZZÁ.
GOLD IN THE WALLS, GOLD IN THE POCKETS. MIND THE WEIGHT, FRIEND.|DE L'OR DANS LES MURS, DE L'OR DANS LES POCHES. ATTENTION AU POIDS, L'AMI.|ARANY A FALAKBAN, ARANY A ZSEBBEN. VIGYÁZZ A SÚLLYAL, BARÁTOM.
THE DARK IS HUNGRY THIS SEASON. FEED YOUR LANTERN.|L'OBSCURITÉ A FAIM CETTE SAISON. NOURRIS TA LANTERNE.|EBBEN A SZEZONBAN ÉHES A SÖTÉT. ETESD A LÁMPÁSODAT.
THE DEEP CALLS. SOME JUMP. FEW REGRET IT.|LES PROFONDEURS APPELLENT. CERTAINS SAUTENT. PEU LE REGRETTENT.|HÍV A MÉLYSÉG. VANNAK, AKIK UGRANAK. KEVESEN BÁNJÁK.
THE SKY HAS COME DOWN INTO THE MINE. CATCH IT IF YOU CAN.|LE CIEL EST DESCENDU DANS LA MINE. ATTRAPE-LE SI TU PEUX.|AZ ÉG LESZÁLLT A BÁNYÁBA. KAPD EL, HA TUDOD.
THE OLD ONES WAKE. THEY WANT TO SEE IF YOU ARE WORTHY.|LES ANCIENS S'ÉVEILLENT. ILS VEULENT VOIR SI TU ES DIGNE.|AZ ŐSÖK FELÉBREDNEK. LÁTNI AKARJÁK, MÉLTÓ VAGY-E.
YOUR FIRE ALSO CHILLS: BURNING FOES SLOW DOWN AND MAY FREEZE.|TON FEU GLACE AUSSI : LES ENNEMIS EN FEU RALENTISSENT ET PEUVENT GELER.|A TÜZED FAGYASZT IS: AZ ÉGŐ ELLENSÉG LELASSUL, ÉS MEG IS FAGYHAT.
THE COLDER YOU ARE, THE HARDER YOU HIT (UP TO 25% MORE).|PLUS TU AS FROID, PLUS TU FRAPPES FORT (JUSQU'À 25% DE PLUS).|MINÉL JOBBAN FÁZOL, ANNÁL ERŐSEBBEN ÜTSZ (LEGFELJEBB 25%-KAL).
OUT OF MANA, YOUR SKILLS ARE PAID WITH LIFE.|SANS MANA, TES COMPÉTENCES SE PAIENT EN VIE.|HA ELFOGY A MANÁD, A KÉPESSÉGEIDET ÉLETTEL FIZETED.
KILLS HEAL YOU 2% OF YOUR LIFE.|CHAQUE VICTIME TE SOIGNE DE 2% DE TA VIE.|MINDEN ÖLÉS AZ ÉLETED 2%-ÁT GYÓGYÍTJA.
EVERY KILL ADDS BONE ARMOR: UP TO 20% LESS DAMAGE.|CHAQUE VICTIME AJOUTE DE L'ARMURE D'OS : JUSQU'À 20% DE DÉGÂTS EN MOINS.|MINDEN ÖLÉS CSONTPÁNCÉLT AD: LEGFELJEBB 20%-KAL KEVESEBB SEBZÉS.
ONE IN TEN SLAIN FOES RISES TO FIGHT FOR YOU.|UN ENNEMI TUÉ SUR DIX SE RELÈVE POUR TOI.|MINDEN TIZEDIK MEGÖLT ELLENSÉG FELKEL, ÉS NEKED HARCOL.
GOLD FROM THIS TRIP SHIELDS YOU: UP TO 20% LESS DAMAGE.|L'OR DE CETTE DESCENTE TE PROTÈGE : JUSQU'À 20% DE DÉGÂTS EN MOINS.|AZ EZEN AZ ÚTON SZERZETT ARANY VÉD: LEGFELJEBB 20%-KAL KEVESEBB SEBZÉS.
CRITICAL HITS MAY SHAKE GOLD OUT OF FOES.|LES COUPS CRITIQUES PEUVENT FAIRE TOMBER DE L'OR.|A KRITIKUS ÜTÉSEK ARANYAT RÁZHATNAK KI AZ ELLENSÉGBŐL.
WHEN YOUR LIGHT IS LOW YOU DEAL 35% MORE DAMAGE.|QUAND TA LUMIÈRE EST FAIBLE, TU INFLIGES 35% DE DÉGÂTS EN PLUS.|HA GYENGE A FÉNYED, 35%-KAL TÖBBET SEBZEL.
KILLS FEED YOUR TORCH AND LANTERN.|CHAQUE VICTIME NOURRIT TA TORCHE ET TA LANTERNE.|AZ ÖLÉSEK TÁPLÁLJÁK A FÁKLYÁDAT ÉS A LÁMPÁSODAT.
+4% DAMAGE FOR EVERY FLOOR YOU WENT DOWN ON THIS TRIP (UP TO 40%).|+4% DE DÉGÂTS PAR ÉTAGE DESCENDU PENDANT CETTE DESCENTE (JUSQU'À 40%).|+4% SEBZÉS MINDEN SZINTÉRT, AMENNYIT EZEN AZ ÚTON LEMENTÉL (LEGFELJEBB 40%).
30% MORE DAMAGE AGAINST LEGENDS, GUARDIANS AND NEMESES.|30% DE DÉGÂTS EN PLUS CONTRE LES LÉGENDES, GARDIENS ET NÉMÉSIS.|30%-KAL TÖBB SEBZÉS LEGENDÁKRA, ŐRZŐKRE ÉS ŐSELLENSÉGEKRE.
EVERY 8 SECONDS YOUR NEXT HIT CALLS DOWN LIGHTNING.|TOUTES LES 8 SECONDES, TON PROCHAIN COUP APPELLE LA FOUDRE.|8 MÁSODPERCENKÉNT A KÖVETKEZŐ ÜTÉSED VILLÁMOT HÍV LE.
YOUR CHAIN LIGHTNING JUMPS TWICE MORE AND HITS 25% HARDER.|TA FOUDRE EN CHAÎNE REBONDIT DEUX FOIS DE PLUS ET FRAPPE 25% PLUS FORT.|A LÁNCVILLÁMOD KÉTSZER TÖBBET UGRIK, ÉS 25%-KAL ERŐSEBB.
+6% DAMAGE FOR EVERY ANCIENT ITEM YOU WEAR.|+6% DE DÉGÂTS PAR OBJET ANTIQUE PORTÉ.|+6% SEBZÉS MINDEN VISELT ŐSI TÁRGYÉRT.
YOUR SKILLS SOMETIMES CAST A SECOND TIME.|TES COMPÉTENCES SE LANCENT PARFOIS UNE SECONDE FOIS.|A KÉPESSÉGEID NÉHA MÁSODSZOR IS ELSÜLNEK.
EMBERFROST GRIPS|POIGNES DE BRAISE-GIVRE|PARÁZSFAGY KESZTYŰ
HEART OF THE LONG WINTER|CŒUR DU LONG HIVER|A HOSSZÚ TÉL SZÍVE
THE CRIMSON PACT|LE PACTE ÉCARLATE|A BÍBOR PAKTUM
MOONHOWL|HURLELUNE|HOLDÜVÖLTÉS
OSSUARY PLATE|CUIRASSE OSSUAIRE|CSONTKAMRA VÉRT
MARROWCALLER|APPELLE-MOELLE|VELŐHÍVÓ
GILDED HIDE|PEAU DORÉE|ARANYOZOTT BŐR
MIDAS FANG|CROC DE MIDAS|MIDÁSZ AGYARA
NIGHTGLASS EYE|ŒIL DE VERRE-NUIT|ÉJÜVEG SZEM
LANTERN EATER|MANGE-LANTERNE|LÁMPÁSFALÓ
ABYSS STRIDERS|ARPENTEURS DE L'ABÎME|MÉLYSÉGJÁRÓK
TROPHY TAKER|PRENEUR DE TROPHÉES|TRÓFEAGYŰJTŐ
THUNDERCALL|APPEL DU TONNERRE|MENNYDÖRGÉSHÍVÓ
COPPER CROWN|COURONNE DE CUIVRE|RÉZKORONA
MANTLE OF THE ANCESTORS|MANTEAU DES ANCÊTRES|AZ ŐSÖK PALÁSTJA
THE ECHOING PAGES|LES PAGES QUI RÉSONNENT|A VISSZHANGZÓ LAPOK
SEASON LEGENDARY|LÉGENDAIRE DE SAISON|SZEZON-LEGENDÁS
SEASON JOURNAL|JOURNAL DE SAISON|SZEZONNAPLÓ
SEASON KEEPER|GARDIEN DE SAISON|SZEZONŐRZŐ
THE SEASON KEEPER|LE GARDIEN DE SAISON|A SZEZON ŐRZŐJE
FLAWLESS GEM|GEMME PARFAITE|HIBÁTLAN DRÁGAKŐ
3 HEALING POTIONS|3 POTIONS DE SOIN|3 GYÓGYITAL
INVEST IN A SHAFT|INVESTIR DANS UN PUITS|BEFEKTETÉS EGY TÁRNÁBA
WAITING|EN ATTENTE|VÁRAKOZIK
READY|PRÊT|KÉSZ
LEAVE|PARTIR|TÁVOZÁS
PRICES IN {0}|PRIX EN {0}|ÁRAK: {0}
NOT ENOUGH {0}|PAS ASSEZ DE {0}|NINCS ELÉG {0}
FOUR CHAPTERS OF SEASON TASKS. EVERY CHAPTER HAS A REWARD.|QUATRE CHAPITRES DE TÂCHES DE SAISON. CHAQUE CHAPITRE A SA RÉCOMPENSE.|NÉGY FEJEZETNYI SZEZONFELADAT. MINDEN FEJEZETNEK JUTALMA VAN.
ONE OF THE SEASON'S TWO POWERS|L'UN DES DEUX POUVOIRS DE LA SAISON|A SZEZON KÉT EREJÉNEK EGYIKE
A RANDOM FLAWLESS GEM.|UNE GEMME PARFAITE AU HASARD.|EGY VÉLETLEN HIBÁTLAN DRÁGAKŐ.
THREE HEALING POTIONS.|TROIS POTIONS DE SOIN.|HÁROM GYÓGYITAL.
A TENTH OF YOUR GOLD GOES INTO A SHAFT. TOMORROW MORNING IT PAYS BACK MORE - OR NOTHING AT ALL.|UN DIXIÈME DE TON OR VA DANS UN PUITS. DEMAIN MATIN IL RAPPORTE PLUS - OU RIEN DU TOUT.|AZ ARANYAD TIZEDE EGY TÁRNÁBA MEGY. HOLNAP REGGEL TÖBBET HOZ VISSZA - VAGY SEMMIT.
WEAR IT WELL. IT REMEMBERS THIS SEASON.|PORTE-LE BIEN. IL SE SOUVIENT DE CETTE SAISON.|VISELD JÓL. EMLÉKSZIK ERRE A SZEZONRA.
IT WILL BE WITH YOU NEXT TIME YOU GO DOWN.|ELLE SERA AVEC TOI À TA PROCHAINE DESCENTE.|A KÖVETKEZŐ LESZÁLLÁSKOR VELED LESZ.
TOMORROW IT PAYS - OR THE ROOF COMES DOWN. HEH.|DEMAIN ÇA PAIE - OU LE PLAFOND S'EFFONDRE. HÉ.|HOLNAP FIZET - VAGY LESZAKAD A FÖDÉM. HEHE.
YOUR BLESSING WAITS FOR YOUR NEXT TRIP|TA BÉNÉDICTION ATTEND TA PROCHAINE DESCENTE|AZ ÁLDÁSOD A KÖVETKEZŐ LESZÁLLÁSRA VÁR
YOUR SHAFT PAYS OUT TOMORROW MORNING|TON PUITS PAIE DEMAIN MATIN|A TÁRNÁD HOLNAP REGGEL FIZET
CHAPTER|CHAPITRE|FEJEZET
CLAIMED|RÉCUPÉRÉ|ÁTVÉVE
CLAIM!|RÉCUPÉRER !|ÁTVEHETŐ!
REWARD|RÉCOMPENSE|JUTALOM
ALREADY CLAIMED|DÉJÀ RÉCUPÉRÉ|MÁR ÁTVETTED
NOT DONE YET|PAS ENCORE FINI|MÉG NINCS KÉSZ
CLAIM THE CHAPTER BEFORE IT FIRST|RÉCUPÈRE D'ABORD LE CHAPITRE PRÉCÉDENT|ELŐBB AZ ELŐZŐ FEJEZETET VEDD ÁT
CHAPTER COMPLETE!|CHAPITRE TERMINÉ !|FEJEZET TELJESÍTVE!
25 COINS, 3 HEALING POTIONS AND A GEM|25 PIÈCES, 3 POTIONS DE SOIN ET UNE GEMME|25 ÉRME, 3 GYÓGYITAL ÉS EGY DRÁGAKŐ
A SEASON LEGENDARY|UN LÉGENDAIRE DE SAISON|EGY SZEZON-LEGENDÁS
AN ANCIENT SEASON LEGENDARY|UN LÉGENDAIRE DE SAISON ANTIQUE|EGY ŐSI SZEZON-LEGENDÁS
A TITLE, THE SEASON CLOAK AND AN ANCIENT SEASON LEGENDARY|UN TITRE, LA CAPE DE SAISON ET UN LÉGENDAIRE DE SAISON ANTIQUE|EGY CÍM, A SZEZONKÖPENY ÉS EGY ŐSI SZEZON-LEGENDÁS
CONQUEROR OF {0}|CONQUÉRANT DE {0}|{0} HÓDÍTÓJA
CLAIM|RÉCUPÉRER|ÁTVÉTEL
CHOOSE|CHOISIR|VÁLASZTÁS
THE BRAZIER WARMS YOU|LE BRASERO TE RÉCHAUFFE|A PARÁZSTARTÓ ÁTMELEGÍT
FROSTBITE! FIND A FIRE!|ENGELURES ! TROUVE UN FEU !|FAGYSÉRÜLÉS! KERESS TÜZET!
BLOOD PACT!|PACTE DE SANG !|VÉRPAKTUM!
MORE DAMAGE AND SPEED - BUT IT DRINKS YOUR LIFE|PLUS DE DÉGÂTS ET DE VITESSE - MAIS IL BOIT TA VIE|TÖBB SEBZÉS ÉS GYORSASÁG - DE ISSZA AZ ÉLETED
THE BLOOD MOON IS FULL!|LA LUNE DE SANG EST PLEINE !|TELE VAN A VÉRHOLD!
THE BEASTS GO WILD - BLOOD FLOWS|LES BÊTES S'AFFOLENT - LE SANG COULE|MEGVADULNAK A BESTIÁK - FOLYIK A VÉR
THE MOON WANES|LA LUNE DÉCROÎT|FOGY A HOLD
THE BONES STAND UP FOR YOU|LES OS SE LÈVENT POUR TOI|A CSONTOK FELÁLLNAK ÉRTED
RAISE THE BONES|RELEVER LES OS|CSONTOK FELÉLESZTÉSE
THE BONESMITH RAISES THE DEAD!|LE FORGEUR D'OS RELÈVE LES MORTS !|A CSONTKOVÁCS FELÉLESZTI A HOLTAKAT!
IT STOLE {0} GOLD!|IL A VOLÉ {0} OR !|ELLOPOTT {0} ARANYAT!
THE KOBOLD ESCAPED WITH YOUR GOLD!|LE KOBOLD S'EST ENFUI AVEC TON OR !|A KOBOLD ELSZÖKÖTT AZ ARANYADDAL!
YOU GOT YOUR GOLD BACK - AND THEN SOME!|TU AS RÉCUPÉRÉ TON OR - ET MÊME PLUS !|VISSZAKAPTAD AZ ARANYAD - MÉG TÖBBET IS!
RIVAL PROSPECTORS!|PROSPECTEURS RIVAUX !|RIVÁLIS KUTATÓK!
THEY ARE DIGGING YOUR GOLD|ILS CREUSENT TON OR|A TE ARANYADAT ÁSSÁK
THE RIVAL PROSPECTORS ARE BEATEN!|LES PROSPECTEURS RIVAUX SONT VAINCUS !|A RIVÁLIS KUTATÓK LEGYŐZVE!
THE SHAFT COLLAPSED!|LE PUITS S'EST EFFONDRÉ !|BEOMLOTT A TÁRNA!
YOUR SHAFT PAID OUT!|TON PUITS A PAYÉ !|FIZETETT A TÁRNÁD!
YOUR GOLD IS UNDER THE ROCKS|TON OR EST SOUS LES ROCHERS|AZ ARANYAD A KÖVEK ALATT VAN
YOUR LANTERN DRINKS THE LIGHT|TA LANTERNE BOIT LA LUMIÈRE|A LÁMPÁSOD ISSZA A FÉNYT
YOUR LANTERN IS DRY! BREAK A LIGHT CRYSTAL|TA LANTERNE EST À SEC ! BRISE UN CRISTAL DE LUMIÈRE|KIFOGYOTT A LÁMPÁSOD! TÖRJ SZÉT EGY FÉNYKRISTÁLYT
SHADES FEAR ONLY THE LIGHT: REFILL YOUR LANTERN|LES OMBRES NE CRAIGNENT QUE LA LUMIÈRE : REMPLIS TA LANTERNE|AZ ÁRNYLÉNYEK CSAK A FÉNYTŐL FÉLNEK: TÖLTSD UTÁN A LÁMPÁSOD
SOMETHING WEARS YOUR SHAPE...|QUELQUE CHOSE PORTE TA FORME...|VALAMI A TE ALAKODAT VISELI...
SHADOW OF {0}|OMBRE DE {0}|{0} ÁRNYA
IT WEARS YOUR FACE|IL PORTE TON VISAGE|A TE ARCODAT VISELI
YOUR SHADOW IS BROKEN|TON OMBRE EST BRISÉE|AZ ÁRNYAD MEGTÖRT
JUMP INTO THE CHASM|SAUTER DANS LE GOUFFRE|UGRÁS A SZAKADÉKBA
YOU LEAP INTO THE DARK...|TU SAUTES DANS LE NOIR...|BEUGRASZ A SÖTÉTBE...
THE CHASM IS TOO DEEP FOR THIS RUN|LE GOUFFRE EST TROP PROFOND POUR CETTE PARTIE|EHHEZ A FUTAMHOZ TÚL MÉLY A SZAKADÉK
THE CHASM ENDS IN THE GUARDIAN'S HALL BELOW|LE GOUFFRE MÈNE À LA SALLE DU GARDIEN EN DESSOUS|A SZAKADÉK AZ ALATTAD LÉVŐ ŐRZŐ TERMÉBE VEZET
THE DEEP HAS NOTICED YOU|LES PROFONDEURS T'ONT REMARQUÉ|A MÉLYSÉG ÉSZREVETT
TOUGHER FOES - RICHER TREASURE|ENNEMIS PLUS COSTAUDS - TRÉSORS PLUS RICHES|ERŐSEBB ELLENSÉG - GAZDAGABB KINCS
THE ROPE HOLDS|LA CORDE TIENT|A KÖTÉL TART
THE DEEP LETS YOU PASS|LES PROFONDEURS TE LAISSENT PASSER|A MÉLYSÉG ÁTENGED
THE ABYSS PULLS YOU!|L'ABÎME T'ATTIRE !|A MÉLYSÉG LEHÚZ!
A TROPHY FOR THE TOWN WALL|UN TROPHÉE POUR LE MUR DE LA VILLE|EGY TRÓFEA A VÁROS FALÁRA
THE ROD DISCHARGES!|LE PARATONNERRE SE DÉCHARGE !|KISÜL A VIHARRÚD!
SUPERCHARGED!|SURCHARGÉ !|TÚLTÖLTVE!
YOUR HITS CALL CHAIN LIGHTNING|TES COUPS APPELLENT LA FOUDRE EN CHAÎNE|AZ ÜTÉSEID LÁNCVILLÁMOT HÍVNAK
A GUST OF WIND!|UNE RAFALE DE VENT !|SZÉLLÖKÉS!
OPEN THE CRYPT|OUVRIR LA CRYPTE|A KRIPTA FELNYITÁSA
RETURNED FROM THE CRYPT|REVENU DE LA CRYPTE|VISSZATÉRT A KRIPTÁBÓL
{0} THE ANCESTOR|{0} L'ANCÊTRE|{0}, AZ ŐS
{0} RESTS AGAIN|{0} REPOSE À NOUVEAU|{0} ÚJRA NYUGOVÓRA TÉR
AN ANCIENT GIFT REMAINS|UN DON ANTIQUE DEMEURE|EGY ŐSI AJÁNDÉK MARAD
TIMELESS: IT RISES AGAIN!|INTEMPOREL : IL SE RELÈVE !|IDŐTLEN: ÚJRA FELKEL!
ECHO!|ÉCHO !|VISSZHANG!
ALDRIC THE FIRST|ALDRIC LE PREMIER|ELSŐ ALDRIC
MIRA STONEHAND|MIRA MAIN-DE-PIERRE|KŐKEZŰ MIRA
OLD BRANN|LE VIEUX BRANN|AZ ÖREG BRANN
SISTER ELWEN|SŒUR ELWEN|ELWEN NŐVÉR
THE GREY WARDEN|LE GARDIEN GRIS|A SZÜRKE ŐRSZEM
IDA OF THE LAMP|IDA À LA LAMPE|LÁMPÁS IDA
`);
