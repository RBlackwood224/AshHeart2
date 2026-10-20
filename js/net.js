'use strict';
// Online co-op over PeerJS. The host simulates everything; guests send input and mirror snapshots.
AH.PEER_LIB = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
AH.Net = function (G) { this.G = G; this.conns = []; this.peer = null; this.status = ''; this.code = ''; this.sendT = 0; this.fxQ = []; this.sfxQ = []; };
const N = AH.Net.prototype;

AH.loadPeer = function (cb) {
  if (window.Peer) return cb(true);
  const s = document.createElement('script'); s.src = AH.PEER_LIB;
  s.onload = () => cb(!!window.Peer); s.onerror = () => cb(false);
  document.head.appendChild(s);
};
AH.netCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };

// ---------- host ----------
N.host = function (cb) {
  const G = this.G;
  this.isHost = true; this.code = AH.netCode(); this.status = 'CONNECTING...';
  AH.loadPeer(ok => {
    if (!ok) { this.status = 'COULD NOT LOAD PEERJS'; cb && cb(false); return; }
    try {
      this.peer = new window.Peer('ashheart-' + this.code.toLowerCase());
    } catch (e) { this.status = 'PEER ERROR'; cb && cb(false); return; }
    this.peer.on('open', () => { this.status = 'WAITING FOR FRIENDS'; cb && cb(true); });
    this.peer.on('error', e => { this.status = 'ERROR: ' + String(e.type || e).toUpperCase(); if (e.type === 'unavailable-id') { this.code = AH.netCode(); } });
    this.peer.on('connection', conn => this.onConn(conn));
    this.peer.on('disconnected', () => { this.status = 'LOST THE BROKER, RETRYING'; try { this.peer.reconnect(); } catch (e) { /* ignore */ } });
  });
};
N.onConn = function (conn) {
  const G = this.G;
  conn.on('open', () => {
    if (G.players.length >= 3) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
    this.conns.push(conn);
  });
  conn.on('data', d => this.hostRecv(conn, d));
  conn.on('close', () => this.dropConn(conn));
  conn.on('error', () => this.dropConn(conn));
};
N.dropConn = function (conn) {
  const G = this.G;
  const i = this.conns.indexOf(conn); if (i >= 0) this.conns.splice(i, 1);
  if (conn.player) { G.toast(null, conn.player.ch.name + ' LEFT', '#ff8a8a'); const p = conn.player; G.players.splice(G.players.indexOf(p), 1); G.pets = G.pets.filter(x => x.owner !== p); G.players.forEach((q, k) => { q.pid = k; q.color = AH.PLAYER_COLORS[k]; }); G.assignPets(); this.sendRoster(); }
};
N.hostRecv = function (conn, d) {
  const G = this.G;
  if (!d || !d.t) return;
  if (d.t === 'hello') {
    if (conn.player || G.players.length >= 3) return;
    const ch = d.ch; if (!ch || !AH.CLASSES[ch.cls]) return;
    const pid = G.players.length;
    const p = new AH.Player(pid, ch, null); p.remote = true; p.conn = conn; p.pad = AH.Net.emptyPad();
    const lead = G.players[0]; p.x = lead.x + 12; p.y = lead.y + 8; G.placeSafe(p);
    G.players.push(p); G.makePet(p);
    conn.player = p;
    conn.send({ t: 'welcome', pid, scene: G.scene, floor: G.floorNo, seed: G.mapSeed, event: G.event, mode: G.mode, world: this.worldLite(), hostName: G.players[0].ch.name });
    this.sendRoster();
    G.toast(null, ch.name + ' JOINED!', '#8ae08e'); AH.Audio.sfx('levelup');
  } else if (d.t === 'in' && conn.player) {
    const p = conn.player.pad;
    p.ax = d.ax; p.ay = d.ay; p.hm = d.h || {};
    for (const b of d.p || []) p.fresh[b] = true;
  } else if (d.t === 'ch' && conn.player) {
    const p = conn.player; const keep = { hp: p.hp, mp: p.mp };
    p.ch = d.ch; p.recalc(); p.hp = Math.min(keep.hp, p.S.hp); p.mp = Math.min(keep.mp, p.S.mp);
    this.sendRoster();
  } else if (d.t === 'act' && conn.player) {
    const p = conn.player; const it = G.findInteract(p);
    if (it && it.kind === d.kind) G.interact(p, it);
  } else if (d.t === 'drop' && conn.player) {
    G.dropItem(conn.player.x, conn.player.y, d.item, conn.player.pid);
  }
};
AH.Net.emptyPad = function () {
  const pad = { ax: 0, ay: 0, hm: {}, fresh: {} };
  pad.pressed = b => { if (pad.fresh[b]) { pad.fresh[b] = false; return true; } return false; };
  pad.held = b => !!pad.hm[b];
  return pad;
};
N.worldLite = function () { const W = this.G.world; return { day: W.day, hour: W.hour, weather: W.weather, trust: W.trust, pop: W.pop, storyDone: W.storyDone }; };
N.sendRoster = function () {
  const G = this.G;
  const roster = G.players.map(p => ({ pid: p.pid, ch: { name: p.ch.name, cls: p.ch.cls, level: p.ch.level, equip: p.ch.equip, pet: p.ch.pet, base: p.ch.base, passives: p.ch.passives, skills: p.ch.skills, slots: p.ch.slots, bag: [], xp: 0, gold: 0, deepest: p.ch.deepest, lifts: [], bestiary: {}, bestTimes: {} } }));
  this.broadcast({ t: 'roster', roster });
};
N.broadcast = function (msg) { for (const c of this.conns) { try { c.send(msg); } catch (e) { /* ignore */ } } };
N.sendTo = function (p, msg) { if (p && p.conn) { try { p.conn.send(msg); } catch (e) { /* ignore */ } } };
N.hostTick = function (dt) {
  const G = this.G;
  this.sendT -= dt;
  if (this.sendT > 0 || !this.conns.length) return;
  this.sendT = 0.05;
  const r = v => Math.round(v * 10) / 10;
  const base = {
    t: 's', sc: G.scene, f: G.floorNo, tm: r(G.time), w: this.worldLite(),
    pl: G.players.map(p => [p.pid, r(p.x), r(p.y), p.face, r(p.aim), p.state, p.anim, Math.round(p.hp), p.S.hp, Math.round(p.mp), p.S.mp, p.dead ? 1 : 0, Math.round(p.torch), p.inv > 0 ? 1 : 0, p.flash > 0 ? 1 : 0, p.buffs.aegis > 0 ? 1 : 0]),
    en: G.enemies.filter(e => !e.dead).map(e => { const a = [e.id, r(e.x), r(e.y), e.face, Math.round(e.hp), e.maxHp, e.flash > 0 ? 1 : 0, e.state === 'wind' ? 1 : 0, e.hidden ? 1 : 0, e.freezeT > 0 ? 1 : 0, e.shieldT > 0 ? 1 : 0, e.aggro ? 1 : 0]; if (!e.netSent) { e.netSent = true; a.push({ n: e.name, s: e.def.spr, pl: e.def.pal, sc: e.scale, fl: e.fly ? 1 : 0, el: e.elite, lg: e.legend ? 1 : 0, bo: e.boss ? 1 : 0, nm: e.nemesis ? 1 : 0, ti: e.title || '' }); } return a; }),
    pr: G.projs.map(p => [p.k, r(p.x), r(p.y), r(p.a || 0), p.col, p.heavy ? 1 : 0, p.enemy ? 1 : 0]),
    zn: G.zones.map(z => [z.kind, r(z.x), r(z.y), z.r, r(z.t)]),
    pt: G.pets.map(pt => [G.players.indexOf(pt.owner), pt.kind, r(pt.x), r(pt.y), pt.face, pt.active ? 1 : 0, pt.chirp > 0 ? 1 : 0, pt.moving ? 1 : 0]),
    np: G.npcs.map(n => [r(n.x), r(n.y), n.face, n.kind]),
    al: G.allies.map(a => [r(a.x), r(a.y), a.face]),
    fx: this.collectFx(), sfx: this.sfxQ, bn: this.bnQ || [],
    st: G.map && G.map.stairs ? (G.map.stairs.locked ? 1 : 0) : 0, rt: r(G.runTimer || 0), ct: r(G.collapseT || 0),
    ps: this.propState(),
  };
  this.fxQ = []; this.sfxQ = []; this.bnQ = [];
  for (const c of this.conns) {
    if (!c.player) continue;
    const pid = c.player.pid;
    const msg = Object.assign({}, base, {
      dr: G.drops.filter(d => d.owner < 0 || d.owner === pid).map(d => [d.id, r(d.x), r(d.y), r(d.z), d.gold ? 1 : 0, d.item ? AH.Net.packIcon(d.item) : null, d.item ? d.item.rarity || 0 : 0]),
      to: (c.toastQ || []), me: pid,
    });
    c.toastQ = [];
    try { c.send(msg); } catch (e) { /* ignore */ }
  }
};
N.collectFx = function () {
  const out = [];
  for (const f of this.G.fx) {
    if (f.sent) continue; f.sent = true;
    if (f.k === 'num' || f.k === 'ring' || f.k === 'boom' || f.k === 'bolt' || f.k === 'arc') out.push(Object.assign({}, f, { cb: undefined }));
    else if (f.k === 'tele') out.push({ k: 'tele', x: f.x, y: f.y, r: f.r, life: f.life, max: f.max });
  }
  return out;
};
AH.Net.packIcon = function (it) { return { kind: it.kind, base: it.base, tier: it.tier, rarity: it.rarity, rune: it.rune, icon: it.icon, cons: it.cons }; };
N.propState = function () {
  const G = this.G; if (!G.map || G.scene !== 'mine') return null;
  const m = G.map;
  return { c: m.props.map((p, i) => (p.type === 'chest' && p.open) || (p.type === 'shrine' && p.used) || (p.type === 'dig' && p.dug) ? i : -1).filter(i => i >= 0), sf: m.secret && m.secret.found ? m.secret.wall : null, ss: m.secret && m.secret.sniffed ? 1 : 0, v: (m.veins || []).map((v, i) => v.hp <= 0 ? i : -1).filter(i => i >= 0) };
};
// host-side hooks
N.toastFor = function (p, msg, col) { if (p.conn) { p.conn.toastQ = p.conn.toastQ || []; p.conn.toastQ.push([msg, col]); } };

