'use strict';
// Enemies: creatures, elites, legendary beasts, nemesis, bosses
AH.sprCache = {};
AH.creatureSprite = function (def) {
  const key = def.spr + JSON.stringify(def.pal || {});
  if (!AH.sprCache[key]) AH.sprCache[key] = Object.keys(def.pal || {}).length ? AH.recolor(AH.SPR[def.spr], def.pal) : AH.SPR[def.spr];
  return AH.sprCache[key];
};
AH.findCreature = function (name) {
  for (const b in AH.CREATURES) for (const c of AH.CREATURES[b]) if (c.name === name) return c;
  return null;
};

AH.Enemy = function (def, x, y, floor, opt) {
  opt = opt || {};
  this.id = AH.uid(); this.def = def; this.name = opt.name || def.name;
  this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.face = 1;
  this.ai = opt.ai || def.ai;
  const f = Math.max(1, floor);
  const lv = f > 100 ? 1 + (f - 100) * 0.06 : 1;
  const pc = opt.players || 1;
  const hpScale = (1 + f * 0.08) * lv * (1 + (pc - 1) * 0.65);
  const dmgScale = (1 + f * 0.065) * lv * (1 + (pc - 1) * 0.15);
  this.maxHp = Math.round(def.hp * 1.3 * hpScale * (opt.hpMult || 1));
  this.hp = this.maxHp;
  this.dmg = def.dmg * 1.5 * dmgScale * (opt.dmgMult || 1);
  this.spd = def.spd * 38 * (opt.spdMult || 1);
  this.xp = Math.round((def.xp || 5) * (1 + f * 0.05) * (opt.xpMult || 1));
  this.scale = opt.scale || 1;
  this.spr = AH.creatureSprite(def);
  this.r = Math.max(4, Math.floor(this.spr.w * this.scale / 3));
  this.state = 'idle'; this.st = 0; this.atkCd = AH.rand.range(0.5, 1.5); this.think = 0;
  this.elite = opt.elite || null; this.legend = opt.legend || null; this.boss = !!opt.boss; this.nemesis = opt.nemesis || null;
  this.minion = !!opt.minion; this.hidden = this.ai === 'ambush' && !opt.noHide;
  this.flash = 0; this.slowT = 0; this.freezeT = 0; this.stunT = 0; this.bleed = 0; this.burnT = 0;
  this.kx = 0; this.ky = 0; this.aggro = opt.aggro || false; this.home = { x, y };
  this.undead = !!def.undead; this.fly = !!def.fly;
  this.abilT = 3; this.shieldT = 0; this.summons = 0; this.blinkT = 3 + AH.rand() * 2; this.enraged = false;
  this.bob = AH.rand() * 6;
  if (this.elite && this.elite.indexOf('giant') >= 0) { this.scale = 1.5; this.r = Math.floor(this.r * 1.5); }
  if (this.elite && this.elite.indexOf('fast') >= 0) this.spd *= 1.5;
};
const E = AH.Enemy.prototype;
E.has = function (a) { return this.elite && this.elite.indexOf(a) >= 0; };
E.isBig = function () { return !!(this.legend || this.boss || this.nemesis); };

