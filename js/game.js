'use strict';
// Game core: scenes, flow, interactions, companions, events, bounties, nemesis
AH.Game = function () {
  this.scene = 'title'; this.time = 0; this.dt = 0;
  this.players = []; this.enemies = []; this.projs = []; this.drops = []; this.fx = []; this.zones = []; this.allies = []; this.pets = []; this.npcs = [];
  this.flashLights = []; this.toasts = []; this.banners = [];
  this.shakeT = 0; this.shakeA = 0; this.menu = null; this.menus = [];
  this.isHost = true; this.net = null; this.floorNo = 0; this.event = null; this.mode = 'story';
  this.slotIdx = -1; this.world = null; this.slotsUsed = [];
  this.weatherFx = []; this.lightning = 0;
};
const GG = AH.Game.prototype;

// ---------- helpers ----------
GG.toast = function (p, msg, col) {
  const pid = p ? p.pid : -1;
  this.toasts.push({ pid, msg, col: col || '#e9e2d0', t: 3 });
  if (this.toasts.length > 12) this.toasts.shift();
  if (p && p.remote && this.netToast) this.netToast(p, msg, col);
};
GG.banner = function (msg, col, sub) { this.banners.push({ msg, col: col || '#f2c94c', sub: sub || '', t: 3.2 }); if (this.banners.length > 2) this.banners.shift(); if (this.netBanner) this.netBanner(msg, col, sub); };
GG.shake = function (n) { if (AH.options && !AH.options.shake) return; this.shakeA = Math.max(this.shakeA, n); this.shakeT = 0.18; };
GG.moveEntity = function (e, dx, dy, r, noclip) {
  const m = this.map; if (!m) return;
  if (noclip) { e.x = AH.clamp(e.x + dx, 8, m.w * AH.T - 8); e.y = AH.clamp(e.y + dy, 8, m.h * AH.T - 8); return; }
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4) || 1;
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (!m.blocked(e.x + sx, e.y, r)) e.x += sx; else if (e.vx !== undefined) e.vx *= 0.5;
    if (!m.blocked(e.x, e.y + sy, r)) e.y += sy; else if (e.vy !== undefined) e.vy *= 0.5;
  }
};
GG.localPlayers = function () { return this.players.filter(p => !p.remote); };
GG.lampsLit = function () { return Math.ceil(AH.clamp(this.world.trust, 0, 100) / 12.5); };

// ---------- start / scenes ----------
GG.startSession = function (slotIdx, device) {
  const slots = AH.Save.load(); const s = slots[slotIdx];
  this.slotIdx = slotIdx; this.world = s.world || AH.Save.newWorld();
  this.players = [];
  this.addLocalPlayer(slotIdx, s.ch, device);
  this.enterTown('start');
};
GG.addLocalPlayer = function (slotIdx, ch, device) {
  const pid = this.players.length;
  const p = new AH.Player(pid, ch, device); p.slotIdx = slotIdx;
  this.players.push(p);
  this.slotsUsed.push(slotIdx);
  this.makePet(p);
  if (this.map) { const lead = this.players[0]; p.x = lead.x + 10; p.y = lead.y + 6; this.placeSafe(p); }
  return p;
};
GG.removePlayer = function (p) {
  this.savePlayer(p);
  this.players.splice(this.players.indexOf(p), 1);
  this.pets = this.pets.filter(x => x.owner !== p);
  this.players.forEach((q, i) => { q.pid = i; q.color = AH.PLAYER_COLORS[i]; });
  this.assignPets();
};
GG.makePet = function (p) {
  const want = p.ch.pet || 'dog';
  this.pets.push({ owner: p, kind: want, x: p.x - 8, y: p.y + 4, face: 1, t: 0, state: 'follow', atk: 0, warnT: 0 });
  this.assignPets();
};
GG.assignPets = function () {
  // max 2 companions when 3 play
  const n = this.players.length;
  this.pets.forEach((pt, i) => { pt.active = !(n >= 3 && i >= 2); });
};
GG.placeSafe = function (e) {
  if (!this.map.blocked(e.x, e.y, 4)) return;
  for (let r = 4; r < 80; r += 4) for (let a = 0; a < 6.28; a += 0.5) { const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (!this.map.blocked(x, y, 4)) { e.x = x; e.y = y; return; } }
};
GG.resetActors = function () { this.banners = []; this.enemies = []; this.projs = []; this.drops = []; this.fx = []; this.zones = []; this.allies = []; this.npcs = []; this.flashLights = []; };

GG.enterTown = function (why) {
  this.buryDead();
  for (const p of this.players) { p.mTarget = p.mInter = p.mDest = null; p.mPath = null; }
  this.scene = 'town'; this.resetActors(); this.event = null; this.floorNo = 0;
  if (!this.townMap) { this.townMap = AH.genTown(); AH.renderTown(this.townMap); }
  this.map = this.townMap;
  const W = this.world;
  if (why === 'return' || why === 'death') {
    W.hour += 5; if (W.hour >= 22) this.newDay();
  }
  const sp = why === 'start' ? this.map.spawn : this.map.mineSpawn;
  this.players.forEach((p, i) => { p.x = sp.x + i * 12 - 10; p.y = sp.y + (i % 2) * 6; p.dead = false; p.state = 'idle'; if (p.hp <= 0) p.hp = p.S.hp * 0.5; p.torch = Math.max(p.torch, 40); p.poison = 0; p.slow = 0; });
  this.pets.forEach(pt => { pt.x = pt.owner.x - 10; pt.y = pt.owner.y + 6; });
  this.spawnVillagers();
  if (this.world.bountyDay !== this.world.day) this.rollBounties();
  AH.Audio.music('town');
  if (why === 'start' && !W.seenIntro) { W.seenIntro = true; this.banner('WELCOME TO DUNMERE', '#f2c94c', 'THE MINE AWAITS. KEEP THE LAMPS BURNING.'); }
  else if (why === 'return') this.townMood();
  this.saveAll();
};
GG.newDay = function () {
  const W = this.world; W.day++; W.hour = 7;
  const rng = AH.mulberry(W.seed + W.day * 31);
  const r = rng();
  W.weather = r < 0.42 ? 'clear' : r < 0.66 ? 'rain' : r < 0.78 ? 'fog' : r < 0.9 ? 'snow' : 'storm';
  const target = W.trust * 0.7 + 10;
  W.pop = Math.round(AH.clamp(W.pop + Math.sign(target - W.pop) * rng.int(1, 3), 5, 80));
  this.rollBounties();
};
GG.checkBossIntro = function (dt) {
  for (const e of this.enemies) if ((e.boss || e.legend || e.nemesis) && !e.introDone && !e.hidden && !e.dead && this.players.some(p => !p.dead && AH.dist(p, e) < 130)) {
    e.introDone = true;
    this.bossIntro = { name: e.name, title: e.title || (e.nemesis ? 'YOUR NEMESIS' : ''), col: e.boss ? '#ff6a5a' : e.nemesis ? '#e05a7a' : '#ff9a3e', t: 2.6 };
    AH.Audio.sfx('boom'); this.shake(4);
  }
  if (this.bossIntro) this.bossIntro.t -= dt;
};
GG.townMood = function () {
  const W = this.world;
  if (W.trust < 35) this.banner(AH.rand.pick(AH.WORRY), '#ff8a8a');
  else if (W.trust > 80) this.banner(AH.rand.pick(AH.HAPPY), '#8ae08e');
};
GG.changeTrust = function (n, why) {
  const W = this.world; const before = this.lampsLit();
  W.trust = AH.clamp(W.trust + n, 0, 100);
  const after = this.lampsLit();
  if (after < before) this.banner('A LAMP OF DUNMERE GOES OUT', '#ff8a8a', why || '');
  else if (after > before) this.banner('A LAMP OF DUNMERE IS LIT AGAIN', '#f2c94c', why || '');
};
GG.spawnVillagers = function () {
  const m = this.map; this.npcs = [];
  const n = Math.round(2 + this.world.pop / 12);
  const kinds = ['vill1', 'vill2', 'vill3', 'miner'];
  for (let i = 0; i < n; i++) {
    const p = { x: (3 + AH.rand.int(0, 40)) * AH.T, y: (12 + AH.rand.int(0, 3)) * AH.T + 8 };
    this.npcs.push({ kind: 'villager', spr: AH.SPR[kinds[i % 4]], x: p.x, y: p.y, wa: 0, t: 0, face: 1, line: AH.rand.int(0, AH.RUMORS.length - 1) });
  }
  // shopkeepers stand at their doors
  for (const b of m.buildings) if (b.npc) this.npcs.push({ kind: 'keeper', role: b.id, spr: AH.SPR[b.npc], x: b.door.x * AH.T + 8 + 18, y: b.door.y * AH.T + 12, face: -1, fixed: 1 });
};