// ---------- guest ----------
N.join = function (code, cb) {
  const G = this.G;
  this.isHost = false; this.code = code.toUpperCase(); this.status = 'CONNECTING...';
  AH.loadPeer(ok => {
    if (!ok) { this.status = 'COULD NOT LOAD PEERJS'; cb && cb(false); return; }
    this.peer = new window.Peer();
    this.peer.on('error', e => { this.status = 'ERROR: ' + String(e.type || e).toUpperCase(); cb && cb(false); });
    this.peer.on('open', () => {
      const conn = this.peer.connect('ashheart-' + this.code.toLowerCase(), { reliable: true });
      this.conn = conn;
      conn.on('open', () => { this.status = 'SAYING HELLO...'; conn.send({ t: 'hello', ch: this.localCh }); });
      conn.on('data', d => this.guestRecv(d));
      conn.on('close', () => { this.status = 'DISCONNECTED'; G.netLost(); });
      setTimeout(() => { if (!this.welcomed) { this.status = 'NO ANSWER. CHECK THE CODE.'; } }, 9000);
    });
  });
};
N.guestRecv = function (d) {
  const G = this.G;
  if (d.t === 'full') { this.status = 'THE GAME IS FULL'; return; }
  if (d.t === 'welcome') {
    this.welcomed = true; this.me = d.pid;
    G.guestStart(d);
    return;
  }
  if (d.t === 'roster') { G.guestRoster(d.roster); return; }
  if (d.t === 'give') { const p = G.localPlayers()[0]; if (!p.addItem(d.item)) { this.conn.send({ t: 'drop', item: d.item }); G.toast(p, 'BAG IS FULL', '#ff8a8a'); } else { G.toast(p, d.item.name, AH.RARITY[d.item.rarity || 0].col); AH.Audio.sfx(d.item.rarity >= 3 ? 'legend' : 'loot'); } this.sendCh(); return; }
  if (d.t === 'bury') { const p = G.localPlayers()[0]; if (p) { for (const s of AH.EQUIP_SLOTS) p.ch.equip[s] = null; p.ch.bag = new Array(p.ch.bag.length).fill(null); p.recalc(); G.toast(p, 'YOUR GEAR LIES IN YOUR GRAVE ON FLOOR ' + d.f, '#ff8a8a'); this.sendCh(); G.savePlayer && G.savePlayer(p); } return; }
  if (d.t === 'ev') { G.guestEvent(d); return; }
  if (d.t === 's') { G.guestSnap(d); return; }
  if (d.t === 'floor') { G.guestFloor(d); return; }
};
N.sendInput = function (pad, pressedList) {
  if (!this.conn || !this.conn.open) return;
  this.conn.send({ t: 'in', ax: Math.round(pad.ax * 100) / 100, ay: Math.round(pad.ay * 100) / 100, h: pad.h, p: pressedList });
};
N.sendCh = function () {
  if (!this.conn || !this.conn.open) return;
  clearTimeout(this.chT);
  this.chT = setTimeout(() => { const p = this.G.localPlayers()[0]; if (p) this.conn.send({ t: 'ch', ch: p.ch }); }, 300);
};
N.close = function () { try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ } };

