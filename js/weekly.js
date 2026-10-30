'use strict';
// The weekly challenge ("WEEKLY DEPTH"): the same mine and the same three rules for everyone this week.
// A fresh level 1 hero, one life, 45 minutes on the clock. The deepest floor wins, then the faster time.
(function () {
  const U = AH.UI;
  const RUN_TIME = 45 * 60;
  const W = AH.Weekly = {};

  // ISO week (counted in UTC so everyone everywhere shares the same week)
  W.key = function (d) {
    d = d ? new Date(d) : new Date();
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
    return t.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
  };
  // the week's end: next Monday 00:00 UTC
  W.endsIn = function () {
    const n = new Date(); const day = n.getUTCDay() || 7;
    const end = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + (8 - day));
    return Math.max(0, end - n.getTime());
  };
  W.fmtLeft = function (ms) { const h = Math.floor(ms / 36e5), d = Math.floor(h / 24); return d > 0 ? d + ' ' + AH.tr('DAYS') + ' ' + (h % 24) + ' ' + AH.tr('HOURS') : h + ' ' + AH.tr('HOURS') + ' ' + Math.floor(ms / 6e4) % 60 + ' ' + AH.tr('MINUTES'); };
  // this week's three rules: one hard, one kind, one strange (or a second hard one)
  W.rules = function (key) {
    key = key || W.key();
    const rng = AH.mulberry(AH.hashStr('rules' + key));
    const of = k => AH.RULES.filter(r => r.kind === k);
    const hard = rng.pick(of('hard'));
    let easy = rng.pick(of('easy'));
    if (hard.id === 'nopot' && easy.id === 'bigpot') easy = of('easy').find(r => r.id === 'dblxp');
    const third = rng() < 0.7 ? rng.pick(of('odd')) : rng.pick(of('hard').filter(r => r !== hard));
    return [hard.id, easy.id, third.id];
  };
  // the week's starting kit, the same for everyone
  W.kit = function (ch, key) {
    key = key || W.key(); ch.weekly = key;
    const rules = W.rules(key), rng = AH.mulberry(AH.hashStr('wkkit' + key + ch.cls));
    if (rules.indexOf('legstart') >= 0) { const w = AH.genItem(rng, 8, { rarity: 3, base: AH.CLASSES[ch.cls].start.weapon, noAncient: true }); w.req = null; ch.equip.weapon = w; }
    if (rules.indexOf('bombs') >= 0) ch.bag[5] = AH.makeCons('bomb', 9);
    if (rules.indexOf('kit') >= 0) { ch.bag[0] = AH.makeCons('potion', 6); const c = ch.equip.chest; const r2 = AH.genItem(rng, 6, { rarity: 2, base: c.base, noAncient: true }); r2.req = null; ch.equip.chest = r2; }
    return ch;
  };
  W.on = () => !(AH.options && AH.options.noWeekly);
  W.best = key => ((AH.options && AH.options.wkBest) || {})[key || W.key()] || null;

  // ---------- result codes for the leaderboard ----------
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  W.sum = s => (AH.hashStr('dunmere' + s + 'canary') % 60466176).toString(36).toUpperCase().padStart(5, '0');
  W.code = function (res) { const body = b64(JSON.stringify(res)); return 'AHW1.' + body + '.' + W.sum(body); };

  // ---------- starting a run ----------
  GG.startWeekly = function (list) {
    const key = W.key();
    this.closeAllMenus();
    this.mode = 'weekly'; this.isHost = true;
    this.world = AH.Save.newWorld(); this.world.seed = AH.hashStr('wkworld' + key); this.world.seenIntro = true; this.world.trust = 60;
    this.slotIdx = -1; this.players = []; this.pets = []; this.slotsUsed = []; this.townMap = null; this.map = null;
    const rules = W.rules(key);
    this.rules = new Set(rules);
    list.forEach((s, i) => {
      const nm = AH.UI.NAMES[(AH.hashStr(key + s.cls + i) >>> 0) % AH.UI.NAMES.length];
      const ch = AH.newCharacter(s.cls, nm, 'dog');
      W.kit(ch, key); ch.wkNick = s.nick;
      const p = this.addLocalPlayer(-1, ch, s.dev); p.slotIdx = -1; p.wkNick = s.nick;
    });
    this.players.forEach(p => { p.recalc(); p.hp = p.S.hp; p.mp = p.S.mp; });
    this.wk = { key, rules, left: RUN_TIME, used: 0, maxFloor: 1, kills: 0, ended: false };
    this.scene = 'mine';
    this.enterMine(1, 'weekly');
    this.banner('WEEKLY DEPTH', '#f2c94c', rules.map(r => AH.tr(AH.ruleDef(r).name)).join('  -  '));
    AH.Audio.sfx('levelup');
  };
  GG.endWeekly = function (why) {
    const wk = this.wk; if (!wk || wk.ended) return; wk.ended = true;
    const res = {
      k: 'w', wk: wk.key, v: AH.VERSION, f: wk.maxFloor, t: Math.round(wk.used), why, kills: wk.kills, r: wk.rules, d: Date.now(),
      pl: this.players.map(p => ({ n: p.wkNick || p.ch.wkNick || 'P' + (p.pid + 1), h: p.ch.name, c: p.ch.cls, l: p.ch.level })),
    };
    const better = W.record(res);
    if (this.net && this.isHost) this.net.broadcast({ t: 'wkend', res, why });
    this.closeAllMenus();
    this.openMenu('wkresult', this.players[0], { res, better, why });
  };
  // keep the week's best in this browser, and earn the town chest
  W.record = function (res) {
    const o = AH.options, wk = { key: res.wk };
    o.wkBest = o.wkBest || {};
    const team = res.pl.length > 1 ? 'team' : 'solo';
    const old = o.wkBest[wk.key] && o.wkBest[wk.key][team];
    const better = !old || res.f > old.f || (res.f === old.f && res.t < old.t);
    o.wkBest[wk.key] = Object.assign({}, o.wkBest[wk.key], better ? { [team]: res } : {});
    for (const k in o.wkBest) if (k < W.key(Date.now() - 60 * 864e5)) delete o.wkBest[k]; // forget old weeks
    // a chest for the town: floor 10 or deeper, once a week
    o.rewards = o.rewards || [];
    o.wkPaid = o.wkPaid || {};
    if (res.f >= 10 && !o.wkPaid[wk.key]) { o.wkPaid[wk.key] = 1; o.rewards.push({ type: 'weekly', week: wk.key, f: res.f }); }
    else if (res.f >= 10 && o.wkPaid[wk.key] < 2 && res.f >= 25) { o.wkPaid[wk.key] = 2; o.rewards.push({ type: 'weekly', week: wk.key, f: res.f, bonus: 1 }); }
    AH.Save.setOptions(o);
    return better;
  };
  // an online friend's game ended on the host
  GG.wkGuestEnd = function (res) {
    if (this.wk) this.wk.ended = true;
    const better = W.record(res);
    this.closeAllMenus();
    this.openMenu('wkresult', this.players[0], { res, better, why: res.why });
  };

  // the host closing a finished weekly game must not throw friends out of their result screen
  // (net.js loads after this file, so wrap once everything is in)
  document.addEventListener('DOMContentLoaded', () => {
    const _lost = GG.netLost;
    GG.netLost = function () {
      if (this.wk && this.wk.ended && this.menu && this.menu.type === 'wkresult') { try { this.net && this.net.close(); } catch (e) { /* ignore */ } this.net = null; this.isHost = true; return; }
      _lost.call(this);
    };
  });
  // ---------- the run hooks: wrap the game where the weekly run and the rules need to step in ----------
  const _enterMine = GG.enterMine;
  GG.enterMine = function (floor, mode) {
    const m = mode || this.mode;
    if (m !== 'weekly') this.rules = AH.seasonRulesFor ? AH.seasonRulesFor(this) : new Set();
    for (const p of this.players) p.recalc();
    _enterMine.call(this, floor, mode);
    if (this.wk && this.mode === 'weekly') this.wk.maxFloor = Math.max(this.wk.maxFloor, floor);
    if (!this.rules || !this.rules.size) return;
    const rng = AH.mulberry((this.mapSeed || 1) ^ 0x5bd1e995);
    if (this.rules.has('well')) for (const p of this.players) { p.hp = p.S.hp; p.mp = AH.usesRage(p.ch.cls) ? p.mp : p.S.mp; }
    const isBoss = floor % 10 === 0;
    const wantLegend = (this.rules.has('legend5') && floor % 5 === 0 && !isBoss) || (this.rules.has('s_depth') && floor % 10 === 5);
    if (wantLegend && !this.legendHere) {
      const pool = AH.LEGENDS.filter(L => floor >= Math.min(L.minF, 6)); const L = rng.pick(pool.length ? pool : AH.LEGENDS);
      const pos = this.map.randomFloorIn(this.map.stairsRoom, rng); this.legendHere = AH.spawnLegend(this, L, pos.x, pos.y);
      this.banner(L.name, '#ff9a3e', 'A LEGENDARY BEAST GUARDS THE STAIRS');
    }
    if (this.rules.has('goldrat') && this.event !== 'goldrat') {
      const r = rng.pick(this.map.rooms); const pos = this.map.randomFloorIn(r, rng);
      const def = { name: 'GOLDEN RAT', spr: 'rat', pal: { r: '#f2c94c', R: '#a8823a', p: '#fff2a8' }, ai: 'flee', hp: 30, dmg: 1, spd: 2.2, xp: 40 };
      const e = new AH.Enemy(def, pos.x, pos.y, floor, { players: this.players.length, noHide: true, noRules: true }); e.goldrat = true; e.fleeT = 30; this.enemies.push(e);
    }
    if (this.rules.has('mimics')) for (const c of this.map.props) if (c.type === 'chest' && !c.mimic && !c.locked && rng() < 0.4) c.mimic = true;
    if (this.rules.has('s_shadow')) for (const e of this.enemies) if (!e.boss && !e.legend && !e.goldrat && !e.nemesis && rng() < 0.3) e.hidden = true;
  };
  const _leaveMine = GG.leaveMine;
  GG.leaveMine = function (why) {
    if (this.mode === 'weekly') { this.endWeekly(why === 'death' ? 'dead' : 'gaveup'); return; }
    _leaveMine.call(this, why);
  };
  const _allDead = GG.allDead;
  GG.allDead = function () {
    if (this.mode === 'weekly') { if (this.players.every(q => q.dead)) this.endWeekly('dead'); return; }
    _allDead.call(this);
  };
  const _killed = GG.onEnemyKilled;
  GG.onEnemyKilled = function (e, by) {
    _killed.call(this, e, by);
    if (this.wk && this.mode === 'weekly' && !e.goldrat) { this.wk.kills++; if (this.rules.has('timekill')) this.wk.left += 3; }
    if (!this.rules || !this.rules.size || this.scene !== 'mine') return;
    if (this.rules.has('boom') && !e.goldrat && !e.boss) {
      const x = e.x, y = e.y, dmg = Math.max(4, e.dmg * 1.1);
      this.telegraph(x, y, 22, 0.55, () => { this.explosion(x, y, 22, dmg, 'enemy'); });
    }
    if (this.rules.has('s_bones') && !e.goldrat && !e.boss && !e.minion && by && by.pid !== undefined && AH.rand() < 0.08) {
      const c = { id: e.id, x: e.x, y: e.y, spr: e.spr, sc: 1, face: e.face, t: 1, max: 1, maxHp: e.maxHp, def: e.def };
      this.raiseMinion(by, c, 0.8);
      const a = this.allies[this.allies.length - 1]; if (a && by.ch.cls !== 'necro') a.t = 25;
      this.toast(by, 'THE SLAIN RISE TO SERVE YOU', '#9ad88a');
    }
  };
  const _update = GG.update;
  GG.update = function (dt) {
    _update.call(this, dt);
    if (this.scene !== 'mine' || this.paused) return;
    const wk = this.wk;
    if (wk && this.mode === 'weekly' && !wk.ended) {
      wk.left -= dt; wk.used += dt;
      if (wk.left <= 300 && !wk.warn5) { wk.warn5 = 1; this.banner('5 MINUTES LEFT!', '#ff8a5a'); AH.Audio.sfx('warn'); }
      if (wk.left <= 60 && !wk.warn1) { wk.warn1 = 1; this.banner('ONE MINUTE LEFT!', '#ff5a4a'); AH.Audio.sfx('warn'); }
      if (wk.left <= 30 && Math.floor(wk.left) !== wk.tick) { wk.tick = Math.floor(wk.left); AH.Audio.sfx('move'); }
      if (wk.left <= 0) { wk.left = 0; this.banner('TIME IS UP!', '#ff5a4a'); this.endWeekly('time'); return; }
    }
    if (!this.rules || !this.rules.size) return;
    this.ruleT = (this.ruleT || 0) + dt;
    if (this.ruleT >= 1) {
      this.ruleT -= 1;
      for (const p of this.players) {
        if (p.dead) continue;
        if (this.rules.has('poison')) p.hurt(this, Math.max(1, p.S.hp * 0.006), null, true);
        if (this.rules.has('regen')) p.heal(this, p.S.hp * 0.012);
      }
      if (this.rules.has('s_storm') && AH.rand() < 0.22) {
        const all = this.enemies.filter(e => !e.dead && !e.hidden).concat(this.players.filter(p => !p.dead));
        const t = AH.rand.pick(all.filter(a => this.players.some(p => AH.dist(p, a) < 160)));
        if (t) { const x = t.x + AH.rand.range(-10, 10), y = t.y + AH.rand.range(-8, 8); this.telegraph(x, y, 16, 0.9, () => { this.lightning = 0.12; AH.Audio.sfx('thunder'); this.explosion(x, y, 16, 8 + this.floorNo * 3, 'enemy'); for (const e of this.enemies) if (!e.dead && AH.dist(e, { x, y }) < 18) e.hurt(this, 20 + this.floorNo * 6, null, { color: '#ffe04a' }); }); }
      }
    }
  };

  // ---------- the clock on the screen ----------
  AH.weeklyHud = function (R, G, ctx, RW) {
    const wk = G.wk; if (!wk || G.mode !== 'weekly') return;
    const t = Math.max(0, wk.left), m = Math.floor(t / 60), s = Math.floor(t % 60);
    const str = m + ':' + String(s).padStart(2, '0');
    const red = t <= 300, blink = t <= 30 && Math.floor(G.time * 4) % 2 === 0;
    if (!blink) AH.text(ctx, RW / 2, 30, str, red ? '#ff5a4a' : '#f2e3b3', { align: 'center', scale: 2 });
    // the rules, for a little while after each new floor
    if (G.rules && G.floorShownT !== G.floorNo) { G.floorShownT = G.floorNo; G.rulesShowT = G.time; }
    if (G.time - (G.rulesShowT || 0) < 8) AH.text(ctx, RW / 2, AH.H - 44, wk.rules.map(r => AH.tr(AH.ruleDef(r).name)).join(' - '), '#c8a0ff', { align: 'center', maxW: RW - 8 });
  };

  // ---------- menus ----------
  // the weekly board on the title screen
  U.init.weekly = function (G, m) { m.sel = 0; };
  U.wkItems = function () {
    const it = [{ id: 'start', label: 'START THE RUN', col: '#ffb347' }, { id: 'board', label: 'LEADERBOARD' }];
    const b = W.best(); if (b && (b.solo || b.team)) it.push({ id: 'code', label: 'SUBMIT MY BEST RESULT' });
    it.push({ id: 'back', label: 'BACK' });
    return it;
  };
  U.update.weekly = function (G, m, dt) {
    U.listUpdate(G, m, dt, U.wkItems(), it => {
      if (it.id === 'start') G.openMenu('wklobby', null, { dev: m.dev || m.lastDev || 'kb1' });
      if (it.id === 'board') G.openMenu('board', null, { dev: m.dev, tab: 0 });
      if (it.id === 'code') { const b = W.best(); G.openMenu('wkresult', null, { res: (b.solo && b.team) ? (b.team.f > b.solo.f ? b.team : b.solo) : (b.solo || b.team), review: true }); }
      if (it.id === 'back') G.closeMenu();
    }, () => G.closeMenu());
  };
  U.draw.weekly = function (G, ctx, m) {
    U.bg(ctx, false); U.title(ctx, 'WEEKLY DEPTH', 12);
    const key = W.key(), rules = W.rules(key);
    AH.text(ctx, AH.UW / 2, 32, AH.tr('WEEK') + ' ' + key.slice(6) + '   -   ' + AH.tr('ENDS IN') + ' ' + W.fmtLeft(W.endsIn()), '#8d8494', { align: 'center' });
    const kc = { hard: '#ff8a7a', easy: '#8ae08e', odd: '#c8a0ff' };
    rules.forEach((id, i) => {
      const r = AH.ruleDef(id), x = 14 + i * 152, y = 46;
      AH.frame(ctx, x, y, 146, 66, { fill: '#15111a', edge: kc[r.kind], hi: kc[r.kind] });
      AH.text(ctx, x + 73, y + 6, r.name, kc[r.kind], { align: 'center', maxW: 140 });
      AH.wrap(r.desc, 136).slice(0, 4).forEach((l, j) => AH.text(ctx, x + 73, y + 20 + j * 10, l, '#cfc6b4', { align: 'center' }));
    });
    AH.wrap('A FRESH LEVEL 1 HERO. ONE LIFE. 45 MINUTES. GET AS DEEP AS YOU CAN. THE SAME MINE FOR EVERYONE THIS WEEK.', 440).forEach((l, i) => AH.text(ctx, AH.UW / 2, 120 + i * 10, l, '#a39bb0', { align: 'center' }));
    const b = W.best();
    const bs = b && b.solo ? AH.tr('FLOOR') + ' ' + b.solo.f + ' (' + AH.fmtTime(b.solo.t).split('.')[0] + ')' : '-';
    const bt = b && b.team ? AH.tr('FLOOR') + ' ' + b.team.f + ' (' + AH.fmtTime(b.team.t).split('.')[0] + ')' : '-';
    AH.text(ctx, AH.UW / 2, 146, AH.tr('YOUR BEST') + ':  ' + AH.tr('SOLO') + ' ' + bs + '   ' + AH.tr('TEAM') + ' ' + bt, '#f2c94c', { align: 'center' });
    U.list(ctx, U.wkItems(), m.sel, 150, 166, 180);
    AH.text(ctx, AH.UW / 2, 246, 'FLOOR 10 OR DEEPER SENDS A CHEST TO YOUR TOWN STASH.', '#6f6880', { align: 'center' });
  };

  // pick a class; more players join with their own controller or keyboard
  U.init.wklobby = function (G, m) { m.t = 0; m.slots = [{ dev: m.dev, cls: 0 }]; };
  U.update.wklobby = function (G, m, dt) {
    m.t += dt; if (m.t < 0.25) return;
    const I = AH.Input, NC = AH.CLASS_KEYS.length, o = AH.options;
    // mouse / touch: the cards of player 1
    const M = AH.Mouse; let pt = null;
    if (M && M.tap) { pt = M.tap; M.tap = null; } else if (M && M.active && !AH.isTouch && M.leftPressed) { pt = M.uiPos(); M.leftPressed = false; }
    if (pt) { if (pt.y > 200 && pt.y < 222 && pt.x > 170 && pt.x < 310) return U.wkStart(G, m); for (let i = 0; i < m.slots.length; i++) { const x = AH.UW / 2 - 165 + i * 112; if (pt.x >= x && pt.x < x + 106 && pt.y > 70 && pt.y < 190) { m.slots[i].cls = (m.slots[i].cls + (pt.x < x + 53 ? -1 : 1) + NC) % NC; AH.Audio.sfx('move'); } } }
    for (const id of I.devices()) {
      const i = m.slots.findIndex(s => s.dev === id);
      const d = I.menuDir(id, dt);
      if (i >= 0 && d.dx) { m.slots[i].cls = (m.slots[i].cls + d.dx + NC) % NC; AH.Audio.sfx('move'); }
      if (I.pressed(id, 'b')) {
        if (i === 0) { G.closeMenu(); return; }
        if (i > 0) { m.slots.splice(i, 1); AH.Audio.sfx('back'); continue; }
      }
      if (I.pressed(id, 'a') || I.pressed(id, 'start')) {
        if (i === 0) return U.wkStart(G, m);
        if (i < 0 && m.slots.length < 3 && id !== 'touch') {
          m.slots.push({ dev: id, cls: m.slots.length % NC }); AH.Audio.sfx('levelup');
          const k = m.slots.length - 1; o.nicks = o.nicks || [];
          if (!o.nicks[k]) U.askName(G, { dev: id }, 'PLAYER NAME', '', v => { o.nicks[k] = v; AH.Save.setOptions(o); }, { note: 'YOUR NAME ON THE LEADERBOARD.' });
          return;
        }
      }
    }
  };
  U.wkStart = function (G, m) {
    const o = AH.options;
    if (!o.nick) { U.askName(G, m, 'PLAYER NAME', '', v => { o.nick = v; AH.Save.setOptions(o); }, { note: 'YOUR NAME ON THE LEADERBOARD. YOUR HERO NAME IS ADDED BY ITSELF.' }); return; }
    const list = m.slots.map((s, i) => ({ dev: s.dev, cls: AH.CLASS_KEYS[s.cls], nick: i === 0 ? o.nick : ((o.nicks || [])[i] || 'P' + (i + 1)) }));
    G.startWeekly(list);
  };
  U.draw.wklobby = function (G, ctx, m) {
    U.bg(ctx, false); U.title(ctx, 'CHOOSE YOUR CLASS', 14);
    AH.text(ctx, AH.UW / 2, 40, 'MORE PLAYERS: PRESS A ON ANOTHER CONTROLLER OR KEYBOARD', '#8d8494', { align: 'center' });
    const o = AH.options;
    if (!U.previews) U.previews = AH.CLASS_KEYS.map(k => new AH.Player(0, AH.newCharacter(k, 'X', 'dog'), null));
    for (let i = 0; i < 3; i++) {
      const x = AH.UW / 2 - 165 + i * 112, y = 60, s = m.slots[i];
      AH.frame(ctx, x, y, 106, 132, s ? { fill: '#1a1420', edge: '#c9a24a', hi: '#f2e3b3' } : {});
      AH.text(ctx, x + 53, y + 6, 'P' + (i + 1), AH.PLAYER_COLORS[i], { align: 'center' });
      if (!s) { AH.text(ctx, x + 53, y + 60, Math.floor(G.time * 2 + i) % 2 ? 'PRESS A' : '...', '#4e4858', { align: 'center' }); continue; }
      const k = AH.CLASS_KEYS[s.cls], P = U.previews[s.cls], sp = P.spr[Math.floor(G.time * 3 + i) % 2];
      AH.drawSpr(ctx, sp, x + 53 - sp.w * 1.5, y + 18, false, 3);
      AH.text(ctx, x + 53, y + 82, '< ' + AH.tr(AH.CLASSES[k].name) + ' >', AH.CLASSES[k].color, { align: 'center', maxW: 102 });
      AH.text(ctx, x + 53, y + 96, i === 0 ? (o.nick || '?') : ((o.nicks || [])[i] || 'P' + (i + 1)), '#f2e3b3', { align: 'center', maxW: 100 });
      AH.text(ctx, x + 53, y + 112, U.devLabel(s.dev), '#6a6274', { align: 'center' });
    }
    AH.frame(ctx, 170, 200, 140, 20, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' });
    AH.text(ctx, AH.UW / 2, 206, 'BEGIN', '#ffb347', { align: 'center' });
    U.hint(ctx, 'LEFT/RIGHT CLASS   ' + U.btnName(G, { dev: m.slots[0].dev }, 'a') + ' BEGIN   ' + U.btnName(G, { dev: m.slots[0].dev }, 'b') + ' BACK');
  };

  // online: the weekly run with friends over the internet
  U.onlineItems = () => [{ id: 'host', label: 'HOST A GAME' }, { id: 'join', label: 'JOIN A GAME' }]
    .concat(W.on() ? [{ id: 'wkhost', label: 'HOST WEEKLY DEPTH', col: '#c8a0ff' }, { id: 'wkjoin', label: 'JOIN WEEKLY DEPTH', col: '#c8a0ff' }] : [])
    .concat([{ id: 'back', label: 'BACK' }]);
  U.init.wkonline = function (G, m) { m.cls = 0; m.t = 0; };
  U.update.wkonline = function (G, m, dt) {
    m.t += dt; const n = U.nav(G, m, dt), NC = AH.CLASS_KEYS.length, o = AH.options;
    if (n.dx) { m.cls = (m.cls + n.dx + NC) % NC; AH.Audio.sfx('move'); }
    if (n.p.b || n.p.start) { G.closeMenu(); return; }
    if (!n.p.a || m.t < 0.2) return;
    if (!o.nick) { U.askName(G, m, 'PLAYER NAME', '', v => { o.nick = v; AH.Save.setOptions(o); }, { note: 'YOUR NAME ON THE LEADERBOARD.' }); return; }
    const key = W.key(), cls = AH.CLASS_KEYS[m.cls], dev = m.dev || 'kb1';
    const ch = W.kit(AH.newCharacter(cls, AH.UI.NAMES[(AH.hashStr(key + cls + o.nick) >>> 0) % AH.UI.NAMES.length], 'dog'), key); ch.wkNick = o.nick;
    G.closeAllMenus();
    if (m.role === 'host') {
      G.net = new AH.Net(G); G.isHost = true; G.net.lobby = true; G.net.pending = []; G.net.hostCh = ch;
      G.net.wkList = [{ dev, cls, nick: o.nick }];
      G.net.host(ok => { if (!ok) G.toast(null, G.net.status, '#ff8a8a'); });
      G.openMenu('online', null, { dev, step: 'lobby', slotIdx: -1 });
    } else G.openMenu('online', null, { dev, step: 'code', slotIdx: -1, wkCh: ch });
  };
  U.draw.wkonline = function (G, ctx, m) {
    U.bg(ctx, false); U.title(ctx, m.role === 'host' ? 'HOST WEEKLY DEPTH' : 'JOIN WEEKLY DEPTH', 14);
    if (!U.previews) U.previews = AH.CLASS_KEYS.map(k => new AH.Player(0, AH.newCharacter(k, 'X', 'dog'), null));
    const k = AH.CLASS_KEYS[m.cls], P = U.previews[m.cls], sp = P.spr[Math.floor(G.time * 3) % 2];
    AH.frame(ctx, AH.UW / 2 - 60, 44, 120, 120, { fill: '#1a1420', edge: '#c9a24a', hi: '#f2e3b3' });
    AH.drawSpr(ctx, sp, AH.UW / 2 - sp.w * 2, 56, false, 4);
    AH.text(ctx, AH.UW / 2, 140, '< ' + AH.tr(AH.CLASSES[k].name) + ' >', AH.CLASSES[k].color, { align: 'center' });
    AH.text(ctx, AH.UW / 2, 176, AH.tr('PLAYER NAME') + ': ' + (AH.options.nick || '?'), '#f2e3b3', { align: 'center' });
    AH.wrap('A FRESH HERO FOR THIS WEEK. FRIENDS JOIN WITH THE ROOM CODE AND ALSO CHOOSE WEEKLY DEPTH. YOU COUNT AS A TEAM.', 420).forEach((l, i) => AH.text(ctx, AH.UW / 2, 196 + i * 10, l, '#a39bb0', { align: 'center' }));
    U.hint(ctx, 'LEFT/RIGHT CLASS   ' + U.btnName(G, m, 'a') + ' CONFIRM   ' + U.btnName(G, m, 'b') + ' BACK');
  };

  // the end of a run
  U.init.wkresult = function (G, m) { m.sel = 0; m.t = 0; };
  U.wkResItems = m => [{ id: 'submit', label: 'SUBMIT TO THE LEADERBOARD', col: '#ffb347' }, { id: 'code', label: 'SHOW THE RESULT CODE' }, { id: 'done', label: m.review ? 'BACK' : 'BACK TO THE TITLE' }];
  U.update.wkresult = function (G, m, dt) {
    m.t += dt; if (m.t < 0.8) { U.nav(G, m, dt); return; }
    U.listUpdate(G, m, dt, U.wkResItems(m), it => {
      if (it.id === 'submit') { if (AH.Board) AH.Board.submit(G, m, W.code(m.res)); }
      if (it.id === 'code') { if (AH.Board) AH.Board.showCode(G, m, W.code(m.res)); }
      if (it.id === 'done') { if (m.review) G.closeMenu(); else { G.wk = null; G.rules = new Set(); G.mode = 'story'; G.quitToTitle(true); } }
    }, () => { if (m.review) G.closeMenu(); });
  };
  U.draw.wkresult = function (G, ctx, m) {
    U.bg(ctx, false); const r = m.res;
    U.title(ctx, m.review ? 'YOUR BEST THIS WEEK' : { dead: 'YOU FELL', time: 'TIME IS UP', gaveup: 'RUN ENDED' }[m.why] || 'RUN ENDED', 16);
    AH.text(ctx, AH.UW / 2, 46, AH.tr('FLOOR') + ' ' + r.f, '#ffb347', { align: 'center', scale: 3 });
    AH.text(ctx, AH.UW / 2, 76, AH.tr('TIME') + ' ' + AH.fmtTime(r.t).split('.')[0] + '    ' + AH.tr('KILLS') + ' ' + r.kills, '#cfc6b4', { align: 'center' });
    r.pl.forEach((p, i) => AH.text(ctx, AH.UW / 2, 92 + i * 11, p.n + ' - ' + p.h + ' (' + AH.tr(AH.CLASSES[p.c].name) + ', ' + AH.tr('LV ' + p.l) + ')', AH.CLASSES[p.c].color, { align: 'center' }));
    let y = 128;
    if (m.better && !m.review) { AH.text(ctx, AH.UW / 2, y, 'A NEW PERSONAL BEST!', '#8ae08e', { align: 'center' }); y += 11; }
    if (r.f >= 10 && !m.review) { AH.text(ctx, AH.UW / 2, y, 'A CHEST WAITS IN YOUR TOWN STASH.', '#f2c94c', { align: 'center' }); y += 11; }
    const place = AH.Board && AH.Board.placeFor ? AH.Board.placeFor(r) : null;
    if (place) AH.text(ctx, AH.UW / 2, y, AH.tr('THIS WOULD BE PLACE') + ' ' + place, '#9ec0ff', { align: 'center' });
    U.list(ctx, U.wkResItems(m), m.sel, 130, 178, 220);
  };

  // ---------- the weekly chest arrives in town ----------
  const _enterTown = GG.enterTown;
  GG.enterTown = function (why) {
    _enterTown.call(this, why);
    const o = AH.options; if (!o.rewards || !o.rewards.length || !this.world || this.isRun()) return;
    const p = this.players[0]; if (!p || p.remote || p.slotIdx < 0) return;
    const st = this.world.stash; let n = 0;
    for (const r of o.rewards) {
      const f = Math.max(6, p.ch.deepest || 1, r.f || 10);
      const rng = AH.mulberry(AH.hashStr(r.week + (r.bonus ? 'b' : '') + p.ch.created));
      const items = [AH.genItem(rng, f, { rarity: r.f >= 20 ? 3 : 2, mf: 200 })];
      if (r.f >= 30) items.push(AH.genItem(rng, f, { rarity: 3 }));
      items.push(AH.makeCons('potion', 3));
      for (const it of items) { const i = st.indexOf(null); if (i >= 0) { st[i] = it; n++; } else if (!p.addItem(it)) this.dropItem(p.x, p.y + 8, it, p.pid); }
    }
    o.rewards = []; AH.Save.setOptions(o);
    if (n) { this.banner('THE WEEKLY CHEST HAS ARRIVED', '#f2c94c', 'LOOK IN YOUR TOWN STASH'); AH.Audio.sfx('legend'); }
    this.saveAll();
  };
})();