GG.enterMine = function (floor, mode) {
  if (this.scene === 'mine') this.buryDead();
  for (const p of this.players) { p.swUsed = false; p.mTarget = p.mInter = p.mDest = null; p.mPath = null; }
  this.mode = mode || this.mode || 'story';
  this.scene = 'mine'; this.resetActors();
  this.floorNo = floor;
  const W = this.world; W.visits = (W.visits || 0) + 1;
  let seed;
  if (this.mode === 'time') seed = AH.hashStr('daily' + new Date().toISOString().slice(0, 10)) + floor * 7919;
  else seed = (W.seed ^ (floor * 2654435761) ^ (W.visits * 40503)) >>> 0;
  const rng = AH.mulberry(seed);
  const isBoss = floor % 10 === 0;
  this.event = null;
  if (!isBoss && floor > 3 && rng() < 0.3) this.event = rng.weighted(AH.EVENTS, 'w').id;
  if (this.netEventSeed) this.netEventSeed(seed, floor, this.event);
  this.map = AH.genFloor(seed, floor, this.event);
  AH.renderMap(this.map);
  if (this.mode !== 'time') for (const g of (W.graves || []).filter(g => g.f === floor)) {
    const rooms = this.map.rooms.filter(r => r !== this.map.startRoom); const r = AH.rand.pick(rooms.length ? rooms : this.map.rooms);
    const pos = this.map.randomFloorIn(r, AH.rand); this.map.props.push({ type: 'grave', x: pos.x, y: pos.y, g });
    const owner = g.items && this.players.find(p => p.ch.created === g.owner);
    if (owner) this.toast(owner, 'YOUR GRAVE IS ON THIS FLOOR', '#f2c94c');
  }
  this.mapSeed = seed;
  const sp = this.map.spawn;
  this.players.forEach((p, i) => { p.x = sp.x + i * 10 - 8; p.y = sp.y; this.placeSafe(p); p.dead = false; if (p.hp <= 0) p.hp = p.S.hp * 0.5; });
  this.pets.forEach(pt => { pt.x = pt.owner.x - 8; pt.y = pt.owner.y + 6; pt.warned = new Set(); });
  // record depth / lifts
  for (const p of this.players) {
    if (floor > p.ch.deepest && this.mode === 'story') { p.ch.deepest = floor; }
    if (floor % 5 === 0 && p.ch.lifts.indexOf(floor) < 0 && this.mode !== 'time') { p.ch.lifts.push(floor); if (!p.remote) this.toast(p, 'LIFT UNLOCKED: FLOOR ' + floor, '#f2c94c'); }
  }
  this.lampMult = 1 + (8 - this.lampsLit()) * 0.04;
  AH.spawnFloorEnemies(this, rng);
  for (const e of this.enemies) { e.maxHp = Math.round(e.maxHp * this.lampMult); e.hp = e.maxHp; }
  // legendary beast
  this.legendHere = null;
  const forced = (W.active || []).find(b => b.type === 'legend' && floor >= b.fmin && floor <= b.fmax && !b.done);
  const pool = AH.LEGENDS.filter(L => floor >= L.minF && floor >= 6);
  if (!isBoss && pool.length && (forced || rng() < 0.045)) {
    const L = forced ? AH.LEGENDS.find(x => x.name === forced.target) : rng.pick(pool);
    const room = this.map.stairsRoom;
    const pos = this.map.randomFloorIn(room, rng);
    this.legendHere = AH.spawnLegend(this, L, pos.x, pos.y);
  }
  // nemesis
  const nem = (W.nemeses || []).find(n => floor >= n.floor - 2 && !n.dead);
  if (!isBoss && nem && rng() < 0.35) {
    const r = rng.pick(this.map.rooms.filter(r => r !== this.map.startRoom)) || this.map.stairsRoom;
    const pos = this.map.randomFloorIn(r, rng);
    this.nemesisHere = AH.spawnNemesis(this, nem, pos.x, pos.y);
    this.banner(nem.name + ' HAS FOUND YOU', '#e05a5a', 'YOUR NEMESIS RETURNS');
  } else this.nemesisHere = null;
  // boss
  this.bossSpawned = false; this.bossDead = false;
  const beaten = isBoss && this.mode === 'story' && floor < 100 && (W.bossKills || {})[floor];
  if (isBoss && !beaten) this.map.stairs.locked = true;
  if (beaten) { this.bossSpawned = true; this.bossDead = true; this.map.stairs.locked = false; }
  // event setup
  this.eventT = 0;
  if (this.event === 'goldrat') { const r = rng.pick(this.map.rooms); const pos = this.map.randomFloorIn(r, rng); const def = { name: 'GOLDEN RAT', spr: 'rat', pal: { r: '#f2c94c', R: '#a8823a', p: '#fff2a8' }, ai: 'flee', hp: 30, dmg: 1, spd: 2.2, xp: 40 }; const e = new AH.Enemy(def, pos.x, pos.y, floor, { players: this.players.length, noHide: true }); e.goldrat = true; e.fleeT = 30; this.enemies.push(e); }
  if (this.event === 'merchant') { const r = rng.pick(this.map.rooms.filter(x => x !== this.map.startRoom)) || this.map.startRoom; const pos = this.map.randomFloorIn(r, rng); this.npcs.push({ kind: 'merchant', spr: AH.recolor(AH.SPR.keeper, { s: '#2a2438', S: '#16121e', h: '#5a5262', a: '#3a2e4a' }), x: pos.x, y: pos.y, face: 1, fixed: 1, stock: this.merchantStock(rng) }); }
  if (this.event === 'collapse') this.collapseT = 80;
  const rescue = (W.active || []).find(b => b.type === 'rescue' && b.floor === floor && !b.done);
  if (rescue) { const r = this.map.stairsRoom; const pos = this.map.randomFloorIn(r, rng); this.npcs.push({ kind: 'lost', spr: AH.SPR.miner, x: pos.x + 20, y: pos.y, face: -1, fixed: 1, bounty: rescue }); }
  // messages
  const b = this.map.biome;
  if (floor === 1 || (floor - 1) % 10 === 0) this.banner(b.name, '#6fd6e8', 'FLOOR ' + floor);
  if (floor === 6) this.banner('THE LAMPS OF THE MINE ARE OUT', '#ffb347', 'KEEP YOUR TORCH BURNING');
  if (this.event) { const ev = AH.EVENTS.find(x => x.id === this.event); this.banner(ev.name, '#f2d36a', ev.msg); }
  if (isBoss && !beaten) this.banner(floor === 100 ? 'THE HEART OF ASH' : 'A TERRIBLE PRESENCE STIRS NEARBY...', '#ff6a5a');
  for (const pt of this.pets) if (pt.kind === 'canary' && pt.active && this.legendHere) { this.toast(pt.owner, 'THE CANARY FALLS SILENT...', '#f8d83c'); AH.Audio.sfx('warn'); }
  AH.Audio.music(isBoss && !beaten ? 'boss' : 'mine');
  if (this.mode === 'time' && floor === 1) { this.runTimer = 0; }
  // bounty: delve
  this.questFloor(rng);
  this.bountyEvent('floor', floor);
  if (floor % 10 === 0 && floor > (this.world.deepDeed || 0)) { this.world.deepDeed = floor; this.deed('deep', floor); }
};
GG.merchantStock = function (rng) {
  const f = this.floorNo, st = [];
  for (let i = 0; i < 6; i++) { const it = AH.genItem(rng, f + 3, { mf: 120 }); st.push({ item: it, price: Math.round(AH.itemValue(it) * 3.2) }); }
  st.push({ item: AH.genRune(rng, f), price: 120 + f * 4 });
  st.push({ item: AH.makeCons('potion', 3), price: 90 });
  return st;
};
GG.nextFloor = function () {
  if (this.mode === 'story' && this.floorNo === 100) return;
  AH.Audio.sfx('stairs');
  this.enterMine(this.floorNo + 1, this.mode);
};
GG.leaveMine = function (why) {
  if (why !== 'death') {
    const W = this.world;
    for (const p of this.players) if (p.ch.deepest > (p.ch.lastTrustDepth || 0)) { const gain = Math.min(10, Math.floor((p.ch.deepest - (p.ch.lastTrustDepth || 0)) / 3) + 1); p.ch.lastTrustDepth = p.ch.deepest; this.changeTrust(gain, 'DUNMERE TAKES HEART'); }
  }
  this.enterTown(why === 'death' ? 'death' : 'return');
};

