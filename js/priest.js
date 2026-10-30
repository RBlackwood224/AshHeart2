'use strict';
// The priest: co-op only. Heals the most wounded friend, shields, sanctifies the ground, raises the fallen.
// Every heal fills his Faith; a full Faith pays for the Prayer that strengthens the whole party.
(function () {
  const U = AH.UI;
  AH.CLASS_PAL.priest = Object.assign({}, AH.CLASS_PAL.wizard, { p: '#e8e0c8', P: '#b8ae90', W: '#fff8e0', w: '#e8dcc0', k: '#a8946a', K: '#7a6a4a', q: '#a8946a', U: '#e8dcc0', u: '#fff8e0', a: '#f2ead8', m: '#d8ccb0', n: '#a89c80', t: '#e8c25a', T: '#a8823a', x: '#e8c25a', X: '#a8823a', h: '#8a6a4a', H: '#5a4030' });
  Object.assign(AH.SKILLS, {
    healray: { name: 'HEALING LIGHT', mp: 12, cd: 2.5, icon: 'holy', desc: 'A RAY OF LIGHT HEALS THE MOST WOUNDED FRIEND NEARBY.' },
    bless: { name: 'BLESSED SHIELD', mp: 16, cd: 9, icon: 'aegis', desc: 'A SHIELD OF LIGHT ON THE MOST WOUNDED FRIEND. IT SOAKS UP DAMAGE.' },
    sanctuary: { name: 'SANCTUARY', mp: 22, cd: 14, icon: 'sun', desc: 'HOLY GROUND: HEALS FRIENDS, BURNS AND SLOWS FOES.' },
    revive: { name: 'RESURRECTION', mp: 30, cd: 30, icon: 'holy', desc: 'RAISES A FALLEN FRIEND AT ONCE, FROM AFAR.' },
    holyfire: { name: 'HOLY FIRE', mp: 14, cd: 5, icon: 'flame', desc: 'SACRED FLAME. TERRIBLE AGAINST THE UNDEAD, WEAK AGAINST THE LIVING.' },
    prayer: { name: 'PRAYER', mp: 0, cd: 20, icon: 'sun', desc: 'NEEDS FULL FAITH. THE WHOLE PARTY HITS 30% HARDER AND HEALS A FIFTH OF THEIR LIFE.' },
  });
  // the priest's own set
  AH.SETS.push({ id: 'saint', name: "SAINT'S VESTMENTS", cls: 'priest', minF: 6, pieces: ['mace', 'robe', 'tomeoff', 'amulet'], b: { 2: { spell: 15, hp: 25 }, 3: { mpr: 2, res: 5 }, 4: { power: 'mend', spell: 20, vit: 8 } } });
  AH.SETS.push({ id: 'pilgrim', name: 'PILGRIM', cls: 'priest', minF: 22, pieces: ['hood', 'boots', 'cloak', 'ring'], b: { 2: { move: 8, mp: 25 }, 3: { int: 10, cdr: 10 }, 4: { power: 'thirst', spell: 15 } } });
  if (AH.SET_TR) { AH.SET_TR["SAINT'S VESTMENTS"] = { fr: 'VÊTEMENTS DU SAINT', hu: 'A SZENT RUHÁJA' }; AH.SET_TR.PILGRIM = { fr: 'PÈLERIN', hu: 'ZARÁNDOK' }; }

  const allies = (G, p) => G.players.filter(q => !q.dead && AH.dist(q, p) < 150);
  const neediest = (G, p) => { let best = p, bk = p.hp / p.S.hp; for (const q of allies(G, p)) { const k = q.hp / q.S.hp; if (k < bk) { bk = k; best = q; } } return best; };
  const soloK = G => G.players.length > 1 ? 1 : 0.6; // alone, his light is weaker
  const faith = (p, n) => { if (p.ch.cls !== 'priest') return; p.faith = Math.min(100, (p.faith || 0) + n); };
  const beam = (G, a, b, col) => {
    const n = 10; for (let k = 0; k <= n; k++) { const x = a.x + (b.x - a.x) * k / n, y = a.y - 10 + (b.y - a.y) * k / n; G.fx.push({ k: 'px', x, y, vx: 0, vy: -10, col, life: 0.35, em: 1 }); }
    G.flashLights.push({ x: b.x, y: b.y, r: 40, i: 0.8, tint: [1.1, 1.1, 0.8], life: 0.25 });
  };
  const _cast = GG.castSkill;
  GG.castSkill = function (p, id, rm) {
    const sp = b => p.spellPower(b) * rm;
    switch (id) {
      case 'healray': {
        const t = neediest(this, p);
        const amt = sp(9) * 1.5 * soloK(this) * (p.S.keys.has('martyrlight') ? 0.9 : 1);
        const before = t.hp; t.heal(this, amt); const done = t.hp - before;
        if (p.S.keys.has('martyrlight') && t !== p) p.heal(this, amt * 0.5);
        if (t.remote && this.netEvent) this.netEvent('heal', t, amt);
        beam(this, p, t, '#fff2b0'); AH.Audio.sfx('holy');
        faith(p, 3 + done / Math.max(1, t.S.hp) * 30);
        return;
      }
      case 'bless': {
        const t = neediest(this, p), strong = p.S.keys.has('divineshell');
        t.blessHp = sp(10) * 2.2 * soloK(this) * (strong ? 2 : 1); t.blessT = strong ? 4 : 8;
        AH.fx.ring(this, t.x, t.y - 8, '#9ec0ff', 22); beam(this, p, t, '#9ec0ff'); AH.Audio.sfx('holy');
        faith(p, 10); return;
      }
      case 'sanctuary':
        this.addZone({ kind: 'holy', x: p.x, y: p.y, r: 52, t: 7, dps: sp(5), owner: p, sanct: 1 });
        for (const e of this.enemies) if (!e.dead && AH.dist(e, p) < 60) e.slowT = 3;
        AH.Audio.sfx('holy'); this.flashLights.push({ x: p.x, y: p.y, r: 90, i: 1, tint: [1.1, 1.05, 0.8], life: 0.4 });
        faith(p, 12); return;
      case 'revive': {
        const t = this.players.find(q => q.dead && q !== p && AH.dist(q, p) < 170);
        if (!t) { this.toast(p, 'NO FALLEN FRIEND NEARBY', '#a39bb0'); p.skillCd[id] = 0.5; p.mp += p.manaCost(AH.SKILLS[id].mp); return false; }
        if (this.scene === 'mine' && t.graveRec && this.map) this.map.props.push({ type: 'grave', x: t.x, y: t.y + 2, g: t.graveRec });
        t.graveRec = null; t.dead = false; t.state = 'idle'; t.hp = t.S.hp * 0.5 * soloK(this); t.reviveT = 0; t.inv = 2;
        this.toast(t, 'RAISED BY ' + p.ch.name, '#8ae08e'); beam(this, p, t, '#fff2b0'); AH.fx.ring(this, t.x, t.y - 8, '#fff2b0', 30); AH.Audio.sfx('legend');
        faith(p, 30); return;
      }
      case 'holyfire': {
        const e0 = this.nearestEnemy(p, 150) || { x: p.x + Math.cos(p.aim) * 40, y: p.y + Math.sin(p.aim) * 40 };
        const wrath = p.S.keys.has('wrath');
        for (const e of this.enemies) if (!e.dead && !e.hidden && AH.dist(e, e0) < 34 + e.r) e.hurt(this, sp(9) * (e.undead || wrath ? 2.6 : 0.6), p, { color: '#ffe08a' });
        AH.fx.ring(this, e0.x, e0.y - 4, '#ffe08a', 34); this.flashLights.push({ x: e0.x, y: e0.y, r: 70, i: 1, tint: [1.2, 1.0, 0.6], life: 0.3 });
        for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28; this.fx.push({ k: 'px', x: e0.x, y: e0.y - 4, vx: Math.cos(a) * 60, vy: Math.sin(a) * 40 - 30, col: k % 2 ? '#ffe08a' : '#ff8a2e', life: 0.5, g: 80, em: 1 }); }
        AH.Audio.sfx('magic'); return;
      }
      case 'prayer': {
        if ((p.faith || 0) < 100 && p.ch.cls === 'priest') { this.toast(p, 'YOUR FAITH IS NOT FULL YET', '#e8c25a'); p.skillCd[id] = 0.5; return false; }
        p.faith = 0;
        for (const q of this.players) if (!q.dead) { q.buffs.fury = Math.max(q.buffs.fury || 0, 10); q.heal(this, q.S.hp * 0.2); AH.fx.ring(this, q.x, q.y - 8, '#f2c94c', 26); }
        this.banner('A PRAYER IS ANSWERED', '#f2c94c', p.ch.name); AH.Audio.sfx('levelup'); return;
      }
    }
    return _cast.call(this, p, id, rm);
  };
  // the blessed shield soaks up damage
  const _hurt = AH.Player.prototype.hurt;
  AH.Player.prototype.hurt = function (G, dmg, src, raw) {
    if (this.blessHp > 0 && !raw && !this.dead && !(this.inv > 0)) {
      const take = Math.min(this.blessHp, dmg); this.blessHp -= take; dmg -= take;
      AH.fx.num(G, this.x, this.y - 22, 'SHIELD', '#9ec0ff');
      if (dmg <= 0.5) { this.inv = 0.2; return 0; }
    }
    return _hurt.call(this, G, dmg, src, raw);
  };
  const _upd = GG.update;
  GG.update = function (dt) {
    _upd.call(this, dt);
    if (this.paused) return;
    for (const p of this.players) if (p.blessT > 0) { p.blessT -= dt; if (p.blessT <= 0) p.blessHp = 0; }
  };
  // faith on the hud, under the mana bar
  AH.faithBar = function (ctx, p, x, y, w) {
    if (p.ch.cls !== 'priest') return;
    const f = (p.faith || 0) / 100;
    AH.bar(ctx, x, y, w, 1, f, f >= 1 ? '#fff2b0' : '#e8c25a', '#2a2414');
  };
  // a priest needs company
  AH.priestAlone = list => list.some(ch => ch && ch.cls === 'priest') && list.length < 2;
  const _pick = U.pickSlot;
  U.pickSlot = function (G, m, i) {
    const s = AH.Save.load()[i];
    if (!m.onDone && s && s.ch.cls === 'priest') { G.toast(null, 'THE PRIEST NEEDS COMPANIONS: PLAY LOCAL OR ONLINE CO-OP', '#fff2b0'); AH.Audio.sfx('error'); return; }
    _pick(G, m, i);
  };
  const _cre = U.update.create;
  U.update.create = function (G, m, dt) {
    // a new priest is made, then waits for a co-op game (unless this creation is for joining one)
    const before = AH.Save.load().length;
    if (m.step === 2 && AH.CLASS_KEYS[m.cls] === 'priest' && !m.onDone) {
      const n = U.nav(G, m, dt); const SN = AH.Season && AH.Season.now(), rows = SN ? 4 : 3;
      m.netInput = { dx: n.dx, dy: n.dy, p: Object.assign({}, n.p) };
      if (m.sel === rows - 1 && n.p.a) {
        m.netInput.p.a = false;
        const ch = AH.newCharacter('priest', m.name || 'HERO', ['canary', 'dog', 'rat'][m.pet], m.hc); if (SN && m.seasonal) ch.season = SN.n;
        const slots = AH.Save.load(); if (slots.length >= AH.Save.MAX) { G.toast(null, 'ALL SLOTS ARE FULL', '#ff8a8a'); return; }
        slots.push({ ch, world: AH.Save.newWorld() }); AH.Save.store(slots);
        window.removeEventListener('keydown', m.keyHandler);
        G.closeAllMenus(); G.openMenu('title', null);
        G.banner('THE PRIEST WAITS FOR COMPANIONS', '#fff2b0', 'START LOCAL OR ONLINE CO-OP WITH HIM');
        return;
      }
    }
    _cre(G, m, dt);
  };
  const _local = U.update.local;
  U.update.local = function (G, m, dt) {
    const L = G.localLobby || [];
    const startPress = L.length && AH.Input.devices().some(id => L.find(x => x.dev === id) && (AH.Input.pressed(id, 'a') || AH.Input.pressed(id, 'start')));
    if (startPress && AH.priestAlone(L.map(x => (AH.Save.load()[x.idx] || {}).ch))) { G.toast(null, 'THE PRIEST NEEDS AT LEAST ONE COMPANION', '#fff2b0'); AH.Audio.sfx('error'); return; }
    _local(G, m, dt);
  };
  const _wk = U.wkStart;
  U.wkStart = function (G, m) {
    if (m.slots.length < 2 && AH.CLASS_KEYS[m.slots[0].cls] === 'priest') { G.toast(null, 'THE PRIEST NEEDS AT LEAST ONE COMPANION', '#fff2b0'); AH.Audio.sfx('error'); return; }
    _wk(G, m);
  };
  // the priest's card in the class picker gets a CO-OP stamp
  AH.coopStamp = function (ctx, x, y) { AH.frame(ctx, x, y, 34, 10, { fill: '#3a2e18', edge: '#e8c25a' }); AH.text(ctx, x + 17, y + 2, 'CO-OP', '#fff2b0', { align: 'center' }); };
})();