E.hurt = function (G, dmg, by, opt) {
  opt = opt || {};
  if (this.dead) return 0;
  if (this.hidden) this.reveal(G);
  if (this.shieldT > 0) { AH.fx.num(G, this.x, this.y - this.spr.h * this.scale, 'SHIELD', '#9ec0ff'); return 0; }
  if (by && by.S && by.S.powers && by.S.powers.has('executioner') && this.hp < this.maxHp * 0.3) dmg *= 1.5;
  let d = dmg;
  if (by && by.pid !== undefined) {
    if (this.undead) { const w = by.wbase(); if (w.undead) d *= w.undead; if (by.ch.cls === 'paladin') d *= 1.25; }
  }
  d = Math.max(1, Math.round(d));
  this.hp -= d; this.flash = 0.1; this.aggro = true;
  if (by && by.pid !== undefined) this.lastHitBy = by;
  if (!opt.silent) AH.fx.num(G, this.x + AH.rand.range(-4, 4), this.y - this.spr.h * this.scale - 2, (opt.crit ? '' : '') + d, opt.crit ? '#ffd36a' : opt.color || '#ffffff', opt.crit);
  if (opt.knock && !this.isBig()) { const a = Math.atan2(this.y - by.y, this.x - by.x); this.kx = Math.cos(a) * opt.knock; this.ky = Math.sin(a) * opt.knock; }
  if (opt.freeze && Math.random() * 100 < opt.freeze) { this.freezeT = this.isBig() ? 0.4 : 1.5; }
  if (opt.frost) this.slowT = 2;
  if (opt.stun && !this.isBig()) this.stunT = opt.stun;
  if (this.hp <= 0) this.die(G, by);
  else if (this.state === 'idle') this.state = 'chase';
  if (this.legend && !this.enraged && this.hp < this.maxHp * 0.4 && (this.legend.abil || []).indexOf('enrage') >= 0) { this.enraged = true; this.spd *= 1.35; this.dmg *= 1.25; G.banner(this.name + ' IS ENRAGED!', '#ff6a5a'); }
  return d;
};
E.reveal = function (G) {
  if (!this.hidden) return;
  this.hidden = false; this.aggro = true; this.state = 'chase';
  AH.fx.dust(G, this.x, this.y, '#5a4e3a', 12); AH.Audio.sfx('break');
};
E.die = function (G, by) {
  this.dead = true;
  if (by && by.S && by.S.powers && by.S.powers.has('souleater') && by.heal) by.heal(G, by.S.hp * 0.03);
  G.fx.push({ k: 'corpse', spr: this.spr, x: this.x, y: this.y, face: this.face, sc: this.scale, life: 0.6, max: 0.6, fly: this.fly });
  AH.Audio.sfx('kill');
  AH.fx.burst(G, this.x, this.y - 6, this.spr, this.scale);
  if (this.has('explosive') || this.ai === 'explode') G.explosion(this.x, this.y, 30, this.dmg * 1.2, 'enemy');
  if ((this.def.split || this.has('splitting')) && !this.minion && this.scale >= 1) {
    for (let k = 0; k < 2; k++) { const e = new AH.Enemy(this.def, this.x + (k ? 6 : -6), this.y, G.floorNo, { hpMult: 0.35, minion: true, scale: 0.75, aggro: true, players: G.players.length }); e.spr = this.spr; G.enemies.push(e); }
  }
  G.onEnemyKilled(this, by);
};