// ---------- interactions ----------
GG.findInteract = function (p) {
  let best = null, bd = 20;
  const cand = (obj, kind, x, y, label, r) => { const d = Math.hypot(p.x - x, p.y - y); if (d < (r || 20) && d < bd) { bd = d; best = { kind, obj, label, x, y }; } };
  const m = this.map; if (!m) return null;
  if (this.scene === 'mine') {
    if (!m.stairs.locked) cand(m.stairs, 'stairs', m.stairs.x, m.stairs.y + 2, this.mode === 'story' && this.floorNo === 100 ? '' : 'DESCEND', 18);
    cand(m.rope, 'rope', m.rope.x, m.rope.y + 6, m.hasLift ? 'LIFT TO TOWN' : 'CLIMB TO TOWN', 16);
    for (const pr of m.props) {
      if (pr.type === 'chest' && !pr.open) cand(pr, 'chest', pr.x, pr.y, 'OPEN');
      else if (pr.type === 'tablet') cand(pr, 'tablet', pr.x, pr.y, 'READ');
      else if (pr.type === 'shrine' && !pr.used) cand(pr, 'shrine', pr.x, pr.y, 'PRAY');
      else if (pr.type === 'grave') cand(pr, 'grave', pr.x, pr.y + 2, pr.g.items && pr.g.owner === p.ch.created ? 'RECLAIM YOUR GEAR' : 'READ', 18);
      else if (pr.type === 'qitem' && !pr.taken) cand(pr, 'qitem', pr.x, pr.y, 'TAKE', 18);
    }
    for (const n of this.npcs) cand(n, n.kind, n.x, n.y, n.kind === 'merchant' ? 'TRADE' : 'HELP', 22);
  } else if (this.scene === 'town') {
    for (const b of m.buildings) if (b.door) cand(b, 'door', b.door.x * AH.T + 8, b.door.y * AH.T + 8, b.name, 18);
    cand(m.board, 'board', m.board.x, m.board.y + 6, 'BOUNTIES', 20);
    cand(m.stash, 'stash', m.stash.x, m.stash.y + 6, 'STASH', 18);
    cand(m.well, 'well', m.well.x, m.well.y + 6, 'WISH (5G)', 18);
    cand(m.mine, 'mine', m.mine.x + 8, m.mine.y, 'ENTER MINE', 26);
    for (const n of this.npcs) cand(n, n.kind === 'keeper' ? 'door' : 'talk', n.x, n.y, n.kind === 'keeper' ? '' : 'TALK', 16);
  }
  if (best && best.kind === 'door' && best.obj.kind === 'keeper') { const b = m.buildings.find(b => b.id === best.obj.role); best = { kind: 'door', obj: b, label: b.name, x: best.x, y: best.y }; }
  return best;
};
GG.interact = function (p, it) {
  if (p.remote && !this.isHost) return;
  if (p.remote && ['door', 'stash', 'talk', 'well', 'board', 'mine', 'merchant'].indexOf(it.kind) >= 0) return;
  const o = it.obj;
  switch (it.kind) {
    case 'stairs': if (this.mode === 'story' && this.floorNo === 100) return; this.nextFloor(); break;
    case 'rope': if (p.remote) { this.toast(p, 'THE HOST DECIDES WHEN TO LEAVE', '#a39bb0'); break; } this.openMenu('rope', p); break;
    case 'chest': this.openChest(p, o); break;
    case 'tablet': AH.Audio.sfx('magic'); this.banner('RUNE TABLET', '#6fd6e8', AH.LORE[o.lore]); if (!o.read) { o.read = 1; p.gainXp(this, 10 + this.floorNo * 2); } break;
    case 'shrine': this.useShrine(p, o); break;
    case 'grave': if (o.g.items && o.g.owner === p.ch.created) this.reclaimGrave(p, o.g); else this.openMenu('grave', p, { g: o.g }); break;
    case 'qitem': o.taken = true; AH.Audio.sfx('legend'); this.toast(null, o.item, '#c8a0ff'); this.questEvent('pickup', o.quest); break;
    case 'merchant': this.openMenu('merchant', p, { npc: o }); break;
    case 'lost': this.rescue(p, o); break;
    case 'door': AH.Audio.sfx('door'); this.openMenu(o.id, p); break;
    case 'board': this.openMenu('bounty', p); break;
    case 'stash': this.openMenu('stash', p); break;
    case 'mine': this.openMenu('minesel', p); break;
    case 'well':
      if (p.ch.gold < 5) { this.toast(p, 'NOT ENOUGH GOLD', '#ff8a8a'); return; }
      p.ch.gold -= 5; AH.Audio.sfx('coin');
      if (AH.rand() < 0.12) { p.buffs.luck = 600; this.toast(p, 'THE WELL SPARKLES. YOU FEEL LUCKY!', '#f2c94c'); } else this.toast(p, 'PLOP.', '#a39bb0');
      break;
    case 'talk': AH.Audio.sfx('select'); o.say = this.villagerLine(o); o.sayUntil = this.time + 5; o.line = (o.line + 1) % AH.RUMORS.length; break;
  }
};
GG.openChest = function (p, c) {
  if (c.mimic) {
    c.open = true; c.type = 'gone';
    const def = { name: 'MIMIC', spr: 'mimic', pal: {}, ai: 'chase', hp: 60, dmg: 14, spd: 1.2, xp: 30 };
    const e = new AH.Enemy(def, c.x, c.y, this.floorNo, { elite: ['vampiric'], hpMult: 2, players: this.players.length, aggro: true, noHide: true });
    e.mimic = true; this.enemies.push(e);
    this.banner('IT WAS A MIMIC!', '#ff6a5a'); AH.Audio.sfx('warn'); return;
  }
  c.open = true; AH.Audio.sfx('loot');
  for (const q of this.players) {
    const mf = q.S.mf + (c.rare ? 120 : 20) + (q.buffs.luck > 0 ? 100 : 0);
    const early = this.floorNo <= 10;
    const n = c.rare ? (early ? 1 : 2) : (AH.rand() < (early ? 0.55 : 0.8) ? 1 : 0);
    for (let k = 0; k < n; k++) this.dropItem(c.x, c.y + 4, AH.genItem(AH.rand, this.floorNo, { mf }), q.pid);
    this.dropGold(c.x, c.y + 4, (5 + this.floorNo * 2) * (c.rare ? 3 : 1) * (n ? 1 : 1.8) * (1 + q.S.gold / 100), q.pid);
    if (AH.rand() < 0.3) this.dropItem(c.x, c.y + 4, AH.makeCons(AH.rand.pick(['potion', 'torch', 'murky', 'bomb', 'idscroll'])), q.pid);
    if (AH.rand() < 0.12) this.dropItem(c.x, c.y + 4, AH.genRune(AH.rand, this.floorNo), q.pid);
  }
};
GG.useShrine = function (p, s) {
  s.used = true; AH.Audio.sfx('holy');
  const r = AH.rand();
  const all = this.players;
  if (r < 0.2) { all.forEach(q => q.buffs.fury = 60); this.banner('SHRINE OF FURY', '#ff8a5a', 'YOU DEAL 30% MORE DAMAGE FOR A MINUTE'); }
  else if (r < 0.4) { all.forEach(q => { q.hp = q.S.hp; q.mp = q.S.mp; q.torch = 100; }); this.banner('SHRINE OF RENEWAL', '#8ae08e', 'LIFE, MANA AND TORCH RESTORED'); }
  else if (r < 0.55) { all.forEach(q => q.buffs.luck = 120); this.banner('SHRINE OF FORTUNE', '#f2c94c', 'BETTER LOOT FOR TWO MINUTES'); }
  else if (r < 0.7) { all.forEach(q => q.buffs.haste = 60); this.banner('SHRINE OF THE WIND', '#9ec0ff', 'YOU MOVE FASTER'); }
  else if (r < 0.85) { all.forEach(q => q.gainXp(this, AH.xpNeed(q.ch.level) * 0.25)); this.banner('SHRINE OF WISDOM', '#d890ff', 'EXPERIENCE FLOWS INTO YOU'); }
  else { this.banner('A CURSED SHRINE!', '#e05a5a', 'THE DEAD ANSWER YOUR PRAYER'); const pool = AH.biomeCreaturesFor(this.floorNo); for (let k = 0; k < 5; k++) { const a = k * 1.25; const e = new AH.Enemy(AH.rand.pick(pool), s.x + Math.cos(a) * 40, s.y + Math.sin(a) * 30, this.floorNo, { aggro: true, players: this.players.length }); if (!this.map.blocked(e.x, e.y, 4)) this.enemies.push(e); } }
};
GG.rescue = function (p, n) {
  this.npcs.splice(this.npcs.indexOf(n), 1);
  n.bounty.done = true;
  this.banner('MINER RESCUED!', '#8ae08e', 'CLAIM YOUR REWARD AT THE BOUNTY BOARD');
  AH.Audio.sfx('holy');
};