// ---------- Game integration ----------
GG.netEvent = function (kind, p, a, b) {
  if (!this.net || !this.isHost || !p || !p.remote) return;
  this.net.sendTo(p, { t: 'ev', k: kind, a, b });
};
GG.netGive = function (p, item) { if (this.net) this.net.sendTo(p, { t: 'give', item }); };
GG.netToast = function (p, msg, col) { if (this.net && this.isHost) this.net.toastFor(p, msg, col); };
GG.netBanner = function (msg, col, sub) { if (this.net && this.isHost) { this.net.bnQ = this.net.bnQ || []; this.net.bnQ.push([msg, col, sub]); } };
GG.netEventSeed = function (seed, floor, event) { if (this.net && this.isHost) this.net.broadcast({ t: 'floor', seed, floor, event, mode: this.mode }); };
GG.onLocalEquip = function (p) { if (this.net && !this.isHost) this.net.sendCh(); };

// guest side world mirror
GG.guestStart = function (d) {
  this.isHost = false;
  this.closeAllMenus();
  const ch = this.net.localCh;
  this.players = [];
  const me = new AH.Player(d.pid, ch, this.net.device); me.puppet = true; this.players.push(me);
  this.world = Object.assign(AH.Save.load()[this.slotIdx].world || AH.Save.newWorld(), d.world);
  this.mode = d.mode;
  if (d.scene === 'mine') this.guestFloor({ seed: d.seed, floor: d.floor, event: d.event, mode: d.mode }); else this.guestTown();
  this.toast(null, 'JOINED ' + d.hostName + "'S GAME", '#8ae08e');
  this.netMirror = { en: {} };
};
GG.guestTown = function () {
  this.scene = 'town'; this.resetActors(); this.floorNo = 0;
  if (!this.townMap) { this.townMap = AH.genTown(); AH.renderTown(this.townMap); }
  this.map = this.townMap; AH.Audio.music('town');
  if (this.netMirror) this.netMirror.en = {};
};
GG.guestFloor = function (d) {
  this.scene = 'mine'; this.resetActors(); this.floorNo = d.floor; this.event = d.event; this.mode = d.mode || this.mode;
  this.map = AH.genFloor(d.seed, d.floor, d.event); AH.renderMap(this.map); AH.addLavaLights(this.map);
  this.mapSeed = d.seed;
  if (this.netMirror) this.netMirror.en = {};
  AH.Audio.music(d.floor % 10 === 0 ? 'boss' : 'mine');
  const me = this.localPlayers()[0];
  if (me) { if (d.floor > me.ch.deepest && this.mode === 'story') me.ch.deepest = d.floor; if (d.floor % 5 === 0 && me.ch.lifts.indexOf(d.floor) < 0 && this.mode !== 'time') me.ch.lifts.push(d.floor); }
};
GG.guestRoster = function (roster) {
  const me = this.localPlayers()[0];
  const keep = [me];
  for (const r of roster) {
    if (r.pid === this.net.me) { me.pid = r.pid; me.color = AH.PLAYER_COLORS[r.pid]; continue; }
    let p = this.players.find(q => q.remote && q.pid === r.pid);
    if (!p || p.ch.name !== r.ch.name) { p = new AH.Player(r.pid, r.ch, null); p.remote = true; }
    else { p.ch = r.ch; p.recalc(); }
    keep.push(p);
  }
  this.players = keep.sort((a, b) => a.pid - b.pid);
  this.pets = [];
};
GG.guestSnap = function (d) {
  const W = this.world; Object.assign(W, d.w);
  if (d.sc === 'town' && this.scene !== 'town') this.guestTown();
  if (!this.map) return;
  // players
  for (const a of d.pl) {
    const p = this.players.find(q => q.pid === a[0]); if (!p) continue;
    p.nx = a[1]; p.ny = a[2];
    if (p.x === 0 && p.y === 0 || AH.dist2(p.x, p.y, a[1], a[2]) > 4000) { p.x = a[1]; p.y = a[2]; }
    p.face = a[3]; if (!p.puppetAim) p.aim = a[4]; p.state = a[5]; p.anim = a[6]; p.hp = a[7]; p.S.hp = a[8]; p.mp = a[9]; p.S.mp = a[10];
    p.dead = !!a[11]; p.torch = a[12]; p.inv = a[13] ? 0.1 : 0; p.flash = a[14] ? 0.1 : 0; p.buffs.aegis = a[15] ? 1 : 0;
  }
  // enemies
  const seen = new Set(); const M = this.netMirror.en;
  for (const a of d.en) {
    const id = a[0]; seen.add(id);
    let e = M[id];
    if (!e) {
      const info = a[12]; if (!info) continue;
      const def = { name: info.n, spr: info.s, pal: info.pl || {}, ai: 'chase', hp: 1, dmg: 0, spd: 0, fly: info.fl };
      e = new AH.Enemy(def, a[1], a[2], 1, { scale: info.sc, elite: info.el, noHide: true });
      e.name = info.n; e.legend = info.lg ? { abil: [] } : null; e.boss = !!info.bo; e.nemesis = info.nm ? {} : null; e.title = info.ti;
      M[id] = e;
    }
    e.nx = a[1]; e.ny = a[2]; e.face = a[3]; e.hp = a[4]; e.maxHp = a[5]; e.flash = a[6] ? 0.1 : 0; e.state = a[7] ? 'wind' : 'idle'; e.hidden = !!a[8]; e.freezeT = a[9] ? 1 : 0; e.shieldT = a[10] ? 1 : 0; e.aggro = !!a[11];
  }
  for (const id in M) if (!seen.has(+id)) { const e = M[id]; if (!e.hidden && e.hp > 0) AH.fx.burst(this, e.x, e.y - 6, e.spr, e.scale); delete M[id]; }
  this.enemies = Object.values(M);
  this.projs = d.pr.map(a => ({ k: a[0], x: a[1], y: a[2], a: a[3], col: a[4], heavy: a[5], enemy: a[6], light: a[0] === 'magic' || a[0] === 'fire' }));
  this.zones = d.zn.map(a => ({ kind: a[0], x: a[1], y: a[2], r: a[3], t: a[4] }));
  this.pets = d.pt.map(a => ({ owner: this.players.find(p => p.pid === a[0]) || this.players[0], kind: a[1], x: a[2], y: a[3], face: a[4], active: !!a[5], chirp: a[6], moving: a[7] }));
  this.npcs = d.np.map((a, i) => { const old = this.npcs[i]; return { x: a[0], y: a[1], face: a[2], kind: a[3], spr: old && old.kind === a[3] ? old.spr : AH.SPR[{ villager: 'vill1', keeper: 'keeper', merchant: 'keeper', lost: 'miner' }[a[3]]], fixed: 1 }; });
  this.allies = d.al.map(a => ({ x: a[0], y: a[1], face: a[2], spr: this.ghostWolf || (this.ghostWolf = AH.recolor(AH.SPR.wolf, { d: '#9ad8f8', D: '#5a9ac8', l: '#e8f8ff' })) }));
  this.drops = d.dr.map(a => ({ id: a[0], x: a[1], y: a[2], z: a[3], gold: a[4], item: a[5], owner: -1, t: 1 }));
  for (const [msg, col] of d.to || []) this.toast(this.localPlayers()[0], msg, col);
  for (const [msg, col, sub] of d.bn || []) this.banners.push({ msg, col, sub: sub || '', t: 3.2 });
  for (const f of d.fx || []) this.fx.push(Object.assign({}, f));
  for (const s of d.sfx || []) AH.Audio.sfx(s);
  if (this.map && this.scene === 'mine') {
    this.map.stairs.locked = !!d.st; this.runTimer = d.rt; this.collapseT = d.ct;
    const ps = d.ps;
    if (ps) {
      for (const i of ps.c) { const p = this.map.props[i]; if (p) { if (p.type === 'chest') p.open = true; if (p.type === 'shrine') p.used = true; if (p.type === 'dig') p.dug = true; } }
      if (ps.sf && this.map.get(ps.sf[0], ps.sf[1]) === AH.TILE.SECRET) { this.map.set(ps.sf[0], ps.sf[1], AH.TILE.FLOOR); const x = this.map.canvas.getContext('2d'); x.fillStyle = this.map.biome.floor[2]; x.fillRect(ps.sf[0] * AH.T, ps.sf[1] * AH.T, AH.T, AH.T); this.map.secret.found = true; }
      if (this.map.secret && ps.ss) this.map.secret.sniffed = true;
      for (const i of ps.v) { const v = this.map.veins[i]; if (v && v.hp > 0) { v.hp = 0; } }
    }
  }
  this.time = d.tm;
};
GG.guestEvent = function (d) {
  const p = this.localPlayers()[0]; if (!p) return;
  if (d.k === 'gold') p.ch.gold += d.a;
  else if (d.k === 'xp') p.gainXp(this, d.a);
  else if (d.k === 'take') p.takeCons(d.a, d.b);
  else if (d.k === 'kill') { p.ch.kills++; p.ch.bestiary[d.a] = (p.ch.bestiary[d.a] || 0) + 1; }
  this.net.sendCh();
};
GG.guestUpdate = function (dt) {
  if (this.scene === 'mine') this.checkBossIntro(dt);
  this.dt = dt;
  for (const t of this.toasts) t.t -= dt; this.toasts = this.toasts.filter(t => t.t > 0);
  for (const b of this.banners) b.t -= dt; this.banners = this.banners.filter(b => b.t > 0);
  if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeA = 0; }
  this.time += dt;
  // interpolate
  for (const p of this.players) if (p.nx !== undefined) { p.x = AH.lerp(p.x, p.nx, Math.min(1, dt * 14)); p.y = AH.lerp(p.y, p.ny, Math.min(1, dt * 14)); }
  for (const e of this.enemies) if (e.nx !== undefined) { e.x = AH.lerp(e.x, e.nx, Math.min(1, dt * 14)); e.y = AH.lerp(e.y, e.ny, Math.min(1, dt * 14)); }
  for (const pr of this.projs) { if (pr.vx) { pr.x += pr.vx * dt; pr.y += pr.vy * dt; } }
  for (const f of this.fx) { f.life -= dt; if (f.k === 'px') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g || 0) * dt; } else if (f.k === 'num') { f.y += f.vy * dt; f.vy *= 0.92; } }
  this.fx = this.fx.filter(f => f.life > 0);
  // local input -> host
  const me = this.localPlayers()[0];
  if (!me || this.menu) { if (this.net) this.net.sendInput({ ax: 0, ay: 0, h: {} }, []); return; }
  const pad = this.padFor(me);
  me.interactable = this.findInteract(me);
  const pressed = [];
  for (const b of ['a', 'b', 'x', 'y', 'lb', 'rb', 'pot', 'mana', 'dodge']) if (pad.pressed(b)) pressed.push(b);
  // menus that live on the guest
  if (pressed.indexOf('a') >= 0 && me.interactable) {
    const k = me.interactable.kind;
    if (k === 'door' || k === 'stash' || k === 'talk' || k === 'well' || k === 'board' || k === 'mine' || k === 'merchant') { this.interact(me, me.interactable); pressed.splice(pressed.indexOf('a'), 1); }
    else if (this.net.conn) this.net.conn.send({ t: 'act', kind: k });
  }
  if (Math.abs(pad.ax) > 0.2 || Math.abs(pad.ay) > 0.2) { me.aim = Math.atan2(pad.ay, pad.ax); me.puppetAim = true; }
  this.net.sendInput({ ax: pad.ax, ay: pad.ay, h: { a: pad.held('a') } }, pressed);
};
GG.netLost = function () {
  if (this.isHost) return;
  this.saveAll();
  this.net = null; this.isHost = true;
  this.quitToTitle();
  this.toast(null, 'CONNECTION TO THE HOST WAS LOST', '#ff8a8a');
};