E.target = function (G) {
  let best = null, bd = 1e9;
  for (const p of G.players) {
    if (p.dead || p.buffs.smoke > 0) continue;
    const d = AH.dist2(this.x, this.y, p.x, p.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best ? { p: best, d: Math.sqrt(bd) } : null;
};

E.update = function (G, dt) {
  if (this.dead) return;
  if (this.flash > 0) this.flash -= dt;
  if (this.shieldT > 0) this.shieldT -= dt;
  if (this.bleed > 0) { this.bleed -= dt; this.bleedT = (this.bleedT || 0) - dt; if (this.bleedT <= 0) { this.bleedT = 0.5; this.hurt(G, this.maxHp * 0.02 + 1, null, { color: '#ff6a5a' }); if (this.dead) return; } }
  if (this.burnT > 0) { this.burnT -= dt; this.burnTick = (this.burnTick || 0) - dt; if (this.burnTick <= 0) { this.burnTick = 0.5; this.hurt(G, this.burnDmg || 2, this.burnBy, { color: '#ffb347' }); if (this.dead) return; } }
  if (this.freezeT > 0) { this.freezeT -= dt; return; }
  if (this.stunT > 0) { this.stunT -= dt; return; }
  const slow = this.slowT > 0 ? 0.55 : 1; if (this.slowT > 0) this.slowT -= dt;
  // knockback
  if (this.kx || this.ky) { G.moveEntity(this, this.kx * dt, this.ky * dt, this.r * 0.6, this.fly || this.ai === 'ghost'); this.kx *= 0.82; this.ky *= 0.82; if (Math.abs(this.kx) + Math.abs(this.ky) < 4) this.kx = this.ky = 0; }
  const T = this.target(G);
  if (!T) { this.vx = this.vy = 0; return; }
  const p = T.p, d = T.d;
  if (this.hidden) { if (d < 36) this.reveal(G); else return; }
  if (!this.aggro) { if (d < 120 && (this.fly || G.map.los(this.x, this.y - 4, p.x, p.y - 4))) { this.aggro = true; } else { this.wander(G, dt); return; } }
  this.face = p.x >= this.x ? 1 : -1;
  const ang = Math.atan2(p.y - this.y, p.x - this.x);
  const spd = this.spd * slow * (1 + (G.enemySpdBonus || 0));
  this.atkCd -= dt * (this.has('frenzied') ? 1.6 : 1);
  this.abilT -= dt;
  if (this.has('shielded')) { this.shieldCd = (this.shieldCd || 4) - dt; if (this.shieldCd <= 0) { this.shieldCd = 6; this.shieldT = 1.5; } }
  if (this.has('burning')) { this.trailT = (this.trailT || 0) - dt; if (this.trailT <= 0) { this.trailT = 0.6; G.addZone({ kind: 'efire', x: this.x, y: this.y, r: 9, t: 2.5, dps: this.dmg * 0.5 }); } }
  if (this.has('spectral') || this.ai === 'ghost') { this.blinkT -= dt; if (this.blinkT <= 0) { this.blinkT = this.ai === 'ghost' ? 3.2 : 4.5; this.blinkTo(G, p); } }
  if (this.legend || this.boss) this.useAbility(G, p, d);
  const move = (a, s) => G.moveEntity(this, Math.cos(a) * s * dt, Math.sin(a) * s * dt, this.r * 0.6, this.fly || this.ai === 'ghost');
  switch (this.state === 'wind' || this.state === 'dash' ? this.state : this.ai) {
    case 'wind':
      this.st -= dt;
      if (this.st <= 0) {
        if (this.windKind === 'charge') { this.state = 'dash'; this.st = 0.45; this.chA = ang; AH.Audio.sfx('dodge'); }
        else { this.state = 'idle'; if (AH.dist(this, p) < this.reach() + 6) this.strike(G, p); }
      }
      break;
    case 'dash':
      this.st -= dt; move(this.chA, spd * 3.6);
      if (AH.dist(this, p) < this.r + 6 && !this.chHit) { this.chHit = true; this.strike(G, p, 1.4); }
      if (this.st <= 0) { this.state = 'idle'; this.chHit = false; this.atkCd = 1.6; }
      break;
    case 'swarm': {
      const wob = Math.sin(G.time * 6 + this.bob) * 1.2;
      move(ang + wob, spd);
      if (d < this.reach() && this.atkCd <= 0) { this.strike(G, p); this.atkCd = 0.9; }
      break;
    }
    case 'blob':
      this.hop = (this.hop || 0) - dt;
      if (this.hop <= 0) { this.hop = 0.9; this.hopA = ang; this.hopT = 0.35; }
      if (this.hopT > 0) { this.hopT -= dt; move(this.hopA, spd * 1.8); }
      if (d < this.reach() && this.atkCd <= 0) { this.strike(G, p); this.atkCd = 1.1; }
      break;
    case 'spit':
      if (d < 60) move(ang + Math.PI, spd * 0.8); else if (d > 100) move(ang, spd); else move(ang + Math.PI / 2, spd * 0.4);
      if (this.atkCd <= 0 && d < 170 && G.map.los(this.x, this.y - 6, p.x, p.y - 6)) { this.atkCd = 1.7; G.enemyShoot(this, ang, this.def.proj || '#ff8a2e'); }
      break;
    case 'charge':
      if (d > 70) move(ang, spd);
      else if (this.atkCd <= 0) { this.state = 'wind'; this.windKind = 'charge'; this.st = 0.5; this.flash = 0.5; }
      else move(ang + Math.PI / 2, spd * 0.5);
      break;
    case 'tank':
      if (d > this.reach()) move(ang, spd);
      else if (this.atkCd <= 0) { this.state = 'wind'; this.windKind = 'slam'; this.st = 0.65; this.atkCd = 2.2; }
      break;
    case 'summon':
      if (d < 70) move(ang + Math.PI, spd); else if (d > 120) move(ang, spd * 0.7);
      if (this.abilT <= 0 && this.summons < 6) { this.abilT = 6; this.summonMinions(G, 2); }
      if (this.atkCd <= 0 && d < 150) { this.atkCd = 2.4; G.enemyShoot(this, ang, '#c8a0ff'); }
      break;
    case 'explode':
      move(ang, spd * 1.2);
      if (d < 14 && !this.fuse) { this.fuse = 0.5; this.flash = 0.5; }
      if (this.fuse) { this.fuse -= dt; if (this.fuse <= 0) { this.hp = 0; this.die(G, null); } }
      break;
    case 'ghost':
      move(ang, spd);
      if (d < this.reach() && this.atkCd <= 0) { this.strike(G, p); this.atkCd = 1.2; }
      break;
    default: // chase, ambush
      if (d > this.reach() - 2) move(ang, spd);
      if (d < this.reach() && this.atkCd <= 0) { this.state = 'wind'; this.windKind = 'melee'; this.st = 0.32; this.atkCd = 1.2; }
  }
};
E.reach = function () { return this.r + 10; };
E.wander = function (G, dt) {
  this.think -= dt;
  if (this.think <= 0) { this.think = AH.rand.range(1, 3); this.wa = AH.rand() < 0.4 ? null : AH.rand() * Math.PI * 2; }
  if (this.wa !== null && this.wa !== undefined) G.moveEntity(this, Math.cos(this.wa) * this.spd * 0.3 * dt, Math.sin(this.wa) * this.spd * 0.3 * dt, this.r * 0.6, this.fly);
};
E.strike = function (G, p, mult) {
  this.lungeT = 0.12;
  mult = mult || 1;
  let dmg = this.dmg * mult;
  if (this.windKind === 'slam') { G.explosion(this.x + this.face * 8, this.y, 26, dmg, 'enemy', true); G.shake(3); return; }
  const dealt = p.hurt(G, dmg, this);
  if (dealt > 0) {
    if (this.has('vampiric')) this.hp = Math.min(this.maxHp, this.hp + dealt);
    if (this.has('frost') || this.def.frost) p.slow = 1.5;
    if (this.def.poison) p.poison = 3;
  }
};
E.blinkTo = function (G, p) {
  for (let k = 0; k < 8; k++) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 30;
    const nx = p.x + Math.cos(a) * r, ny = p.y + Math.sin(a) * r;
    if (!G.map.blocked(nx, ny, this.r * 0.6)) { AH.fx.puff(G, this.x, this.y - 6, '#c8a0ff'); this.x = nx; this.y = ny; AH.fx.puff(G, nx, ny - 6, '#c8a0ff'); return; }
  }
};
E.summonMinions = function (G, n) {
  const def = AH.findCreature(this.def.minion) || AH.CREATURES.stone[1];
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const x = this.x + Math.cos(a) * 18, y = this.y + Math.sin(a) * 14;
    if (G.map.blocked(x, y, 4)) continue;
    const e = new AH.Enemy(def, x, y, G.floorNo, { minion: true, aggro: true, hpMult: 0.6, xpMult: 0.3, players: G.players.length });
    G.enemies.push(e); this.summons++;
    AH.fx.puff(G, x, y - 6, '#c8a0ff');
  }
  AH.Audio.sfx('magic');
};
E.useAbility = function (G, p, d) {
  const ab = (this.legend && this.legend.abil) || ['nova', 'summon'];
  this.legT = (this.legT === undefined ? 3 : this.legT) - G.dt;
  if (this.legT > 0) return;
  this.legT = this.enraged ? 3 : 4.5;
  const a = AH.rand.pick(ab);
  const ang = Math.atan2(p.y - this.y, p.x - this.x);
  if (a === 'nova') { G.telegraph(this.x, this.y, 46, 0.7, () => { if (!this.dead) G.explosion(this.x, this.y, 46, this.dmg * 1.3, 'enemy', true); }); }
  else if (a === 'spit3') { for (let k = -2; k <= 2; k++) G.enemyShoot(this, ang + k * 0.22, this.def.proj || '#ffb347'); }
  else if (a === 'summon') { if (this.summons < 10) { const save = this.def.minion; if (!save) { this.def = Object.assign({}, this.def, { minion: AH.biomeCreaturesFor(G.floorNo)[0].name }); } this.summonMinions(G, 3); } }
  else if (a === 'blink') this.blinkTo(G, p);
  else if (a === 'howl') { G.banner(this.name + ' HOWLS!', '#ff6a5a'); for (const e of G.enemies) if (AH.dist(e, this) < 150) e.aggro = true; this.spd *= 1.05; }
  else if (a === 'split') { this.summonMinions(G, 2); }
  else if (a === 'steal') { for (const pl of G.players) if (AH.dist(pl, this) < 90) { pl.torch = Math.max(0, pl.torch - 30); G.toast(pl, 'YOUR TORCH FLICKERS!', '#ffb347'); } }
  else if (a === 'enrage' && !this.enraged && this.hp < this.maxHp * 0.6) { this.enraged = true; this.spd *= 1.3; }
  if (this.boss && this.heartPhase) this.heartAttack(G, p, ang);
};
E.heartAttack = function (G, p, ang) {
  // ASHHEART: ember spirals and summons
  for (let k = 0; k < 12; k++) G.enemyShoot(this, (G.time * 0.7) + k * Math.PI / 6, '#ff8a2e', 0.8);
  if (this.hp < this.maxHp * 0.5 && this.summons < 8) { this.def = Object.assign({}, this.def, { minion: 'HELL IMP' }); this.summonMinions(G, 2); }
};