AH.addI18n(`
WEEKLY DEPTH|PROFONDEUR DE LA SEMAINE|HETI MÉLYSÉG
START THE RUN|LANCER LA DESCENTE|FUTAM INDÍTÁSA
SUBMIT MY BEST RESULT|ENVOYER MON MEILLEUR RÉSULTAT|LEGJOBB EREDMÉNYEM BEKÜLDÉSE
WEEK|SEMAINE|HÉT
ENDS IN|FINIT DANS|VÉGE
A FRESH LEVEL 1 HERO. ONE LIFE. 45 MINUTES. GET AS DEEP AS YOU CAN. THE SAME MINE FOR EVERYONE THIS WEEK.|UN HÉROS NEUF DE NIVEAU 1. UNE SEULE VIE. 45 MINUTES. DESCENDS LE PLUS BAS POSSIBLE. LA MÊME MINE POUR TOUT LE MONDE CETTE SEMAINE.|FRISS, 1. SZINTŰ HŐS. EGY ÉLET. 45 PERC. JUSS MINÉL MÉLYEBBRE. EZEN A HÉTEN MINDENKINEK UGYANAZ A BÁNYA.
YOUR BEST|TON MEILLEUR|LEGJOBBAD
SOLO|SOLO|EGYÉNI
TEAM|ÉQUIPE|CSAPAT
FLOOR 10 OR DEEPER SENDS A CHEST TO YOUR TOWN STASH.|L'ÉTAGE 10 OU PLUS ENVOIE UN COFFRE DANS TA RÉSERVE.|A 10. SZINT VAGY MÉLYEBB EGY LÁDIKÓT KÜLD A VÁROSI LÁDÁDBA.
CHOOSE YOUR CLASS|CHOISIS TA CLASSE|VÁLASSZ KASZTOT
MORE PLAYERS: PRESS A ON ANOTHER CONTROLLER OR KEYBOARD|PLUS DE JOUEURS : APPUIE SUR A SUR UNE AUTRE MANETTE OU UN AUTRE CLAVIER|TÖBB JÁTÉKOS: NYOMJ A-T EGY MÁSIK KONTROLLEREN VAGY BILLENTYŰZETEN
BEGIN|COMMENCER|INDULÁS
LEFT/RIGHT CLASS|GAUCHE/DROITE CLASSE|BALRA/JOBBRA KASZT
YOUR NAME ON THE LEADERBOARD.|TON NOM DANS LE CLASSEMENT.|A NEVED A RANGSORBAN.
5 MINUTES LEFT!|PLUS QUE 5 MINUTES !|MÉG 5 PERC!
ONE MINUTE LEFT!|PLUS QU'UNE MINUTE !|MÉG EGY PERC!
TIME IS UP!|LE TEMPS EST ÉCOULÉ !|LEJÁRT AZ IDŐ!
TIME IS UP|LE TEMPS EST ÉCOULÉ|LEJÁRT AZ IDŐ
YOU FELL|TU ES TOMBÉ|ELESTÉL
RUN ENDED|DESCENTE TERMINÉE|A FUTAM VÉGET ÉRT
END THE RUN|TERMINER LA DESCENTE|FUTAM BEFEJEZÉSE
YOUR BEST THIS WEEK|TON MEILLEUR CETTE SEMAINE|A HETI LEGJOBBAD
TIME|TEMPS|IDŐ
KILLS|VICTIMES|ÖLÉS
A NEW PERSONAL BEST!|NOUVEAU RECORD PERSONNEL !|ÚJ EGYÉNI CSÚCS!
A CHEST WAITS IN YOUR TOWN STASH.|UN COFFRE T'ATTEND DANS TA RÉSERVE.|EGY LÁDIKÓ VÁR A VÁROSI LÁDÁDBAN.
THIS WOULD BE PLACE|CE SERAIT LA PLACE|EZ A HELYEZÉS LENNE:
SUBMIT TO THE LEADERBOARD|ENVOYER AU CLASSEMENT|BEKÜLDÉS A RANGSORBA
SHOW THE RESULT CODE|AFFICHER LE CODE DU RÉSULTAT|EREDMÉNYKÓD MUTATÁSA
BACK TO THE TITLE|RETOUR AU MENU|VISSZA A FŐMENÜBE
THE WEEKLY CHEST HAS ARRIVED|LE COFFRE DE LA SEMAINE EST ARRIVÉ|MEGÉRKEZETT A HETI LÁDIKÓ
LOOK IN YOUR TOWN STASH|REGARDE DANS TA RÉSERVE|NÉZZ BELE A VÁROSI LÁDÁDBA
A LEGENDARY BEAST GUARDS THE STAIRS|UNE BÊTE LÉGENDAIRE GARDE L'ESCALIER|LEGENDÁS BESTIA ŐRZI A LÉPCSŐT
HOST WEEKLY DEPTH|HÉBERGER LA PROFONDEUR DE LA SEMAINE|HETI MÉLYSÉG INDÍTÁSA (HOST)
JOIN WEEKLY DEPTH|REJOINDRE LA PROFONDEUR DE LA SEMAINE|CSATLAKOZÁS HETI MÉLYSÉGHEZ
A FRESH HERO FOR THIS WEEK. FRIENDS JOIN WITH THE ROOM CODE AND ALSO CHOOSE WEEKLY DEPTH. YOU COUNT AS A TEAM.|UN HÉROS NEUF POUR CETTE SEMAINE. LES AMIS REJOIGNENT AVEC LE CODE ET CHOISISSENT AUSSI LA PROFONDEUR DE LA SEMAINE. VOUS COMPTEZ COMME UNE ÉQUIPE.|FRISS HŐS ERRE A HÉTRE. A BARÁTOK A SZOBAKÓDDAL CSATLAKOZNAK, ŐK IS A HETI MÉLYSÉGET VÁLASZTVA. CSAPATKÉNT SZÁMÍTOTOK.
WEEKLY HEROES JOIN ONLY WEEKLY GAMES|LES HÉROS DE LA SEMAINE NE REJOIGNENT QUE LES PARTIES DE LA SEMAINE|HETI HŐS CSAK HETI JÁTÉKHOZ CSATLAKOZHAT
THE SLAIN RISE TO SERVE YOU|LES MORTS SE RELÈVENT POUR TE SERVIR|A MEGÖLTEK FELKELNEK, HOGY SZOLGÁLJANAK
`);