// ---------- kills, death, nemesis ----------
GG.onEnemyKilled = function (e, by) {
  const near = this.players.filter(p => !p.dead && AH.dist(p, e) < 260);
  for (const p of (near.length ? near : this.players)) {
    p.gainXp(this, e.xp / Math.max(1, near.length * 0.7));
    if (p.S.powers.has('thirst')) p.mp = Math.min(p.S.mp, p.mp + 4);
    if (!e.minion || Math.random() < 0.35) this.rollLoot(e.x, e.y, e, p);
    p.ch.kills++; p.ch.bestiary[e.def.name] = (p.ch.bestiary[e.def.name] || 0) + 1;
    if (p.remote) this.netEvent('kill', p, e.def.name);
  }
  if (by && by.S && by.S.powers.has('killboom')) this.explosion(e.x, e.y, 24, by.rollDamage(0.6, { noCrit: true }).dmg, 'player', false, by);
  if (e.goldrat) { for (const p of this.players) this.dropGold(e.x, e.y, (30 + this.floorNo * 8) * 5, p.pid); this.banner('YOU CAUGHT THE GOLDEN RAT!', '#f2c94c'); }
  if (e.legend && !e.boss) { this.banner(e.name + ' IS SLAIN!', '#ff9a3e', e.title || ''); this.changeTrust(4); }
  if (e.nemesis) { e.nemesis.dead = true; this.banner('NEMESIS DEFEATED!', '#f2c94c', e.name); this.changeTrust(6, 'THE TOWN SLEEPS EASIER'); }
  if (e.boss) {
    this.bossDead = true; this.map.stairs.locked = false;
    if (this.mode === 'story') { this.world.bossKills = this.world.bossKills || {}; this.world.bossKills[this.floorNo] = 1; }
    if (this.floorNo === 100 && this.mode === 'story') { this.victory(); }
    else { this.banner(e.name + ' FALLS!', '#ff9a3e', 'THE WAY DOWN IS OPEN'); this.changeTrust(8); }
    if (this.mode === 'time' && this.floorNo === 10) this.finishTimeAttack();
  }
  this.bountyEvent('kill', e);
  this.questEvent('kill', e);
  if (e.boss) this.deed('boss', e.name); else if (e.legend && !e.questFoe) this.deed('legend', e.name);
  if (e.nemesis) this.deed('nemesis', e.name);
};
GG.playerDown = function (p, src) {
  p.dead = true; p.state = 'dead'; p.reviveT = 0;
  AH.fx.burst(this, p.x, p.y - 8, p.spr[0], 1);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; this.fx.push({ k: 'smoke', x: p.x + Math.cos(a) * 4, y: p.y - 6 + Math.sin(a) * 3, vx: Math.cos(a) * 18, vy: Math.sin(a) * 10 - 8, r: 3 + (k % 3), life: 0.9, max: 0.9 }); }
  AH.Audio.sfx('boom');
  if (this.scene === 'mine' && this.mode !== 'time' && this.world) {
    const w = p.weapon ? p.weapon() : null;
    const rec = { f: this.floorNo, x: Math.round(p.x), y: Math.round(p.y), name: p.ch.name, cls: p.ch.cls, lvl: p.ch.level, by: src && src.name ? src.name : '', day: this.world.day || 1, hp: p.S.hp, armor: p.S.armor, crit: Math.round(p.S.crit), dmg: w && w.dmg ? w.dmg[0] + '-' + w.dmg[1] : '1-3', wpn: w ? w.name : 'FISTS', biome: this.map && this.map.biome ? this.map.biome.name : '' };
    const W = this.world; W.graves = W.graves || []; W.graves.push(rec); while (W.graves.length > 40) { const i = W.graves.findIndex(g => !g.items); if (i < 0) break; W.graves.splice(i, 1); }
    p.graveRec = rec;
  }
  this.toast(null, p.ch.name + ' HAS FALLEN!', '#ff6a5a');
  if (src && src.def && !src.minion && !src.goldrat) this.lastKiller = src;
  if (this.players.every(q => q.dead)) setTimeout(() => this.allDead(), 1600);
};
// Diablo-style: on a final death everything the hero carries goes into the grave
GG.buryGear = function (p) {
  const rec = p.graveRec; p.graveRec = null;
  if (!rec || this.mode === 'time' || p.ch.hardcore) return;
  const eq = {}; let n = 0;
  for (const s of AH.EQUIP_SLOTS) if (p.ch.equip[s]) { eq[s] = p.ch.equip[s]; p.ch.equip[s] = null; n++; }
  const bag = p.ch.bag.filter(Boolean); n += bag.length;
  p.ch.bag = new Array(p.ch.bag.length).fill(null);
  if (!n) return;
  rec.items = { equip: eq, bag }; rec.owner = p.ch.created;
  if (p.remote && this.net && this.isHost) this.net.sendTo(p, { t: 'bury', f: rec.f });
  p.recalc(); p.hp = Math.min(p.hp, p.S.hp);
  this.toast(p, 'YOUR GEAR LIES IN YOUR GRAVE ON FLOOR ' + rec.f, '#ff8a8a');
};
GG.buryDead = function () { for (const p of this.players) if (p.dead) this.buryGear(p); };
GG.reclaimGrave = function (p, g) {
  const it = g.items; if (!it) return;
  if (p.remote && this.net && this.isHost) { for (const s in it.equip) this.netGive(p, it.equip[s]); for (const x of it.bag) this.netGive(p, x); g.items = null; g.owner = null; this.banner('GEAR RECOVERED', '#8ae08e', p.ch.name); return; }
  for (const s in it.equip) { const x = it.equip[s]; if (!p.ch.equip[s] || p.ch.equip[s].loaner) p.ch.equip[s] = x; else if (!p.addItem(x)) this.dropItem(p.x, p.y + 6, x, p.pid); }
  for (const x of it.bag) if (!p.addItem(x)) this.dropItem(p.x, p.y + 6, x, p.pid);
  g.items = null; g.owner = null;
  p.recalc(); this.onLocalEquip && this.onLocalEquip(p);
  AH.Audio.sfx('legend'); this.banner('GEAR RECOVERED', '#8ae08e', p.ch.name);
};
// the smith lends plain gear to heroes who lost theirs (worth nothing when sold)
GG.lendGear = function (p) {
  const C = AH.CLASSES[p.ch.cls], f = Math.max(1, Math.floor((p.ch.deepest || 1) * 0.7)), rng = AH.rand;
  const chest = { paladin: 'plate', rogue: 'leather', wizard: 'robe' }[p.ch.cls];
  const mk = base => { const it = AH.genItem(rng, f, { rarity: 0, base, noSet: true }); it.loaner = 1; it.req = null; return it; };
  if (!p.ch.equip.weapon) p.ch.equip.weapon = mk(C.start.weapon);
  if (C.start.off && !p.ch.equip.off) p.ch.equip.off = mk(C.start.off);
  if (!p.ch.equip.chest) p.ch.equip.chest = mk(chest);
  if (p.countCons('potion') < 3) p.addItem(AH.makeCons('potion', 3 - p.countCons('potion')));
  p.recalc(); this.onLocalEquip && this.onLocalEquip(p);
  AH.Audio.sfx('heavy'); this.toast(p, 'DORAN LENDS YOU SOME GEAR', '#f2c94c');
};
GG.allDead = function () {
  if (!this.players.every(q => q.dead)) return;
  const W = this.world;
  // nemesis
  const k = this.lastKiller;
  if (k && this.scene === 'mine' && this.mode !== 'time') {
    if (k.nemesis) { k.nemesis.rank++; k.nemesis.floor = this.floorNo; k.nemesis.title = AH.rand.pick(AH.NEMESIS_TITLES); this.banner(k.nemesis.name + ' GROWS STRONGER', '#e05a5a'); }
    else if (!k.boss && (W.nemeses || []).filter(n => !n.dead).length < 4) {
      const nm = (k.legend ? k.name : AH.rand.pick(['GRUK', 'MORL', 'VASH', 'SKREE', 'OLGRA', 'THRAX', 'NIBB', 'KORR', 'ZEL', 'URGOTH'])) + ' ' + AH.rand.pick(AH.NEMESIS_TITLES).split(' ')[0];
      const nem = { name: nm.replace(' DOOM', ' THE DOOM').replace(' NIGHTMARE', ' THE NIGHTMARE'), base: k.def.name, floor: this.floorNo, rank: 1, affixes: [AH.rand.pick(AH.ELITE_AFFIX).id], title: 'WHO KILLED ' + this.players[0].ch.name };
      W.nemeses = W.nemeses || []; W.nemeses.push(nem);
      this.banner('A NEMESIS IS BORN', '#e05a5a', nem.name + ' WILL REMEMBER YOU');
    }
  }
  this.lastKiller = null;
  this.changeTrust(-12, 'YOU WERE CARRIED BACK TO TOWN');
  for (const p of this.players) {
    p.ch.deaths++;
    const lost = Math.floor(p.ch.gold * 0.25); p.ch.gold -= lost;
    if (lost > 0 && !p.remote) this.toast(p, 'YOU LOST ' + lost + ' GOLD', '#ff8a8a');
    if (p.ch.hardcore) p.ch.dead = true;
  }
  const hc = this.players.filter(p => p.ch.hardcore && !p.remote);
  if (hc.length) {
    for (const p of hc) { const slots = AH.Save.load(); const i = slots.findIndex(s => s && s.ch && s.ch.created === p.ch.created); if (i >= 0) { slots[i].ch.dead = true; AH.Save.store(slots); } }
    if (hc.indexOf(this.players[0]) >= 0) { this.gameOver = { name: this.players[0].ch.name, floor: this.floorNo }; this.openMenu('gameover', this.players[0]); return; }
    for (const p of hc) this.removePlayer(p);
  }
  if (this.mode === 'time') this.toast(null, 'TIME ATTACK FAILED', '#ff8a8a');
  this.leaveMine('death');
};
GG.victory = function () {
  this.world.storyDone = true;
  for (const p of this.players) p.ch.storyDone = true;
  this.banner('ASHHEART IS SILENCED', '#f2c94c', 'DUNMERE IS SAFE. ENDLESS MODE UNLOCKED!');
  this.changeTrust(40, 'ALL LAMPS BURN BRIGHT');
  this.map.stairs.locked = true;
  setTimeout(() => this.openMenu('victory', this.players[0]), 3500);
};
GG.finishTimeAttack = function () {
  const t = this.runTimer;
  const key = new Date().toISOString().slice(0, 10);
  for (const p of this.players) { const b = p.ch.bestTimes[key]; if (!b || t < b) p.ch.bestTimes[key] = t; }
  this.banner('SPRINT COMPLETE: ' + AH.fmtTime(t), '#f2c94c', 'DAILY SEED ' + key);
  setTimeout(() => this.leaveMine('rope'), 4000);
};
AH.fmtTime = function (t) { const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t * 100) % 100); return m + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0'); };

