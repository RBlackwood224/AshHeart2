'use strict';
// Seasons: every 8 weeks a new theme. Seasonal heroes start from nothing, live under the season's rule,
// feel the Ashheart's pulse, and together dig the shared shaft. When the season ends a seasonal hero
// either stays (as a normal hero) or becomes a legend of Dunmere: a statue in town and an heirloom for every other hero.
(function () {
  const U = AH.UI;
  const DAY = 864e5, LEN = 56 * DAY;
  const START = Date.UTC(2026, 9, 26); // Monday 26 October 2026: season 1
  AH.SEASON_THEMES = [
    { id: 's_winter', name: 'ASHEN WINTER', col: '#9ef0ff', desc: 'COLD CREEPS THROUGH THE MINE: YOUR FIRE BURNS TWICE AS HOT.', item: { name: 'FROSTFIRE CROWN', base: 'helm', legend: 'burnground' } },
    { id: 's_bloodmoon', name: 'BLOOD MOON', col: '#ff5a5a', desc: 'MONSTERS ARE STRONGER, BUT DROP MORE TREASURE.', item: { name: 'MOONFANG', base: 'dagger', legend: 'emberheart' } },
    { id: 's_bones', name: 'SEASON OF BONES', col: '#e2dcc8', desc: 'SOME SLAIN MONSTERS RISE AND FIGHT FOR YOU.', item: { name: 'THE OSSUARY KEY', base: 'amulet', legend: 'thirst' } },
    { id: 's_gold', name: 'GOLD RUSH', col: '#f2c94c', desc: 'DOUBLE GOLD EVERYWHERE, BUT MONSTERS STEAL FROM YOU.', item: { name: 'MIDAS GRIP', base: 'gloves', legend: 'goldheal' } },
    { id: 's_shadow', name: 'TIME OF SHADOWS', col: '#a07ad8', desc: 'MANY MONSTERS HIDE IN THE DARK. EVERY HERO HAS THE CANARY\'S EYE.', item: { name: 'NIGHTGLASS CLOAK', base: 'cloak', legend: 'frostdodge' } },
    { id: 's_depth', name: 'CALL OF THE DEEP', col: '#6fd6e8', desc: 'A LEGENDARY BEAST WAITS HALFWAY THROUGH EVERY TEN FLOORS.', item: { name: 'DEEPCALLER', base: 'greatsword', legend: 'triple' } },
    { id: 's_storm', name: 'STORM SEASON', col: '#ffe04a', desc: 'LIGHTNING STRIKES THE MINE. IT HURTS MONSTERS MOST.', item: { name: 'STORMCROWN', base: 'greathelm', legend: 'chaincrit' } },
    { id: 's_ancient', name: 'RETURN OF THE ANCIENTS', col: '#ff9a3e', desc: 'ANCIENT ITEMS FALL THREE TIMES AS OFTEN.', item: { name: 'ELDER BAND', base: 'ring', legend: 'killboom' } },
  ];
  AH.SEASON_RULES = AH.SEASON_THEMES.map(t => ({ id: t.id, kind: 'season', name: t.name, desc: t.desc }));
  const S = AH.Season = {};
  S.at = function (t) {
    t = t === undefined ? Date.now() : t;
    if (t < START) return null;
    const i = Math.floor((t - START) / LEN), st = START + i * LEN;
    return { n: i + 1, theme: AH.SEASON_THEMES[i % AH.SEASON_THEMES.length], start: st, end: st + LEN };
  };
  S.now = () => S.at();
  S.ofWeek = function (key) { // the season a weekly key belongs to (its Thursday)
    const y = +key.slice(0, 4), w = +key.slice(6);
    const jan4 = Date.UTC(y, 0, 4), day = new Date(jan4).getUTCDay() || 7;
    const mon1 = jan4 - (day - 1) * DAY;
    return S.at(mon1 + (w - 1) * 7 * DAY + 3 * DAY);
  };
  S.leftText = function () { const c = S.now(); if (!c) return ''; const d = Math.ceil((c.end - Date.now()) / DAY); return d + ' ' + AH.tr('DAYS'); };
  S.name = n => { const c = S.at(START + (n - 1) * LEN + DAY); return c ? c.theme.name : ''; };
  S.isSeasonal = ch => !!(ch && ch.season);
  S.active = ch => { const c = S.now(); return !!(c && ch && ch.season === c.n); };
  // the shared shaft: milestones count for every seasonal hero
  S.MILES = [{ d: 100, lab: '+10% GOLD FOR SEASONAL HEROES' }, { d: 250, lab: '+10% EXPERIENCE FOR SEASONAL HEROES' }, { d: 500, lab: 'THE HEART CHAMBER OPENS' }, { d: 1000, lab: '+20% MAGIC FIND FOR SEASONAL HEROES' }];
  S.shaft = function () { const c = S.now(); const d = AH.Board && AH.Board.data; return c && d && d.seasons && d.seasons[c.n] ? d.seasons[c.n].shaft || 0 : 0; };
  S.mile = i => S.shaft() >= S.MILES[i].d;
  S.heartOpen = () => { const c = S.now(); return !!c && (S.mile(2) || c.end - Date.now() < 14 * DAY); };

  // which rules a session lives under
  AH.seasonRulesFor = function (G) {
    const set = new Set(); const c = S.now();
    if (c && G.players.length && G.players.every(p => p.ch && p.ch.season === c.n)) { set.add(c.theme.id); set.add('pulse'); }
    return set;
  };
  // numbers: shared-shaft boons and the season's own touch
  const _ruleStats = AH.ruleStats;
  AH.ruleStats = function (Sx, ch) {
    _ruleStats(Sx, ch);
    if (!S.active(ch)) return;
    if (S.mile(0)) Sx.gold += 10;
    if (S.mile(3)) Sx.mf += 20;
    if (AH.game && AH.game.rules && AH.game.rules.has('s_shadow')) Sx.light += 10;
  };
  const _gain = AH.Player.prototype.gainXp;
  AH.Player.prototype.gainXp = function (G, n) {
    if (S.active(this.ch) && S.mile(1)) n *= 1.1;
    const L = (AH.options && AH.options.legends) || []; if (L.length) n *= 1 + 0.03 * Math.min(5, L.length); // legends of Dunmere teach everyone
    return _gain.call(this, G, n);
  };

  // ---------- the Ashheart's pulse ----------
  const PERIOD = 600, WAVE = 60;
  const _update = GG.update;
  GG.update = function (dt) {
    _update.call(this, dt);
    if (this.scene !== 'mine' || this.paused || !this.rules || !this.rules.has('pulse')) { this.pulse = false; return; }
    this.pulseClock = (this.pulseClock || 0) + dt;
    const ph = this.pulseClock % PERIOD, on = ph > PERIOD - WAVE;
    if (on && !this.pulse) { this.banner('THE ASHHEART PULSES!', '#ff5a4a', 'MONSTERS RAGE - TREASURE FLOWS'); AH.Audio.sfx('warn'); this.shake(4); }
    if (!on && this.pulse) this.banner('THE PULSE FADES', '#a39bb0');
    this.pulse = on;
    if (on) { this.beatT = (this.beatT || 0) - dt; if (this.beatT <= 0) { this.beatT = 1.1; AH.Audio.sfx('heavy'); } }
    // gold rush: monsters that hit you take a little gold
  };
  const _hurt = AH.Player.prototype.hurt;
  AH.Player.prototype.hurt = function (G, dmg, src, raw) {
    if (G && G.pulse && src && !raw) dmg *= 1.3;
    const d = _hurt.call(this, G, dmg, src, raw);
    if (d > 0 && src && !raw && AH.rule('s_gold') && this.ch.gold > 0 && AH.rand() < 0.25) { const g = Math.max(1, Math.round(this.ch.gold * 0.01)); this.ch.gold -= g; AH.fx.num(G, this.x, this.y - 30, '-' + g + 'G', '#f2c94c'); }
    return d;
  };
  // the pulse doubles treasure
  const _loot = GG.rollLoot;
  GG.rollLoot = function (x, y, src, p) { _loot.call(this, x, y, src, p); if ((this.pulse || AH.rule('s_bloodmoon')) && AH.rand() < (this.pulse ? 0.06 : 0.03)) this.dropItem(x, y, AH.genItem(AH.rand, this.floorNo, { mf: p.S.mf + 80 }), p.pid); };
  AH.pulseHud = function (G, ctx, RW, RH) {
    if (!G.pulse) return;
    const a = 0.12 + 0.1 * Math.sin(G.time * 6);
    ctx.fillStyle = 'rgba(200,30,20,' + a + ')';
    ctx.fillRect(0, 0, RW, 3); ctx.fillRect(0, RH - 3, RW, 3); ctx.fillRect(0, 0, 3, RH); ctx.fillRect(RW - 3, 0, 3, RH);
  };

  // ---------- the season's heart ----------
  AH.spawnSeasonHeart = function (G, x, y) {
    const c = S.now(), cut = 1 - Math.min(0.5, S.shaft() / 2000);
    const def = { name: 'HEART OF ' + (c ? c.theme.name : 'ASH'), spr: 'heart', pal: {}, ai: 'spit', hp: 700, dmg: 55, spd: 0.3, xp: 1500, minion: 'HELL IMP', proj: c ? c.theme.col : '#ff8a2e' };
    const e = new AH.Enemy(def, x, y, G.floorNo, { boss: true, hpMult: 5 * cut, scale: 2.3, players: G.players.length, legend: { abil: ['nova', 'spit3', 'summon', 'enrage'] }, name: def.name, noHide: true });
    e.seasonHeart = true; e.title = 'THE SEASON\'S HEART'; e.aggro = true;
    G.enemies.push(e); return e;
  };
  const _killed = GG.onEnemyKilled;
  GG.onEnemyKilled = function (e, by) {
    _killed.call(this, e, by);
    if (!e.seasonHeart) return;
    this.heartRun = false;
    const c = S.now(); if (!c) return;
    this.banner('THE SEASON\'S HEART IS STILLED!', c.theme.col, c.theme.name);
    for (const p of this.players) {
      if (p.remote) continue;
      p.ch.titles = p.ch.titles || []; const t = 'HEARTBREAKER OF ' + c.theme.name; if (p.ch.titles.indexOf(t) < 0) p.ch.titles.push(t);
      p.ch.heartKills = p.ch.heartKills || {};
      if (!p.ch.heartKills[c.n]) { p.ch.heartKills[c.n] = 1; this.dropItem(e.x, e.y, S.seasonItem(c, Math.max(this.floorNo, 20)), p.pid); }
    }
  };
  S.seasonItem = function (c, f) {
    const d = c.theme.item, it = AH.genItem(AH.rand, f + 4, { rarity: 3, base: d.base, noSet: true });
    it.name = d.name; it.legend = d.legend; it.seasonal = c.n; it.affixes.forEach(a => a.v = Math.round(a.v * 1.25)); delete it.bargain; delete it.unid; delete it.cursed;
    return it;
  };
  // the cloak of the season: wear any cloak in the season's colour after floor 30
  S.cloakCol = ch => ch && ch.seasonCloak ? (AH.SEASON_THEMES[(ch.seasonCloak - 1) % AH.SEASON_THEMES.length] || {}).col : null;
  const _enter = GG.enterMine;
  GG.enterMine = function (floor, mode) {
    _enter.call(this, floor, mode);
    const c = S.now();
    for (const p of this.players) if (c && p.ch.season === c.n && floor >= 30 && !p.ch.seasonCloak) { p.ch.seasonCloak = c.n; if (!p.remote) this.banner('SEASON CLOAK EARNED', c.theme.col, 'YOUR CLOAK NOW WEARS THE COLOURS OF ' + c.theme.name); p.buildLook(); }
    if (this.heartRun) { this.bossSpawned = false; this.bossDead = false; if (this.map.stairs) this.map.stairs.locked = true; this.banner('THE HEART CHAMBER', c ? c.theme.col : '#ff5a4a', 'THE SEASON\'S HEART BEATS AHEAD'); }
  };
  const _leave = GG.leaveMine;
  GG.leaveMine = function (why) { this.heartRun = false; _leave.call(this, why); };

  // ---------- the end of a season: stay, or become a legend ----------
  const _start = GG.startSession;
  GG.startSession = function (slotIdx, device) {
    _start.call(this, slotIdx, device);
    const p = this.players[0]; const c = S.now();
    if (p && p.ch.season && (!c || p.ch.season !== c.n)) this.openMenu('seasonend', p);
  };
  U.init.seasonend = function (G, m) { m.sel = 0; m.step = 0; m.pick = 0; };
  U.update.seasonend = function (G, m, dt) {
    const p = m.p, ch = p.ch;
    if (m.step === 0) {
      U.listUpdate(G, m, dt, [{ id: 'keep' }, { id: 'legend' }], it => {
        if (it.id === 'keep') { ch.seasonDone = ch.season; ch.season = null; G.saveAll(); G.closeMenu(); G.banner('A HERO OF DUNMERE', '#f2c94c', ch.name + ' STAYS'); }
        else { m.step = 1; m.sel = 0; }
      });
      return;
    }
    const items = AH.EQUIP_SLOTS.map(s => ch.equip[s]).filter(x => x && !x.loaner);
    U.listUpdate(G, m, dt, items.concat([{ back: 1 }]), (it, i) => {
      if (it.back) { m.step = 0; m.sel = 1; return; }
      G.openMenu('confirm', p, { text: 'BECOME A LEGEND? THE HERO RETIRES.', yes: () => S.makeLegend(G, p, items[i]) });
    }, () => { m.step = 0; m.sel = 1; });
  };
  S.makeLegend = function (G, p, item) {
    const o = AH.options, ch = p.ch;
    o.legends = o.legends || [];
    const heir = JSON.parse(JSON.stringify(item)); heir.heirloom = ch.name; heir.req = null; delete heir.cursed;
    o.legends.push({ name: ch.name, cls: ch.cls, level: ch.level, season: ch.season, deepest: ch.deepest, item: heir, id: Date.now() });
    AH.Save.setOptions(o);
    const slots = AH.Save.load(); const i = slots.findIndex(s => s && s.ch && s.ch.created === ch.created); if (i >= 0) { slots.splice(i, 1); AH.Save.store(slots); }
    G.closeAllMenus(); G.quitToTitle(true);
    G.banner(ch.name + ' BECOMES A LEGEND OF DUNMERE', '#f2c94c', 'A STATUE RISES BY THE WELL');
    AH.Audio.sfx('legend');
  };
  U.draw.seasonend = function (G, ctx, m) {
    U.bg(ctx); const ch = m.p.ch;
    U.title(ctx, 'THE SEASON HAS ENDED', 20);
    AH.text(ctx, AH.UW / 2, 44, ch.name + ' - ' + AH.tr(S.name(ch.season)), '#f2e3b3', { align: 'center' });
    if (m.step === 0) {
      const rows = [{ label: 'STAY A HERO OF DUNMERE', right: '' }, { label: 'BECOME A LEGEND', right: '' }];
      U.list(ctx, rows, m.sel, 110, 70, 260, { lh: 18 });
      const d = m.sel === 0 ? 'YOUR HERO STAYS WITH EVERYTHING. FROM NOW ON A NORMAL HERO.' : 'YOUR HERO RETIRES: A STATUE IN TOWN, ONE OF THEIR ITEMS IN THE STASH OF EVERY OTHER HERO OF YOURS, AND +3% EXPERIENCE FOR ALL YOUR HEROES (UP TO 5 LEGENDS).';
      AH.wrap(d, 400).forEach((l, i) => AH.text(ctx, AH.UW / 2, 130 + i * 10, l, '#a39bb0', { align: 'center' }));
    } else {
      AH.text(ctx, AH.UW / 2, 64, 'CHOOSE THE HEIRLOOM', '#ffb347', { align: 'center' });
      const items = AH.EQUIP_SLOTS.map(s => ch.equip[s]).filter(x => x && !x.loaner);
      U.list(ctx, items.map(it => ({ label: it.name, col: AH.RARITY[it.rarity || 0].col })).concat([{ label: 'BACK' }]), m.sel, 40, 80, 200, { lh: 14 });
      const it = items[m.sel]; if (it) U.itemPanel(G, ctx, it, 260, 76, 200, 170, ch.cls);
    }
  };
  // heirlooms find every other hero in town
  const _town = GG.enterTown;
  GG.enterTown = function (why) {
    _town.call(this, why);
    const L = (AH.options && AH.options.legends) || []; if (!L.length || !this.world || this.isRun()) return;
    const p = this.players[0]; if (!p || p.remote || p.slotIdx < 0) return;
    p.ch.heirlooms = p.ch.heirlooms || [];
    let n = 0;
    for (const lg of L) {
      if (p.ch.heirlooms.indexOf(lg.id) >= 0) continue;
      p.ch.heirlooms.push(lg.id);
      const it = JSON.parse(JSON.stringify(lg.item)); it.id = AH.uid();
      const i = this.world.stash.indexOf(null); if (i >= 0) { this.world.stash[i] = it; n++; } else if (p.addItem(it)) n++;
    }
    if (n) { this.banner('AN HEIRLOOM WAITS IN YOUR STASH', '#f2c94c', 'A GIFT FROM A LEGEND OF DUNMERE'); this.saveAll(); }
    if (!(AH.options && AH.options.noSeasonNews)) {
      const c = S.now(); const o = AH.options;
      if (c && o.seasonSeen !== c.n && why === 'start') { o.seasonSeen = c.n; AH.Save.setOptions(o); this.banner(AH.tr('SEASON') + ' ' + c.n + ': ' + AH.tr(c.theme.name), c.theme.col, c.theme.desc); }
    }
  };
})();