E.draw = function (ctx, G) {
  if (this.dead) return;
  if (this.hidden) {
    if (Math.floor(G.time * 3 + this.bob) % 4 === 0) { ctx.fillStyle = '#5a4e3a'; ctx.fillRect(Math.round(this.x - 3), Math.round(this.y - 1), 6, 1); ctx.fillRect(Math.round(this.x - 1), Math.round(this.y - 2), 2, 1); }
    return;
  }
  const s = this.spr, sc = this.scale;
  const fy = this.fly ? Math.sin(G.time * 5 + this.bob) * 2 - 6 : 0;
  const moving = this._px !== undefined && Math.hypot(this.x - this._px, this.y - this._py) > 0.02;
  this._px = this.x; this._py = this.y;
  const hop = !this.fly && moving && Math.floor(G.time * 8 + this.bob * 3) % 2 ? -1 : 0;
  let w = s.w * sc, h = s.h * sc, lx = 0;
  if (this.state === 'wind') { const sq = Math.min(2, Math.round(sc * 1.5)); h -= sq; w += sq; lx = -this.face; }
  if (this.lungeT > 0) { this.lungeT -= G.dt || 0.016; lx = this.face * Math.round(3 * sc * Math.min(1, this.lungeT / 0.08)); }
  const x = Math.round(this.x - w / 2) + lx, y = Math.round(this.y - h + 2 + fy) + hop;
  this._dx = x; this._dy = y;
  // shadow
  ctx.fillStyle = 'rgba(6,4,10,0.5)'; ctx.fillRect(Math.round(this.x - w / 3), Math.round(this.y), Math.round(w / 1.5), 2);
  // glowing outline so big threats read in the dark
  if (this.boss || this.legend || this.nemesis) {
    const oc = this.boss ? '#ff5a3a' : this.nemesis ? '#e04a6a' : '#ffa040';
    ctx.globalAlpha = 0.65 + Math.sin(G.time * 5) * 0.25;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) AH.drawTint(ctx, s, x + ox, y + oy, this.face < 0, sc, oc);
    ctx.globalAlpha = 1;
  }
  const flash = (this.flash > 0 && Math.floor(G.time * 30) % 2 === 0) || (this.state === 'wind' && Math.floor(G.time * 16) % 2 === 0);
  const img = flash ? null : (this.face < 0 ? s.cf : s.c);
  if (flash) AH.drawFlash(ctx, s, x, y, this.face < 0, sc);
  else ctx.drawImage(img, x, y, w, h);
  if (this.state === 'wind' && Math.floor(G.time * 10) % 2) AH.text(ctx, this.x, y - 9, '!', '#ff6a5a', { align: 'center' });
  if (this.freezeT > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#9ef0ff'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); ctx.globalAlpha = 1; }
  if (this.shieldT > 0) { AH.arc(ctx, this.x, this.y - h / 2, Math.max(w, h) / 2 + 2, 0, Math.PI * 2, ['#9ec0ff']); }
};
E.drawEm = function (ctx, G) {
  if (this.dead || this.hidden || this._dx === undefined) return;
  AH.drawSprEm(ctx, this.spr, this._dx, this._dy, this.face < 0, this.scale);
  // elite / legend marker
  if (this.elite || this.legend || this.nemesis || this.boss) {
    const col = this.boss ? '#ff6a5a' : this.legend ? '#ff9a3e' : this.nemesis ? '#e05a5a' : '#f2d36a';
    const w = Math.max(16, this.spr.w * this.scale);
    AH.bar(ctx, Math.round(this.x - w / 2), this._dy - 4, Math.round(w), 1, this.hp / this.maxHp, col, '#2a1416');
  } else if (this.hp < this.maxHp) {
    AH.bar(ctx, Math.round(this.x - 6), this._dy - 3, 12, 1, this.hp / this.maxHp, '#d43c3c', '#2a1416');
  }
};