// ---------- bounties ----------
GG.rollBounties = function () {
  const W = this.world; W.bountyDay = W.day;
  const rng = AH.mulberry(W.seed + W.day * 977);
  const deep = Math.max(1, ...this.players.map(p => p.ch.deepest || 1));
  const offers = [];
  for (let i = 0; i < 4; i++) {
    const r = rng();
    const fl = AH.clamp(deep + rng.int(-3, 6), 1, 120);
    if (r < 0.35) {
      const pool = AH.biomeCreaturesFor(Math.max(1, fl)); const c = rng.pick(pool); const n = rng.int(6, 14);
      offers.push({ id: AH.uid(), type: 'hunt', target: c.name, need: n, have: 0, reward: 20 + fl * 6 * n / 8, trust: 2, text: 'SLAY ' + n + ' ' + c.name });
    } else if (r < 0.6) {
      const pool = AH.LEGENDS.filter(L => L.minF <= fl + 4); if (!pool.length) { i--; continue; }
      const L = rng.pick(pool); const fmin = Math.max(L.minF, fl - 2), fmax = fmin + 6;
      offers.push({ id: AH.uid(), type: 'legend', target: L.name, fmin, fmax, reward: 120 + fmin * 20, trust: 6, text: 'WANTED: ' + L.name + ' (FLOORS ' + fmin + '-' + fmax + ')' });
    } else if (r < 0.78) {
      const f = AH.clamp(deep + rng.int(2, 6), 2, 120);
      offers.push({ id: AH.uid(), type: 'delve', floor: f, reward: 40 + f * 10, trust: 3, text: 'REACH FLOOR ' + f });
    } else if (r < 0.9) {
      const f = AH.clamp(deep + rng.int(-2, 3), 2, 100); if (f % 10 === 0) { i--; continue; }
      offers.push({ id: AH.uid(), type: 'rescue', floor: f, reward: 60 + f * 9, trust: 8, text: 'RESCUE A LOST MINER ON FLOOR ' + f });
    } else {
      const n = rng.int(6, 12);
      offers.push({ id: AH.uid(), type: 'gather', need: n, reward: n * 12, trust: 2, text: 'BRING ' + n + ' ORE TO THE SMITH' });
    }
  }
  W.bounties = offers;
};
GG.bountyEvent = function (kind, a) {
  const W = this.world; if (!W || !W.active) return;
  for (const b of W.active) {
    if (b.done) continue;
    if (kind === 'kill' && b.type === 'hunt' && a.def.name === b.target) { b.have++; if (b.have >= b.need) { b.done = true; this.banner('BOUNTY COMPLETE', '#f2c94c', b.text); } }
    if (kind === 'kill' && b.type === 'legend' && a.legend && a.name === b.target) { b.done = true; this.banner('BOUNTY COMPLETE', '#f2c94c', b.text); }
    if (kind === 'floor' && b.type === 'delve' && a >= b.floor) { b.done = true; this.banner('BOUNTY COMPLETE', '#f2c94c', b.text); }
  }
};