// ---------- ONLINE MENU ----------
U.init.online = function (G, m) { m.step = 'menu'; m.sel = 0; m.code = ''; m.gsel = 0; };
U.update.online = function (G, m, dt) {
  const n = U.nav(G, m, dt);
  if (m.step === 'menu') {
    const items = [{ id: 'host', label: 'HOST A GAME' }, { id: 'join', label: 'JOIN A GAME' }, { id: 'back', label: 'BACK' }];
    U.listUpdate(G, m, dt, items, it => {
      if (it.id === 'back') { G.closeMenu(); return; }
      if (!AH.Save.load().length) { G.toast(null, 'CREATE A HERO FIRST', '#ff8a8a'); return; }
      const dev = m.dev || m.lastDev || 'kb1';
      G.openMenu('slots', null, { dev, purpose: 'online', onDone: idx => {
        if (it.id === 'host') {
          G.net = new AH.Net(G); G.isHost = true;
          G.startSession(idx, dev);
          G.net.host(ok => { if (ok) G.banner('ONLINE: CODE ' + G.net.code, '#9ec0ff', 'FRIENDS JOIN WITH THIS CODE'); else G.toast(null, G.net.status, '#ff8a8a'); });
        } else {
          G.openMenu('online', null, { dev, step: 'code', slotIdx: idx });
        }
      } });
    }, () => G.closeMenu());
    return;
  }
  if (m.step === 'code') {
    const grid = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('').concat(['DEL', 'GO']);
    if (n.dx) { m.gsel = (m.gsel + n.dx + grid.length) % grid.length; AH.Audio.sfx('move'); }
    if (n.dy) { m.gsel = AH.clamp(m.gsel + n.dy * 9, 0, grid.length - 1); AH.Audio.sfx('move'); }
    if (!m.kh) { m.kh = e => { if (G.menu !== m || m.step !== 'code') return; if (/^[a-zA-Z0-9]$/.test(e.key) && m.code.length < 5) m.code += e.key.toUpperCase(); else if (e.key === 'Backspace') m.code = m.code.slice(0, -1); else if (e.key === 'Enter') m.go = true; }; window.addEventListener('keydown', m.kh); }
    if (n.p.a) { const k = grid[m.gsel]; if (k === 'DEL') m.code = m.code.slice(0, -1); else if (k === 'GO') m.go = true; else if (m.code.length < 5) m.code += k; AH.Audio.sfx('select'); }
    if (n.p.b) { window.removeEventListener('keydown', m.kh); G.closeAllMenus(); G.openMenu('title', null); return; }
    if (m.go && m.code.length === 5) {
      m.go = false; window.removeEventListener('keydown', m.kh);
      G.slotIdx = m.slotIdx; G.world = AH.Save.load()[m.slotIdx].world;
      G.net = new AH.Net(G); G.net.localCh = AH.Save.load()[m.slotIdx].ch; G.net.device = m.dev || 'kb1';
      m.step = 'wait';
      G.net.join(m.code);
    }
    m.go = false;
    return;
  }
  if (m.step === 'wait') { if (n.p.b) { G.net && G.net.close(); G.net = null; G.closeAllMenus(); G.openMenu('title', null); } }
};
U.draw.online = function (G, ctx, m) {
  U.bg(ctx, false); U.title(ctx, 'ONLINE CO-OP', 16);
  if (m.step === 'menu') {
    U.list(ctx, [{ label: 'HOST A GAME' }, { label: 'JOIN A GAME' }, { label: 'BACK' }], m.sel, 150, 70, 180);
    ['UP TO 3 HEROES. THE HOST RUNS THE GAME,', 'FRIENDS JOIN WITH A 5-LETTER CODE.', 'EACH PLAYER SEES THEIR OWN LOOT.'].forEach((l, i) => AH.text(ctx, UW / 2, 150 + i * 11, l, '#8d8494', { align: 'center' }));
  } else if (m.step === 'code') {
    AH.text(ctx, UW / 2, 60, 'ENTER THE HOST CODE', '#cfc6b4', { align: 'center' });
    AH.text(ctx, UW / 2, 80, (m.code + '_____').slice(0, 5).split('').join(' '), '#ffb347', { align: 'center', scale: 3 });
    const grid = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('').concat(['DEL', 'GO']);
    grid.forEach((k, i) => { const x = 110 + (i % 9) * 30, y = 130 + Math.floor(i / 9) * 18; if (i === m.gsel) AH.frame(ctx, x - 4, y - 4, k.length > 1 ? 26 : 16, 15, { fill: '#2e2638', edge: '#c9a24a', hi: '#f2e3b3' }); AH.text(ctx, x, y, k, i === m.gsel ? '#ffb347' : '#cfc6b4'); });
  } else {
    AH.text(ctx, UW / 2, 110, G.net ? G.net.status : '', '#cfc6b4', { align: 'center' });
    AH.text(ctx, UW / 2, 130, 'CODE ' + m.code, '#8d8494', { align: 'center' });
    U.hint(ctx, U.btnName(G, m, 'b') + ' CANCEL');
  }
};