AH.addI18n(`
PRIEST|PRÊTRE|PAP
CO-OP ONLY. HEALS, SHIELDS AND RAISES THE FALLEN. HEALING FILLS HIS FAITH.|CO-OP SEULEMENT. SOIGNE, PROTÈGE ET RELÈVE LES MORTS. SOIGNER REMPLIT SA FOI.|CSAK CO-OPBAN. GYÓGYÍT, VÉD, FELTÁMASZT. A GYÓGYÍTÁS TÖLTI A HITÉT.
HEALING LIGHT|LUMIÈRE DE SOIN|GYÓGYÍTÓ FÉNY
A RAY OF LIGHT HEALS THE MOST WOUNDED FRIEND NEARBY.|UN RAYON DE LUMIÈRE SOIGNE L'AMI LE PLUS BLESSÉ.|FÉNYSUGÁR GYÓGYÍTJA A LEGSÉRÜLTEBB TÁRSAT.
BLESSED SHIELD|BOUCLIER BÉNI|ÁLDOTT PAJZS
A SHIELD OF LIGHT ON THE MOST WOUNDED FRIEND. IT SOAKS UP DAMAGE.|UN BOUCLIER DE LUMIÈRE SUR L'AMI LE PLUS BLESSÉ. IL ABSORBE LES DÉGÂTS.|FÉNYPAJZS A LEGSÉRÜLTEBB TÁRSRA. ELNYELI A SEBZÉST.
SANCTUARY|SANCTUAIRE|SZENTÉLY
HOLY GROUND: HEALS FRIENDS, BURNS AND SLOWS FOES.|SOL SACRÉ : SOIGNE LES AMIS, BRÛLE ET RALENTIT LES ENNEMIS.|SZENT FÖLD: GYÓGYÍTJA A TÁRSAKAT, ÉGETI ÉS LASSÍTJA AZ ELLENSÉGET.
RESURRECTION|RÉSURRECTION|FELTÁMASZTÁS
RAISES A FALLEN FRIEND AT ONCE, FROM AFAR.|RELÈVE TOUT DE SUITE UN AMI TOMBÉ, DE LOIN.|AZONNAL, MESSZIRŐL FELTÁMASZT EGY ELESETT TÁRSAT.
HOLY FIRE|FEU SACRÉ|SZENT LÁNG
SACRED FLAME. TERRIBLE AGAINST THE UNDEAD, WEAK AGAINST THE LIVING.|FLAMME SACRÉE. TERRIBLE CONTRE LES MORTS-VIVANTS, FAIBLE CONTRE LES VIVANTS.|SZENT LÁNG. RETTENETES AZ ÉLŐHALOTTAKRA, GYENGE AZ ÉLŐKRE.
PRAYER|PRIÈRE|IMA
NEEDS FULL FAITH. THE WHOLE PARTY HITS 30% HARDER AND HEALS A FIFTH OF THEIR LIFE.|IL FAUT UNE FOI PLEINE. TOUT LE GROUPE FRAPPE 30% PLUS FORT ET RÉCUPÈRE UN CINQUIÈME DE SA VIE.|TELI HIT KELL HOZZÁ. AZ EGÉSZ CSAPAT 30%-KAL ERŐSEBBEN ÜT, ÉS ÉLETE ÖTÖDÉT VISSZAKAPJA.
NO FALLEN FRIEND NEARBY|AUCUN AMI TOMBÉ À PROXIMITÉ|NINCS ELESETT TÁRS A KÖZELBEN
RAISED BY {0}|RELEVÉ PAR {0}|FELTÁMASZTOTTA: {0}
YOUR FAITH IS NOT FULL YET|TA FOI N'EST PAS ENCORE PLEINE|MÉG NEM TELT MEG A HITED
A PRAYER IS ANSWERED|UNE PRIÈRE EST EXAUCÉE|MEGHALLGATTATOTT AZ IMA
THE PRIEST NEEDS COMPANIONS: PLAY LOCAL OR ONLINE CO-OP|LE PRÊTRE A BESOIN DE COMPAGNONS : JOUE EN CO-OP LOCAL OU EN LIGNE|A PAPNAK TÁRSAK KELLENEK: JÁTSSZ HELYI VAGY ONLINE CO-OPBAN
THE PRIEST NEEDS AT LEAST ONE COMPANION|LE PRÊTRE A BESOIN D'AU MOINS UN COMPAGNON|A PAPNAK LEGALÁBB EGY TÁRS KELL
THE PRIEST WAITS FOR COMPANIONS|LE PRÊTRE ATTEND SES COMPAGNONS|A PAP TÁRSAKRA VÁR
START LOCAL OR ONLINE CO-OP WITH HIM|LANCE UNE PARTIE CO-OP LOCALE OU EN LIGNE AVEC LUI|INDÍTS VELE HELYI VAGY ONLINE CO-OPOT
MARTYR'S LIGHT|LUMIÈRE DU MARTYR|A MÁRTÍR FÉNYE
YOUR HEALS ALSO HEAL YOU FOR HALF. 10% LESS LIFE.|TES SOINS TE SOIGNENT AUSSI DE MOITIÉ. 10% DE VIE EN MOINS.|A GYÓGYÍTÁSAID FELE TÉGED IS GYÓGYÍT. 10%-KAL KEVESEBB ÉLET.
DIVINE SHELL|COQUE DIVINE|ISTENI HÉJ
YOUR BLESSED SHIELDS ARE TWICE AS STRONG, BUT LAST HALF AS LONG.|TES BOUCLIERS BÉNIS SONT DEUX FOIS PLUS FORTS, MAIS DURENT MOITIÉ MOINS.|AZ ÁLDOTT PAJZSAID KÉTSZER ERŐSEBBEK, DE FELEANNYI IDEIG TARTANAK.
WRATH OF HEAVEN|COLÈRE DU CIEL|AZ ÉG HARAGJA
HOLY FIRE HITS EVERY FOE AS IF IT WERE UNDEAD.|LE FEU SACRÉ FRAPPE CHAQUE ENNEMI COMME UN MORT-VIVANT.|A SZENT LÁNG MINDEN ELLENSÉGET ÚGY SÚJT, MINTHA ÉLŐHALOTT LENNE.
GENTLE HANDS|MAINS DOUCES|GYENGÉD KEZEK
WELLSPRING|SOURCE|FORRÁS
GRACE|GRÂCE|KEGYELEM
SANCTITY|SAINTETÉ|SZENTSÉG
GUARDIAN ANGEL|ANGE GARDIEN|ŐRANGYAL
HALLOWED|SANCTIFIÉ|MEGSZENTELT
SMITING HAND|MAIN VENGERESSE|SÚJTÓ KÉZ
ZEALOT|ZÉLOTE|BUZGÓ
RADIANCE|RAYONNEMENT|RAGYOGÁS
CO-OP|CO-OP|CO-OP
`);