// ---------- companions ----------
GG.updatePets = function (dt) {
  for (const pt of this.pets) {
    if (!pt.active) continue;
    const o = pt.owner; pt.t += dt;
    if (pt.atk > 0) pt.atk -= dt;
    const follow = (dist, spd) => {
      const d = AH.dist(pt, o);
      if (d > 180) { pt.x = o.x - 8; pt.y = o.y + 4; return; }
      if (d > dist) { const a = Math.atan2(o.y - pt.y, o.x - pt.x); this.moveEntity(pt, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt, 3, pt.kind === 'canary'); pt.face = Math.cos(a) > 0 ? 1 : -1; pt.moving = true; } else pt.moving = false;
    };
    if (this.scene !== 'mine') { follow(18, 85); continue; }
    if (pt.kind === 'canary') {
      const tx = o.x + Math.sin(pt.t * 2) * 6 - o.face * 6, ty = o.y - 26 + Math.cos(pt.t * 3) * 2;
      pt.x = AH.lerp(pt.x, tx, dt * 5); pt.y = AH.lerp(pt.y, ty, dt * 5); pt.face = o.face;
      pt.warnT -= dt;
      if (pt.warnT <= 0) {
        const near = this.enemies.filter(e => !e.dead && !e.minion && AH.dist(e, o) < 125 && !pt.warned.has(e.id));
        if (near.length) {
          near.forEach(e => pt.warned.add(e.id));
          const hidden = near.filter(e => e.hidden).length;
          this.toast(o, near.length + (near.length > 1 ? ' ENEMIES' : ' ENEMY') + ' AHEAD!' + (hidden ? ' SOME ARE HIDING!' : ''), '#f8d83c');
          AH.Audio.sfx('chirp'); pt.warnT = 6; pt.chirp = 1.2;
        }
      }
      if (pt.chirp > 0) pt.chirp -= dt;
      continue;
    }
    if (pt.kind === 'dog') {
      if (pt.state === 'dig') {
        pt.digT -= dt; if (Math.floor(pt.digT * 8) % 2 === 0) AH.fx.dust(this, pt.x, pt.y, '#5a4e3a', 1);
        if (pt.digT <= 0) { pt.state = 'follow'; this.dogDig(pt); }
        continue;
      }
      const spot = this.map.props.find(p => p.type === 'dig' && !p.dug && AH.dist(p, pt) < 110);
      const foe = this.enemies.find(e => !e.dead && !e.hidden && AH.dist(e, o) < 60);
      if (foe) {
        const d = AH.dist(pt, foe);
        if (d > 10) { const a = Math.atan2(foe.y - pt.y, foe.x - pt.x); this.moveEntity(pt, Math.cos(a) * 110 * dt, Math.sin(a) * 110 * dt, 3); pt.face = Math.cos(a) > 0 ? 1 : -1; pt.moving = true; }
        else if (pt.atk <= 0) { pt.atk = 0.9; const dmg = (4 + o.ch.level * 1.8 + this.floorNo * 0.8) * (1 + o.S.pet / 100) * (o.S.powers.has('petfury') ? 3 : 1); foe.hurt(this, dmg, o, { color: '#c48c56' }); AH.Audio.sfx('bark'); }
      } else if (spot) {
        const d = AH.dist(pt, spot);
        if (d > 4) { const a = Math.atan2(spot.y - pt.y, spot.x - pt.x); this.moveEntity(pt, Math.cos(a) * 95 * dt, Math.sin(a) * 95 * dt, 3); pt.face = Math.cos(a) > 0 ? 1 : -1; pt.moving = true; }
        else { pt.state = 'dig'; pt.digT = 1.4; pt.spot = spot; spot.dug = true; AH.Audio.sfx('dig'); }
      } else follow(20, 95);
      continue;
    }
    if (pt.kind === 'rat') {
      const coin = this.drops.find(d => d.gold && (d.owner === o.pid || d.owner < 0) && AH.dist(d, pt) < 90 && !d.taken);
      const sec = this.map.secret && !this.map.secret.found && !this.map.secret.sniffed ? this.map.secret : null;
      if (coin) {
        const d = AH.dist(pt, coin);
        if (d > 3) { const a = Math.atan2(coin.y - pt.y, coin.x - pt.x); this.moveEntity(pt, Math.cos(a) * 120 * dt, Math.sin(a) * 120 * dt, 2); pt.face = Math.cos(a) > 0 ? 1 : -1; pt.moving = true; }
        else { coin.taken = true; o.ch.gold += coin.gold; AH.Audio.sfx('coin'); AH.fx.num(this, pt.x, pt.y - 10, '+' + coin.gold + 'G', '#f2c94c'); if (o.S.powers.has('goldheal')) o.heal(this, 2); }
      } else if (sec) {
        const wx = sec.wall[0] * AH.T + 8, wy = sec.wall[1] * AH.T + 14;
        if (AH.dist(o, { x: wx, y: wy }) < 110) {
          const d = Math.hypot(pt.x - wx, pt.y - wy);
          if (d > 8) { const a = Math.atan2(wy - pt.y, wx - pt.x); this.moveEntity(pt, Math.cos(a) * 80 * dt, Math.sin(a) * 80 * dt, 2); pt.face = Math.cos(a) > 0 ? 1 : -1; pt.moving = true; }
          else { sec.sniffed = true; this.toast(o, 'YOUR RAT SNIFFS A HOLLOW WALL! BREAK IT!', '#b8b0c4'); AH.Audio.sfx('squeak'); }
        } else follow(16, 100);
      } else follow(16, 100);
    }
  }
};
GG.dogDig = function (pt) {
  const o = pt.owner, s = pt.spot, r = AH.rand();
  AH.Audio.sfx('bark');
  if (r < 0.3) this.dropGold(s.x, s.y, (4 + this.floorNo * 2) * 2, o.pid);
  else if (r < 0.55) this.dropItem(s.x, s.y, AH.makeCons(AH.rand.pick(['ore', 'ore', 'gem', 'potion', 'torch', 'murky'])), o.pid);
  else if (r < 0.85) this.dropItem(s.x, s.y, AH.genItem(AH.rand, this.floorNo, { mf: o.S.mf + 60 }), o.pid);
  else if (r < 0.95) this.dropItem(s.x, s.y, AH.genRune(AH.rand, this.floorNo), o.pid);
  else { this.toast(o, 'THE DOG FOUND A BONE. GOOD BOY.', '#c48c56'); }
};
GG.updateAllies = function (dt) {
  for (const a of this.allies) {
    a.t -= dt; a.atk -= dt;
    const foe = this.nearestEnemy(a, 120);
    if (foe) {
      const d = AH.dist(a, foe);
      if (d > 10) { const an = Math.atan2(foe.y - a.y, foe.x - a.x); this.moveEntity(a, Math.cos(an) * 120 * dt, Math.sin(an) * 120 * dt, 3); a.face = Math.cos(an) > 0 ? 1 : -1; }
      else if (a.atk <= 0) { a.atk = 0.6; foe.hurt(this, a.owner.spellPower(5), a.owner, { color: '#9ad8f8' }); }
    } else if (AH.dist(a, a.owner) > 24) { const an = Math.atan2(a.owner.y - a.y, a.owner.x - a.x); this.moveEntity(a, Math.cos(an) * 110 * dt, Math.sin(an) * 110 * dt, 3); a.face = Math.cos(an) > 0 ? 1 : -1; }
  }
  this.allies = this.allies.filter(a => a.t > 0);
};