// ---------- spawning ----------
AH.biomeCreaturesFor = function (floor) {
  if (floor > 100) { const all = []; for (const b in AH.CREATURES) all.push(...AH.CREATURES[b]); return all; }
  const b = AH.biomeOf(floor);
  return AH.CREATURES[b.id].filter(c => !c.minF || floor >= c.minF);
};
AH.spawnFloorEnemies = function (G, rng) {
  const m = G.map, f = G.floorNo, pc = G.players.length;
  const pool = AH.biomeCreaturesFor(f);
  const critters = AH.CREATURES.stone.filter(c => c.name === 'CAVE RAT' || c.name === 'CAVE BAT' || c.name === 'PALE SLIME');
  for (const sp of m.spawns) {
    if (sp.critter) { G.enemies.push(new AH.Enemy(rng.pick(critters), sp.x, sp.y, f, { players: pc, hpMult: 0.6, dmgMult: 0.5 })); continue; }
    const def = rng.pick(pool);
    const isElite = f >= 8 && rng() < 0.08 + f * 0.003;
    let elite = null;
    if (isElite) { elite = [rng.pick(AH.ELITE_AFFIX).id]; if (f > 30 && rng() < 0.4) elite.push(rng.pick(AH.ELITE_AFFIX).id); }
    const e = new AH.Enemy(def, sp.x, sp.y, f, { elite, players: pc, hpMult: elite ? 2.6 : 1, dmgMult: elite ? 1.3 : 1, xpMult: elite ? 4 : 1, aggro: !!sp.ambush });
    if (elite) e.name = elite.map(a => AH.ELITE_AFFIX.find(x => x.id === a).name).join(' ') + ' ' + def.name;
    // champion pack: elites bring friends
    G.enemies.push(e);
    if (elite) for (let k = 0; k < 2; k++) { const x = sp.x + rng.int(-14, 14), y = sp.y + rng.int(-10, 10); if (!m.blocked(x, y, 4)) G.enemies.push(new AH.Enemy(def, x, y, f, { players: pc })); }
  }
};
AH.spawnLegend = function (G, L, x, y, opt) {
  opt = opt || {};
  const f = G.floorNo;
  const base = Object.assign({}, AH.CREATURES.stone.find(c => c.spr === L.spr) || AH.findCreatureBySpr(L.spr), { pal: L.pal, spr: L.spr, name: L.name });
  base.minion = base.minion || AH.biomeCreaturesFor(f)[0].name;
  if (L.spr === 'spider') base.minion = 'DUST SPIDER';
  const e = new AH.Enemy(base, x, y, f, { legend: L, ai: L.ai, name: L.name, hpMult: opt.boss ? 34 : 18, dmgMult: 2.1, xpMult: 25, scale: 2, players: G.players.length, boss: opt.boss, noHide: true });
  e.title = L.title; if (opt.boss) e.aggro = true;
  G.enemies.push(e);
  return e;
};
AH.findCreatureBySpr = function (spr) { for (const b in AH.CREATURES) for (const c of AH.CREATURES[b]) if (c.spr === spr) return c; return AH.CREATURES.stone[0]; };
AH.spawnAshheart = function (G, x, y) {
  const def = { name: 'ASHHEART', spr: 'heart', pal: {}, ai: 'spit', hp: 900, dmg: 70, spd: 0.25, xp: 2000, minion: 'HELL IMP', proj: '#ff8a2e', fly: 1 };
  const e = new AH.Enemy(def, x, y, G.floorNo, { boss: true, hpMult: 6, scale: 3, players: G.players.length, legend: { abil: ['nova', 'spit3', 'summon'] }, name: 'ASHHEART', noHide: true });
  e.heartPhase = true; e.title = 'THE BURNING DREAM'; e.aggro = true;
  G.enemies.push(e); return e;
};
AH.spawnNemesis = function (G, nem, x, y) {
  const def = AH.findCreature(nem.base) || AH.CREATURES.stone[1];
  const e = new AH.Enemy(def, x, y, Math.max(G.floorNo, nem.floor), { nemesis: nem, name: nem.name, hpMult: 6 + nem.rank * 2, dmgMult: 1.4 + nem.rank * 0.15, xpMult: 12, scale: 1.5, players: G.players.length, elite: nem.affixes, aggro: true, noHide: true });
  e.title = nem.title;
  G.enemies.push(e); return e;
};
