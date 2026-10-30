'use strict';
// A living Dunmere: the town grows, its people have names, wishes and friendships,
// they keep their own hours, leave when hope dies and come back when it returns. Now and then something happens.
(function () {
  const U = AH.UI, T = AH.T;
  const DAY = 864e5;

  // ---------- growth ----------
  AH.TOWN_LEVELS = [0, 30, 80, 160, 280, 450];
  AH.townLevel = W => { let l = 0; for (let i = 0; i < AH.TOWN_LEVELS.length; i++) if ((W && W.dev || 0) >= AH.TOWN_LEVELS[i]) l = i; return l; };
  AH.TOWN_GROWTH = ['A MINING CAMP', 'NEW HOMES ON THE EAST SIDE', 'THE JEWELER BUILDS HER SHOP', 'THE GAMBLING DEN OPENS', 'STONE HOUSES EVERYWHERE', 'THE GUILD HALL STANDS'];
  GG.addDev = function (n, why) {
    const W = this.world; if (!W || this.isRun()) return;
    const before = AH.townLevel(W); W.dev = (W.dev || 0) + n; const after = AH.townLevel(W);
    if (after > before) { this.banner('DUNMERE GROWS!', '#8ae08e', AH.TOWN_GROWTH[after]); AH.Audio.sfx('achieve'); this.changeTrust(5); }
  };
  AH.genTown = function () {
    const G = AH.game, W = G && G.world, lv = AH.townLevel(W);
    const WD = 76, H = 21, B = AH.TOWN_BASE;
    const m = new AH.Map(WD, H);
    m.town = true; m.level = lv;
    m.t.fill(AH.TILE.TREE);
    for (let y = B; y < 17; y++) for (let x = 1; x < WD - 1; x++) m.set(x, y, AH.TILE.ROAD);
    for (let y = 17; y < 19; y++) for (let x = 1; x < WD - 1; x++) m.set(x, y, AH.TILE.GRASS);
    const wallBy = (base, l1, l4) => lv >= 4 ? l4 : lv >= 1 ? l1 : base;
    m.buildings = [
      { id: 'house1', x: 1, w: 4, h: 4, roof: ['#56607e', '#343a52', '#7a84a4'], wall: wallBy('planks', 'timber', 'stone') },
      { id: 'smith', name: 'SMITH', x: 6, w: 7, h: 5, roof: ['#9a4234', '#5e2820', '#c05a44'], wall: 'stone', door: { x: 11, y: B }, npc: 'smith' },
      { id: 'store', name: 'STORE', x: 14, w: 5, h: 5, roof: ['#56607e', '#343a52', '#7a84a4'], wall: 'planks', door: { x: 17, y: B }, npc: 'herbal' },
      { id: 'inn', name: 'INN', x: 21, w: 7, h: 6, roof: ['#9a4234', '#5e2820', '#c05a44'], wall: 'inn', door: { x: 24, y: B }, npc: 'keeper' },
      { id: 'shrine', name: 'SHRINE', x: 30, w: 5, h: 6, roof: ['#6a6a7a', '#3a3a4a', '#9a9aaa'], wall: 'marble', door: { x: 32, y: B }, npc: 'priest' },
      { id: 'house2', x: 37, w: 4, h: 4, roof: ['#7a5a3a', '#4a3424', '#9a7a5a'], wall: wallBy('timber', 'timber', 'stone') },
      { id: 'house3', x: 42, w: 5, h: 4, roof: ['#9a4234', '#5e2820', '#c05a44'], wall: 'stone' },
    ];
    if (lv >= 1) m.buildings.push({ id: 'house4', x: 48, w: 4, h: 4, roof: ['#56607e', '#343a52', '#7a84a4'], wall: wallBy('planks', 'timber', 'stone') });
    if (lv >= 2) m.buildings.push({ id: 'jewel', name: 'JEWELER', x: 53, w: 5, h: 5, roof: ['#3a4a7a', '#22284a', '#5a6aa4'], wall: 'marble', door: { x: 55, y: B }, lit: 1 });
    if (lv >= 3) m.buildings.push({ id: 'gamble', name: 'DEN', x: 59, w: 5, h: 5, roof: ['#5a2a6a', '#341a40', '#7a4a8a'], wall: 'timber', door: { x: 61, y: B }, lit: 1 });
    if (lv >= 5) { const h3 = m.buildings.find(b => b.id === 'house3'); Object.assign(h3, { id: 'townbook', name: 'GUILD', roof: ['#3a6a4a', '#22402c', '#5a8a6a'], wall: 'marble', door: { x: 44, y: B }, lit: 1 }); }
    for (const b of m.buildings) b.y = B - b.h;
    m.mine = { x: 70 * T, y: B * T + 4 };
    m.well = { x: 26 * T + 8, y: 14 * T + 12 }; m.set(26, 14, AH.TILE.BUILD);
    m.board = { x: 29 * T + 4, y: 12 * T + 6 };
    m.stash = { x: 36 * T + 2, y: 12 * T + 6 };
    m.lamps = [[5.5, 11], [13.5, 11], [20, 11], [41.5, 11], [47.3, 11], [10, 16], [30, 16], [44, 16], [58.4, 11], [64.5, 11], [56, 16]].map(([x, y]) => ({ x: Math.round(x * T + 7), y: y * T + 6 }));
    const rng = AH.mulberry(77);
    m.trees = [];
    for (let x = 1; x < WD - 1; x += 2) m.trees.push({ x: x * T + rng.int(0, 12), y: 19 * T + rng.int(6, 12), s: rng.int(0, 2) });
    for (let x = 2; x < WD - 1; x += 2) m.trees.push({ x: x * T + rng.int(0, 12), y: 20 * T + rng.int(6, 16), s: rng.int(0, 2) });
    m.trees.sort((a, b) => a.y - b.y);
    m.spawn = { x: 24 * T + 8, y: 14 * T + 8 };
    m.mineSpawn = { x: 70 * T + 8, y: (B + 1) * T + 8 };
    return m;
  };
  // ---------- the people of Dunmere ----------
  AH.RESIDENTS = [
    { id: 'marta', name: 'MARTA', spr: 'vill1', job: 'THE BAKER', like: ['potion', 'mana', 'g_topaz'], lines: ['FRESH BREAD FOR THE BRAVE!', 'YOU LOOK THIN. EAT SOMETHING.', 'MY OVEN IS WARM BECAUSE OF YOU.', 'YOU ARE FAMILY NOW, HERO.'] },
    { id: 'odo', name: 'OLD ODO', spr: 'miner', job: 'A RETIRED MINER', like: ['ore', 'iron', 'silver', 'coal'], lines: ['IN MY DAY WE DUG WITH SPOONS.', 'THE DEEP HAS EYES, YOU KNOW.', 'YOU DIG LIKE MY FATHER DID.', 'TAKE MY LUCKY PICK. YOU EARNED IT.'] },
    { id: 'greta', name: 'GRETA', spr: 'vill2', job: 'THE SEAMSTRESS', like: ['g_ruby', 'g_amethyst', 'dust'], lines: ['MIND THE MUD ON MY STEPS.', 'THAT CLOAK NEEDS MENDING.', 'I SEWED YOUR NAME INTO A BANNER.', 'THE FINEST THREAD, ONLY FOR YOU.'] },
    { id: 'tomas', name: 'TOMAS', spr: 'vill3', job: 'THE GATE GUARD', like: ['torch', 'bomb', 'scrap'], lines: ['HALT. OH, IT IS YOU.', 'QUIET NIGHT. TOO QUIET.', 'IF THEY COME, WE STAND TOGETHER.', 'DUNMERE IS SAFE WITH YOU AROUND.'] },
    { id: 'ilka', name: 'ILKA', spr: 'vill1', job: 'THE HERB GIRL', like: ['murky', 'g_emerald', 'potion'], lines: ['DO YOU KNOW WHICH MUSHROOMS BITE?', 'I FOUND A BLUE FLOWER BY THE WELL!', 'MERA SAYS YOU ARE BRAVE.', 'I WANT TO BE LIKE YOU ONE DAY.'] },
    { id: 'viktor', name: 'VIKTOR', spr: 'vill3', job: 'A THIRSTY POET', like: ['goldore', 'g_sapphire', 'idscroll'], lines: ['A RHYME FOR A COIN?', 'THE MINE SINGS AT NIGHT. LISTEN.', 'I WROTE A BALLAD ABOUT YOU.', 'YOUR BALLAD IS SUNG IN THREE TOWNS!'] },
    { id: 'beno', name: 'BENO', spr: 'vill2', job: 'THE FISHERMAN', like: ['coal', 'mithril', 'g_diamond'], lines: ['NOTHING BITES IN THE CAVE LAKE.', 'I SAW A GLOWING FISH ONCE.', 'YOU BRING THE TOWN LUCK.', 'THE BIG ONE WAS NAMED AFTER YOU.'] },
    { id: 'hanna', name: 'HANNA', spr: 'vill1', job: 'THE MIDWIFE', like: ['potion', 'g_amethyst', 'shard'], lines: ['TWINS LAST NIGHT! LIFE GOES ON.', 'BE CAREFUL DOWN THERE.', 'THE CHILDREN PLAY "HERO" NOW.', 'A BABY WAS NAMED AFTER YOU.'] },
  ];
  AH.resDef = id => AH.RESIDENTS.find(r => r.id === id);
  AH.likes = (r, k) => r.like.some(l => k === l || (l.indexOf('g_') === 0 && k.indexOf(l + '_') === 0));
  GG.resState = function (id) { const W = this.world; W.res = W.res || {}; return W.res[id] = W.res[id] || { f: 0 }; };
  GG.residentsHere = function () {
    const W = this.world, gone = W.gone || [];
    const n = Math.min(AH.RESIDENTS.length, 2 + Math.floor((W.pop || 40) / 8));
    return AH.RESIDENTS.filter(r => gone.indexOf(r.id) < 0).slice(0, n);
  };
  const _vill = GG.spawnVillagers;
  GG.spawnVillagers = function () {
    _vill.call(this);
    if (!this.map || !this.map.town) return;
    const here = this.residentsHere();
    let i = 0;
    for (const n of this.npcs) {
      if (n.kind !== 'villager') continue;
      const r = here[i++]; if (!r) break;
      n.res = r.id; n.name = r.name; n.spr = AH.SPR[r.spr] || n.spr;
    }
    this.npcsAway = [];
    // vendors move into their own houses as the town grows
    const lv = this.map.level || 0;
    this.npcs = this.npcs.filter(n => !(n.kind === 'vendor' && ((n.role === 'jewel' && lv >= 2) || (n.role === 'gamble' && lv >= 3))));
    for (const b of this.map.buildings) if ((b.id === 'jewel' || b.id === 'gamble') && b.door) this.npcs.push({ kind: 'vendor', role: b.id, spr: b.id === 'jewel' ? AH.SPR.jeweler : AH.SPR.gambler, x: b.door.x * T + 8 + 18, y: b.door.y * T + 12, face: -1, fixed: 1 });
    // a traveling trader on trader days
    const W = this.world;
    if (W.tevent === 'trader' && W.teventDay === W.day) {
      const rng = AH.mulberry(W.seed + W.day * 71);
      if (!W.traderStock || W.traderDay !== W.day) { const f0 = this.floorNo; this.floorNo = Math.max(5, ...this.players.map(p => p.ch.deepest || 1)); W.traderStock = this.merchantStock(rng); this.floorNo = f0; W.traderDay = W.day; }
      this.npcs.push({ kind: 'vendor', role: 'trader', spr: AH.recolor(AH.SPR.keeper, { s: '#2a2438', S: '#16121e', h: '#5a5262', a: '#3a2e4a' }), x: 33 * T + 8, y: 15 * T + 8, face: -1, fixed: 1, stock: W.traderStock });
    }
    // statues of the legends, around the well
    const L = (AH.options && AH.options.legends) || [];
    L.slice(-6).forEach((lg, k) => {
      const sx = 26 * T + 8 + [-34, 34, -52, 52, -70, 70][k], sy = 15 * T + 10;
      this.npcs.push({ kind: 'statue', legend: lg, spr: AH.statueSprite(lg.cls), x: sx, y: sy, face: k % 2 ? -1 : 1, fixed: 1 });
    });
  };
  // a hero turned to stone
  const statueCache = {};
  AH.statueSprite = function (cls) {
    if (statueCache[cls]) return statueCache[cls];
    const P = new AH.Player(0, AH.newCharacter(cls, 'X', 'dog'), null), s = P.spr[0];
    const W = s.w, H = s.h + 4;
    const mk = flip => {
      const c = AH.makeCanvas(W, H), x = c.getContext('2d');
      x.drawImage(flip ? s.cf : s.c, 0, 0);
      const d = x.getImageData(0, 0, W, H);
      for (let i = 0; i < d.data.length; i += 4) { if (!d.data[i + 3]) continue; const g = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11); const v = Math.round(70 + g * 0.55); d.data[i] = v; d.data[i + 1] = v; d.data[i + 2] = Math.round(v * 1.06); }
      x.putImageData(d, 0, 0);
      x.fillStyle = AH.OUT; x.fillRect(1, H - 5, W - 2, 5); x.fillStyle = '#6a6474'; x.fillRect(2, H - 4, W - 4, 3); x.fillStyle = '#8a8494'; x.fillRect(2, H - 4, W - 4, 1);
      return c;
    };
    return statueCache[cls] = { w: W, h: H, c: mk(false), cf: mk(true) };
  };
  // night: people go home; evening: they gather by the inn
  const _townUpd = GG.updateTown;
  GG.updateTown = function (dt) {
    _townUpd.call(this, dt);
    const W = this.world, h = W.hour;
    const night = h >= 22.5 || h < 6;
    this.npcsAway = this.npcsAway || [];
    if (night) { const go = this.npcs.filter(n => n.kind === 'villager' && n.res !== 'tomas'); if (go.length) { this.npcsAway.push(...go); this.npcs = this.npcs.filter(n => go.indexOf(n) < 0); } }
    else if (this.npcsAway.length) { this.npcs.push(...this.npcsAway); this.npcsAway = []; }
    if (h >= 19 && !night) for (const n of this.npcs) if (n.kind === 'villager' && n.res) {
      const tx = 24 * T + 8 + ((n.res.charCodeAt(0) * 7) % 40) - 20, ty = 13 * T + 8 + (n.res.charCodeAt(1) % 12);
      const d = Math.hypot(tx - n.x, ty - n.y); if (d > 6) { n.wa = Math.atan2(ty - n.y, tx - n.x); } else n.wa = null;
    }
  };
  // talking to a named villager opens their little window
  const _inter = GG.interact;
  GG.interact = function (p, it) {
    if (it && it.kind === 'talk' && it.obj && it.obj.res && !p.remote) { AH.Audio.sfx('select'); this.openMenu('resident', p, { npc: it.obj }); return; }
    if (it && it.kind === 'vendor' && it.obj.role === 'trader') { if (p.remote) return; this.openMenu('merchant', p, { npc: it.obj }); return; }
    if (it && it.kind === 'vendor' && it.obj.role === 'guildhall') { this.openMenu('townbook', p); return; }
    _inter.call(this, p, it);
  };
  const _find = GG.findInteract;
  GG.findInteract = function (p) {
    const best = _find.call(this, p);
    if (best && best.kind === 'talk' && best.obj && best.obj.res) best.label = 'TALK TO ' + best.obj.name;
    if (best && best.kind === 'vendor' && best.obj.role === 'trader') best.label = 'TRADE';
    if (this.scene === 'town') for (const n of this.npcs) if (n.kind === 'statue' && Math.hypot(p.x - n.x, p.y - n.y) < 16 && (!best || Math.hypot(p.x - best.x, p.y - best.y) > 12)) {
      if (!n.spoke || this.time - n.spoke > 6) { n.spoke = this.time; n.say = AH.tr('HERE STANDS') + ' ' + n.legend.name + ', ' + AH.tr(AH.CLASSES[n.legend.cls].name) + ' ' + AH.tr('LV ' + n.legend.level) + '. ' + AH.tr(AH.rand.pick(['THE DEEP REMEMBERS.', 'STILL WATCHING OVER DUNMERE.', 'A LEGEND OF THE ' + AH.tr(AH.Season ? AH.Season.name(n.legend.season) : '') + '.'])); n.sayUntil = this.time + 4; }
    }
    return best;
  };

  // ---------- tasks the people give ----------
  GG.makeTask = function (r) {
    const W = this.world, rng = AH.mulberry(W.seed + W.day * 131 + r.id.charCodeAt(0) * 17);
    const deep = Math.max(1, ...this.players.map(p => p.ch.deepest || 1));
    const t = rng();
    if (t < 0.35) { const k = rng.pick(r.like.filter(l => AH.CONSUMABLES[l]) .concat([AH.oreForFloor(deep, rng())])); const n = AH.CONSUMABLES[k] && AH.CONSUMABLES[k].stack > 9 ? rng.int(4, 9) : rng.int(2, 3); return { type: 'bring', k, n, reward: 40 + deep * 6, text: 'BRING ME ' + n + ' ' + AH.CONSUMABLES[k].name }; }
    if (t < 0.7) { const c = rng.pick(AH.biomeCreaturesFor(Math.max(1, deep))); const n = rng.int(8, 16); return { type: 'slay', target: c.name, n, have: 0, reward: 50 + deep * 7, text: 'SLAY ' + n + ' ' + c.name }; }
    const f = AH.clamp(deep + rng.int(-4, 2), 2, 99); const what = rng.pick(['MY FATHER\'S PICKAXE', 'A SILVER LOCKET', 'MY LOST BOOK', 'GRANDMA\'S RING', 'A WOODEN TOY HORSE', 'MY LUCKY LANTERN']);
    return { type: 'relic', floor: f % 10 === 0 ? f + 1 : f, what, reward: 70 + deep * 8, text: 'FIND ' + what + ' ON FLOOR ' + (f % 10 === 0 ? f + 1 : f) };
  };
  const _killed = GG.onEnemyKilled;
  GG.onEnemyKilled = function (e, by) {
    _killed.call(this, e, by);
    const W = this.world; if (!W || !W.res || this.isRun()) return;
    for (const id in W.res) { const t = W.res[id].task; if (t && t.type === 'slay' && !t.done && e.def && e.def.name === t.target) { t.have++; if (t.have >= t.n) { t.done = true; this.toast(null, AH.tr('TASK DONE') + ': ' + AH.resDef(id).name, '#8ae08e'); } } }
    if (e.raider && this.enemies.filter(x => x.raider && !x.dead && x !== e).length === 0 && W.tevent === 'raid' && !W.raidDone) { W.raidDone = true; this.banner('THE RAID IS BROKEN!', '#8ae08e', 'DUNMERE CHEERS FOR YOU'); this.changeTrust(6); this.addDev(4); }
    if (e.boss && this.mode === 'story') { W.devBoss = W.devBoss || {}; if (!W.devBoss[this.floorNo]) { W.devBoss[this.floorNo] = 1; this.addDev(8); } }
  };
  // a relic lies on its floor; the raid waits at the mine's first steps
  const _enter = GG.enterMine;
  GG.enterMine = function (floor, mode) {
    _enter.call(this, floor, mode);
    const W = this.world; if (!W || this.isRun()) return;
    for (const id in (W.res || {})) {
      const t = W.res[id].task;
      if (t && t.type === 'relic' && !t.done && t.floor === floor) {
        const rooms = this.map.rooms.filter(r => r !== this.map.startRoom); const r = AH.rand.pick(rooms.length ? rooms : this.map.rooms);
        const pos = this.map.randomFloorIn(r, AH.rand);
        this.map.props.push({ type: 'qitem', x: pos.x, y: pos.y, item: t.what, quest: 'res:' + id });
        this.toast(null, AH.resDef(id).name + ': ' + AH.tr(t.what) + ' ' + AH.tr('IS ON THIS FLOOR'), '#c8a0ff');
      }
    }
    if (W.tevent === 'raid' && W.teventDay === W.day && !W.raidDone && !W.raidSpawned) {
      W.raidSpawned = true;
      const pool = AH.biomeCreaturesFor(floor), sp = this.map.spawn;
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2, x = sp.x + Math.cos(a) * 70, y = sp.y + Math.sin(a) * 50;
        const e = new AH.Enemy(AH.rand.pick(pool), x, y, floor, { elite: k < 2 ? [AH.rand.pick(AH.ELITE_AFFIX).id] : null, hpMult: k < 2 ? 2.2 : 1.2, players: this.players.length, aggro: true, noHide: true });
        e.raider = true; this.placeSafe(e); this.enemies.push(e);
      }
      this.banner('THE RAIDERS ARE HERE!', '#ff6a5a', 'BREAK THEM BEFORE THEY REACH DUNMERE');
    }
  };
  const _qev = GG.questEvent;
  GG.questEvent = function (kind, a) {
    if (kind === 'pickup' && typeof a === 'string' && a.indexOf('res:') === 0) {
      const id = a.slice(4), st = this.resState(id); if (st.task) { st.task.done = true; this.toast(null, AH.tr('TASK DONE') + ': ' + AH.resDef(id).name, '#8ae08e'); }
      return;
    }
    if (_qev) _qev.call(this, kind, a);
  };

  // ---------- days: people leave and return, things happen ----------
  const _newDay = GG.newDay;
  GG.newDay = function () {
    const W = this.world;
    if (W.tevent === 'raid' && W.teventDay === W.day && !W.raidDone) { this.changeTrust(-6, 'THE RAIDERS HIT THE FARMS'); }
    _newDay.call(this);
    W.gone = W.gone || [];
    W.lowDays = W.trust < 25 ? (W.lowDays || 0) + 1 : 0;
    const here = this.residentsHere();
    if (W.lowDays >= 2 && here.length > 3) {
      const r = here.slice().sort((a, b) => (this.resState(a.id).f) - (this.resState(b.id).f))[0];
      W.gone.push(r.id); W.lowDays = 0; W.news = { t: 'gone', id: r.id };
    } else if (W.trust > 70 && W.gone.length) { const id = W.gone.shift(); W.news = { t: 'back', id }; }
    else if (W.trust < 35) W.news = { t: 'worry' };
    // the day's happening
    const rng = AH.mulberry(W.seed + W.day * 4441), r = rng();
    W.tevent = W.day > 3 && r < 0.14 ? 'raid' : r < 0.29 ? 'trader' : r < 0.37 ? 'festival' : null;
    W.teventDay = W.day; W.raidDone = false; W.raidSpawned = false; W.eventShown = false;
  };
  const _town = GG.enterTown;
  GG.enterTown = function (why) {
    const W = this.world;
    if (this.townMap && this.townMap.level !== AH.townLevel(W)) this.townMap = null;
    _town.call(this, why);
    if (!W || this.isRun()) return;
    const N = W.news; W.news = null;
    if (N && N.t === 'gone') this.banner(AH.resDef(N.id).name + ' ' + AH.tr('HAS LEFT DUNMERE'), '#ff8a8a', 'THE TOWN HAS LOST HOPE');
    if (N && N.t === 'back') this.banner(AH.resDef(N.id).name + ' ' + AH.tr('IS BACK IN DUNMERE'), '#8ae08e', 'HOPE BRINGS PEOPLE HOME');
    if (N && N.t === 'worry') this.toast(null, 'PEOPLE ARE PACKING THEIR BAGS. THE TOWN NEEDS HOPE.', '#ff8a8a');
    if (W.teventDay === W.day && !W.eventShown && W.tevent) {
      W.eventShown = true;
      if (W.tevent === 'raid') this.banner('RAIDERS NEAR THE MINE!', '#ff6a5a', 'THEY WAIT ON THE NEXT FLOOR YOU ENTER');
      if (W.tevent === 'trader') this.banner('A TRAVELING TRADER IS IN TOWN', '#c8a0ff', 'RARE WARES, TODAY ONLY');
      if (W.tevent === 'festival') { this.banner('FESTIVAL IN DUNMERE!', '#f2c94c', 'CHEAPER PRICES AND A BLESSING FOR THE NEXT DIVE'); for (const p of this.players) { p.buffs.fury = Math.max(p.buffs.fury || 0, 300); p.buffs.luck = Math.max(p.buffs.luck || 0, 300); } }
    }
  };
  const _price = U.priceMul;
  U.priceMul = function (G) {
    let m = _price(G); const W = G.world;
    if (W && W.tevent === 'festival' && W.teventDay === W.day) m *= 0.8;
    // good friends talk the shopkeepers down
    if (W && W.res) { const best = Object.values(W.res).filter(s => s.f >= 50).length; m *= 1 - Math.min(0.1, best * 0.02); }
    return m;
  };
  // bounties claimed help the town grow
  const _bUp = U.update.bounty;
  U.update.bounty = function (G, m, dt) {
    const before = (G.world.active || []).length;
    const n0 = AH.Input.devices().some(id => AH.Input.pressed(id, 'y'));
    if (n0) { G.openMenu('townbook', m.p); return; }
    _bUp(G, m, dt);
    if ((G.world.active || []).length < before && m.p) G.addDev(2);
  };

  // ---------- a resident's window ----------
  U.init.resident = function (G, m) { m.sel = 0; m.r = AH.resDef(m.npc.res); m.st = G.resState(m.npc.res); m.say = U.resLine(G, m); };
  U.resTier = f => f >= 100 ? 3 : f >= 60 ? 2 : f >= 25 ? 1 : 0;
  U.resLine = (G, m) => m.r.lines[U.resTier(m.st.f)];
  U.resRows = function (G, m) {
    const st = m.st, t = st.task;
    return [{ id: 'talk', label: 'TALK' }, { id: 'gift', label: 'GIVE A GIFT', right: st.giftDay === G.world.day ? 'TOMORROW' : '' },
      { id: 'task', label: t ? (t.done ? 'TASK DONE - CLAIM' : AH.tr('TASK') + ': ' + AH.tr(t.text)) : 'ASK FOR A TASK', col: t && t.done ? '#8ae08e' : t ? '#c8a0ff' : undefined },
      { id: 'leave', label: 'GOODBYE' }];
  };
  U.update.resident = function (G, m, dt) {
    const p = m.p, st = m.st, r = m.r;
    if (m.mode === 'gift') {
      const items = p.ch.bag.map((it, i) => ({ it, i })).filter(x => x.it && x.it.kind === 'cons' && x.it.cons !== 'key');
      U.listUpdate(G, m, dt, items.length ? items : [{ none: 1 }], x => {
        if (x.none) return;
        const k = x.it.cons, liked = AH.likes(r, k);
        x.it.stack--; if (x.it.stack <= 0) p.ch.bag[x.i] = null;
        const before = U.resTier(st.f); st.f = Math.min(100, st.f + (liked ? 14 : 4)); st.giftDay = G.world.day;
        m.say = liked ? AH.tr('OH! I LOVE THESE! THANK YOU!') : AH.tr('THANK YOU, THAT IS KIND.');
        AH.Audio.sfx(liked ? 'levelup' : 'coin'); m.mode = null; m.sel = 0;
        U.resReward(G, m, before);
      }, () => { m.mode = null; m.sel = 1; });
      return;
    }
    U.listUpdate(G, m, dt, U.resRows(G, m), it => {
      if (it.id === 'leave') { G.closeMenu(); G.saveAll(); return; }
      if (it.id === 'talk') { if (!m.talked) { m.talked = 1; if (st.talkDay !== G.world.day) { st.talkDay = G.world.day; st.f = Math.min(100, st.f + 1); } } m.say = U.resLine(G, m) + (G.world.trust < 35 ? ' ' + AH.tr('BUT I AM SCARED. MANY ARE LEAVING.') : ''); return; }
      if (it.id === 'gift') { if (st.giftDay === G.world.day) { m.say = AH.tr('ONE GIFT A DAY IS PLENTY, DEAR.'); return; } m.mode = 'gift'; m.sel = 0; m.say = AH.tr('I LIKE') + ': ' + r.like.map(l => AH.tr(AH.CONSUMABLES[l] ? AH.CONSUMABLES[l].name : AH.GEMS[l.slice(2)] ? AH.GEMS[l.slice(2)].name : l)).join(', '); return; }
      if (it.id === 'task') {
        const t = st.task;
        if (!t) { if (st.taskDay === G.world.day) { m.say = AH.tr('NOTHING MORE TODAY. COME BACK TOMORROW.'); return; } st.task = G.makeTask(r); st.taskDay = G.world.day; m.say = AH.tr(st.task.text) + '.'; AH.Audio.sfx('select'); return; }
        if (t.type === 'bring' && !t.done) { if (p.countCons(t.k) >= t.n) { p.takeCons(t.k, t.n); t.done = true; } else { m.say = AH.tr('YOU STILL NEED') + ' ' + t.n + ' ' + AH.tr(AH.CONSUMABLES[t.k].name) + '.'; return; } }
        if (!t.done) { m.say = AH.tr('NOT YET? I AM STILL WAITING.'); return; }
        const before = U.resTier(st.f);
        p.ch.gold += Math.round(t.reward); st.f = Math.min(100, st.f + 18); st.task = null; G.changeTrust(2); G.addDev(3);
        m.say = AH.tr('YOU DID IT! HERE, TAKE THIS.') + ' (+' + Math.round(t.reward) + 'G)'; AH.Audio.sfx('legend');
        U.resReward(G, m, before);
      }
    }, () => { G.closeMenu(); G.saveAll(); });
  };
  U.resReward = function (G, m, before) {
    const after = U.resTier(m.st.f), p = m.p; if (after <= before) return;
    const f = Math.max(5, p.ch.deepest || 1);
    let it = null;
    if (after === 1) it = AH.rollGem(AH.rand, f + 10);
    if (after === 2) it = AH.genItem(AH.rand, f, { rarity: 2, mf: 200 });
    if (after === 3) it = AH.genItem(AH.rand, f + 3, { rarity: 3 });
    if (it) { if (!p.addItem(it)) G.dropItem(p.x, p.y + 8, it, p.pid); G.banner(m.r.name + ' ' + AH.tr(['', 'LIKES YOU', 'TRUSTS YOU', 'LOVES YOU LIKE FAMILY'][after]), '#f2c94c', AH.tr('A GIFT') + ': ' + AH.tr(it.name)); }
  };
  U.draw.resident = function (G, ctx, m) {
    U.bg(ctx);
    AH.frame(ctx, 4, 4, 140, 262); const s = m.npc.spr; AH.drawSpr(ctx, s, 74 - s.w * 2, 20, false, 4);
    AH.text(ctx, 74, 96, m.r.name, '#f2e3b3', { align: 'center' });
    AH.text(ctx, 74, 106, m.r.job, '#8d8494', { align: 'center' });
    // friendship hearts
    const f = m.st.f; for (let i = 0; i < 4; i++) { const on = f >= (i + 1) * 25, x = 46 + i * 14, y = 120; ctx.fillStyle = on ? '#e0304a' : '#3a2a32'; ctx.fillRect(x, y + 1, 3, 2); ctx.fillRect(x + 4, y + 1, 3, 2); ctx.fillRect(x, y + 3, 7, 2); ctx.fillRect(x + 1, y + 5, 5, 1); ctx.fillRect(x + 2, y + 6, 3, 1); ctx.fillRect(x + 3, y + 7, 1, 1); }
    AH.text(ctx, 74, 132, AH.tr('FRIENDSHIP') + ' ' + f + '/100', '#c8a0a8', { align: 'center' });
    AH.wrap('"' + m.say + '"', 128).forEach((l, i) => AH.text(ctx, 74, 148 + i * 9, l, '#a39bb0', { align: 'center' }));
    if (m.mode === 'gift') {
      const items = m.p.ch.bag.filter(x => x && x.kind === 'cons' && x.cons !== 'key');
      AH.text(ctx, 160, 12, 'GIVE WHAT?', '#f2e3b3');
      U.list(ctx, items.length ? items.map(it => ({ label: it.name, right: 'X' + it.stack + (AH.likes(m.r, it.cons) ? '  ' + AH.tr('LIKES IT') : ''), rcol: AH.likes(m.r, it.cons) ? '#e0304a' : '#8d8494' })) : [{ label: 'NOTHING TO GIVE', disabled: true }], m.sel, 156, 28, 310, { lh: 12 });
      return;
    }
    U.list(ctx, U.resRows(G, m), m.sel, 156, 40, 314, { lh: 18 });
    const t = m.st.task;
    if (t && t.type === 'slay') AH.text(ctx, 160, 130, AH.tr('PROGRESS') + ': ' + t.have + '/' + t.n, '#9ec0ff');
    AH.wrap('FRIENDS GIVE GIFTS AT EVERY HEART, AND GOOD FRIENDS MAKE THE SHOPS CHEAPER.', 300).forEach((l, i) => AH.text(ctx, 312, 230 + i * 10, l, '#6f6880', { align: 'center' }));
  };

  // ---------- the town book: growth, people, legends, donations ----------
  U.init.townbook = function (G, m) { m.sel = 0; };
  U.tbRows = () => [{ id: 'd100', label: 'DONATE 100 GOLD', right: '+1' }, { id: 'd1000', label: 'DONATE 1000 GOLD', right: '+12' }, { id: 'back', label: 'BACK' }];
  U.update.townbook = function (G, m, dt) {
    U.listUpdate(G, m, dt, U.tbRows(), it => {
      if (it.id === 'back') { G.closeMenu(); return; }
      const n = it.id === 'd100' ? 100 : 1000; if (m.p.ch.gold < n) { G.toast(m.p, 'NOT ENOUGH GOLD', '#ff8a8a'); AH.Audio.sfx('error'); return; }
      m.p.ch.gold -= n; AH.Audio.sfx('coin'); G.addDev(n === 100 ? 1 : 12); if (n === 1000) G.changeTrust(2, 'THE TOWN THANKS YOU'); G.saveAll();
    }, () => G.closeMenu());
  };
  U.draw.townbook = function (G, ctx, m) {
    U.bg(ctx); U.title(ctx, 'THE BOOK OF DUNMERE', 10);
    const W = G.world, lv = AH.townLevel(W), dev = W.dev || 0, next = AH.TOWN_LEVELS[lv + 1];
    AH.text(ctx, 20, 34, AH.tr('TOWN LEVEL') + ' ' + lv + ': ' + AH.tr(AH.TOWN_GROWTH[lv]), '#8ae08e');
    AH.rect(ctx, 20, 46, 200, 5, '#2a2430'); AH.rect(ctx, 20, 46, Math.round(200 * (next ? (dev - AH.TOWN_LEVELS[lv]) / (next - AH.TOWN_LEVELS[lv]) : 1)), 5, '#8ae08e');
    AH.text(ctx, 20, 56, next ? AH.tr('NEXT') + ' (' + dev + '/' + next + '): ' + AH.tr(AH.TOWN_GROWTH[lv + 1]) : 'DUNMERE IS A CITY NOW!', '#a39bb0', { maxW: 440 });
    AH.wrap('THE TOWN GROWS FROM SLAIN BOSSES, BOUNTIES, HELPING ITS PEOPLE, BROKEN RAIDS AND GOLD.', 440).forEach((l, i) => AH.text(ctx, 20, 68 + i * 9, l, '#6f6880'));
    AH.text(ctx, 20, 94, 'THE PEOPLE', '#f2e3b3');
    const here = G.residentsHere(), gone = W.gone || [];
    AH.RESIDENTS.forEach((r, i) => {
      const x = 20 + (i % 2) * 220, y = 106 + Math.floor(i / 2) * 11, st = (W.res || {})[r.id] || { f: 0 };
      const away = gone.indexOf(r.id) >= 0, absent = !away && here.indexOf(r) < 0;
      AH.text(ctx, x, y, r.name, away ? '#6a3a3a' : absent ? '#4e4858' : '#cfc6b4');
      AH.text(ctx, x + 70, y, away ? 'LEFT TOWN' : absent ? 'NOT YET HERE' : st.f + '/100', away ? '#ff8a8a' : absent ? '#4e4858' : '#e0304a');
      if (st.task && !away) AH.text(ctx, x + 118, y, st.task.done ? '(+)' : '(!)', st.task.done ? '#8ae08e' : '#c8a0ff');
    });
    const L = (AH.options && AH.options.legends) || [];
    AH.text(ctx, 20, 154, AH.tr('LEGENDS OF DUNMERE') + ': ' + (L.length ? L.map(l => l.name).join(', ') : '-'), '#ff9a3e', { maxW: 440 });
    U.list(ctx, U.tbRows(), m.sel, 150, 176, 180);
    AH.coinIcon(ctx, 20, 250); AH.text(ctx, 28, 249, '' + m.p.ch.gold, '#f2c94c');
  };
})();