AH.addI18n(`
ASHEN WINTER|HIVER DE CENDRE|HAMVAS TÉL
COLD CREEPS THROUGH THE MINE: YOUR FIRE BURNS TWICE AS HOT.|LE FROID ENVAHIT LA MINE : TON FEU BRÛLE DEUX FOIS PLUS FORT.|HIDEG KÚSZIK A BÁNYÁBAN: A TÜZED KÉTSZER OLYAN FORRÓ.
BLOOD MOON|LUNE DE SANG|VÉRHOLD
MONSTERS ARE STRONGER, BUT DROP MORE TREASURE.|LES MONSTRES SONT PLUS FORTS, MAIS LAISSENT PLUS DE TRÉSORS.|A SZÖRNYEK ERŐSEBBEK, DE TÖBB KINCSET DOBNAK.
SEASON OF BONES|SAISON DES OS|CSONTOK SZEZONJA
SOME SLAIN MONSTERS RISE AND FIGHT FOR YOU.|CERTAINS MONSTRES TUÉS SE RELÈVENT ET COMBATTENT POUR TOI.|NÉHÁNY MEGÖLT SZÖRNY FELKEL ÉS NEKED HARCOL.
GOLD RUSH|RUÉE VERS L'OR|ARANYLÁZ
DOUBLE GOLD EVERYWHERE, BUT MONSTERS STEAL FROM YOU.|OR DOUBLÉ PARTOUT, MAIS LES MONSTRES TE VOLENT.|MINDENHOL DUPLA ARANY, DE A SZÖRNYEK LOPNAK TŐLED.
TIME OF SHADOWS|TEMPS DES OMBRES|ÁRNYAK IDEJE
MANY MONSTERS HIDE IN THE DARK. EVERY HERO HAS THE CANARY'S EYE.|BEAUCOUP DE MONSTRES SE CACHENT DANS LE NOIR. CHAQUE HÉROS A L'ŒIL DU CANARI.|SOK SZÖRNY BÚJIK MEG A SÖTÉTBEN. MINDEN HŐSNEK KANÁRISZEME VAN.
CALL OF THE DEEP|APPEL DES PROFONDEURS|MÉLYSÉG HÍVÁSA
A LEGENDARY BEAST WAITS HALFWAY THROUGH EVERY TEN FLOORS.|UNE BÊTE LÉGENDAIRE ATTEND AU MILIEU DE CHAQUE DIZAINE D'ÉTAGES.|MINDEN TÍZ SZINT KÖZEPÉN LEGENDÁS BESTIA VÁR.
STORM SEASON|SAISON DES ORAGES|VIHARSZEZON
LIGHTNING STRIKES THE MINE. IT HURTS MONSTERS MOST.|LA FOUDRE FRAPPE LA MINE. ELLE BLESSE SURTOUT LES MONSTRES.|VILLÁMOK CSAPNAK A BÁNYÁBA. LEGINKÁBB A SZÖRNYEKNEK ÁRT.
RETURN OF THE ANCIENTS|RETOUR DES ANCIENS|ŐSÖK VISSZATÉRÉSE
ANCIENT ITEMS FALL THREE TIMES AS OFTEN.|LES OBJETS ANCIENS TOMBENT TROIS FOIS PLUS SOUVENT.|AZ ŐSI TÁRGYAK HÁROMSZOR GYAKRABBAN ESNEK.
+10% GOLD FOR SEASONAL HEROES|+10% D'OR POUR LES HÉROS DE SAISON|+10% ARANY A SZEZONÁLIS HŐSÖKNEK
+10% EXPERIENCE FOR SEASONAL HEROES|+10% D'EXPÉRIENCE POUR LES HÉROS DE SAISON|+10% TAPASZTALAT A SZEZONÁLIS HŐSÖKNEK
THE HEART CHAMBER OPENS|LA CHAMBRE DU CŒUR S'OUVRE|MEGNYÍLIK A SZÍVKAMRA
+20% MAGIC FIND FOR SEASONAL HEROES|+20% DE DÉCOUVERTE MAGIQUE POUR LES HÉROS DE SAISON|+20% TÁRGYTALÁLÁS A SZEZONÁLIS HŐSÖKNEK
THE ASHHEART PULSES!|LE CŒUR DE CENDRE PULSE !|LÜKTET A HAMUSZÍV!
MONSTERS RAGE - TREASURE FLOWS|LES MONSTRES ENRAGENT - LES TRÉSORS COULENT|TOMBOLNAK A SZÖRNYEK - ÖMLIK A KINCS
THE PULSE FADES|LA PULSATION S'ÉTEINT|ELCSITUL A LÜKTETÉS
THE SEASON'S HEART|LE CŒUR DE LA SAISON|A SZEZON SZÍVE
THE SEASON'S HEART IS STILLED!|LE CŒUR DE LA SAISON S'EST TU !|ELHALLGATOTT A SZEZON SZÍVE!
THE SEASON'S HEART BEATS AHEAD|LE CŒUR DE LA SAISON BAT DEVANT TOI|ELŐTTED DOBOG A SZEZON SZÍVE
THE HEART CHAMBER|LA CHAMBRE DU CŒUR|A SZÍVKAMRA
SEASON CLOAK EARNED|CAPE DE SAISON GAGNÉE|SZEZONKÖPENY MEGSZEREZVE
THE SEASON HAS ENDED|LA SAISON EST FINIE|VÉGET ÉRT A SZEZON
STAY A HERO OF DUNMERE|RESTER UN HÉROS DE DUNMERE|DUNMERE HŐSE MARAD
BECOME A LEGEND|DEVENIR UNE LÉGENDE|LEGENDÁVÁ VÁLIK
YOUR HERO STAYS WITH EVERYTHING. FROM NOW ON A NORMAL HERO.|TON HÉROS RESTE AVEC TOUT. DÉSORMAIS UN HÉROS NORMAL.|A HŐSÖD MINDENÉVEL MARAD. MOSTANTÓL NORMÁL HŐS.
YOUR HERO RETIRES: A STATUE IN TOWN, ONE OF THEIR ITEMS IN THE STASH OF EVERY OTHER HERO OF YOURS, AND +3% EXPERIENCE FOR ALL YOUR HEROES (UP TO 5 LEGENDS).|TON HÉROS SE RETIRE : UNE STATUE EN VILLE, UN DE SES OBJETS DANS LA RÉSERVE DE CHACUN DE TES AUTRES HÉROS, ET +3% D'EXPÉRIENCE POUR TOUS TES HÉROS (JUSQU'À 5 LÉGENDES).|A HŐSÖD VISSZAVONUL: SZOBRA LESZ A VÁROSBAN, EGY TÁRGYA BEKERÜL MINDEN MÁSIK HŐSÖD LÁDÁJÁBA, ÉS +3% TAPASZTALATOT KAP MINDEN HŐSÖD (LEGFELJEBB 5 LEGENDÁIG).
CHOOSE THE HEIRLOOM|CHOISIS L'HÉRITAGE|VÁLASZD KI AZ ÖRÖKSÉGET
BECOME A LEGEND? THE HERO RETIRES.|DEVENIR UNE LÉGENDE ? LE HÉROS SE RETIRE.|LEGENDÁVÁ VÁLIK? A HŐS VISSZAVONUL.
AN HEIRLOOM WAITS IN YOUR STASH|UN HÉRITAGE T'ATTEND DANS TA RÉSERVE|ÖRÖKSÉG VÁR A LÁDÁDBAN
A GIFT FROM A LEGEND OF DUNMERE|UN CADEAU D'UNE LÉGENDE DE DUNMERE|AJÁNDÉK DUNMERE EGYIK LEGENDÁJÁTÓL
A STATUE RISES BY THE WELL|UNE STATUE S'ÉLÈVE PRÈS DU PUITS|SZOBOR EMELKEDIK A KÚT MELLETT
A HERO OF DUNMERE|UN HÉROS DE DUNMERE|DUNMERE HŐSE
SEASON|SAISON|SZEZON
SEASONAL|DE SAISON|SZEZONÁLIS
NORMAL|NORMAL|NORMÁL
SEASONAL HEROES PLAY ONLY WITH SEASONAL HEROES|LES HÉROS DE SAISON JOUENT SEULEMENT AVEC DES HÉROS DE SAISON|SZEZONÁLIS HŐS CSAK SZEZONÁLISSAL JÁTSZHAT
`);
