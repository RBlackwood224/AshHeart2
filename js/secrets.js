'use strict';
// A few small surprises. Shh.
(function () {
  const U = AH.UI, T = AH.T;
  AH.SPR.sheep = AH.sprite(['....wwwww....', '..wwwWwwwww..', '.wwwwwwwWwwkk', 'wwWwwwwwwwkkk', 'wwwwwwwwwwkek', '.wwwwWwwwwkkk', '..wwwwwwww.k.', '..k.k..k.k...', '..k.k..k.k...'], { w: '#f2eee4', W: '#d8d2c4', k: '#2a2430', e: '#f2e3b3' });
  AH.SPR.breadbin = AH.sprite(['..bbbbbbbbbbbb..', '.bBBBBBBBBBBBBb.', '.bkkkkkkkkkkkkb.', '.bkKkKkKkKkKkkb.', '.bkkkkkkkkkkkkb.', '.bBBBBroygBBBBb.', '..bbbbbbbbbbbb..'], { b: '#6a6050', B: '#c8bca0', k: '#4a4038', K: '#8a8070', r: '#e0304a', o: '#ff8a2e', y: '#f2c94c', g: '#2ec060' });

  // deep below, somebody left an old friend
  const _enter = GG.enterMine;
  GG.enterMine = function (floor, mode) {
    _enter.call(this, floor, mode);
    if (this.isRun() || !this.map || !this.map.rooms) return;
    const rng = AH.mulberry((this.mapSeed || 7) ^ 0x64);
    if (floor === 64) {
      const rooms = this.map.rooms.filter(r => r !== this.map.startRoom && r !== this.map.stairsRoom);
      const r = rng.pick(rooms.length ? rooms : this.map.rooms), pos = this.map.randomFloorIn(r, rng);
      this.npcs.push({ kind: 'breadbin', spr: AH.SPR.breadbin, x: pos.x, y: pos.y, face: 1, fixed: 1 });
    }
    if (floor >= 30 && rng() < 0.035) {
      const r = rng.pick(this.map.rooms), pos = this.map.randomFloorIn(r, rng);
      this.npcs.push({ kind: 'sheep', spr: AH.SPR.sheep, x: pos.x, y: pos.y, face: 1, fixed: 1, t: 0 });
    }
  };
  const _find = GG.findInteract;
  GG.findInteract = function (p) {
    const best = _find.call(this, p);
    if (best && best.kind === 'breadbin') best.label = 'READY.';
    if (best && best.kind === 'sheep') best.label = 'PET';
    return best;
  };
  const _inter = GG.interact;
  GG.interact = function (p, it) {
    if (it && it.kind === 'breadbin') {
      AH.Audio.sfx('magic');
      this.banner('**** 64K RAM SYSTEM ****', '#9ec0ff', '38911 BASIC BYTES FREE. READY.');
      if (!p.ch.eggs || !p.ch.eggs.c64) {
        p.ch.eggs = Object.assign({}, p.ch.eggs, { c64: 1 });
        const a = AH.genItem(AH.rand, Math.max(30, this.floorNo), { rarity: 3, base: 'amulet', noSet: true, noAncient: true });
        a.name = 'THE BREADBIN'; a.legend = 'goldheal'; a.affixes.push({ k: 'mf', v: 64 }); a.affixes.push({ k: 'gold', v: 64 }); delete a.bargain; delete a.unid; delete a.cursed;
        this.dropItem(it.obj.x, it.obj.y + 8, a, p.pid);
        this.toast(p, 'LOAD "*",8,1', '#9ec0ff');
      }
      return;
    }
    if (it && it.kind === 'sheep') {
      const n = it.obj; n.say = 'BAA!'; n.sayUntil = this.time + 2; AH.Audio.sfx('select');
      if (!n.petted) { n.petted = 1; for (const q of this.players) q.buffs.luck = Math.max(q.buffs.luck || 0, 600); this.banner('A SHEEP! DOWN HERE?', '#f2eee4', 'IT LOOKS AT YOU. YOU FEEL LUCKY.'); }
      return;
    }
    if (it && it.kind === 'well' && p.ch.gold >= 5 && this.world) {
      const W = this.world; W.wellCoins = (W.wellCoins || 0) + 1;
      if (W.wellCoins === 64 && !W.wellEgg) {
        W.wellEgg = 1; p.ch.gold -= 5; AH.Audio.sfx('legend');
        const r = AH.genItem(AH.rand, Math.max(10, p.ch.deepest || 1), { rarity: 3, base: 'ring', noSet: true, noAncient: true });
        r.name = 'THE WISHING COIN'; r.legend = 'goldheal'; r.affixes.push({ k: 'mf', v: 30 }); delete r.unid; delete r.cursed; delete r.bargain;
        if (!p.addItem(r)) this.dropItem(p.x, p.y + 8, r, p.pid);
        this.banner('THE WELL REMEMBERS 1982', '#f2c94c', 'SIXTY-FOUR WISHES. ONE COMES TRUE.');
        return;
      }
    }
    _inter.call(this, p, it);
  };
  // sheep wander a little and talk
  const _upd = GG.update;
  GG.update = function (dt) {
    _upd.call(this, dt);
    if (this.scene !== 'mine' || this.paused) return;
    for (const n of this.npcs) if (n.kind === 'sheep') {
      n.t -= dt;
      if (n.t <= 0) { n.t = AH.rand.range(1.5, 4); n.wa = AH.rand() < 0.4 ? null : AH.rand() * Math.PI * 2; if (AH.rand() < 0.3) { n.say = 'BAA'; n.sayUntil = this.time + 1.5; } }
      if (n.wa !== null && n.wa !== undefined) { this.moveEntity(n, Math.cos(n.wa) * 14 * dt, Math.sin(n.wa) * 14 * dt, 4); n.face = Math.cos(n.wa) > 0 ? 1 : -1; }
    }
  };
  // an old code on the title screen
  const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let at = 0;
  window.addEventListener('keydown', e => {
    const G = AH.game; if (!G || !G.menu || G.menu.type !== 'title') { at = 0; return; }
    at = e.code === SEQ[at] ? at + 1 : (e.code === SEQ[0] ? 1 : 0);
    if (at === SEQ.length) {
      at = 0; const o = AH.options; o.shepherd = 1; AH.Save.setOptions(o);
      G.banner('BAA BAA!', '#f2eee4', 'YOUR NEXT HERO STARTS WITH A SHEPHERD\'S CROOK'); AH.Audio.sfx('levelup');
    }
  });
  const _new = AH.newCharacter;
  AH.newCharacter = function (cls, name, pet, hc) {
    const ch = _new(cls, name, pet, hc);
    const o = AH.options;
    if (o && o.shepherd && name !== 'X' && !(AH.game && AH.game.mode === 'weekly')) {
      o.shepherd = 0; AH.Save.setOptions(o);
      const s = AH.genItem(AH.mulberry(64), 3, { rarity: 2, base: 'staff', noSet: true }); s.name = 'SHEPHERD\'S CROOK'; s.req = null; s.sockets = 1; s.affixes.push({ k: 'mf', v: 25 });
      const i = ch.bag.indexOf(null); if (i >= 0) ch.bag[i] = s;
    }
    return ch;
  };
})();

AH.addI18n(`
PET|CARESSER|SIMOGATÁS
A SHEEP! DOWN HERE?|UN MOUTON ! ICI EN BAS ?|EGY BÁRÁNY! ITT LENT?
IT LOOKS AT YOU. YOU FEEL LUCKY.|IL TE REGARDE. TU TE SENS CHANCEUX.|RÁD NÉZ. SZERENCSÉSNEK ÉRZED MAGAD.
THE WELL REMEMBERS 1982|LE PUITS SE SOUVIENT DE 1982|A KÚT EMLÉKSZIK 1982-RE
SIXTY-FOUR WISHES. ONE COMES TRUE.|SOIXANTE-QUATRE VŒUX. L'UN SE RÉALISE.|HATVANNÉGY KÍVÁNSÁG. EGY TELJESÜL.
YOUR NEXT HERO STARTS WITH A SHEPHERD'S CROOK|TON PROCHAIN HÉROS COMMENCE AVEC UN BÂTON DE BERGER|A KÖVETKEZŐ HŐSÖD PÁSZTORBOTTAL KEZD
`);