AH.addI18n(`
DUNMERE GROWS!|DUNMERE GRANDIT !|NŐ DUNMERE!
A MINING CAMP|UN CAMP DE MINEURS|BÁNYÁSZTÁBOR
NEW HOMES ON THE EAST SIDE|DE NOUVELLES MAISONS À L'EST|ÚJ HÁZAK A KELETI OLDALON
THE JEWELER BUILDS HER SHOP|LA JOAILLIÈRE BÂTIT SA BOUTIQUE|AZ ÉKSZERÉSZ FELÉPÍTI A BOLTJÁT
THE GAMBLING DEN OPENS|LE TRIPOT OUVRE|MEGNYÍLIK A JÁTÉKBARLANG
STONE HOUSES EVERYWHERE|DES MAISONS DE PIERRE PARTOUT|MINDENHOL KŐHÁZAK
THE GUILD HALL STANDS|LA HALLE DE LA GUILDE SE DRESSE|ÁLL A CÉHHÁZ
JEWELER|JOAILLIÈRE|ÉKSZERÉSZ
DEN|TRIPOT|BARLANG
THE BAKER|LA BOULANGÈRE|A PÉK
A RETIRED MINER|UN MINEUR RETRAITÉ|NYUGDÍJAS BÁNYÁSZ
THE SEAMSTRESS|LA COUTURIÈRE|A VARRÓNŐ
THE GATE GUARD|LE GARDE DE LA PORTE|A KAPUŐR
THE HERB GIRL|LA CUEILLEUSE D'HERBES|A FÜVESLÁNY
A THIRSTY POET|UN POÈTE ASSOIFFÉ|SZOMJAS KÖLTŐ
THE FISHERMAN|LE PÊCHEUR|A HALÁSZ
THE MIDWIFE|LA SAGE-FEMME|A BÁBA
OLD ODO|VIEIL ODO|AZ ÖREG ODO
FRESH BREAD FOR THE BRAVE!|DU PAIN FRAIS POUR LES BRAVES !|FRISS KENYÉR A BÁTRAKNAK!
YOU LOOK THIN. EAT SOMETHING.|TU AS L'AIR MAIGRE. MANGE QUELQUE CHOSE.|SOVÁNY VAGY. EGYÉL VALAMIT.
MY OVEN IS WARM BECAUSE OF YOU.|MON FOUR EST CHAUD GRÂCE À TOI.|MIATTAD MELEG A KEMENCÉM.
YOU ARE FAMILY NOW, HERO.|TU FAIS PARTIE DE LA FAMILLE, HÉROS.|MÁR A CSALÁDHOZ TARTOZOL, HŐS.
IN MY DAY WE DUG WITH SPOONS.|DE MON TEMPS ON CREUSAIT À LA CUILLÈRE.|AZ ÉN IDŐMBEN KANÁLLAL ÁSTUNK.
THE DEEP HAS EYES, YOU KNOW.|LES PROFONDEURS ONT DES YEUX, TU SAIS.|A MÉLYNEK SZEME VAN, TUDOD.
YOU DIG LIKE MY FATHER DID.|TU CREUSES COMME MON PÈRE.|ÚGY ÁSOL, MINT AZ APÁM.
TAKE MY LUCKY PICK. YOU EARNED IT.|PRENDS MA PIOCHE PORTE-BONHEUR. TU L'AS MÉRITÉE.|VEDD A SZERENCSECSÁKÁNYOM. MEGÉRDEMELTED.
MIND THE MUD ON MY STEPS.|ATTENTION À LA BOUE SUR MES MARCHES.|VIGYÁZZ, NE HORDD BE A SARAT.
THAT CLOAK NEEDS MENDING.|CETTE CAPE A BESOIN D'UN RACCOMMODAGE.|AZ A KÖPENY JAVÍTÁSRA SZORUL.
I SEWED YOUR NAME INTO A BANNER.|J'AI BRODÉ TON NOM SUR UNE BANNIÈRE.|BEHÍMEZTEM A NEVED EGY ZÁSZLÓBA.
THE FINEST THREAD, ONLY FOR YOU.|LE PLUS BEAU FIL, RIEN QUE POUR TOI.|A LEGSZEBB FONAL, CSAK NEKED.
HALT. OH, IT IS YOU.|HALTE. OH, C'EST TOI.|ÁLLJ! Ó, TE VAGY AZ.
QUIET NIGHT. TOO QUIET.|NUIT CALME. TROP CALME.|CSENDES ÉJ. TÚL CSENDES.
IF THEY COME, WE STAND TOGETHER.|S'ILS VIENNENT, NOUS TIENDRONS ENSEMBLE.|HA JÖNNEK, EGYÜTT ÁLLUNK ELLENÜK.
DUNMERE IS SAFE WITH YOU AROUND.|DUNMERE EST EN SÛRETÉ AVEC TOI.|VELED BIZTONSÁGBAN VAN DUNMERE.
DO YOU KNOW WHICH MUSHROOMS BITE?|TU SAIS QUELS CHAMPIGNONS MORDENT ?|TUDOD, MELYIK GOMBA HARAP?
I FOUND A BLUE FLOWER BY THE WELL!|J'AI TROUVÉ UNE FLEUR BLEUE PRÈS DU PUITS !|TALÁLTAM EGY KÉK VIRÁGOT A KÚTNÁL!
MERA SAYS YOU ARE BRAVE.|MERA DIT QUE TU ES COURAGEUX.|MERA SZERINT BÁTOR VAGY.
I WANT TO BE LIKE YOU ONE DAY.|UN JOUR, JE VEUX ÊTRE COMME TOI.|EGYSZER OLYAN AKAROK LENNI, MINT TE.
A RHYME FOR A COIN?|UNE RIME POUR UNE PIÈCE ?|EGY RÍMET EGY ÉRMÉÉRT?
THE MINE SINGS AT NIGHT. LISTEN.|LA MINE CHANTE LA NUIT. ÉCOUTE.|ÉJJEL ÉNEKEL A BÁNYA. FIGYELD.
I WROTE A BALLAD ABOUT YOU.|J'AI ÉCRIT UNE BALLADE SUR TOI.|BALLADÁT ÍRTAM RÓLAD.
YOUR BALLAD IS SUNG IN THREE TOWNS!|TA BALLADE SE CHANTE DANS TROIS VILLES !|A BALLADÁDAT HÁROM VÁROSBAN ÉNEKLIK!
NOTHING BITES IN THE CAVE LAKE.|RIEN NE MORD DANS LE LAC DE LA GROTTE.|A BARLANGI TÓBAN SEMMI SEM HARAP.
I SAW A GLOWING FISH ONCE.|J'AI VU UN POISSON LUMINEUX UNE FOIS.|EGYSZER LÁTTAM EGY VILÁGÍTÓ HALAT.
YOU BRING THE TOWN LUCK.|TU PORTES CHANCE À LA VILLE.|SZERENCSÉT HOZOL A VÁROSNAK.
THE BIG ONE WAS NAMED AFTER YOU.|LE GROS POISSON PORTE TON NOM.|A NAGY HALAT RÓLAD NEVEZTÉK EL.
TWINS LAST NIGHT! LIFE GOES ON.|DES JUMEAUX CETTE NUIT ! LA VIE CONTINUE.|IKREK SZÜLETTEK AZ ÉJJEL! MEGY TOVÁBB AZ ÉLET.
BE CAREFUL DOWN THERE.|FAIS ATTENTION LÀ-DESSOUS.|VIGYÁZZ MAGADRA ODALENT.
THE CHILDREN PLAY "HERO" NOW.|LES ENFANTS JOUENT AU "HÉROS" MAINTENANT.|A GYEREKEK MOST "HŐSÖSDIT" JÁTSZANAK.
A BABY WAS NAMED AFTER YOU.|UN BÉBÉ PORTE TON NOM.|EGY KISBABÁT RÓLAD NEVEZTEK EL.
TALK|PARLER|BESZÉLGETÉS
GIVE A GIFT|OFFRIR UN CADEAU|AJÁNDÉK ADÁSA
TOMORROW|DEMAIN|HOLNAP
ASK FOR A TASK|DEMANDER UNE TÂCHE|FELADAT KÉRÉSE
TASK DONE - CLAIM|TÂCHE FINIE - RÉCLAMER|FELADAT KÉSZ - JUTALOM
GOODBYE|AU REVOIR|VISZLÁT
TASK DONE|TÂCHE ACCOMPLIE|FELADAT TELJESÍTVE
GIVE WHAT?|DONNER QUOI ?|MIT ADSZ?
NOTHING TO GIVE|RIEN À DONNER|NINCS MIT ADNI
OH! I LOVE THESE! THANK YOU!|OH ! J'ADORE ÇA ! MERCI !|Ó! EZT IMÁDOM! KÖSZÖNÖM!
THANK YOU, THAT IS KIND.|MERCI, C'EST GENTIL.|KÖSZÖNÖM, EZ KEDVES.
ONE GIFT A DAY IS PLENTY, DEAR.|UN CADEAU PAR JOUR SUFFIT, MON CHER.|NAPI EGY AJÁNDÉK BŐVEN ELÉG, DRÁGÁM.
I LIKE|J'AIME|SZERETEM
NOTHING MORE TODAY. COME BACK TOMORROW.|RIEN DE PLUS AUJOURD'HUI. REVIENS DEMAIN.|MÁRA ENNYI. GYERE VISSZA HOLNAP.
YOU STILL NEED|IL TE FAUT ENCORE|MÉG KELL:
NOT YET? I AM STILL WAITING.|PAS ENCORE ? J'ATTENDS TOUJOURS.|MÉG NEM? MÉG MINDIG VÁROK.
YOU DID IT! HERE, TAKE THIS.|TU L'AS FAIT ! TIENS, PRENDS ÇA.|MEGCSINÁLTAD! TESSÉK, EZ A TIÉD.
BUT I AM SCARED. MANY ARE LEAVING.|MAIS J'AI PEUR. BEAUCOUP PARTENT.|DE FÉLEK. SOKAN ELMENNEK.
LIKES YOU|T'APPRÉCIE|KEDVEL TÉGED
TRUSTS YOU|TE FAIT CONFIANCE|MEGBÍZIK BENNED
LOVES YOU LIKE FAMILY|T'AIME COMME SA FAMILLE|CSALÁDTAGKÉNT SZERET
A GIFT|UN CADEAU|AJÁNDÉK
FRIENDSHIP|AMITIÉ|BARÁTSÁG
PROGRESS|PROGRÈS|ÁLLÁS
FRIENDS GIVE GIFTS AT EVERY HEART, AND GOOD FRIENDS MAKE THE SHOPS CHEAPER.|LES AMIS OFFRENT UN CADEAU À CHAQUE CŒUR, ET LES BONS AMIS FONT BAISSER LES PRIX.|A BARÁTOK MINDEN SZÍVNÉL AJÁNDÉKOT ADNAK, A JÓ BARÁTOK MIATT OLCSÓBBAK A BOLTOK.
BRING ME {0} {1}|APPORTE-MOI {0} {1}|HOZZ NEKEM {0} DB-OT: {1}
FIND {0} ON FLOOR {1}|TROUVE {0} À L'ÉTAGE {1}|KERESD MEG A(Z) {1}. SZINTEN: {0}
MY FATHER'S PICKAXE|LA PIOCHE DE MON PÈRE|APÁM CSÁKÁNYA
A SILVER LOCKET|UN MÉDAILLON D'ARGENT|EZÜST MEDÁL
MY LOST BOOK|MON LIVRE PERDU|AZ ELVESZETT KÖNYVEM
GRANDMA'S RING|LA BAGUE DE MAMIE|NAGYI GYŰRŰJE
A WOODEN TOY HORSE|UN CHEVAL DE BOIS|FA JÁTÉKLÓ
MY LUCKY LANTERN|MA LANTERNE PORTE-BONHEUR|A SZERENCSELÁMPÁSOM
IS ON THIS FLOOR|EST À CET ÉTAGE|EZEN A SZINTEN VAN
TALK TO {0}|PARLER À {0}|BESZÉLJ VELE: {0}
HAS LEFT DUNMERE|A QUITTÉ DUNMERE|ELHAGYTA DUNMERE-T
IS BACK IN DUNMERE|EST DE RETOUR À DUNMERE|VISSZATÉRT DUNMERE-BE
THE TOWN HAS LOST HOPE|LA VILLE A PERDU ESPOIR|A VÁROS ELVESZTETTE A REMÉNYT
HOPE BRINGS PEOPLE HOME|L'ESPOIR RAMÈNE LES GENS|A REMÉNY HAZAHOZZA AZ EMBEREKET
PEOPLE ARE PACKING THEIR BAGS. THE TOWN NEEDS HOPE.|LES GENS FONT LEURS BAGAGES. LA VILLE A BESOIN D'ESPOIR.|AZ EMBEREK CSOMAGOLNAK. A VÁROSNAK REMÉNY KELL.
RAIDERS NEAR THE MINE!|DES PILLARDS PRÈS DE LA MINE !|PORTYÁZÓK A BÁNYA KÖZELÉBEN!
THEY WAIT ON THE NEXT FLOOR YOU ENTER|ILS ATTENDENT AU PROCHAIN ÉTAGE OÙ TU ENTRES|A KÖVETKEZŐ SZINTEN VÁRNAK, AHOVA BELÉPSZ
THE RAIDERS ARE HERE!|LES PILLARDS SONT LÀ !|ITT VANNAK A PORTYÁZÓK!
BREAK THEM BEFORE THEY REACH DUNMERE|BRISE-LES AVANT QU'ILS N'ATTEIGNENT DUNMERE|TÖRD MEG ŐKET, MIELŐTT DUNMERE-HEZ ÉRNEK
THE RAID IS BROKEN!|LE RAID EST BRISÉ !|A PORTYA MEGTÖRT!
DUNMERE CHEERS FOR YOU|DUNMERE T'ACCLAME|DUNMERE ÉLJENEZ
THE RAIDERS HIT THE FARMS|LES PILLARDS ONT FRAPPÉ LES FERMES|A PORTYÁZÓK LECSAPTAK A TANYÁKRA
A TRAVELING TRADER IS IN TOWN|UN MARCHAND AMBULANT EST EN VILLE|VÁNDORKERESKEDŐ ÉRKEZETT
RARE WARES, TODAY ONLY|MARCHANDISES RARES, AUJOURD'HUI SEULEMENT|RITKA ÁRU, CSAK MA
FESTIVAL IN DUNMERE!|FÊTE À DUNMERE !|ÜNNEP DUNMERE-BEN!
CHEAPER PRICES AND A BLESSING FOR THE NEXT DIVE|PRIX RÉDUITS ET UNE BÉNÉDICTION POUR LA PROCHAINE DESCENTE|OLCSÓBB ÁRAK ÉS ÁLDÁS A KÖVETKEZŐ LESZÁLLÁSRA
TRADE|COMMERCER|KERESKEDÉS
HERE STANDS|ICI SE DRESSE|ITT ÁLL
THE DEEP REMEMBERS.|LES PROFONDEURS SE SOUVIENNENT.|A MÉLY EMLÉKEZIK.
STILL WATCHING OVER DUNMERE.|VEILLE TOUJOURS SUR DUNMERE.|MÉG MINDIG DUNMERE-RE VIGYÁZ.
THE BOOK OF DUNMERE|LE LIVRE DE DUNMERE|DUNMERE KÖNYVE
TOWN LEVEL|NIVEAU DE LA VILLE|VÁROS SZINTJE
DUNMERE IS A CITY NOW!|DUNMERE EST UNE CITÉ !|DUNMERE MÁR VÁROS!
THE TOWN GROWS FROM SLAIN BOSSES, BOUNTIES, HELPING ITS PEOPLE, BROKEN RAIDS AND GOLD.|LA VILLE GRANDIT AVEC LES BOSS TUÉS, LES PRIMES, L'AIDE À SES HABITANTS, LES RAIDS BRISÉS ET L'OR.|A VÁROS A LEGYŐZÖTT BOSSOKTÓL, A FEJVADÁSZ-MUNKÁKTÓL, A LAKÓK SEGÍTÉSÉTŐL, A MEGTÖRT PORTYÁKTÓL ÉS AZ ARANYTÓL NŐ.
THE PEOPLE|LES HABITANTS|A LAKÓK
LEFT TOWN|PARTI|ELKÖLTÖZÖTT
NOT YET HERE|PAS ENCORE LÀ|MÉG NINCS ITT
HAS A TASK|A UNE TÂCHE|VAN FELADATA
LEGENDS OF DUNMERE|LÉGENDES DE DUNMERE|DUNMERE LEGENDÁI
DONATE 100 GOLD|DONNER 100 OR|100 ARANY ADOMÁNY
DONATE 1000 GOLD|DONNER 1000 OR|1000 ARANY ADOMÁNY
TOWN|VILLE|VÁROS
TASK|TÂCHE|FELADAT
LIKES IT|AIME ÇA|SZERETI
`);
