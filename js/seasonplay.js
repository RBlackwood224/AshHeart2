'use strict';
// Season play: every season really changes the game. Each one brings its own mechanic, its own creature,
// an elite affix, something to find on the floors, two legendary powers, its own coin, a journal and a keeper in town.
// The season is on when every hero in the game is a seasonal hero of the running season (the same as its rule).
(function () {
  const S = AH.Season, P = AH.Player.prototype, E = AH.Enemy.prototype, GP = AH.Game.prototype;
  const SP = AH.SPR, T = AH.T;
  const SPA = AH.SPA = {}; // shared helpers for the season ui file
  // real players beat the test bots by a good fifth: the season is tuned that much harder
  const HARD = SPA.HARD = 1.22;

  // ---------- sprites ----------
  SP.s_brazier = AH.sprite(['...f..f...', '..fFffFf..', '.fFyyyyFf.', '..fyYYyf..', 'kkkkkkkkkk', 'kMMMMMMMMk', '.kMmmmmMk.', '..kMMMMk..', '...kmmk...', '...kMMk...', '..kMMMMk..', '.kkkkkkkk.'],
    { f: '#ff6a1e', F: '#ffb347', y: '#ffe08a', Y: '#fff4c0', k: '#1a1216', M: '#6a6276', m: '#3a3442' }, { emissive: 'fFyY' });
  SP.s_brazier2 = AH.sprite(['..f....f..', '...fFffF..', '.fFyyyyFf.', '..fyYYyf..', 'kkkkkkkkkk', 'kMMMMMMMMk', '.kMmmmmMk.', '..kMMMMk..', '...kmmk...', '...kMMk...', '..kMMMMk..', '.kkkkkkkk.'],
    { f: '#ff6a1e', F: '#ffb347', y: '#ffe08a', Y: '#fff4c0', k: '#1a1216', M: '#6a6276', m: '#3a3442' }, { emissive: 'fFyY' });
  SP.s_icechest = AH.sprite(['.WWWWWWWWWWWW.', 'WwBBBBBBBBBBwW', 'WBkkkkkkkkkkBW', 'WwggggggggggwW', 'WBbbbbYYbbbbBW', 'WBbbbbbbbbbbBW', 'WwBBBBBBBBBBwW', '.WWwWWWWWwWW..'],
    { W: '#d8f4ff', w: '#9ef0ff', B: '#4e3420', b: '#8a6038', k: '#1a1216', g: '#a8823a', Y: '#fff2a8' }, { emissive: 'w' });
  SP.s_seam = AH.sprite(['....rrrr......', '..rrRRRRrr....', '.rRRyRRRRRr...', 'rRRRRRyYRRRr..', 'rRyRRRRRRRyRr.', 'rRRRRyRRRRRRr.', '.rRRRRRRyRRr..', '..rrrrrrrrr...'],
    { r: '#3a3442', R: '#5a5266', y: '#f2c94c', Y: '#fff4c0' }, { emissive: 'Y' });
  SP.s_lightcrystal = AH.sprite(['...c....', '..cCc...', '..cCc.c.', '.cCwCcCc', '.cCwCcCc', '.cCwC.c.', 'cCCwCc..', 'cCwwCc..', '.rrrrr..', 'rRRRRRr.'],
    { c: '#e8c860', C: '#fff4b0', w: '#ffffff', r: '#3a3442', R: '#5a5266' }, { emissive: 'cCw' });
  SP.s_rod = AH.sprite(['..y...', '.yYy..', '..y...', '..m...', '..M...', '..m...', '..M...', '..m...', '..M...', '.mMm..', 'mMMMm.', 'kkkkk.'],
    { y: '#ffe04a', Y: '#ffffff', m: '#a8823a', M: '#e8c25a', k: '#3a3442' }, { emissive: 'yY' });
  SP.s_crypt = AH.sprite(['..kkkkkkkk..', '.kSSSSSSSSk.', '.kSsooooSSk.', '.kSoyyyyoSk.', '.kSoyrryoSk.', '.kSoyyyyoSk.', '.kSsooooSSk.', '.kSSSSSSSSk.', '.kSsSsSsSSk.', '.kSSSSSSSSk.', 'kkkkkkkkkkkk', 'kMMMMMMMMMMk'],
    { S: '#8a7a6a', s: '#5a4e42', o: '#ff9a3e', y: '#a8823a', r: '#ff5a3a', k: '#1a1216', M: '#5a4e42' }, { emissive: 'or' });
  SP.s_cryptOpen = AH.sprite(['............', '............', '..kkkkkkkk..', '.kmmmmmmmmk.', '.kmkkkkkkmk.', '.kmkkkkkkmk.', '.kmkkkkkkmk.', '.kmkkkkkkmk.', '.kmmmmmmmmk.', '.kSSSSSSSSk.', 'kkkkkkkkkkkk', 'kMMMMMMMMMMk'],
    { S: '#8a7a6a', m: '#5a4e42', k: '#1a1216', M: '#5a4e42' });
  SP.s_bonepile = AH.sprite(['....bB......', '..bbBbb.k...', '.bBbkbbBbb..', 'bbBbbbBkbBb.', 'BbbBbbbbBbbB'], { b: '#e2dcc8', B: '#a8a08c', k: '#2a2430' });

  // ---------- the eight seasons ----------
  // cur: the season's coin. sk: its creature (stats are taken from the floor's own creatures).
  // obj: the thing to break on the floors. aff: its elite affix. pw: its two legendary powers.
  const TH = AH.SEASON_PLAY = {
    s_winter: {
      cur: 'EMBERS', meter: 'COLD', aff: { id: 'frigid', name: 'FRIGID' },
      sk: [{ name: 'FROST WRAITH', spr: 'ghost', pal: { w: '#d8f4ff', W: '#6fb8d8', e: '#9ef0ff', k: '#2a6a8a' }, ai: 'ghost', hm: 0.9, dm: 0.9, spd: 0.95, undead: 1, kind: 'wraith' }],
      obj: { kind: 'icechest', name: 'FROZEN CHEST', spr: 's_icechest', hm: 2.2, n: [2, 3], sig: 1 }, mm: 1,
      pw: ['frostfire', 'icecore'],
      boon: { name: 'HEARTH BLESSING', desc: 'ON YOUR NEXT TRIP THE COLD CREEPS IN HALF AS FAST.' },
      jt: { mech: 'WARM YOURSELF AT {0} BRAZIERS', sk: 'SLAY {0} FROST WRAITHS', obj: 'BREAK {0} FROZEN CHESTS' },
      say: 'THE COLD TAKES THE CARELESS. STAY NEAR THE FIRE.',
    },
    s_bloodmoon: {
      cur: 'BLOOD DROPS', meter: 'BLOOD', aff: { id: 'thirsty', name: 'BLOODTHIRSTY' },
      sk: [{ name: 'WEREWOLF', spr: 'wolf', pal: { d: '#6a4a3a', D: '#3a2a20', l: '#9a7a5a', k: '#ff3b1f' }, ai: 'charge', hm: 1.2, dm: 1.1, spd: 1.15, kind: 'were' },
        { name: 'BLOOD BAT', spr: 'bat', pal: { p: '#8a1a2a', P: '#4a0a14', e: '#ffb347' }, ai: 'swarm', hm: 0.5, dm: 0.7, spd: 1.7, fly: 1, kind: 'vamp' }],
      obj: null, mm: 0.6,
      pw: ['bloodprice', 'moonhunger'],
      boon: { name: 'MOON ELIXIR', desc: 'ON YOUR NEXT TRIP EVERY BLOOD PACT LASTS TWICE AS LONG.' },
      jt: { mech: 'SEAL {0} BLOOD PACTS', sk: 'SLAY {0} WEREWOLVES AND BLOOD BATS', obj: 'SLAY {0} BEASTS UNDER THE FULL MOON' },
      say: 'WHEN THE MOON IS FULL, THE BLOOD SINGS. LISTEN TO IT.',
    },
    s_bones: {
      cur: 'BONE CHIPS', meter: null, aff: { id: 'ossified', name: 'OSSIFIED' },
      sk: [{ name: 'BONESMITH', spr: 'cultist', pal: { p: '#d8d0b8', P: '#8a8270', e: '#8aff7a', k: '#2a2430' }, ai: 'summon', hm: 1.1, dm: 0.8, spd: 0.8, undead: 1, minion: 'BONE WALKER', kind: 'bonesmith' }],
      obj: null, mm: 1,
      pw: ['bonearmor', 'marrow'],
      boon: { name: 'BONE CHARM', desc: 'ON YOUR NEXT TRIP A BONE GUARD RISES BESIDE YOU ON EVERY FLOOR.' },
      jt: { mech: 'RAISE {0} BONE PILES', sk: 'SLAY {0} BONESMITHS', obj: null },
      say: 'BONES REMEMBER HOW TO STAND. THEY ONLY NEED A REASON.',
    },
    s_gold: {
      cur: 'NUGGETS', meter: 'POCKETS', aff: { id: 'gilded', name: 'GILDED' },
      sk: [{ name: 'KOBOLD THIEF', spr: 'goblin', pal: { g: '#c89030', G: '#7a5a1a', c: '#3a2a4a', C: '#1a1220', e: '#ffe04a' }, ai: 'chase', hm: 0.7, dm: 0.7, spd: 1.5, kind: 'thief' }],
      obj: { kind: 'seam', name: 'GOLD SEAM', spr: 's_seam', hm: 2.6, n: [2, 3], sig: 1 }, mm: 0.5,
      pw: ['goldskin', 'midas'],
      boon: { name: 'PROSPECTOR\'S MAP', desc: 'ON YOUR NEXT TRIP TWICE AS MANY GOLD SEAMS AND NO HEAVY POCKETS.' },
      jt: { mech: 'CATCH {0} RIVAL PROSPECTORS', sk: 'CATCH {0} KOBOLD THIEVES', obj: 'MINE {0} GOLD SEAMS' },
      say: 'GOLD IN THE WALLS, GOLD IN THE POCKETS. MIND THE WEIGHT, FRIEND.',
    },
    s_shadow: {
      cur: 'LIGHT SHARDS', meter: 'OIL', aff: { id: 'umbral', name: 'UMBRAL' },
      sk: [{ name: 'SHADE', spr: 'ghost', pal: { w: '#2a2438', W: '#16121e', e: '#a07ad8', k: '#a07ad8' }, ai: 'ghost', hm: 1.0, dm: 1.0, spd: 1.0, kind: 'shade' }],
      obj: { kind: 'lightcrystal', name: 'LIGHT CRYSTAL', spr: 's_lightcrystal', hm: 1.4, n: [2, 3], sig: 1 }, mm: 0.15,
      pw: ['nightglass', 'lightthief'],
      boon: { name: 'LAMP OIL BARREL', desc: 'ON YOUR NEXT TRIP YOUR LANTERN BURNS ITS OIL HALF AS FAST.' },
      jt: { mech: 'DEFEAT {0} OF YOUR SHADOWS', sk: 'SLAY {0} SHADES', obj: 'BREAK {0} LIGHT CRYSTALS' },
      say: 'THE DARK IS HUNGRY THIS SEASON. FEED YOUR LANTERN.',
    },
    s_depth: {
      cur: 'ABYSS PEARLS', meter: null, aff: { id: 'abyssal', name: 'ABYSSAL' },
      sk: [{ name: 'ABYSS LURKER', spr: 'worm', pal: { p: '#3a5a8a', P: '#1a2a4a', m: '#06040a', t: '#6fd6e8' }, ai: 'ambush', hm: 1.2, dm: 1.1, spd: 0.9, kind: 'lurker' }],
      obj: null, mm: 0.35,
      pw: ['deepdiver', 'trophyhunter'],
      boon: { name: 'ROPE OF THE DEEP', desc: 'ON YOUR NEXT TRIP THE CHASMS DO NOT CURSE YOU.' },
      jt: { mech: 'JUMP INTO {0} CHASMS', sk: 'SLAY {0} ABYSS LURKERS', obj: null },
      say: 'THE DEEP CALLS. SOME JUMP. FEW REGRET IT.',
    },
    s_storm: {
      cur: 'STORM GLASS', meter: 'CHARGE', aff: { id: 'charged', name: 'CHARGED' },
      sk: [{ name: 'STORM SPRITE', spr: 'moth', pal: { w: '#fff2a8', W: '#e0b020', e: '#ffffff' }, ai: 'swarm', hm: 0.6, dm: 0.8, spd: 1.8, fly: 1, kind: 'sprite' }],
      obj: { kind: 'rod', name: 'STORM ROD', spr: 's_rod', hm: 1.6, n: [2, 3], sig: 1 }, mm: 0.6,
      pw: ['stormcaller', 'conductor'],
      boon: { name: 'COPPER WIRE', desc: 'ON YOUR NEXT TRIP YOU START EVERY FLOOR HALF CHARGED.' },
      jt: { mech: 'BECOME SUPERCHARGED {0} TIMES', sk: 'SLAY {0} STORM SPRITES', obj: 'DISCHARGE {0} STORM RODS' },
      say: 'THE SKY HAS COME DOWN INTO THE MINE. CATCH IT IF YOU CAN.',
    },
    s_ancient: {
      cur: 'OLD COINS', meter: null, aff: { id: 'timeless', name: 'TIMELESS' },
      sk: [{ name: 'ELDER GUARDIAN', spr: 'golem', pal: { s: '#a8823a', S: '#6a4a1a', d: '#3a2a10', e: '#ff9a3e' }, ai: 'tank', hm: 1.6, dm: 1.1, spd: 0.55, kind: 'guardian' }],
      obj: null, mm: 0.3,
      pw: ['ancestral', 'echo'],
      boon: { name: 'ANCESTOR\'S BLESSING', desc: 'ON YOUR NEXT TRIP EVERY ANCESTOR LEAVES TWO ANCIENT ITEMS.' },
      jt: { mech: 'DEFEAT {0} ANCESTORS', sk: 'SLAY {0} ELDER GUARDIANS', obj: null },
      say: 'THE OLD ONES WAKE. THEY WANT TO SEE IF YOU ARE WORTHY.',
    },
  };
  // the season's heart now drops the season's own first power
  AH.SEASON_THEMES.forEach(t => { if (TH[t.id]) t.item.legend = TH[t.id].pw[0]; });

  // ---------- legendary powers ----------
  AH.LEGEND_POWERS.push(
    { id: 'frostfire', lab: 'YOUR FIRE ALSO CHILLS: BURNING FOES SLOW DOWN AND MAY FREEZE.' },
    { id: 'icecore', lab: 'THE COLDER YOU ARE, THE HARDER YOU HIT (UP TO 25% MORE).' },
    { id: 'bloodprice', lab: 'OUT OF MANA, YOUR SKILLS ARE PAID WITH LIFE.' },
    { id: 'moonhunger', lab: 'KILLS HEAL YOU 2% OF YOUR LIFE.' },
    { id: 'bonearmor', lab: 'EVERY KILL ADDS BONE ARMOR: UP TO 20% LESS DAMAGE.' },
    { id: 'marrow', lab: 'ONE IN TEN SLAIN FOES RISES TO FIGHT FOR YOU.' },
    { id: 'goldskin', lab: 'GOLD FROM THIS TRIP SHIELDS YOU: UP TO 20% LESS DAMAGE.' },
    { id: 'midas', lab: 'CRITICAL HITS MAY SHAKE GOLD OUT OF FOES.' },
    { id: 'nightglass', lab: 'WHEN YOUR LIGHT IS LOW YOU DEAL 35% MORE DAMAGE.' },
    { id: 'lightthief', lab: 'KILLS FEED YOUR TORCH AND LANTERN.' },
    { id: 'deepdiver', lab: '+4% DAMAGE FOR EVERY FLOOR YOU WENT DOWN ON THIS TRIP (UP TO 40%).' },
    { id: 'trophyhunter', lab: '30% MORE DAMAGE AGAINST LEGENDS, GUARDIANS AND NEMESES.' },
    { id: 'stormcaller', lab: 'EVERY 8 SECONDS YOUR NEXT HIT CALLS DOWN LIGHTNING.' },
    { id: 'conductor', lab: 'YOUR CHAIN LIGHTNING JUMPS TWICE MORE AND HITS 25% HARDER.' },
    { id: 'ancestral', lab: '+6% DAMAGE FOR EVERY ANCIENT ITEM YOU WEAR.' },
    { id: 'echo', lab: 'YOUR SKILLS SOMETIMES CAST A SECOND TIME.' },
  );
  const PW_ITEM = {
    frostfire: ['EMBERFROST GRIPS', 'gloves'], icecore: ['HEART OF THE LONG WINTER', 'amulet'],
    bloodprice: ['THE CRIMSON PACT', 'ring'], moonhunger: ['MOONHOWL', 'axe'],
    bonearmor: ['OSSUARY PLATE', 'plate'], marrow: ['MARROWCALLER', 'scepter'],
    goldskin: ['GILDED HIDE', 'leather'], midas: ['MIDAS FANG', 'dagger'],
    nightglass: ['NIGHTGLASS EYE', 'ring'], lightthief: ['LANTERN EATER', 'staff'],
    deepdiver: ['ABYSS STRIDERS', 'boots'], trophyhunter: ['TROPHY TAKER', 'greatsword'],
    stormcaller: ['THUNDERCALL', 'maul'], conductor: ['COPPER CROWN', 'helm'],
    ancestral: ['MANTLE OF THE ANCESTORS', 'cloak'], echo: ['THE ECHOING PAGES', 'tomeoff'],
  };
  // a season legendary: one of the season's two powers on a fitting base
  AH.seasonLegend = function (themeId, f, pick) {
    const th = TH[themeId]; if (!th) return null;
    const pw = pick || AH.rand.pick(th.pw), d = PW_ITEM[pw];
    const it = AH.genItem(AH.rand, Math.max(1, f) + 2, { rarity: 3, base: d[1], noSet: true, noAncient: true });
    it.name = d[0]; it.legend = pw; it.slegend = themeId;
    it.affixes.forEach(a => { a.v = Math.round(a.v * 1.15 * 10) / 10; });
    delete it.unid; delete it.cursed; delete it.bargain;
    return it;
  };

  // ---------- which season is being played right now ----------
  const tid = AH.seasonTheme = function (G) {
    G = G || AH.game; if (!G || !G.players || !G.players.length) return null;
    const c = S.now(); if (!c || !TH[c.theme.id]) return null;
    if (G.mode === 'weekly' || G.mode === 'time') return null;
    if (G.scene === 'mine') return G.rules && G.rules.has(c.theme.id) ? c.theme.id : null;
    return G.players.every(p => p.ch && S.active(p.ch)) ? c.theme.id : null;
  };
  const on = id => { const G = AH.game; return !!G && G.scene === 'mine' && tid(G) === id; };
  SPA.tid = tid; SPA.TH = TH;

  // ---------- the season coin ----------
  AH.giveSig = function (G, p, n, x, y) {
    if (!p || !p.ch || n <= 0 || !S.active(p.ch)) return;
    n = Math.round(n * (S.surge && S.surge() ? 2 : 1));
    p.ch.sig = (p.ch.sig || 0) + n;
    jAdd(p, 'sig', n);
    const th = TH[tid(G)] || {};
    AH.fx.num(G, x === undefined ? p.x : x, (y === undefined ? p.y : y) - 34, '+' + n + ' ' + AH.tr(th.cur || 'SIGILS'), S.now() ? S.now().theme.col : '#f2c94c');
  };
  // the 250-floor milestone: the season surges, coins come twice as fast
  S.surge = () => S.shaft() >= 250;

  // ---------- the season journal ----------
  const CHAP = [
    [{ k: 'floor', n: 5 }, { k: 'kill', n: 80 }, { k: 'mech', n: 3 }],
    [{ k: 'floor', n: 20 }, { k: 'elite', n: 25 }, { k: 'sk', n: 40 }, { k: 'obj', n: 10 }],
    [{ k: 'floor', n: 40 }, { k: 'legend', n: 3 }, { k: 'boss', n: 4 }, { k: 'mech', n: 30 }],
    [{ k: 'floor', n: 70 }, { k: 'legend', n: 7 }, { k: 'boss', n: 7 }, { k: 'mech', n: 80 }],
  ];
  const jOf = ch => { const c = S.now(); if (!c) return null; if (!ch.sj || ch.sj.s !== c.n) ch.sj = { s: c.n, c: {}, got: [] }; return ch.sj; };
  function jAdd(p, k, n) { if (!p || !p.ch || !S.active(p.ch)) return; const j = jOf(p.ch); if (j) j.c[k] = (j.c[k] || 0) + (n || 1); }
  SPA.jAdd = jAdd;
  SPA.chapters = function (themeId) {
    const th = TH[themeId];
    // every season's own mechanic comes at its own pace (braziers are many, your shadow is rare)
    return CHAP.map(list => list.map(t => {
      if (t.k === 'obj' && !th.jt.obj) return { k: 'mech', n: Math.max(2, Math.round(t.n * 1.5 * th.mm * HARD)) };
      if (t.k === 'mech') return { k: 'mech', n: Math.max(1, Math.round(t.n * th.mm * HARD)) };
      if (t.k === 'floor' || t.k === 'boss') return t;
      return { k: t.k, n: Math.round(t.n * HARD) };
    }));
  };
  SPA.taskLab = function (themeId, t) {
    const th = TH[themeId];
    const L = { floor: 'REACH FLOOR {0}', kill: 'SLAY {0} MONSTERS', elite: 'SLAY {0} ELITES', legend: 'SLAY {0} LEGENDARY BEASTS', boss: 'DEFEAT {0} FLOOR GUARDIANS', sk: th.jt.sk, obj: th.jt.obj, mech: th.jt.mech }[t.k] || '{0}';
    return L.replace('{0}', t.n);
  };
  SPA.taskVal = (ch, t) => { const j = jOf(ch); if (!j) return 0; return t.k === 'floor' ? (ch.deepest || 0) : (j.c[t.k] || 0); };
  SPA.chapDone = (ch, themeId, i) => SPA.chapters(themeId)[i].every(t => SPA.taskVal(ch, t) >= t.n);
  SPA.REWARDS = ['25 COINS, 3 HEALING POTIONS AND A GEM', 'A SEASON LEGENDARY', 'AN ANCIENT SEASON LEGENDARY', 'A TITLE, THE SEASON CLOAK AND AN ANCIENT SEASON LEGENDARY'];
  SPA.claim = function (G, p, i) {
    const c = S.now(), th = tid(G) || (c && c.theme.id); const j = jOf(p.ch);
    if (!j || !th || j.got.indexOf(i) >= 0 || !SPA.chapDone(p.ch, th, i)) return false;
    j.got.push(i);
    const f = Math.max(5, p.ch.deepest || 1), give = it => { if (!p.addItem(it)) G.dropItem(p.x, p.y + 8, it, p.pid); };
    if (i === 0) { p.ch.sig = (p.ch.sig || 0) + 25; give(AH.makeCons('potion', 3)); give(AH.makeCons(AH.gemKey(AH.rand.pick(Object.keys(AH.GEMS)), 1), 1)); }
    if (i === 1) give(AH.seasonLegend(th, f));
    if (i >= 2) { const it = AH.seasonLegend(th, f); if (AH.makeAncient) AH.makeAncient(it); give(it); }
    if (i === 3) {
      p.ch.titles = p.ch.titles || []; const t = 'CONQUEROR OF ' + c.theme.name; if (p.ch.titles.indexOf(t) < 0) p.ch.titles.push(t);
      if (!p.ch.seasonCloak) { p.ch.seasonCloak = c.n; p.buildLook && p.buildLook(); }
    }
    AH.Audio.sfx('legend'); G.banner('CHAPTER COMPLETE!', c.theme.col, SPA.REWARDS[i]);
    G.saveAll && G.saveAll();
    return true;
  };

  // ---------- creatures, objects and affixes on the floors ----------
  const poolStats = function (f) {
    const pool = AH.biomeCreaturesFor(f).filter(c => !c.minF || f >= c.minF);
    const hp = pool.reduce((s, c) => s + c.hp, 0) / pool.length, dmg = pool.reduce((s, c) => s + c.dmg, 0) / pool.length, xp = pool.reduce((s, c) => s + (c.xp || 6), 0) / pool.length;
    return { hp, dmg, xp };
  };
  SPA.creatureDef = function (d, f) {
    const ps = poolStats(f);
    return { name: d.name, spr: d.spr, pal: d.pal, ai: d.ai, hp: Math.round(ps.hp * d.hm), dmg: Math.round(ps.dmg * d.dm * 10) / 10, spd: d.spd, xp: Math.round(ps.xp * 1.4), fly: d.fly, undead: d.undead, minion: d.minion, sk: d.kind };
  };
  AH.spawnSeasonObj = function (G, o, x, y, extra) {
    const ps = poolStats(G.floorNo);
    const def = Object.assign({ name: o.name, spr: o.spr, pal: {}, ai: 'still', hp: Math.round(ps.hp * o.hm), dmg: 0, spd: 0, xp: Math.round(ps.xp * 1.5) }, extra || {});
    const e = new AH.Enemy(def, x, y, G.floorNo, { players: G.players.length, noHide: true, noRules: true });
    e.sobj = o.kind; e.still = true; e.face = 1;
    G.enemies.push(e); return e;
  };
  const _spawnFloor = AH.spawnFloorEnemies;
  AH.spawnFloorEnemies = function (G, rng) {
    _spawnFloor(G, rng);
    // the weekly challenge is a race for good players: a fifth tougher too
    if (G.mode === 'weekly') for (const e of G.enemies) { e.maxHp = Math.round(e.maxHp * 1.2); e.hp = e.maxHp; e.dmg *= 1.15; }
    const id = tid(G); if (!id) return;
    for (const e of G.enemies) { e.maxHp = Math.round(e.maxHp * HARD); e.hp = e.maxHp; e.dmg *= 1 + (HARD - 1) * 0.8; }
    const th = TH[id], f = G.floorNo, isBoss = f % 10 === 0, m = G.map;
    const r2 = AH.mulberry((G.mapSeed || rng.int(1, 1e9)) ^ 0x51ab);
    // some of the floor's creatures are the season's own
    const list = G.enemies.slice();
    for (const e of list) {
      if (e.elite || e.legend || e.boss || e.nemesis || e.goldrat || e.minion || r2() > 0.2) continue;
      if (e.def && (e.def.name === 'CAVE RAT' || e.def.name === 'CAVE BAT' || e.def.name === 'PALE SLIME') && e.maxHp < 30) continue;
      const d = SPA.creatureDef(r2.pick(th.sk), f);
      const n = new AH.Enemy(d, e.x, e.y, f, { players: G.players.length, aggro: e.aggro });
      n.sk = d.sk; G.enemies[G.enemies.indexOf(e)] = n;
    }
    // elites wear the season's affix
    for (const e of G.enemies) if (e.elite && !e.sobj && r2() < 0.6 && e.elite.indexOf(th.aff.id) < 0) { e.elite.push(th.aff.id); e.name = th.aff.name + ' ' + e.name; }
    // the season's thing to find on every floor
    if (th.obj && !isBoss) {
      let n = r2.int(th.obj.n[0], th.obj.n[1]);
      if (id === 's_gold' && G.players.some(p => p.boonOn)) n *= 2;
      const rooms = m.rooms.filter(r => r !== m.startRoom);
      for (let k = 0; k < n && rooms.length; k++) { const pos = m.randomFloorIn(r2.pick(rooms), r2); if (!m.blocked(pos.x, pos.y, 6)) AH.spawnSeasonObj(G, th.obj, pos.x, pos.y); }
    }
  };
  // still things never move or strike; season creatures have their own habits
  const _eUpd = E.update;
  E.update = function (G, dt) {
    if (this.still) { if (this.flash > 0) this.flash -= dt; if (this.burnT > 0) { this.burnT -= dt; this.burnTick = (this.burnTick || 0) - dt; if (this.burnTick <= 0) { this.burnTick = 0.5; this.hurt(G, this.burnDmg || 2, this.burnBy, { color: '#ffb347' }); } } return; }
    if (this.dead) return;
    const id = G.scene === 'mine' ? tid(G) : null;
    if (id) seasonFoe(G, this, dt, id);
    _eUpd.call(this, G, dt);
  };
  function seasonFoe(G, e, dt, id) {
    // affixes
    if (e.has('charged')) { e.chargeT = (e.chargeT === undefined ? 3 + AH.rand() * 2 : e.chargeT) - dt; if (e.chargeT <= 0 && e.aggro) { e.chargeT = 5; const x = e.x, y = e.y; G.telegraph(x, y, 34, 0.8, () => { if (e.dead) return; G.lightning = 0.1; AH.Audio.sfx('thunder'); G.explosion(x, y, 34, e.dmg * 0.9, 'enemy'); }); } }
    // creatures
    if (e.sk === 'were') {
      const full = G.fullMoon;
      if (full && !e.wereOn) { e.wereOn = true; e.scale = 1.35; e.r = Math.floor(e.r * 1.3); e.dmg *= 1.3; e.spd *= 1.2; AH.fx.puff(G, e.x, e.y - 8, '#ff5a5a'); }
      if (!full && e.wereOn) { e.wereOn = false; e.scale = 1; e.dmg /= 1.3; e.spd /= 1.2; }
    }
    if (e.sk === 'bonesmith' && e.aggro) {
      e.reviveT = (e.reviveT === undefined ? 4 : e.reviveT) - dt;
      if (e.reviveT <= 0) {
        e.reviveT = 6;
        const c = (G.corpses || []).find(c => !c.used && !c.big && c.def && AH.dist(c, e) < 90);
        if (c) { const n = new AH.Enemy(c.def, c.x, c.y, G.floorNo, { hpMult: 0.5, xpMult: 0.3, minion: true, aggro: true, players: G.players.length }); G.enemies.push(n); G.useCorpse(c); AH.fx.puff(G, c.x, c.y - 4, '#d8d0b8'); G.toast(null, 'THE BONESMITH RAISES THE DEAD!', '#d8d0b8'); }
      }
    }
    if (e.sk === 'guardian') { e.gShield = (e.gShield === undefined ? 3 : e.gShield) - dt; if (e.gShield <= 0 && e.aggro) { e.gShield = 6; e.shieldT = 1.6; } }
    if (e.sk === 'lurker' && !e.hidden && !e.pulled) {
      e.pulled = true; const T2 = e.target(G);
      if (T2 && T2.d < 110 && T2.p.ch) { const p = T2.p, a = Math.atan2(e.y - p.y, e.x - p.x); G.moveEntity(p, Math.cos(a) * Math.min(40, T2.d - 14), Math.sin(a) * Math.min(40, T2.d - 14), 4); G.toast(p, 'THE ABYSS PULLS YOU!', '#6fd6e8'); AH.fx.ring(G, p.x, p.y - 8, '#6fd6e8', 20); }
    }
    if (e.thief && e.ai === 'flee') { /* kobold running away with your gold: GG.updateFlee drives it */ }
  }
  const _eHurt = E.hurt;
  E.hurt = function (G, dmg, by, opt) {
    opt = opt || {};
    const id = G && G.scene === 'mine' ? tid(G) : null;
    let d = dmg;
    if (this.sobj === 'icechest' && opt.color === '#ffb347') d *= 3; // fire thaws the ice
    if (this.has && this.has('ossified') && this.hp > this.maxHp * 0.5) d *= 0.5;
    if (this.sk === 'shade' && by && by.pid !== undefined && (by.oil === undefined ? 100 : by.oil) < 50 && !SPA.inCrystalLight(G, this)) { d *= 0.3; if (!this.shadeWarn && by.ch) { this.shadeWarn = true; G.toast(by, 'SHADES FEAR ONLY THE LIGHT: REFILL YOUR LANTERN', '#a07ad8'); } }
    if (by && by.pid !== undefined && by.S) {
      const pw = by.S.powers;
      if (pw.has('icecore')) d *= 1 + Math.min(25, (by.cold || 0) / 4) / 100;
      if (pw.has('nightglass') && ((by.oil !== undefined && by.oil < 50) || by.torch < 40)) d *= 1.35;
      if (pw.has('deepdiver') && G.scene === 'mine') d *= 1 + Math.min(40, Math.max(0, G.floorNo - (by.tripStart || G.floorNo)) * 4) / 100;
      if (pw.has('trophyhunter') && this.isBig && this.isBig()) d *= 1.3;
      if (pw.has('ancestral')) d *= 1 + 0.06 * (by.ancN || 0);
      if (by.buffs.pact > 0) d *= 1.4;
      if (pw.has('frostfire') && (opt.color === '#ffb347' || this.burnT > 0) && !this.still) { this.slowT = Math.max(this.slowT, 1.5); if (AH.rand() < 0.1) this.freezeT = this.isBig() ? 0.3 : 1; }
      if (pw.has('stormcaller') && !SPA.inChain && !this.still) { by.scT = by.scT || 0; if (G.time >= by.scT) { by.scT = G.time + 8; SPA.inChain = true; try { G.chainLightning(by, this, by.rollDamage(0.8, { noCrit: true }).dmg, 3); } finally { SPA.inChain = false; } } }
      if (by.buffs.superc > 0 && !SPA.inChain && AH.rand() < 0.25 && !this.still) { SPA.inChain = true; try { G.chainLightning(by, this, d * 0.5, 2); } finally { SPA.inChain = false; } }
      if (pw.has('midas') && opt.crit && AH.rand() < 0.25 && !this.still) G.dropGold(this.x, this.y, 2 + G.floorNo * 2, by.pid);
    }
    const dealt = _eHurt.call(this, G, d, by, opt);
    if (dealt > 0 && by && by.buffs && by.buffs.pact > 0 && by.heal) by.heal(G, dealt * 0.03);
    return dealt;
  };
  const _eDie = E.die;
  E.die = function (G, by) {
    if (this.has && this.has('timeless') && !this.reborn && G.scene === 'mine') {
      this.reborn = true; this.hp = Math.round(this.maxHp * 0.4); this.dead = false; this.flash = 0.4;
      AH.fx.ring(G, this.x, this.y - 8, '#ff9a3e', 26); G.toast(null, 'TIMELESS: IT RISES AGAIN!', '#ff9a3e'); AH.Audio.sfx('magic'); return;
    }
    _eDie.call(this, G, by);
  };
  const _eStrike = E.strike;
  E.strike = function (G, p, mult) {
    const before = p && p.hp;
    _eStrike.call(this, G, p, mult);
    if (!p || !p.ch || p.dead || G.scene !== 'mine' || !(p.hp < before)) return;
    if (this.has('frigid')) p.cold = Math.min(100, (p.cold || 0) + 12);
    if (this.sk === 'vamp') this.hp = Math.min(this.maxHp, this.hp + (before - p.hp));
    if ((this.sk === 'thief' || this.has('gilded')) && p.ch.gold > 0 && !this.stolen) {
      const g = Math.max(5, Math.round(p.ch.gold * (this.sk === 'thief' ? 0.03 : 0.015))); p.ch.gold -= g; this.stolen = g;
      AH.fx.num(G, p.x, p.y - 30, '-' + g + 'G', '#f2c94c'); G.toast(p, 'IT STOLE ' + g + ' GOLD!', '#f2c94c');
      if (this.sk === 'thief') { this.ai = 'flee'; this.fleeT = 9; this.thief = true; }
    }
  };

  // ---------- the floors: props for each season ----------
  const _genFloor = AH.genFloor;
  AH.genFloor = function (seed, floor, event) {
    const m = _genFloor(seed, floor, event);
    const G = AH.game; const id = G ? tid(G) || (G.rules && [...G.rules].find(r => TH[r])) : null;
    if (!id || floor % 10 === 0) return m;
    const rng = AH.mulberry(seed ^ 0x2f6a);
    const rooms = m.rooms.filter(r => r !== m.startRoom && r !== m.stairsRoom);
    const spot = () => { for (let k = 0; k < 20; k++) { const r = rng.pick(rooms.length ? rooms : m.rooms); const pos = m.randomFloorIn(r, rng); if (!m.blocked(pos.x, pos.y, 8)) return pos; } return null; };
    if (id === 's_winter') {
      // ice creeps over the floors, and braziers burn here and there
      for (let k = 0, n = rng.int(2, 4); k < n && rooms.length; k++) {
        const r = rng.pick(rooms), cx = rng.int(r.x + 1, r.x + r.w - 2), cy = rng.int(r.y + 1, r.y + r.h - 2), rad = rng.range(1.5, 3);
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (Math.hypot(x - cx, (y - cy) * 1.3) < rad && m.get(x, y) === AH.TILE.FLOOR) m.set(x, y, AH.TILE.ICE);
      }
      for (let k = 0, n = rng.int(3, 5); k < n; k++) { const pos = spot(); if (!pos) continue; m.props.push({ type: 's_brazier', x: pos.x, y: pos.y, id: k }); m.lights.push({ x: pos.x, y: pos.y - 8, r: 64, i: 0.9, tint: [1.15, 0.7, 0.4], flicker: 1, sbr: 1 }); }
    }
    if (id === 's_bones') for (let k = 0, n = rng.int(3, 5); k < n; k++) { const pos = spot(); if (pos) m.props.push({ type: 's_bonepile', x: pos.x, y: pos.y }); }
    if (id === 's_depth' && rng() < 0.45) { const pos = spot(); if (pos) m.props.push({ type: 's_chasm', x: pos.x, y: pos.y }); }
    if (id === 's_ancient' && rng() < 0.4) { const pos = spot(); if (pos) m.props.push({ type: 's_crypt', x: pos.x, y: pos.y }); }
    if (id === 's_shadow') for (const l of m.lights) if (l.flicker) l.i *= 0.5;
    return m;
  };

  // ---------- the hero in the season ----------
  const _pUpd = P.update;
  P.update = function (G, dt, pad) {
    const id = G.scene === 'mine' && !this.dead ? tid(G) : null;
    let mul = 1;
    if (id) mul = seasonHero(G, this, dt, id);
    if (mul !== 1) { const s = this.S.speed; this.S.speed = s * mul; try { _pUpd.call(this, G, dt, pad); } finally { this.S.speed = s; } }
    else _pUpd.call(this, G, dt, pad);
  };
  function seasonHero(G, p, dt, id) {
    let mul = 1;
    const boon = !!p.boonOn;
    if (p.buffs.pact > 0) { mul *= 1.2; p.pactTick = (p.pactTick || 0) - dt; if (p.pactTick <= 0) { p.pactTick = 1; if (p.hp > p.S.hp * 0.1) p.hp -= p.S.hp * 0.015 * HARD; } }
    if (p.buffs.superc > 0 && Math.random() < dt * 8) G.fx.push({ k: 'px', x: p.x + AH.rand.range(-5, 5), y: p.y - AH.rand.range(2, 16), vx: 0, vy: -10, col: '#ffe04a', life: 0.3, em: 1 });
    if (p.boneSt > 0) { p.boneT = (p.boneT || 0) - dt; if (p.boneT <= 0) { p.boneT = 3; p.boneSt--; } }
    if (id === 's_winter') {
      let warm = 0;
      for (const pr of G.map.props) if (pr.type === 's_brazier' && AH.dist(p, pr) < 46) {
        warm = 18; p.warmed = p.warmed || new Set();
        const key = G.floorNo + ':' + pr.id; if (!p.warmed.has(key)) { p.warmed.add(key); jAdd(p, 'mech'); if (!p.remote) G.toast(p, 'THE BRAZIER WARMS YOU', '#ffb347'); }
      }
      for (const z of G.zones) if ((z.kind === 'fire' || z.kind === 'efire') && AH.dist(p, z) < z.r + 20) warm = Math.max(warm, 12);
      // about a minute to grow cold, two to freeze, if you never stop at a fire
      const rate = (1.5 + G.floorNo * 0.01) * HARD * (boon ? 0.5 : 1);
      p.cold = AH.clamp((p.cold || 0) + (warm ? -warm : rate) * dt, 0, 100);
      if (p.cold >= 60) { mul *= 0.8; if (Math.random() < dt * 6) G.fx.push({ k: 'px', x: p.x + AH.rand.range(-5, 5), y: p.y - AH.rand.range(2, 16), vx: 0, vy: 6, col: '#d8f4ff', life: 0.5 }); }
      if (p.cold >= 100) { p.frostT = (p.frostT || 0) - dt; if (p.frostT <= 0) { p.frostT = 1; p.hurt(G, p.S.hp * 0.025, null, true); if (G.time - (p.frostWarn || -9) > 6) { p.frostWarn = G.time; G.toast(p, 'FROSTBITE! FIND A FIRE!', '#9ef0ff'); } } }
    }
    if (id === 's_gold' && !boon) {
      const W = (600 + p.ch.level * 60) / HARD, tg = p.tripGold || 0;
      if (tg > W) mul *= Math.max(0.8, 1 - (tg - W) / (W * 6));
    }
    if (id === 's_shadow') {
      p.oil = AH.clamp((p.oil === undefined ? 100 : p.oil) - dt * 0.8 * HARD * (boon ? 0.5 : 1), 0, 100);
      if (p.oil <= 0 && G.time - (p.oilWarn || -20) > 15) { p.oilWarn = G.time; G.toast(p, 'YOUR LANTERN IS DRY! BREAK A LIGHT CRYSTAL', '#e8c860'); }
    }
    if (id === 's_storm') {
      const w = G.wind; if (w && w.t > 0) G.moveEntity(p, w.x * 16 * dt, w.y * 10 * dt, 4);
    }
    return mul;
  }
  // damage taken
  const _pHurt = P.hurt;
  P.hurt = function (G, dmg, src, raw) {
    let d = dmg;
    if (G && G.scene === 'mine') {
      if (G.fullMoon && src && src.def && !raw) d *= 1.2;
      if (G.deepCurse && src && src.def && !raw) d *= 1.2;
      const pw = this.S.powers;
      if (pw.has('bonearmor') && this.boneSt) d *= 1 - Math.min(20, this.boneSt * 2) / 100;
      if (pw.has('goldskin') && this.tripGold) d *= 1 - Math.min(20, this.tripGold / 150) / 100;
    }
    return _pHurt.call(this, G, d, src, raw);
  };
  // gold picked up in the mine is "this trip's gold" until you reach town
  const _pickup = GP.pickup;
  GP.pickup = function (p, d) {
    const g = d && d.gold && !d.taken ? d.gold : 0;
    _pickup.call(this, p, d);
    if (g && this.scene === 'mine') p.tripGold = (p.tripGold || 0) + g;
  };
  // skills: echo, blood price, and the fire that warms
  const _try = P.trySkill;
  P.trySkill = function (G, slot) {
    const id = this.ch.slots[slot];
    if (id && this.S.powers.has('bloodprice') && !this.S.keys.has('bloodmagic') && AH.SKILLS[id] && this.mp < this.manaCost(AH.SKILLS[id].mp) && !AH.usesRage(this.ch.cls)) {
      this.S.keys.add('bloodmagic'); try { return _try.call(this, G, slot); } finally { this.S.keys.delete('bloodmagic'); }
    }
    return _try.call(this, G, slot);
  };
  const _cast = GP.castSkill;
  GP.castSkill = function (p, id, rm) {
    const r = _cast.call(this, p, id, rm);
    if (r === false) return r;
    if (this.scene === 'mine' && /fire|flame|meteor|burn|holyfire/.test(id) && p.cold) p.cold = Math.max(0, p.cold - 10);
    if (p.S && p.S.powers.has('echo') && !SPA.inEcho && AH.rand() < 0.15) { setTimeout(() => { if (p.dead || this.scene !== 'mine') return; SPA.inEcho = true; try { _cast.call(this, p, id, rm * 0.8); this.toast(p, 'ECHO!', '#ff9a3e'); } finally { SPA.inEcho = false; } }, 180); }
    return r;
  };
  const _chain = GP.chainLightning;
  GP.chainLightning = function (p, first, dmg, jumps) {
    if (p && p.S && p.S.powers.has('conductor')) { dmg *= 1.25; jumps += 2; }
    return _chain.call(this, p, first, dmg, jumps);
  };
  // ancient items worn (for the ancestors' power) are counted once per recalc
  const _recalc = P.recalc;
  P.recalc = function () { const r = _recalc.apply(this, arguments); try { this.ancN = AH.EQUIP_SLOTS.reduce((n, s) => n + (this.ch.equip[s] && this.ch.equip[s].ancient ? 1 : 0), 0); } catch (e) { this.ancN = 0; } return r; };

  // ---------- kills ----------
  const _killed = GP.onEnemyKilled;
  GP.onEnemyKilled = function (e, by) {
    const id = this.scene === 'mine' ? tid(this) : null;
    const pl = by && by.pid !== undefined ? by : (by && by.owner && by.owner.pid !== undefined ? by.owner : null);
    if (e.thief && e.stolen) { this.dropGold(e.x, e.y, e.stolen * 1.5, pl ? pl.pid : -1); this.toast(pl, 'YOU GOT YOUR GOLD BACK - AND THEN SOME!', '#f2c94c'); }
    _killed.call(this, e, by);
    // powers work in every game, season or not
    if (pl && pl.S) {
      const pw = pl.S.powers;
      if (pw.has('moonhunger')) pl.heal(this, pl.S.hp * (this.fullMoon ? 0.04 : 0.02));
      if (pw.has('bonearmor')) { pl.boneSt = Math.min(10, (pl.boneSt || 0) + 1); pl.boneT = 3; }
      if (pw.has('lightthief')) { pl.torch = Math.min(100, (pl.torch || 0) + 3); if (pl.oil !== undefined) pl.oil = Math.min(100, pl.oil + 4); }
      if (pw.has('marrow') && !e.still && !e.boss && !e.minion && !e.goldrat && AH.rand() < 0.1 && this.raiseMinion) {
        const c = { id: e.id, x: e.x, y: e.y, spr: e.spr, sc: 1, face: e.face, t: 1, max: 1, maxHp: e.maxHp, def: e.def };
        this.raiseMinion(pl, c, 0.7); const a = this.allies[this.allies.length - 1]; if (a && pl.ch.cls !== 'necro') a.t = 20;
      }
    }
    if (!id) return;
    const th = TH[id];
    // the journal and the coin
    for (const p of this.players) {
      if (!S.active(p.ch)) continue;
      const mine = p === pl;
      if (e.still) { if (mine) { jAdd(p, 'obj'); AH.giveSig(this, p, (th.obj && th.obj.sig) || 2, e.x, e.y); } continue; }
      jAdd(p, 'kill');
      if (e.elite) jAdd(p, 'elite');
      if (e.legend && !e.boss) jAdd(p, 'legend');
      if (e.boss && !e.seasonHeart) jAdd(p, 'boss');
      if (e.sk) jAdd(p, 'sk');
      if (id === 's_bloodmoon' && this.fullMoon) jAdd(p, 'obj');
      if (!mine) continue;
      const big = e.boss ? 10 : e.legend ? 6 : e.nemesis ? 6 : 0;
      if (big) AH.giveSig(this, p, big, e.x, e.y);
      else if (e.elite && AH.rand() < (th.obj ? 0.35 : 0.5)) AH.giveSig(this, p, 1 + (AH.rand() < 0.4 ? 1 : 0), e.x, e.y);
      else if (e.sk && AH.rand() < (th.obj ? 0.25 : 0.4)) AH.giveSig(this, p, 1, e.x, e.y);
      // season legendaries now and then
      const ch = e.boss ? 0.15 : e.legend || e.nemesis ? 0.12 : e.elite ? 0.008 : 0;
      if (ch && AH.rand() < ch) this.dropItem(e.x, e.y, AH.seasonLegend(id, this.floorNo), p.pid);
    }
    if (!pl) return;
    // what each season does when something dies
    if (id === 's_winter') {
      pl.cold = Math.max(0, (pl.cold || 0) - 1);
      if (e.sk === 'wraith') { AH.fx.ring(this, e.x, e.y - 6, '#9ef0ff', 36); for (const p of this.players) if (!p.dead && AH.dist(p, e) < 40) { p.cold = Math.min(100, (p.cold || 0) + 15); p.slow = 1.2; } }
      if (e.sobj === 'icechest') { AH.Audio.sfx('break'); AH.fx.puff(this, e.x, e.y - 4, '#d8f4ff'); const rr = AH.rand(), it = AH.genItem(AH.rand, this.floorNo, { rarity: rr < 0.05 ? 3 : rr < 0.6 ? 2 : 1, mf: pl.S.mf + 60 }); this.dropItem(e.x, e.y, it, pl.pid); }
    }
    if (id === 's_bloodmoon' && !e.still) {
      pl.blood = Math.min(100, (pl.blood || 0) + (this.fullMoon ? 6 : 3) / HARD);
      if (pl.blood >= 100) { pl.blood = 0; pl.buffs.pact = pl.pactMax = pl.boonOn ? 24 : 12; jAdd(pl, 'mech'); AH.giveSig(this, pl, 2); this.banner('BLOOD PACT!', '#ff5a5a', 'MORE DAMAGE AND SPEED - BUT IT DRINKS YOUR LIFE'); AH.Audio.sfx('levelup'); AH.fx.ring(this, pl.x, pl.y - 8, '#ff5a5a', 30); }
      for (const o of this.enemies) if (!o.dead && o !== e && o.has('thirsty') && AH.dist(o, e) < 90) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.25); o.atkCd = 0; AH.fx.puff(this, o.x, o.y - 6, '#ff5a5a'); }
    }
    if (id === 's_gold') {
      if (e.sobj === 'seam') { for (let k = 0; k < 2; k++) this.dropGold(e.x + AH.rand.range(-6, 6), e.y + AH.rand.range(-4, 4), 8 + this.floorNo * 3, pl.pid); AH.Audio.sfx('ore'); }
      if (e.has('gilded')) this.dropGold(e.x, e.y, (10 + this.floorNo * 5) * 1.5, pl.pid);
      if (e.rival) { jAdd(pl, 'mech'); if (!this.enemies.some(o => !o.dead && o.rival)) { this.banner('THE RIVAL PROSPECTORS ARE BEATEN!', '#f2c94c'); AH.giveSig(this, pl, 5, e.x, e.y); } }
    }
    if (id === 's_shadow') {
      if (e.sobj === 'lightcrystal') { pl.oil = Math.min(100, (pl.oil === undefined ? 100 : pl.oil) + 35); this.map.lights.push({ x: e.x, y: e.y - 6, r: 84, i: 0.95, tint: [1.15, 1.05, 0.75], crystal: 1 }); AH.fx.puff(this, e.x, e.y - 6, '#fff4b0'); this.toast(pl, 'YOUR LANTERN DRINKS THE LIGHT', '#e8c860'); }
      if (e.shadowDouble) { jAdd(pl, 'mech'); AH.giveSig(this, pl, 6, e.x, e.y); this.banner('YOUR SHADOW IS BROKEN', '#a07ad8'); this.dropItem(e.x, e.y, AH.genItem(AH.rand, this.floorNo, { rarity: 3, mf: 200 }), pl.pid); }
    }
    if (id === 's_depth') {
      if ((e.legend || e.boss) && !e.seasonHeart) { pl.ch.trophies = (pl.ch.trophies || 0) + 1; this.toast(pl, 'A TROPHY FOR THE TOWN WALL', '#6fd6e8'); }
      if (e.has('abyssal')) { const x = e.x, y = e.y, dm = e.dmg; this.telegraph(x, y, 26, 0.9, () => { this.explosion(x, y, 26, dm, 'enemy'); AH.fx.puff(this, x, y, '#3a5a8a'); }); }
    }
    if (id === 's_storm') {
      pl.charge = Math.min(100, (pl.charge || 0) + 1 / HARD);
      if (e.sobj === 'rod') {
        pl.charge = Math.min(100, pl.charge + 25 / HARD);
        this.banner('THE ROD DISCHARGES!', '#ffe04a');
        for (let k = 0; k < 4; k++) setTimeout(() => {
          if (this.scene !== 'mine') return;
          const t = AH.rand.pick(this.enemies.filter(o => !o.dead && !o.hidden && !o.still && AH.dist(o, e) < 120));
          if (!t) return; AH.fx.bolt(this, t.x, t.y - 80, t.x, t.y - 6); this.lightning = 0.1; AH.Audio.sfx('thunder');
          t.hurt(this, pl.rollDamage(1.2, { noCrit: true }).dmg + this.floorNo * 2, pl, { color: '#ffe04a' });
        }, 200 + k * 250);
      }
      if (e.sk === 'sprite') { const x = e.x, y = e.y, dm = e.dmg * 0.6; this.explosion(x, y, 18, dm, 'enemy'); }
      if (pl.charge >= 100 && !(pl.buffs.superc > 0)) { pl.charge = 0; pl.buffs.superc = 12; jAdd(pl, 'mech'); this.banner('SUPERCHARGED!', '#ffe04a', 'YOUR HITS CALL CHAIN LIGHTNING'); AH.Audio.sfx('levelup'); }
    }
    if (id === 's_ancient' && e.ancestor) {
      jAdd(pl, 'mech'); AH.giveSig(this, pl, 8, e.x, e.y);
      const n = pl.boonOn ? 2 : 1;
      for (let k = 0; k < n; k++) { const it = AH.genItem(AH.rand, this.floorNo + 2, { rarity: 3, mf: 300 }); if (AH.makeAncient) AH.makeAncient(it); this.dropItem(e.x, e.y, it, pl.pid); }
      this.banner(e.name + ' RESTS AGAIN', '#ff9a3e', 'AN ANCIENT GIFT REMAINS');
    }
  };

  // ---------- entering a floor ----------
  const _enter = GP.enterMine;
  GP.enterMine = function (floor, mode) {
    const fromTown = this.scene !== 'mine';
    const jumped = this.deepJump; this.deepJump = false;
    const c0 = S.now(), pre = c0 && TH[c0.theme.id] && this.mode !== 'weekly' && this.mode !== 'time' && this.players.every(p => S.active(p.ch)) ? c0.theme.id : null;
    if (fromTown) for (const p of this.players) { p.tripStart = floor; p.tripGold = 0; p.cold = 0; p.oil = 100; p.charge = 0; p.blood = 0; p.boonOn = !!(pre && p.ch.boon === pre); if (p.boonOn) p.ch.boon = null; }
    _enter.call(this, floor, mode);
    const id = tid(this);
    this.fullMoon = false; this.enemySpdBonus = 0; this.wind = null; this.deepCurse = false;
    for (const p of this.players) if (id === 's_storm' && p.boonOn) p.charge = Math.max(p.charge || 0, 50);
    if (!id) return;
    const th = TH[id], f = floor, isBoss = f % 10 === 0;
    const rng = AH.mulberry((this.mapSeed || 7) ^ 0x7e11);
    if (fromTown) this.banner(S.now().theme.name, S.now().theme.col, th.say);
    if (id === 's_bones') for (const p of this.players) if (p.boonOn && !p.remote && this.raiseMinion) {
      const def = AH.findCreature('BONE WALKER'); const c = { id: AH.uid(), x: p.x + 12, y: p.y, spr: AH.creatureSprite(def), sc: 1, face: 1, t: 1, max: 1, maxHp: 50, def };
      this.raiseMinion(p, c, 1); const a = this.allies[this.allies.length - 1]; if (a && p.ch.cls !== 'necro') a.t = 120;
    }
    if (jumped) {
      if (this.players.some(p => p.boonOn)) this.banner('THE ROPE HOLDS', '#6fd6e8', 'THE DEEP LETS YOU PASS');
      else { for (const e of this.enemies) { e.maxHp = Math.round(e.maxHp * 1.3); e.hp = e.maxHp; } this.deepCurse = true; this.banner('THE DEEP HAS NOTICED YOU', '#6fd6e8', 'TOUGHER FOES - RICHER TREASURE'); }
    }
    if (isBoss) return;
    // gold rush: a rival crew works this floor
    if (id === 's_gold' && rng() < 0.25) {
      const r = rng.pick(this.map.rooms.filter(x => x !== this.map.startRoom)) || this.map.stairsRoom;
      const base = AH.findCreature('TUNNEL GOBLIN');
      const def = Object.assign({}, SPA.creatureDef({ name: 'RIVAL PROSPECTOR', spr: 'goblin', pal: { g: '#b8a070', G: '#7a6a4a', c: '#5a3a1a', C: '#3a2410', e: '#ffe04a' }, ai: 'chase', hm: 1, dm: 1, spd: base ? base.spd : 1.1 }, f));
      for (let k = 0; k < 3; k++) { const pos = this.map.randomFloorIn(r, rng); const e = new AH.Enemy(def, pos.x, pos.y, f, { elite: ['gilded'], players: this.players.length, hpMult: 2.4, dmgMult: 1.2, xpMult: 4 }); e.name = 'RIVAL PROSPECTOR'; e.rival = true; this.enemies.push(e); }
      this.banner('RIVAL PROSPECTORS!', '#f2c94c', 'THEY ARE DIGGING YOUR GOLD');
    }
    // time of shadows: your own shadow waits on some floors
    if (id === 's_shadow' && rng() < 0.2) {
      const p = this.players[0], r = rng.pick(this.map.rooms.filter(x => x !== this.map.startRoom)) || this.map.stairsRoom, pos = this.map.randomFloorIn(r, rng);
      const def = Object.assign(SPA.creatureDef({ name: 'SHADOW', spr: 'cultist', pal: { p: '#16121e', P: '#06040a', k: '#000000', e: '#a07ad8', f: '#2a2438', g: '#a07ad8' }, ai: 'spit', hm: 1, dm: 1.1, spd: 1.1 }, f), { proj: '#a07ad8' });
      const e = new AH.Enemy(def, pos.x, pos.y, f, { elite: ['spectral', 'umbral'], players: this.players.length, hpMult: 7, dmgMult: 1.3, xpMult: 10, scale: 1.2, noHide: true });
      e.name = 'SHADOW OF ' + (p.ch.name || 'HERO'); e.shadowDouble = true; e.title = 'IT WEARS YOUR FACE'; this.enemies.push(e);
      this.banner('SOMETHING WEARS YOUR SHAPE...', '#a07ad8');
    }
  };
  // town: the trip is over
  const _enterTown = GP.enterTown;
  GP.enterTown = function (why) {
    _enterTown.call(this, why);
    for (const p of this.players) { p.cold = 0; p.tripGold = 0; p.blood = 0; p.charge = 0; p.oil = 100; p.boonOn = false; if (p.buffs) { p.buffs.pact = 0; p.buffs.superc = 0; } p.warmed = null; }
    this.fullMoon = false; this.enemySpdBonus = 0; this.deepCurse = false; this.wind = null;
    const id = tid(this); if (!id) return;
    const W = this.world;
    if (id === 's_winter') W.weather = AH.rand() < 0.8 ? 'snow' : 'fog';
    if (id === 's_storm') W.weather = AH.rand() < 0.6 ? 'storm' : 'rain';
    if (id === 's_shadow' && AH.rand() < 0.6) W.weather = 'fog';
  };
  const _newDay = GP.newDay;
  GP.newDay = function () {
    _newDay.call(this);
    const id = tid(this), W = this.world;
    if (id === 's_winter') W.weather = AH.rand() < 0.8 ? 'snow' : 'fog';
    if (id === 's_storm') W.weather = AH.rand() < 0.6 ? 'storm' : 'rain';
    if (id === 's_shadow' && AH.rand() < 0.6) W.weather = 'fog';
    // gold rush investments pay out (or not) every morning
    for (const p of this.players) {
      const iv = p.ch.invest; if (!iv || p.remote) continue;
      p.ch.invest = null; const r = AH.rand();
      const k = r < 0.15 ? 0 : r < 0.65 ? 1.3 : r < 0.95 ? 1.8 : 3;
      const back = Math.round(iv * k); p.ch.gold += back;
      this.banner(k === 0 ? 'THE SHAFT COLLAPSED!' : 'YOUR SHAFT PAID OUT!', k === 0 ? '#ff8a8a' : '#f2c94c', k === 0 ? 'YOUR GOLD IS UNDER THE ROCKS' : '+' + back + 'G');
    }
  };

  // ---------- every frame in the mine ----------
  const _upd = GP.update;
  GP.update = function (dt) {
    _upd.call(this, dt);
    if (this.scene !== 'mine' || this.paused) return;
    if (this.lightning > 0) this.lightning = Math.max(0, this.lightning - dt); // a flash fades in the mine too
    const id = tid(this); if (!id) return;
    if (id === 's_bloodmoon') {
      this.moonT = (this.moonT || 0) + dt;
      const full = this.moonT % 100 > 70;
      if (full && !this.fullMoon) { this.banner('THE BLOOD MOON IS FULL!', '#ff5a5a', 'THE BEASTS GO WILD - BLOOD FLOWS'); AH.Audio.sfx('warn'); }
      if (!full && this.fullMoon) this.banner('THE MOON WANES', '#a39bb0');
      this.fullMoon = full; this.enemySpdBonus = full ? 0.2 : 0;
    }
    if (id === 's_storm') {
      this.windT = (this.windT === undefined ? 20 : this.windT) - dt;
      if (this.wind && this.wind.t > 0) {
        this.wind.t -= dt;
        for (const pr of this.projs) { pr.vx += this.wind.x * 90 * dt; pr.vy += this.wind.y * 50 * dt; }
        if (Math.random() < dt * 30) { const v = this.players[0]; if (v) this.fx.push({ k: 'px', x: v.x + AH.rand.range(-160, 160), y: v.y + AH.rand.range(-90, 90), vx: this.wind.x * 160, vy: this.wind.y * 90, col: 'rgba(200,210,240,0.6)', life: 0.6 }); }
      }
      if (this.windT <= 0) { this.windT = AH.rand.range(25, 40); const a = AH.rand() * Math.PI * 2; this.wind = { x: Math.cos(a), y: Math.sin(a), t: 5 }; this.banner('A GUST OF WIND!', '#c8d4f0'); AH.Audio.sfx('dodge'); }
    }
  };
  // a kobold running off with your gold
  const _flee = GP.updateFlee;
  GP.updateFlee = function (e, dt) {
    if (!e.thief) return _flee.call(this, e, dt);
    e.fleeT -= dt; if (e.flash > 0) e.flash -= dt;
    const T2 = e.target(this); if (!T2) return;
    const a = Math.atan2(e.y - T2.p.y, e.x - T2.p.x) + Math.sin(this.time * 3) * 0.6;
    this.moveEntity(e, Math.cos(a) * e.spd * 1.1 * dt, Math.sin(a) * e.spd * 1.1 * dt, 3);
    e.face = Math.cos(a) > 0 ? 1 : -1;
    if (Math.random() < dt * 3) AH.fx.spark(this, e.x, e.y - 3, '#f2c94c', 1);
    if (e.fleeT <= 0) { e.gone = true; AH.fx.puff(this, e.x, e.y, '#f2c94c'); this.toast(null, 'THE KOBOLD ESCAPED WITH YOUR GOLD!', '#ff8a8a'); }
  };
  // a shade is weak where a crystal burns
  SPA.inCrystalLight = function (G, e) { return !!(G.map && G.map.lights && G.map.lights.some(l => l.crystal && Math.hypot(l.x - e.x, l.y - e.y) < 80)); };
  // the lantern: light shrinks as the oil runs out
  const R = AH.Render.prototype;
  const _lights = R.collectLights;
  R.collectLights = function (G, v) {
    if (G.scene !== 'mine' || tid(G) !== 's_shadow') return _lights.call(this, G, v);
    const save = G.players.map(p => p.S.light);
    G.players.forEach(p => { p.S.light -= (1 - (p.oil === undefined ? 100 : p.oil) / 100) * 60; });
    try { return _lights.call(this, G, v); } finally { G.players.forEach((p, i) => { p.S.light = save[i]; }); }
  };

  // ---------- floor props: braziers, bone piles, chasms, crypts ----------
  const _find = GP.findInteract;
  GP.findInteract = function (p) {
    let best = _find.call(this, p);
    if (this.scene !== 'mine' || !this.map || !tid(this)) return best;
    let bd = best ? Math.hypot(p.x - best.x, p.y - best.y) : 99;
    for (const pr of this.map.props) {
      let lab = null, r = 20;
      if (pr.type === 's_bonepile' && !pr.used) lab = 'RAISE THE BONES';
      else if (pr.type === 's_chasm') { lab = 'JUMP INTO THE CHASM'; r = 22; }
      else if (pr.type === 's_crypt' && !pr.open) lab = 'OPEN THE CRYPT';
      if (!lab) continue;
      const d = Math.hypot(p.x - pr.x, p.y - pr.y);
      if (d < r && d < bd) { bd = d; best = { kind: pr.type, obj: pr, label: lab, x: pr.x, y: pr.y }; }
    }
    return best;
  };
  const _inter = GP.interact;
  GP.interact = function (p, it) {
    if (!it || ['s_bonepile', 's_chasm', 's_crypt'].indexOf(it.kind) < 0) return _inter.call(this, p, it);
    if (p.remote && !this.isHost) return;
    const pr = it.obj;
    if (it.kind === 's_bonepile') {
      pr.used = true; jAdd(p, 'mech'); AH.giveSig(this, p, 1, pr.x, pr.y);
      const def = AH.findCreature(this.floorNo > 50 ? 'ROTTEN DEAD' : 'BONE WALKER') || AH.findCreature('BONE WALKER');
      const c = { id: AH.uid(), x: pr.x, y: pr.y, spr: AH.creatureSprite(def), sc: 1, face: 1, t: 1, max: 1, maxHp: 60, def };
      this.raiseMinion(p, c, 1.1); const a = this.allies[this.allies.length - 1]; if (a && p.ch.cls !== 'necro') a.t = 45;
      this.toast(p, 'THE BONES STAND UP FOR YOU', '#e2dcc8');
    }
    if (it.kind === 's_chasm') {
      if (this.mode !== 'story') { this.toast(p, 'THE CHASM IS TOO DEEP FOR THIS RUN', '#a39bb0'); return; }
      const f = this.floorNo, boss = Math.ceil((f + 1) / 10) * 10, target = Math.min(f + 3, boss);
      if (target <= f + 1) { this.toast(p, 'THE CHASM ENDS IN THE GUARDIAN\'S HALL BELOW', '#a39bb0'); return; }
      for (const q of this.players) jAdd(q, 'mech');
      AH.giveSig(this, p, 3);
      this.deepJump = true; AH.Audio.sfx('stairs'); this.shake(4);
      this.banner('YOU LEAP INTO THE DARK...', '#6fd6e8', 'FLOOR ' + target);
      this.enterMine(target, this.mode);
    }
    if (it.kind === 's_crypt') {
      pr.open = true; AH.Audio.sfx('door'); this.shake(3);
      const e = SPA.spawnAncestor(this, pr.x, pr.y + 12);
      this.banner(e.name, '#ff9a3e', 'RETURNED FROM THE CRYPT');
    }
  };
  // the ancestors: heroes of earlier seasons from the leaderboard, legends of this town, or the old founders
  const FOUNDERS = ['ALDRIC THE FIRST', 'MIRA STONEHAND', 'OLD BRANN', 'SISTER ELWEN', 'KORVATH', 'THE GREY WARDEN', 'HALVARD', 'IDA OF THE LAMP'];
  SPA.ancestors = function () {
    const out = []; const c = S.now(); const d = AH.Board && AH.Board.data;
    if (d && d.seasons && c) for (const n in d.seasons) if (+n < c.n) for (const h of (d.seasons[n].heroes || []).slice(0, 10)) out.push({ name: h.h, cls: h.c });
    for (const L of (AH.options && AH.options.legends) || []) if (L && L.name) out.push({ name: L.name, cls: L.cls });
    if (!out.length) for (const n of FOUNDERS) out.push({ name: n, cls: AH.rand.pick(['paladin', 'rogue', 'wizard', 'necro', 'barb']) });
    return out;
  };
  SPA.spawnAncestor = function (G, x, y) {
    const a = AH.rand.pick(SPA.ancestors()), cls = AH.CLASSES[a.cls] ? a.cls : 'paladin', col = AH.CLASSES[cls].color;
    const abil = { paladin: ['nova', 'enrage'], rogue: ['blink', 'spit3'], wizard: ['spit3', 'nova', 'blink'], necro: ['summon', 'spit3'], barb: ['nova', 'rain', 'enrage'], priest: ['nova', 'summon'] }[cls] || ['nova'];
    const def = Object.assign(SPA.creatureDef({ name: 'ANCESTOR', spr: cls === 'necro' || cls === 'barb' ? 'skel' : 'ghost', pal: { w: '#e8d8a8', W: col, e: '#ff9a3e', k: '#ff9a3e', b: '#e8d8a8', B: col }, ai: cls === 'wizard' || cls === 'necro' || cls === 'rogue' ? 'spit' : 'charge', hm: 1, dm: 1, spd: 1.0 }, G.floorNo), { proj: col, minion: AH.biomeCreaturesFor(G.floorNo)[0].name });
    const e = new AH.Enemy(def, x, y, G.floorNo, { legend: { abil }, hpMult: 14, dmgMult: 1.8, xpMult: 20, scale: 1.6, players: G.players.length, noHide: true, aggro: true });
    e.name = AH.tr(a.name) + ' THE ANCESTOR'; e.title = 'RETURNED FROM THE CRYPT'; e.ancestor = true;
    G.enemies.push(e); return e;
  };

  // ---------- after its season, a power stays in the world ----------
  const _roll = GP.rollLoot;
  GP.rollLoot = function (x, y, src, p) {
    if (this.deepCurse && p && p.S) { p.S.mf += 100; try { _roll.call(this, x, y, src, p); } finally { p.S.mf -= 100; } }
    else _roll.call(this, x, y, src, p);
    if (!src || !(src.legend || src.boss || src.nemesis) || !p || tid(this)) return;
    const c = S.now(); if (!c || c.n < 2 || AH.rand() > 0.06) return;
    const past = AH.SEASON_THEMES.slice(0, Math.min(8, c.n - 1)).map(t => t.id).filter(i => TH[i]);
    if (past.length) this.dropItem(x, y, AH.seasonLegend(AH.rand.pick(past), this.floorNo), p.pid);
  };
  SPA.PW_ITEM = PW_ITEM;
})();