// ---------- main update ----------
GG.update = function (dt) {
  this.dt = dt; this.time += dt;
  if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeA = 0; }
  for (const t of this.toasts) t.t -= dt; this.toasts = this.toasts.filter(t => t.t > 0);
  for (const b of this.banners) b.t -= dt; this.banners = this.banners.filter(b => b.t > 0);
  if (this.scene === 'title') return;
  const menuPause = this.menu && !this.net;
  this.paused = !!menuPause;
  if (menuPause) return;
  // players
  for (const p of this.players) {
    const pad = this.padFor(p);
    p.update(this, dt, pad);
    if (p.whirl > 0) { p.whirl -= dt; p.whirlTick -= dt; if (p.whirlTick <= 0) { p.whirlTick = 0.18; p.hitList.clear(); this.meleeSwing(p, 0.7 * (1 + (p.ch.skills.whirl - 1) * 0.2), 24, Math.PI * 2, false); p.aim += 2; } }
    if (p.poison > 0) { p.poison -= dt; p.poisonT = (p.poisonT || 0) - dt; if (p.poisonT <= 0) { p.poisonT = 0.6; p.hurt(this, 1 + this.floorNo * 0.25, null, true); } }
  }
  this.updatePets(dt);
  if (this.scene === 'mine') {
    if (this.mode === 'time') this.runTimer = (this.runTimer || 0) + dt;
    for (const e of this.enemies) {
      if (e.ai === 'flee' && !e.dead) { this.updateFlee(e, dt); continue; }
      e.update(this, dt);
    }
    this.checkBossIntro(dt);
    this.enemies = this.enemies.filter(e => !e.dead && !e.gone);
    this.updateAllies(dt);
    this.updateProjs(dt);
    this.updateZones(dt);
    this.updateEvents(dt);
    // boss arena trigger
    if (this.map.arena && !this.bossSpawned && this.players.some(p => { const a = this.map.arena; return p.x > a.x * AH.T && p.x < (a.x + a.w) * AH.T && p.y > a.y * AH.T && p.y < (a.y + a.h) * AH.T + 4; })) {
      this.bossSpawned = true;
      const a = this.map.arena, cx = (a.x + a.w / 2) * AH.T, cy = (a.y + a.h / 3) * AH.T;
      if (this.floorNo % 100 === 0 && this.mode === 'story') { this.bossNow = AH.spawnAshheart(this, cx, cy); if (!this.bossNow.title) this.bossNow.title = 'THE BURNING DREAM'; }
      else { const L = AH.LEGENDS.find(l => l.name === AH.BOSSES[(Math.floor(this.floorNo / 10) - 1) % 9]); this.bossNow = AH.spawnLegend(this, L, cx, cy, { boss: true }); }
      AH.Audio.sfx('warn');
    }
  }
  if (this.scene === 'town') this.updateTown(dt);
  this.updateDrops(dt);
  // fx
  for (const f of this.fx) {
    f.life -= dt;
    if (f.k === 'px') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g || 0) * dt; }
    else if (f.k === 'num') { f.y += f.vy * dt; f.vy *= 0.92; }
    else if (f.k === 'tele' && f.life <= 0 && f.cb) { const cb = f.cb; f.cb = null; cb(); }
  }
  this.fx = this.fx.filter(f => f.life > 0);
  for (const l of this.flashLights) l.life -= dt; this.flashLights = this.flashLights.filter(l => l.life > 0);
  if (this.net && this.isHost) this.net.hostTick(dt);
};
GG.updateFlee = function (e, dt) {
  e.fleeT -= dt; if (e.flash > 0) e.flash -= dt;
  const T = e.target(this); if (!T) return;
  const a = Math.atan2(e.y - T.p.y, e.x - T.p.x) + Math.sin(this.time * 3) * 0.6;
  this.moveEntity(e, Math.cos(a) * e.spd * dt, Math.sin(a) * e.spd * dt, 3);
  e.face = Math.cos(a) > 0 ? 1 : -1;
  if (Math.random() < dt * 3) AH.fx.spark(this, e.x, e.y - 3, '#f2c94c', 1);
  if (e.fleeT <= 0) { e.gone = true; AH.fx.puff(this, e.x, e.y, '#f2c94c'); this.toast(null, 'THE GOLDEN RAT ESCAPED...', '#a39bb0'); }
};
GG.updateEvents = function (dt) {
  // first glittering rock: teach mining once
  if (this.scene === 'mine' && this.world && !this.world.tipVein && this.map && this.map.veins) {
    for (const p of this.players) if (!p.remote && !p.dead && this.map.veins.some(v => v.hp > 0 && Math.hypot(v.x - p.x, v.y - p.y) < 56)) {
      this.world.tipVein = 1; this.toast(p, AH.Mouse && AH.Mouse.active ? 'CLICK THE GLITTERING ROCK TO MINE ORE' : 'HIT THE GLITTERING ROCK TO MINE ORE', '#f2c94c'); break;
    }
  }
  if (this.event === 'collapse') {
    this.collapseT -= dt;
    this.rockT = (this.rockT || 0) - dt;
    if (this.rockT <= 0) {
      this.rockT = this.collapseT > 0 ? 1.4 : 0.5;
      const p = AH.rand.pick(this.players.filter(p => !p.dead)); if (p) { const x = p.x + AH.rand.range(-30, 30), y = p.y + AH.rand.range(-20, 20); this.telegraph(x, y, 14, 0.9, () => { this.explosion(x, y, 14, 10 + this.floorNo * 2.5, 'enemy'); AH.fx.dust(this, x, y, '#6a6276', 10); }); }
    }
  }
  if (this.event === 'gas' || (this.map.biome.hazard === 'gas' && this.floorNo % 3 === 0)) {
    this.gasT = (this.gasT || 4) - dt;
    if (this.gasT <= 0) { this.gasT = 5; const r = AH.rand.pick(this.map.rooms); const pos = this.map.randomFloorIn(r, AH.rand); this.addZone({ kind: 'gas', x: pos.x, y: pos.y, r: 28, t: 6, dps: 3 + this.floorNo * 0.6 }); }
  }
};
GG.updateTown = function (dt) {
  const W = this.world;
  W.hour += dt / 60; // 1 real minute = 1 hour
  if (W.hour >= 23.5) { W.hour = 23.5; }
  for (const n of this.npcs) {
    if (n.fixed) continue;
    n.t -= dt;
    if (n.t <= 0) { n.t = AH.rand.range(1.5, 4); n.wa = AH.rand() < 0.35 ? null : AH.rand() * Math.PI * 2; }
    if (n.wa !== null) { this.moveEntity(n, Math.cos(n.wa) * 18 * dt, Math.sin(n.wa) * 18 * dt, 4); n.face = Math.cos(n.wa) > 0 ? 1 : -1; n.walkT = (n.walkT || 0) + dt; }
  }
  // weather
  if (W.weather === 'storm') { this.lightningT = (this.lightningT || 6) - dt; if (this.lightningT <= 0) { this.lightningT = AH.rand.range(5, 12); this.lightning = 0.25; setTimeout(() => AH.Audio.sfx('thunder'), 400); } }
  if (this.lightning > 0) this.lightning -= dt;
};
